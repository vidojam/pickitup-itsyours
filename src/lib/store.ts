import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { emitInventoryChange } from "@/lib/inventory-events";
import { DEFAULT_OFFER_AMOUNT } from "@/lib/constants";
import { AppStore, Item, ItemCategory, Reservation } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const EMPTY_STORE: AppStore = {
  items: [],
  reservations: [],
};

let queue: Promise<void> = Promise.resolve();

function normalizeItem(item: unknown): Item {
  const rawItem = item as Record<string, unknown>;
  const imageUrls = Array.isArray(rawItem.imageUrls)
    ? rawItem.imageUrls.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : typeof rawItem.imageUrl === "string" && rawItem.imageUrl.length > 0
      ? [rawItem.imageUrl]
      : [];

  return {
    id: typeof rawItem.id === "string" ? rawItem.id : crypto.randomUUID(),
    imageUrls,
    offerAmount: typeof rawItem.offerAmount === "number" ? rawItem.offerAmount : DEFAULT_OFFER_AMOUNT,
    timeViewed: typeof rawItem.timeViewed === "string" ? rawItem.timeViewed : "",
    location: typeof rawItem.location === "string" ? rawItem.location : "",
    address: typeof rawItem.address === "string" ? rawItem.address : undefined,
    category: rawItem.category as ItemCategory,
    status: rawItem.status as Item["status"],
    createdAt: typeof rawItem.createdAt === "string" ? rawItem.createdAt : new Date().toISOString(),
    updatedAt: typeof rawItem.updatedAt === "string" ? rawItem.updatedAt : new Date().toISOString(),
    activeReservationId: typeof rawItem.activeReservationId === "string" ? rawItem.activeReservationId : undefined,
  };
}

function normalizeStore(store: AppStore): AppStore {
  return {
    items: Array.isArray(store.items) ? store.items.map((item) => normalizeItem(item)) : [],
    reservations: Array.isArray(store.reservations) ? store.reservations : [],
  };
}

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

export async function readStore(): Promise<AppStore> {
  await ensureStoreFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return normalizeStore(JSON.parse(raw) as AppStore);
}

async function writeStore(store: AppStore) {
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function withStore<T>(
  mutator: (store: AppStore) => Promise<{ result: T; changed?: boolean }> | { result: T; changed?: boolean },
): Promise<T> {
  let result!: T;

  queue = queue.then(async () => {
    const store = await readStore();
    const output = await mutator(store);
    result = output.result;
    if (output.changed) {
      await writeStore(store);
      emitInventoryChange();
    }
  });

  await queue;
  return result;
}

export async function listItems(status?: Item["status"]) {
  const store = await readStore();
  const byDate = [...store.items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  if (!status) {
    return byDate;
  }
  return byDate.filter((item) => item.status === status);
}

export async function getItemById(id: string) {
  const store = await readStore();
  return store.items.find((item) => item.id === id) ?? null;
}

export async function createItem(input: {
  imageUrls: string[];
  offerAmount: number;
  timeViewed: string;
  location: string;
  category: ItemCategory;
}) {
  return withStore(async (store) => {
    const now = new Date().toISOString();
    const item: Item = {
      id: crypto.randomUUID(),
      imageUrls: input.imageUrls,
      offerAmount: input.offerAmount,
      timeViewed: input.timeViewed,
      location: input.location,
      category: input.category,
      status: "available",
      createdAt: now,
      updatedAt: now,
    };

    store.items.push(item);
    return { result: item, changed: true };
  });
}

export async function createReservation(input: {
  itemId: string;
  paymentIntentId: string;
  amount: number;
}) {
  return withStore(async (store) => {
    const item = store.items.find((entry) => entry.id === input.itemId);
    if (!item || item.status !== "available") {
      return { result: null };
    }

    const now = new Date().toISOString();
    const reservation: Reservation = {
      id: crypto.randomUUID(),
      itemId: input.itemId,
      paymentIntentId: input.paymentIntentId,
      amount: input.amount,
      status: "authorized",
      createdAt: now,
      updatedAt: now,
    };

    item.status = "pending";
    item.activeReservationId = reservation.id;
    item.updatedAt = now;
    store.reservations.push(reservation);

    return {
      result: {
        reservation,
        item,
      },
      changed: true,
    };
  });
}

export async function getReservationById(reservationId: string) {
  const store = await readStore();
  return store.reservations.find((entry) => entry.id === reservationId) ?? null;
}

export async function getReservationDetails(reservationId: string) {
  const store = await readStore();
  const reservation = store.reservations.find((entry) => entry.id === reservationId);
  if (!reservation) {
    return null;
  }
  const item = store.items.find((entry) => entry.id === reservation.itemId) ?? null;
  return { reservation, item };
}

export async function findReservationByIntent(paymentIntentId: string) {
  const store = await readStore();
  return store.reservations.find((entry) => entry.paymentIntentId === paymentIntentId) ?? null;
}

export async function decideReservation(input: {
  reservationId: string;
  decision: "picked" | "missing";
}) {
  return withStore(async (store) => {
    const reservation = store.reservations.find((entry) => entry.id === input.reservationId);
    if (!reservation || reservation.status !== "authorized") {
      return { result: null };
    }

    const item = store.items.find((entry) => entry.id === reservation.itemId);
    if (!item) {
      return { result: null };
    }

    const now = new Date().toISOString();
    reservation.status = input.decision === "picked" ? "charged" : "released";
    reservation.updatedAt = now;

    item.status = input.decision === "picked" ? "completed" : "missing";
    item.activeReservationId = undefined;
    item.updatedAt = now;

    return {
      result: {
        reservation,
        item,
      },
      changed: true,
    };
  });
}

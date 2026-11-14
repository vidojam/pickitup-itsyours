import { emitInventoryChange } from "@/lib/inventory-events";
import { Item, ItemCategory, Reservation } from "@/lib/types";
import { getDb } from "@/lib/db";

type Row = Record<string, unknown>;

function rowToItem(row: Row): Item {
  return {
    id: row.id as string,
    imageUrls: JSON.parse(row.imageUrls as string) as string[],
    offerAmount: row.offerAmount as number,
    timeViewed: row.timeViewed as string,
    location: row.location as string,
    address: (row.address as string | null) ?? undefined,
    category: row.category as ItemCategory,
    status: row.status as Item["status"],
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
    activeReservationId: (row.activeReservationId as string | null) ?? undefined,
  };
}

function rowToReservation(row: Row): Reservation {
  return {
    id: row.id as string,
    itemId: row.itemId as string,
    paymentIntentId: row.paymentIntentId as string,
    amount: row.amount as number,
    status: row.status as Reservation["status"],
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function listItems(status?: Item["status"]): Promise<Item[]> {
  const db = getDb();
  const rows = status
    ? (db.prepare("SELECT * FROM items WHERE status = ? ORDER BY createdAt DESC").all(status) as Row[])
    : (db.prepare("SELECT * FROM items ORDER BY createdAt DESC").all() as Row[]);
  return rows.map(rowToItem);
}

export async function getItemById(id: string): Promise<Item | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToItem(row) : null;
}

export async function createItem(input: {
  imageUrls: string[];
  offerAmount: number;
  timeViewed: string;
  location: string;
  category: ItemCategory;
}): Promise<Item> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO items (id, imageUrls, offerAmount, timeViewed, location, category, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'available', ?, ?)",
  ).run(id, JSON.stringify(input.imageUrls), input.offerAmount, input.timeViewed, input.location, input.category, now, now);

  emitInventoryChange();
  return (await getItemById(id))!;
}

export async function createReservation(input: {
  itemId: string;
  paymentIntentId: string;
  amount: number;
}): Promise<{ reservation: Reservation; item: Item } | null> {
  const db = getDb();

  const run = db.transaction((): { reservation: Reservation; item: Item } | null => {
    // Idempotency: return existing reservation if this paymentIntentId was already used.
    // The UNIQUE constraint on paymentIntentId is the structural enforcer; this check
    // gives callers a clean return value instead of a constraint error.
    const existingRow = db
      .prepare("SELECT * FROM reservations WHERE paymentIntentId = ?")
      .get(input.paymentIntentId) as Row | undefined;

    if (existingRow) {
      const existing = rowToReservation(existingRow);
      const itemRow = db.prepare("SELECT * FROM items WHERE id = ?").get(existing.itemId) as Row | undefined;
      return itemRow ? { reservation: existing, item: rowToItem(itemRow) } : null;
    }

    // Atomic check-and-insert: the status check and INSERT happen inside a single
    // SQLite transaction, eliminating any TOCTOU window between checking availability
    // and creating the reservation.
    const itemRow = db
      .prepare("SELECT * FROM items WHERE id = ? AND status = 'available'")
      .get(input.itemId) as Row | undefined;

    if (!itemRow) return null;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      "INSERT INTO reservations (id, itemId, paymentIntentId, amount, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'authorized', ?, ?)",
    ).run(id, input.itemId, input.paymentIntentId, input.amount, now, now);

    db.prepare(
      "UPDATE items SET status = 'pending', activeReservationId = ?, updatedAt = ? WHERE id = ?",
    ).run(id, now, input.itemId);

    const item = rowToItem(itemRow);
    return {
      reservation: {
        id,
        itemId: input.itemId,
        paymentIntentId: input.paymentIntentId,
        amount: input.amount,
        status: "authorized",
        createdAt: now,
        updatedAt: now,
      },
      item: { ...item, status: "pending", activeReservationId: id, updatedAt: now },
    };
  });

  const result = run();
  if (result) emitInventoryChange();
  return result;
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM reservations WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToReservation(row) : null;
}

export async function getReservationDetails(
  reservationId: string,
): Promise<{ reservation: Reservation; item: Item } | null> {
  const db = getDb();
  const resRow = db.prepare("SELECT * FROM reservations WHERE id = ?").get(reservationId) as Row | undefined;
  if (!resRow) return null;
  const reservation = rowToReservation(resRow);
  const itemRow = db.prepare("SELECT * FROM items WHERE id = ?").get(reservation.itemId) as Row | undefined;
  return itemRow ? { reservation, item: rowToItem(itemRow) } : null;
}

export async function findReservationByIntent(paymentIntentId: string): Promise<Reservation | null> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM reservations WHERE paymentIntentId = ?")
    .get(paymentIntentId) as Row | undefined;
  return row ? rowToReservation(row) : null;
}

export async function decideReservation(input: {
  reservationId: string;
  decision: "picked" | "missing";
}): Promise<{ reservation: Reservation; item: Item } | null> {
  const db = getDb();

  const run = db.transaction((): { reservation: Reservation; item: Item } | null => {
    const resRow = db
      .prepare("SELECT * FROM reservations WHERE id = ? AND status = 'authorized'")
      .get(input.reservationId) as Row | undefined;
    if (!resRow) return null;

    const reservation = rowToReservation(resRow);
    const itemRow = db.prepare("SELECT * FROM items WHERE id = ?").get(reservation.itemId) as Row | undefined;
    if (!itemRow) return null;

    const now = new Date().toISOString();
    const newResStatus = input.decision === "picked" ? "charged" : "released";
    const newItemStatus = input.decision === "picked" ? "completed" : "missing";

    db.prepare("UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?").run(
      newResStatus,
      now,
      input.reservationId,
    );
    db.prepare(
      "UPDATE items SET status = ?, activeReservationId = NULL, updatedAt = ? WHERE id = ?",
    ).run(newItemStatus, now, reservation.itemId);

    return {
      reservation: { ...reservation, status: newResStatus as Reservation["status"], updatedAt: now },
      item: {
        ...rowToItem(itemRow),
        status: newItemStatus as Item["status"],
        activeReservationId: undefined,
        updatedAt: now,
      },
    };
  });

  const result = run();
  if (result) emitInventoryChange();
  return result;
}

export async function relistReservation(
  reservationId: string,
): Promise<{ reservation: Reservation; item: Item } | null> {
  const db = getDb();

  const run = db.transaction((): { reservation: Reservation; item: Item } | null => {
    const resRow = db
      .prepare("SELECT * FROM reservations WHERE id = ? AND status = 'authorized'")
      .get(reservationId) as Row | undefined;
    if (!resRow) return null;

    const reservation = rowToReservation(resRow);
    const itemRow = db.prepare("SELECT * FROM items WHERE id = ?").get(reservation.itemId) as Row | undefined;
    if (!itemRow) return null;

    const now = new Date().toISOString();
    db.prepare("UPDATE reservations SET status = 'released', updatedAt = ? WHERE id = ?").run(now, reservationId);
    db.prepare(
      "UPDATE items SET status = 'available', activeReservationId = NULL, updatedAt = ? WHERE id = ?",
    ).run(now, reservation.itemId);

    return {
      reservation: { ...reservation, status: "released", updatedAt: now },
      item: { ...rowToItem(itemRow), status: "available", activeReservationId: undefined, updatedAt: now },
    };
  });

  const result = run();
  if (result) emitInventoryChange();
  return result;
}

export async function refundReservation(
  reservationId: string,
): Promise<{ reservation: Reservation; item: Item } | null> {
  const db = getDb();

  const run = db.transaction((): { reservation: Reservation; item: Item } | null => {
    const resRow = db
      .prepare("SELECT * FROM reservations WHERE id = ? AND status = 'charged'")
      .get(reservationId) as Row | undefined;
    if (!resRow) return null;

    const reservation = rowToReservation(resRow);
    const itemRow = db.prepare("SELECT * FROM items WHERE id = ?").get(reservation.itemId) as Row | undefined;
    if (!itemRow) return null;

    const now = new Date().toISOString();
    db.prepare("UPDATE reservations SET status = 'refunded', updatedAt = ? WHERE id = ?").run(now, reservationId);
    db.prepare(
      "UPDATE items SET status = 'available', activeReservationId = NULL, updatedAt = ? WHERE id = ?",
    ).run(now, reservation.itemId);

    return {
      reservation: { ...reservation, status: "refunded", updatedAt: now },
      item: { ...rowToItem(itemRow), status: "available", activeReservationId: undefined, updatedAt: now },
    };
  });

  const result = run();
  if (result) emitInventoryChange();
  return result;
}


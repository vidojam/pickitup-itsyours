import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "admin-mobile-links.json");
const LINK_LIFETIME_MS = 10 * 60 * 1000;

type StoredLink = {
  token: string;
  expiresAt: string;
};

let queue: Promise<void> = Promise.resolve();

async function ensureLinksFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

async function readLinks(): Promise<StoredLink[]> {
  await ensureLinksFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return JSON.parse(raw) as StoredLink[];
}

async function writeLinks(links: StoredLink[]) {
  await writeFile(DATA_FILE, JSON.stringify(links, null, 2), "utf8");
}

export async function createAdminMobileLink() {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + LINK_LIFETIME_MS).toISOString();

  queue = queue.then(async () => {
    const links = await readLinks();
    const activeLinks = links.filter((entry) => new Date(entry.expiresAt).getTime() > Date.now());
    activeLinks.push({ token, expiresAt });
    await writeLinks(activeLinks);
  });

  await queue;
  return { token, expiresAt };
}

export async function consumeAdminMobileLink(token: string) {
  let isValid = false;

  queue = queue.then(async () => {
    const links = await readLinks();
    const activeLinks = links.filter((entry) => new Date(entry.expiresAt).getTime() > Date.now());
    const index = activeLinks.findIndex((entry) => entry.token === token);

    if (index === -1) {
      await writeLinks(activeLinks);
      return;
    }

    activeLinks.splice(index, 1);
    isValid = true;
    await writeLinks(activeLinks);
  });

  await queue;
  return isValid;
}
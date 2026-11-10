// Server-side session store so sessions can actually be revoked (logout) and expire.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SESSION_LIFETIME_MS, signSessionToken } from "./admin-session-token";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "admin-sessions.json");

type StoredSession = {
  id: string;
  expiresAt: string;
};

let queue: Promise<void> = Promise.resolve();

async function ensureSessionsFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

async function readSessions(): Promise<StoredSession[]> {
  await ensureSessionsFile();
  const raw = await readFile(DATA_FILE, "utf8");
  return JSON.parse(raw) as StoredSession[];
}

async function writeSessions(sessions: StoredSession[]) {
  await writeFile(DATA_FILE, JSON.stringify(sessions, null, 2), "utf8");
}

function pruneExpired(sessions: StoredSession[]) {
  return sessions.filter((entry) => new Date(entry.expiresAt).getTime() > Date.now());
}

export async function createAdminSession() {
  const sessionId = crypto.randomUUID();
  const expiresAtMs = Date.now() + SESSION_LIFETIME_MS;

  queue = queue.then(async () => {
    const sessions = pruneExpired(await readSessions());
    sessions.push({ id: sessionId, expiresAt: new Date(expiresAtMs).toISOString() });
    await writeSessions(sessions);
  });
  await queue;

  const token = await signSessionToken(sessionId, expiresAtMs);
  return { token, expiresAtMs };
}

export async function isAdminSessionActive(sessionId: string) {
  let active = false;

  queue = queue.then(async () => {
    const sessions = pruneExpired(await readSessions());
    active = sessions.some((entry) => entry.id === sessionId);
    await writeSessions(sessions);
  });
  await queue;

  return active;
}

export async function destroyAdminSession(sessionId: string) {
  queue = queue.then(async () => {
    const sessions = pruneExpired(await readSessions());
    await writeSessions(sessions.filter((entry) => entry.id !== sessionId));
  });
  await queue;
}

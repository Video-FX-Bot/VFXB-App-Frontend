// backend/src/services/fileStore.js
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const USERS_PATH = path.join(DATA_DIR, "users.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_PATH);
  } catch {
    await fs.writeFile(USERS_PATH, "[]", "utf8");
  }
}

export async function readUsers() {
  await ensureDataDir();
  const raw = await fs.readFile(USERS_PATH, "utf8");
  return JSON.parse(raw || "[]");
}

export async function writeUsers(users) {
  await ensureDataDir();
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

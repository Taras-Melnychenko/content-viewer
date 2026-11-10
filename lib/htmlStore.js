import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteHtmlBlob, getHtmlBlob, putHtmlBlob } from "./blobStore.js";
import { assertWritableStorage, usesBlobStorage } from "./storageMode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "data", "uploads");

export async function saveHtml(id, buffer) {
  assertWritableStorage();
  if (usesBlobStorage()) {
    const blob = await putHtmlBlob(id, buffer);
    return { publicUrl: blob.url };
  }
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filePath = path.join(UPLOADS_DIR, `${id}.html`);
  fs.writeFileSync(filePath, buffer);
  return { filePath };
}

export async function loadHtml(id) {
  if (usesBlobStorage()) {
    return getHtmlBlob(id);
  }
  const filePath = path.join(UPLOADS_DIR, `${id}.html`);
  if (!fs.existsSync(filePath)) return null;
  return { body: fs.readFileSync(filePath), filePath };
}

export async function deleteHtml(id) {
  if (usesBlobStorage()) {
    await deleteHtmlBlob(id);
    return;
  }
  const filePath = path.join(UPLOADS_DIR, `${id}.html`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

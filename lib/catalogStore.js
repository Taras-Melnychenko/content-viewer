import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCatalogBlob, putCatalogBlob } from "./blobStore.js";
import { assertWritableStorage, usesBlobStorage } from "./storageMode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(__dirname, "..", "data", "catalog.json");

export { usesBlobStorage } from "./storageMode.js";

function readCatalogLocal() {
  if (!fs.existsSync(CATALOG_PATH)) return [];
  try {
    const items = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function writeCatalogLocal(items) {
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

export async function readCatalog() {
  if (usesBlobStorage()) return getCatalogBlob();
  return readCatalogLocal();
}

export async function writeCatalog(items) {
  assertWritableStorage();
  if (usesBlobStorage()) return putCatalogBlob(items);
  writeCatalogLocal(items);
}

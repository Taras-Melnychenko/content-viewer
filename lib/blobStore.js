import { del, list, put } from "@vercel/blob";

const CATALOG_PATH = "meta/catalog.json";

async function blobByPathname(pathname) {
  const { blobs } = await list({ prefix: pathname, limit: 10 });
  return blobs.find((b) => b.pathname === pathname) ?? null;
}

export async function getCatalogBlob() {
  const blob = await blobByPathname(CATALOG_PATH);
  if (!blob) return [];
  const res = await fetch(blob.downloadUrl);
  if (!res.ok) return [];
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

export async function putCatalogBlob(items) {
  await put(CATALOG_PATH, JSON.stringify(items, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function putHtmlBlob(id, buffer) {
  return put(`uploads/${id}.html`, buffer, {
    access: "public",
    contentType: "text/html; charset=utf-8",
    addRandomSuffix: false,
  });
}

export async function deleteHtmlBlob(id) {
  await del(`uploads/${id}.html`);
}

export async function getHtmlBlob(id) {
  const pathname = `uploads/${id}.html`;
  const blob = await blobByPathname(pathname);
  if (!blob) return null;
  const res = await fetch(blob.downloadUrl);
  if (!res.ok) return null;
  return {
    body: Buffer.from(await res.arrayBuffer()),
    publicUrl: blob.url,
  };
}

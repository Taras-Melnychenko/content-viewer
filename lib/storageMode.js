/** @returns {boolean} */
export function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

/**
 * On Vercel the filesystem is read-only — uploads require Blob.
 * @throws {Error}
 */
export function assertWritableStorage() {
  if (isVercelRuntime() && !usesBlobStorage()) {
    throw new Error(
      "Blob storage is not configured. In the Vercel project: Storage → Connect Store → Blob, then redeploy.",
    );
  }
}

export function storageLabel() {
  if (usesBlobStorage()) return "vercel-blob";
  if (isVercelRuntime()) return "misconfigured-vercel";
  return "local-disk";
}

import crypto from "node:crypto";

export function isUploadAuthRequired() {
  const secret = process.env.UPLOAD_SECRET;
  return typeof secret === "string" && secret.length > 0;
}

export function checkUploadAuth(req) {
  if (!isUploadAuthRequired()) return true;

  const token = req.get("X-Upload-Token") ?? "";
  const secret = process.env.UPLOAD_SECRET ?? "";
  if (!token || !secret) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

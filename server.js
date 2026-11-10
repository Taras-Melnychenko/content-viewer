import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCatalog, writeCatalog } from "./lib/catalogStore.js";
import { deleteHtml, saveHtml, loadHtml } from "./lib/htmlStore.js";
import { checkUploadAuth, isUploadAuthRequired } from "./lib/uploadAuth.js";
import { isVercelRuntime, storageLabel, usesBlobStorage } from "./lib/storageMode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const PUBLIC_DIR = path.join(__dirname, "public");

const app = express();

function publicItem(item) {
  const { storedName, ...rest } = item;
  return rest;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".html" || ext === ".htm") {
      cb(null, true);
      return;
    }
    cb(new Error("Only .html or .htm files are allowed"));
  },
});

app.use(express.json({ limit: "32kb" }));
app.use(express.static(PUBLIC_DIR));

app.get("/api/health", (_req, res) => {
  const blobOk = usesBlobStorage();
  const misconfigured = isVercelRuntime() && !blobOk;
  res.status(misconfigured ? 503 : 200).json({
    ok: !misconfigured,
    storage: storageLabel(),
    blobConfigured: blobOk,
    uploadAuthRequired: isUploadAuthRequired(),
    ...(misconfigured
      ? {
          hint: "Connect Vercel Blob to this project (Storage → Blob), then redeploy.",
        }
      : {}),
  });
});

app.get("/api/items", async (_req, res) => {
  try {
    const items = (await readCatalog())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicItem);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Catalog error" });
  }
});

app.get("/api/items/:id", async (req, res) => {
  const item = (await readCatalog()).find((i) => i.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }
  res.json({ item: publicItem(item) });
});

app.post("/api/items", (req, res) => {
  if (!checkUploadAuth(req)) {
    res.status(401).json({ error: "Upload token required or invalid" });
    return;
  }

  upload.single("file")(req, res, async (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "File too large (max 15 MB)"
          : err.message || "Upload failed";
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Choose an HTML file" });
      return;
    }

    let id;
    try {
      id = crypto.randomUUID();
      await saveHtml(id, req.file.buffer);

      const title = (req.body.title || "").trim() || req.file.originalname;
      const description = (req.body.description || "").trim();
      const item = {
        id,
        title,
        description,
        originalName: req.file.originalname,
        storedName: `${id}.html`,
        sizeBytes: req.file.size,
        createdAt: new Date().toISOString(),
      };

      const catalog = await readCatalog();
      catalog.push(item);
      try {
        await writeCatalog(catalog);
      } catch (catalogErr) {
        await deleteHtml(id).catch(() => {});
        throw catalogErr;
      }

      res.status(201).json({ item: publicItem(item) });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Failed to save" });
    }
  });
});

app.get("/raw/:id", async (req, res) => {
  const item = (await readCatalog()).find((i) => i.id === req.params.id);
  if (!item) {
    res.status(404).send("Not found");
    return;
  }

  try {
    const loaded = await loadHtml(req.params.id);
    if (!loaded) {
      res.status(404).send("File missing");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(loaded.body);
  } catch {
    res.status(500).send("Error loading file");
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Content Viewer: http://localhost:${PORT}`);
  });
}

export default app;

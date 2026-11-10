const gallery = document.getElementById("gallery");
const galleryHint = document.getElementById("gallery-hint");
const galleryPanel = document.getElementById("gallery-panel");
const viewerPanel = document.getElementById("viewer-panel");
const viewerFrame = document.getElementById("viewer-frame");
const viewerTitle = document.getElementById("viewer-title");
const viewerDescription = document.getElementById("viewer-description");
const openRaw = document.getElementById("open-raw");
const uploadDialog = document.getElementById("upload-dialog");
const uploadForm = document.getElementById("upload-form");
const uploadError = document.getElementById("upload-error");
const uploadTokenRow = document.getElementById("upload-token-row");
const uploadTokenInput = document.getElementById("upload-token");

const UPLOAD_TOKEN_KEY = "content-viewer-upload-token";
let uploadAuthRequired = false;

function getUploadHeaders() {
  const headers = {};
  const token = uploadTokenInput?.value?.trim() || sessionStorage.getItem(UPLOAD_TOKEN_KEY);
  if (token) headers["X-Upload-Token"] = token;
  return headers;
}

function configureUploadAuth(required) {
  uploadAuthRequired = required;
  if (!uploadTokenRow) return;
  uploadTokenRow.hidden = !required;
  if (required) {
    const saved = sessionStorage.getItem(UPLOAD_TOKEN_KEY);
    if (saved && uploadTokenInput) uploadTokenInput.value = saved;
  }
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setOpenRawEnabled(enabled, rawUrl) {
  openRaw.disabled = !enabled;
  if (enabled && rawUrl) {
    openRaw.dataset.rawUrl = rawUrl;
  } else {
    delete openRaw.dataset.rawUrl;
  }
}

function setView(mode, id) {
  const viewing = mode === "view" && id;
  galleryPanel.hidden = viewing;
  viewerPanel.hidden = !viewing;

  const url = new URL(window.location.href);
  if (viewing) {
    url.searchParams.set("view", id);
  } else {
    url.searchParams.delete("view");
    setOpenRawEnabled(false);
  }
  history.replaceState({ view: id ?? null }, "", url);
}

async function loadItems() {
  const res = await fetch("/api/items");
  if (!res.ok) throw new Error("Failed to load catalog");
  const data = await res.json();
  return data.items;
}

function renderGallery(items) {
  gallery.innerHTML = "";
  if (!items.length) {
    gallery.hidden = true;
    galleryHint.hidden = false;
    return;
  }

  galleryHint.hidden = true;
  gallery.hidden = false;

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `
      <button type="button" class="card-open" data-id="${item.id}">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description || "No description")}</p>
        <div class="card-meta">${formatDate(item.createdAt)} · ${formatSize(item.sizeBytes)}</div>
      </button>
    `;
    gallery.appendChild(li);
  }
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function openItem(id) {
  const res = await fetch(`/api/items/${id}`);
  if (!res.ok) {
    alert("Content not found");
    setView("gallery");
    return;
  }
  const { item } = await res.json();
  viewerTitle.textContent = item.title;
  viewerDescription.textContent = item.description || "";
  const rawUrl = `/raw/${item.id}`;
  viewerFrame.src = rawUrl;
  setOpenRawEnabled(true, rawUrl);
  setView("view", id);
}

function wireUi() {
  document.getElementById("open-upload").addEventListener("click", () => {
    uploadError.hidden = true;
    uploadDialog.showModal();
  });

  document.getElementById("close-upload").addEventListener("click", () => uploadDialog.close());
  document.getElementById("cancel-upload").addEventListener("click", () => uploadDialog.close());

  document.getElementById("back-to-gallery").addEventListener("click", () => {
    viewerFrame.src = "about:blank";
    setView("gallery");
  });

  openRaw.addEventListener("click", () => {
    const rawUrl = openRaw.dataset.rawUrl;
    if (!openRaw.disabled && rawUrl) {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
    }
  });

  gallery.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id]");
    if (!btn) return;
    openItem(btn.dataset.id);
  });

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    uploadError.hidden = true;

    if (uploadAuthRequired) {
      const token = uploadTokenInput?.value?.trim();
      if (!token) {
        uploadError.textContent = "Upload token is required.";
        uploadError.hidden = false;
        return;
      }
      sessionStorage.setItem(UPLOAD_TOKEN_KEY, token);
    }

    const formData = new FormData(uploadForm);
    const submit = document.getElementById("submit-upload");
    submit.disabled = true;

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        body: formData,
        headers: getUploadHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        uploadError.textContent = data.error || "Upload failed";
        uploadError.hidden = false;
        return;
      }
      uploadDialog.close();
      uploadForm.reset();
      const items = await loadItems();
      renderGallery(items);
      await openItem(data.item.id);
    } catch {
      uploadError.textContent = "Network error. Please try again.";
      uploadError.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });
}

async function init() {
  setOpenRawEnabled(false);
  wireUi();
  try {
    const healthRes = await fetch("/api/health");
    if (healthRes.ok) {
      const health = await healthRes.json();
      configureUploadAuth(Boolean(health.uploadAuthRequired));
    }
  } catch {
    /* health optional */
  }
  try {
    const items = await loadItems();
    renderGallery(items);
  } catch {
    galleryHint.textContent = "Failed to load the catalog. Check that the server is running.";
  }

  const params = new URLSearchParams(window.location.search);
  const viewId = params.get("view");
  if (viewId) {
    await openItem(viewId);
  }
}

init();

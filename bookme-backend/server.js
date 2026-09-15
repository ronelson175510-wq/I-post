const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { db, isDbEnabled } = require("./db");

const app = express();
const uploadsDir = path.join(__dirname, "uploads");
const projectRoot = path.join(__dirname, "..");
const postsFilePath = path.join(__dirname, "posts.json");
const PORT = process.env.PORT || 10000;
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:10000").replace(/\/$/, "");
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || "http://localhost:10000").replace(/\/$/, "");

function normalizeMediaUrlForPublic(mediaUrl) {
  if (!mediaUrl) return mediaUrl;

  const normalizedBase = publicBaseUrl.replace(/\/$/, "");
  const localPatterns = [
    /^https?:\/\/localhost(?::\d+)?/i,
    /^https?:\/\/127\.0\.0\.1(?::\d+)?/i,
    /^https?:\/\/0\.0\.0\.0(?::\d+)?/i
  ];

  let normalized = mediaUrl;
  for (const pattern of localPatterns) {
    normalized = normalized.replace(pattern, normalizedBase);
  }

  return normalized;
}

function loadPostsFromFile() {
  try {
    if (!fs.existsSync(postsFilePath)) {
      fs.writeFileSync(postsFilePath, "[]", "utf8");
      return [];
    }

    const raw = fs.readFileSync(postsFilePath, "utf8").trim();
    if (!raw) {
      fs.writeFileSync(postsFilePath, "[]", "utf8");
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((post) => ({
      ...post,
      media_url: normalizeMediaUrlForPublic(post?.media_url),
      media_urls: Array.isArray(post?.media_urls)
        ? post.media_urls.map(normalizeMediaUrlForPublic)
        : post?.media_urls
    }));
  } catch (error) {
    console.warn("Failed to load posts file, resetting it:", error.message);
    try {
      fs.writeFileSync(postsFilePath, "[]", "utf8");
    } catch (writeError) {
      console.warn("Unable to reset posts file:", writeError.message);
    }
    return [];
  }
}

function savePostsToFile() {
  try {
    const normalizedPosts = inMemoryPosts.map((post) => ({
      ...post,
      media_url: normalizeMediaUrlForPublic(post?.media_url),
      media_urls: Array.isArray(post?.media_urls)
        ? post.media_urls.map(normalizeMediaUrlForPublic)
        : post?.media_urls
    }));

    fs.writeFileSync(postsFilePath, JSON.stringify(normalizedPosts, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save posts file:", error.message);
  }
}

const inMemoryPosts = loadPostsFromFile();

function getLocalUploadPathFromMediaUrl(mediaUrl) {
  if (!mediaUrl) return null;

  if (mediaUrl.startsWith("/uploads/")) {
    return path.join(uploadsDir, path.basename(mediaUrl));
  }

  try {
    const parsed = new URL(mediaUrl);
    if (parsed.origin === publicBaseUrl && parsed.pathname.startsWith("/uploads/")) {
      return path.join(uploadsDir, path.basename(parsed.pathname));
    }
  } catch (error) {
    return null;
  }

  return null;
}

function removeInMemoryPostById(postId, requestingUserId = null) {
  const index = inMemoryPosts.findIndex(post => Number(post.id) === Number(postId));
  if (index < 0) {
    return null;
  }

  const existing = inMemoryPosts[index];
  if (requestingUserId && existing?.user_id && String(existing.user_id) !== String(requestingUserId)) {
    return { forbidden: true };
  }

  const removed = inMemoryPosts.splice(index, 1)[0];
  if (removed?.media_url) {
    const localUploadPath = getLocalUploadPathFromMediaUrl(removed.media_url);
    if (localUploadPath && fs.existsSync(localUploadPath)) {
      fs.unlinkSync(localUploadPath);
    }
  }
  return removed;
}

function pruneMissingMediaPosts() {
  for (let index = inMemoryPosts.length - 1; index >= 0; index--) {
    const post = inMemoryPosts[index];

    if (post?.media_url) {
      post.media_url = normalizeMediaUrlForPublic(post.media_url);
    }

    if (Array.isArray(post?.media_urls)) {
      post.media_urls = post.media_urls.map(normalizeMediaUrlForPublic);
    }

    const localUploadPath = getLocalUploadPathFromMediaUrl(post?.media_url);

    if (post?.media_url && localUploadPath && !fs.existsSync(localUploadPath)) {
      inMemoryPosts.splice(index, 1);
    }
  }

  savePostsToFile();
}

fs.mkdirSync(uploadsDir, { recursive: true });
pruneMissingMediaPosts();

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      "null",
      frontendUrl,
      process.env.FRONTEND_URL,
      process.env.PUBLIC_BASE_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.options(/.*/, cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  const isStaticAsset = /\.(html|js|css|json)$/i.test(req.path);
  if (isStaticAsset) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use("/uploads", express.static(uploadsDir));
app.use(express.static(projectRoot));

app.get("/", (req, res) => {
  res.sendFile(path.join(projectRoot, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(projectRoot, "login.html"));
});

app.get("/message", (req, res) => {
  res.sendFile(path.join(projectRoot, "message.html"));
});

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Backend healthy", publicBaseUrl });
});

app.post("/api/translate", async (req, res) => {
  const { text, source = "auto", target = "en" } = req.body || {};

  if (!text || !target) {
    return res.status(400).json({ error: "Missing translation text or target language" });
  }

  const candidateUrls = [
    process.env.LIBRETRANSLATE_URL,
    "http://localhost:5000/translate",
    "http://127.0.0.1:5000/translate",
    "https://libretranslate.com/translate",
    "https://translate.terraprint.co/translate",
    "https://translate.argosopentech.com/translate"
  ].filter(Boolean);

  const uniqueUrls = [...new Set(candidateUrls)];

  let lastError = null;

  for (const libreTranslateUrl of uniqueUrls) {
    try {
      const response = await fetch(libreTranslateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: text,
          source,
          target,
          format: "text"
        })
      });

      const data = await response.json();
      const translatedText = data?.translatedText || data?.translation || data?.[0]?.translatedText || data?.[0]?.translation;

      if (response.ok && translatedText) {
        return res.json({ translatedText });
      }

      lastError = new Error(data?.error || "Translation request failed");
    } catch (error) {
      lastError = error;
      console.warn(`Translation attempt failed for ${libreTranslateUrl}:`, error.message);
    }
  }

  console.error("TRANSLATE ERROR:", lastError?.message || "Translation service unavailable");
  return res.status(503).json({
    error: "Translation service unavailable. Set LIBRETRANSLATE_URL to a working LibreTranslate instance."
  });
});

app.post("/api/profile-picture", upload.single("profilePic"), (req, res) => {
  const userId = req.body.user_id || "anonymous";
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No profile picture uploaded" });
  }

  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    return res.status(400).json({ error: "Profile picture must be an image" });
  }

  const imageUrl = `${publicBaseUrl}/uploads/${file.filename}`;

  return res.json({
    success: true,
    user_id: userId,
    url: imageUrl,
    file: file.filename
  });
});

app.post("/api/posts", upload.array("file", 20), (req, res) => {
  const user_id = req.body.user_id || "anonymous";
  const commonContent = (req.body.content || "").trim();
  const files = Array.isArray(req.files) ? req.files : [];

  if (!files.length) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const mediaUrls = files.map((file) => normalizeMediaUrlForPublic(`${publicBaseUrl}/uploads/${file.filename}`));
  const firstOriginalName = files[0]?.originalname || "uploaded file";
  const cleanOriginalName = path.parse(firstOriginalName).name || firstOriginalName;
  const media_type = files.some((file) => file.mimetype?.startsWith("video/")) ? "video" : "image";
  const content = commonContent;

  if (!isDbEnabled()) {
    const savedPost = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_id,
      content,
      media_type,
      media_url: mediaUrls[0] || null,
      media_urls: mediaUrls,
      saved_filename: files[0]?.filename || null,
      original_name: firstOriginalName,
      created_at: new Date().toISOString(),
      dbDisabled: true,
      is_gallery: mediaUrls.length > 1
    };

    inMemoryPosts.unshift(savedPost);
    savePostsToFile();

    return res.json({
      success: true,
      dbDisabled: true,
      post: savedPost,
      posts: [savedPost]
    });
  }

  const query = `
    INSERT INTO posts (user_id, content, media_type, media_url)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [user_id, content, media_type, mediaUrls[0]], (err, results) => {
    if (err) {
      console.error("DB INSERT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    const savedPost = {
      id: results.insertId,
      user_id,
      content,
      media_type,
      media_url: mediaUrls[0],
      media_urls: mediaUrls,
      saved_filename: files[0]?.filename || null,
      original_name: firstOriginalName,
      success: true,
      is_gallery: mediaUrls.length > 1
    };

    res.json({
      success: true,
      post: savedPost,
      posts: [savedPost]
    });
  });
});

app.get("/api/posts", (req, res) => {
  if (!isDbEnabled()) {
    pruneMissingMediaPosts();
    return res.json(inMemoryPosts.slice(0, 20));
  }

  db.query("SELECT * FROM posts ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("DB SELECT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    const fixedResults = results
      .map(post => ({
        ...post,
        media_url: post.media_url && !post.media_url.startsWith("http")
          ? `${publicBaseUrl}${post.media_url}`
          : post.media_url
      }))
      .filter(post => {
        if (!post.media_url) return true;
        const localUploadPath = getLocalUploadPathFromMediaUrl(post.media_url);
        return !localUploadPath || fs.existsSync(localUploadPath);
      });

    res.json(fixedResults);
  });
});

app.delete("/api/posts/:id", (req, res) => {
  const postId = Number(req.params.id);
  const requestingUserId = req.body?.user_id || req.query?.user_id || null;

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!isDbEnabled()) {
    const deleted = removeInMemoryPostById(postId, requestingUserId);
    if (!deleted) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (deleted.forbidden) {
      return res.status(403).json({ error: "You can only delete your own posts." });
    }

    savePostsToFile();
    return res.json({ success: true, deletedId: postId });
  }

  db.query("SELECT user_id, media_url FROM posts WHERE id = ?", [postId], (selectErr, rows) => {
    if (selectErr) {
      console.error("DELETE SELECT ERROR:", selectErr);
      return res.status(500).json({ error: selectErr.message });
    }

    const existingPost = rows?.[0];
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (requestingUserId && String(existingPost.user_id) !== String(requestingUserId)) {
      return res.status(403).json({ error: "You can only delete your own posts." });
    }

    const mediaUrl = existingPost.media_url;
    const localUploadPath = getLocalUploadPathFromMediaUrl(mediaUrl);

    if (localUploadPath && fs.existsSync(localUploadPath)) {
      fs.unlinkSync(localUploadPath);
    }

    db.query("DELETE FROM posts WHERE id = ?", [postId], (deleteErr) => {
      if (deleteErr) {
        console.error("DELETE ERROR:", deleteErr);
        return res.status(500).json({ error: deleteErr.message });
      }

      res.json({ success: true, deletedId: postId });
    });
  });
});

app.post("/api/text-post", (req, res) => {
  const { user_id, content } = req.body || {};
  const safeUserId = user_id || "anonymous";
  const safeContent = String(content || "").trim();

  if (!safeContent) {
    return res.status(400).json({ error: "Missing content" });
  }

  if (!isDbEnabled()) {
    const savedPost = {
      id: Date.now(),
      user_id: safeUserId,
      content: safeContent,
      media_type: "text",
      media_url: null,
      original_name: null,
      created_at: new Date().toISOString(),
      dbDisabled: true
    };

    inMemoryPosts.unshift(savedPost);
    savePostsToFile();

    return res.json({
      ...savedPost,
      success: true,
      dbDisabled: true
    });
  }

  const query = `
    INSERT INTO posts (user_id, content, media_type)
    VALUES (?, ?, 'text')
  `;

  db.query(query, [safeUserId, safeContent], (err, results) => {
    if (err) {
      console.error("TEXT POST ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json({
      id: results.insertId,
      success: true
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
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
const commentsFilePath = path.join(__dirname, "comments.json");
const PORT = process.env.PORT || 10000;
const frontendUrl = getPublicBaseUrl();

function getPublicBaseUrl(req = null) {
  const configuredBase = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || process.env.APP_URL;
  if (configuredBase) {
    return configuredBase.replace(/\/$/, "");
  }

  if (req) {
    const forwardedProto = (req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0].trim();
    const forwardedHost = req.headers["x-forwarded-host"] || req.headers.host;
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
    }
  }

  return "http://localhost:10000";
}

function normalizeMediaUrlForPublic(mediaUrl, req = null) {
  if (!mediaUrl) return mediaUrl;

  const normalizedBase = getPublicBaseUrl(req).replace(/\/$/, "");
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

function loadCommentsFromFile() {
  try {
    if (!fs.existsSync(commentsFilePath)) {
      fs.writeFileSync(commentsFilePath, "[]", "utf8");
      return [];
    }

    const raw = fs.readFileSync(commentsFilePath, "utf8").trim();
    if (!raw) {
      fs.writeFileSync(commentsFilePath, "[]", "utf8");
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to load comments file, resetting it:", error.message);
    try {
      fs.writeFileSync(commentsFilePath, "[]", "utf8");
    } catch (writeError) {
      console.warn("Unable to reset comments file:", writeError.message);
    }
    return [];
  }
}

function saveCommentsToFile() {
  try {
    fs.writeFileSync(commentsFilePath, JSON.stringify(inMemoryComments, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save comments file:", error.message);
  }
}

const inMemoryPosts = loadPostsFromFile();
const inMemoryComments = loadCommentsFromFile();

function normalizeStoredMediaUrls(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (error) {
      // Ignore invalid JSON and fall back to a simple split below.
    }

    return trimmed
      .split(/\s*[,;]\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeCommentRows(comments) {
  return (Array.isArray(comments) ? comments : []).map((comment) => ({
    ...comment,
    user_id: comment?.user_id != null ? String(comment.user_id) : comment?.user_id,
    post_id: Number(comment?.post_id)
  }));
}

function ensureUserRecord(userId, fields = {}, callback) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    return callback ? callback(null) : Promise.resolve();
  }

  const name = fields?.name ? String(fields.name).trim() : null;
  const email = fields?.email ? String(fields.email).trim() : null;
  const profilePic = fields?.profile_pic ? String(fields.profile_pic).trim() : null;

  if (!db) {
    return callback ? callback(null) : Promise.resolve();
  }

  const query = `
    INSERT INTO users (id, name, email, profile_pic)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email = VALUES(email),
      profile_pic = IFNULL(VALUES(profile_pic), profile_pic)
  `;

  db.query(query, [safeUserId, name, email, profilePic], (err) => {
    if (callback) {
      callback(err);
      return;
    }

    if (err) {
      return Promise.reject(err);
    }
    return Promise.resolve();
  });
}

function initializeDatabaseSchema() {
  if (!db) return;

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS reported_contents (
      id INT PRIMARY KEY AUTO_INCREMENT,
      post_id INT NOT NULL,
      reporter_user_id VARCHAR(255) NOT NULL,
      reason VARCHAR(100) DEFAULT 'spam',
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_report (post_id, reporter_user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS report_count INT DEFAULT 0;

    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS is_flagged TINYINT(1) DEFAULT 0;

    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS report_status ENUM('active', 'taken_down') DEFAULT 'active';
  `;

  db.query(schemaSql, (err) => {
    if (err) {
      console.error("SCHEMA INIT ERROR:", err.message);
    } else {
      console.log("Database schema initialized.");
    }
  });
}

function upsertUserProfile({ userId, firstName, lastName, dob, email, profilePic }, callback) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    return callback ? callback(null) : Promise.resolve();
  }

  if (!db) {
    return callback ? callback(null) : Promise.resolve();
  }

  const safeFirstName = firstName && String(firstName).trim() ? String(firstName).trim() : null;
  const safeLastName = lastName && String(lastName).trim() ? String(lastName).trim() : null;
  const safeDob = dob && String(dob).trim() ? String(dob).trim() : null;
  const safeEmail = email && String(email).trim() ? String(email).trim() : null;
  const safeProfilePic = profilePic && String(profilePic).trim() ? String(profilePic).trim() : null;
  const fullName = [safeFirstName, safeLastName].filter(Boolean).join(" ") || null;

  const columns = ["id", "name", "email", "profile_pic", "first_name", "last_name", "dob"];
  const values = [safeUserId, fullName, safeEmail, safeProfilePic, safeFirstName, safeLastName, safeDob];

  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => column !== "id")
    .map((column) => `${column} = VALUES(${column})`)
    .join(", ");

  const query = `
    INSERT INTO users (${columns.join(", ")})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
  `;

  db.query(query, values, (err) => {
    if (callback) {
      callback(err);
      return;
    }

    if (err) {
      return Promise.reject(err);
    }
    return Promise.resolve();
  });
}

function getLocalUploadPathFromMediaUrl(mediaUrl) {
  if (!mediaUrl) return null;

  if (mediaUrl.startsWith("/uploads/")) {
    return path.join(uploadsDir, path.basename(mediaUrl));
  }

  try {
    const parsed = new URL(mediaUrl);
    const expectedOrigin = getPublicBaseUrl();
    if (parsed.origin === expectedOrigin && parsed.pathname.startsWith("/uploads/")) {
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
  const publicBaseUrl = getPublicBaseUrl(req);
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
  const publicBaseUrl = getPublicBaseUrl(req);

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

app.get("/api/profile/:userId", (req, res) => {
  const userId = String(req.params.userId || "").trim();
  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({
      user_id: userId,
      firstName: "",
      lastName: "",
      dob: "",
      email: ""
    });
  }

  db.query(
    "SELECT id, name, email, first_name, last_name, dob, profile_pic FROM users WHERE id = ? LIMIT 1",
    [userId],
    (err, rows) => {
      if (err) {
        console.error("PROFILE LOAD ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      const row = rows?.[0] || null;
      if (!row) {
        return res.json({
          user_id: userId,
          firstName: "",
          lastName: "",
          dob: "",
          email: "",
          profile_pic: null
        });
      }

      return res.json({
        user_id: row.id,
        firstName: row.first_name || "",
        lastName: row.last_name || "",
        dob: row.dob || "",
        email: row.email || "",
        profile_pic: row.profile_pic || null
      });
    }
  );
});

app.post("/api/profile", (req, res) => {
  const userId = req.body?.user_id || req.body?.userId || "";
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const dob = String(req.body?.dob || "").trim();
  const email = String(req.body?.email || "").trim();
  const profilePic = String(req.body?.profile_pic || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    const profile = {
      user_id: userId,
      firstName,
      lastName,
      dob,
      email,
      profile_pic: profilePic || null
    };

    return res.json({ success: true, profile });
  }

  upsertUserProfile({ userId, firstName, lastName, dob, email, profilePic }, (err) => {
    if (err) {
      console.error("PROFILE SAVE ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    return res.json({
      success: true,
      profile: {
        user_id: userId,
        firstName,
        lastName,
        dob,
        email,
        profile_pic: profilePic || null
      }
    });
  });
});

app.post("/api/posts", upload.array("file", 20), (req, res) => {
  const user_id = req.body.user_id || "anonymous";
  const commonContent = (req.body.content || "").trim();
  const files = Array.isArray(req.files) ? req.files : [];
  const publicBaseUrl = getPublicBaseUrl(req);

  if (!files.length) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const mediaUrls = files.map((file) => normalizeMediaUrlForPublic(`${publicBaseUrl}/uploads/${file.filename}`, req));
  const firstOriginalName = files[0]?.originalname || "uploaded file";
  const cleanOriginalName = path.parse(firstOriginalName).name || firstOriginalName;
  const media_type = files.some((file) => file.mimetype?.startsWith("video/")) ? "video" : "photo";
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
    INSERT INTO posts (user_id, content, media_type, media_url, media_urls)
    VALUES (?, ?, ?, ?, ?)
  `;

  ensureUserRecord(user_id, {
    name: req.body?.name,
    email: req.body?.email,
    profile_pic: req.body?.profile_pic
  }, (userErr) => {
    if (userErr) {
      console.error("USER ENSURE ERROR:", userErr);
      return res.status(500).json({ error: userErr.message });
    }

    db.query(query, [String(user_id), content, media_type, mediaUrls[0] || null, JSON.stringify(mediaUrls)], (err, results) => {
      if (err) {
        console.error("DB INSERT ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      const savedPost = {
        id: results.insertId,
        user_id,
        content,
        media_type,
        media_url: mediaUrls[0] || null,
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
});

app.get("/api/posts", (req, res) => {
  const publicBaseUrl = getPublicBaseUrl(req);

  if (!isDbEnabled()) {
    pruneMissingMediaPosts();
    return res.json(inMemoryPosts
      .filter((post) => !(post.is_flagged || Number(post.report_count || 0) >= 10))
      .slice(0, 20));
  }

  db.query("SELECT * FROM posts ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("DB SELECT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    const fixedResults = results
      .map(post => {
        const storedMediaUrls = normalizeStoredMediaUrls(post.media_urls || post.media_url);
        const resolvedMediaUrls = storedMediaUrls.length
          ? storedMediaUrls.map((url) => normalizeMediaUrlForPublic(url, req))
          : (post.media_url ? [normalizeMediaUrlForPublic(post.media_url, req)] : []);

        return {
          ...post,
          media_urls: resolvedMediaUrls,
          media_url: resolvedMediaUrls[0] || null,
          is_flagged: Boolean(post.is_flagged),
          report_count: Number(post.report_count || 0)
        };
      })
      .filter(post => {
        if (post.is_flagged || Number(post.report_count || 0) >= 10) {
          return false;
        }
        if (!post.media_url) return true;
        const localUploadPath = getLocalUploadPathFromMediaUrl(post.media_url);
        return !localUploadPath || fs.existsSync(localUploadPath);
      });

    res.json(fixedResults);
  });
});

app.post("/api/posts/:id/report", (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.body?.user_id ? String(req.body.user_id).trim() : "";
  const reason = String(req.body?.reason || "spam").trim() || "spam";
  const details = String(req.body?.details || "").trim();

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.status(503).json({ error: "Database is not enabled for reports." });
  }

  db.query("SELECT id, report_count, is_flagged FROM posts WHERE id = ?", [postId], (selectErr, rows) => {
    if (selectErr) {
      console.error("REPORT SELECT ERROR:", selectErr);
      return res.status(500).json({ error: selectErr.message });
    }

    const existingPost = rows?.[0];
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    db.query(
      "INSERT INTO reported_contents (post_id, reporter_user_id, reason, details) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE reason = VALUES(reason), details = VALUES(details), created_at = CURRENT_TIMESTAMP",
      [postId, userId, reason, details],
      (insertErr) => {
        if (insertErr) {
          console.error("REPORT INSERT ERROR:", insertErr);
          return res.status(500).json({ error: insertErr.message });
        }

        db.query("SELECT COUNT(*) AS total_reports FROM reported_contents WHERE post_id = ?", [postId], (countErr, countRows) => {
          if (countErr) {
            console.error("REPORT COUNT ERROR:", countErr);
            return res.status(500).json({ error: countErr.message });
          }

          const reportCount = Number(countRows?.[0]?.total_reports || 0);
          const shouldFlag = reportCount >= 10;

          db.query(
            "UPDATE posts SET report_count = ?, is_flagged = ?, report_status = ? WHERE id = ?",
            [reportCount, shouldFlag ? 1 : 0, shouldFlag ? "taken_down" : "active", postId],
            (updateErr) => {
              if (updateErr) {
                console.error("REPORT UPDATE ERROR:", updateErr);
                return res.status(500).json({ error: updateErr.message });
              }

              return res.json({
                success: true,
                reportCount,
                flagged: shouldFlag,
                status: shouldFlag ? "taken_down" : "active"
              });
            }
          );
        });
      }
    );
  });
});

app.get("/api/comments/:postId", (req, res) => {
  const postId = Number(req.params.postId);

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!isDbEnabled()) {
    const comments = normalizeCommentRows(inMemoryComments)
      .filter((comment) => Number(comment.post_id) === postId)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    return res.json(comments);
  }

  db.query(
    "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC",
    [postId],
    (err, results) => {
      if (err) {
        console.error("DB COMMENT SELECT ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      return res.json(normalizeCommentRows(results));
    }
  );
});

app.post("/api/comments", (req, res) => {
  const { post_id, user_id, content } = req.body || {};
  const safePostId = Number(post_id);
  const safeUserId = user_id ? String(user_id) : "anonymous";
  const safeContent = String(content || "").trim();

  if (!Number.isFinite(safePostId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!safeContent) {
    return res.status(400).json({ error: "Missing comment text" });
  }

  if (!isDbEnabled()) {
    const comment = {
      id: Date.now(),
      user_id: safeUserId,
      post_id: safePostId,
      comment: safeContent,
      created_at: new Date().toISOString()
    };

    inMemoryComments.unshift(comment);
    saveCommentsToFile();

    return res.json({ success: true, comment });
  }

  ensureUserRecord(safeUserId, {
    name: req.body?.name,
    email: req.body?.email,
    profile_pic: req.body?.profile_pic
  }, (userErr) => {
    if (userErr) {
      console.error("COMMENT USER ENSURE ERROR:", userErr);
      return res.status(500).json({ error: userErr.message });
    }

    db.query(
      "INSERT INTO comments (user_id, post_id, comment) VALUES (?, ?, ?)",
      [safeUserId, safePostId, safeContent],
      (err, results) => {
        if (err) {
          console.error("DB COMMENT INSERT ERROR:", err);
          return res.status(500).json({ error: err.message });
        }

        return res.json({
          success: true,
          comment: {
            id: results.insertId,
            user_id: safeUserId,
            post_id: safePostId,
            comment: safeContent,
            created_at: new Date().toISOString()
          }
        });
      }
    );
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
  const safeContent = String(content || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

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

  ensureUserRecord(safeUserId, {
    name: req.body?.name,
    email: req.body?.email,
    profile_pic: req.body?.profile_pic
  }, (userErr) => {
    if (userErr) {
      console.error("TEXT USER ENSURE ERROR:", userErr);
      return res.status(500).json({ error: userErr.message });
    }

    db.query(query, [String(safeUserId), safeContent], (err, results) => {
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
});

initializeDatabaseSchema();

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
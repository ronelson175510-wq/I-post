const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { db, isDbEnabled } = require("./db");

const app = express();
const uploadsDir = path.join(__dirname, "uploads");
const projectRoot = path.join(__dirname, "..");
const PORT = process.env.PORT || 10000;
const frontendUrl = process.env.FRONTEND_URL || "https://i-post.onrender.com";
const publicBaseUrl = process.env.PUBLIC_BASE_URL || "https://i-post.onrender.com";

fs.mkdirSync(uploadsDir, { recursive: true });

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

app.post("/api/summarize", async (req, res) => {
  const { text } = req.body || {};

  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: "Missing text to summarize" });
  }

  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2";
  const prompt = `Summarize this in exactly one clear sentence, under 22 words, natural English, no repeated words or phrases, and no bullet points.\n\nText:\n${String(text).slice(0, 5000)}`;

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.8
        }
      })
    });

    const data = await response.json();
    const summary = String(data?.response || "").replace(/\s+/g, " ").trim();

    if (summary) {
      return res.json({ summary });
    }

    throw new Error("Empty summary from Ollama");
  } catch (error) {
    console.warn("OLLAMA SUMMARY ERROR:", error.message);

    const fallback = String(text)
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return res.json({
      summary: fallback.length > 0 ? fallback : "No content available to summarize."
    });
  }
});

app.post("/api/posts", upload.single("file"), (req, res) => {
  if (!isDbEnabled()) {
    return res.status(503).json({
      error: "Database is not enabled yet. Set DB credentials and DB_ENABLED=true to use posts.",
      dbDisabled: true
    });
  }

  const user_id = req.body.user_id || "anonymous";
  const content = req.body.content || "";
  const media_type = req.body.media_type || "image";

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const media_url = `${publicBaseUrl}/uploads/${req.file.filename}`;

  const query = `
    INSERT INTO posts (user_id, content, media_type, media_url)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [user_id, content, media_type, media_url], (err, results) => {
    if (err) {
      console.error("DB INSERT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json({
      id: results.insertId,
      saved_filename: req.file.filename,
      media_url,
      success: true
    });
  });
});

app.get("/api/posts", (req, res) => {
  if (!isDbEnabled()) {
    return res.status(503).json({
      error: "Database is not enabled yet. Set DB credentials and DB_ENABLED=true to use posts.",
      dbDisabled: true,
      posts: []
    });
  }

  db.query("SELECT * FROM posts ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("DB SELECT ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    const fixedResults = results.map(post => ({
      ...post,
      media_url: post.media_url && !post.media_url.startsWith("http")
        ? `${publicBaseUrl}${post.media_url}`
        : post.media_url
    }));

    res.json(fixedResults);
  });
});

app.post("/api/text-post", (req, res) => {
  if (!isDbEnabled()) {
    return res.status(503).json({
      error: "Database is not enabled yet. Set DB credentials and DB_ENABLED=true to use posts.",
      dbDisabled: true
    });
  }

  const { user_id, content } = req.body;

  if (!user_id || !content) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const query = `
    INSERT INTO posts (user_id, content, media_type)
    VALUES (?, ?, 'text')
  `;

  db.query(query, [user_id, content], (err, results) => {
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
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("./db");

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

app.post("/api/posts", upload.single("file"), (req, res) => {
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
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { db, isDbEnabled } = require("./db");
const { sanitizeRecentSearchQuery, dedupeRecentSearchEntries } = require("./recentSearches");
const { normalizePostAccessSettings, canUserViewPost, canUserCommentOnPost } = require("./postAccess");

const app = express();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET
});
const projectRoot = path.join(__dirname, "..");
const tempUploadDir = path.join(__dirname, ".tmp-upload");
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

function validateDisplayNamePolicy(name, fieldLabel = "Name") {
  const trimmedName = String(name || "").trim();

  if (!trimmedName) {
    return `${fieldLabel} is required.`;
  }

  if (trimmedName.length < 2) {
    return `${fieldLabel} must be at least 2 characters long.`;
  }

  if (trimmedName.length > 30) {
    return `${fieldLabel} must be no more than 30 characters long.`;
  }

  if (/\p{Extended_Pictographic}/u.test(trimmedName)) {
    return `${fieldLabel} cannot contain emojis.`;
  }

  if (/[!@#$%^&*()[\]{};:"\\|<>/?~]/.test(trimmedName)) {
    return `${fieldLabel} cannot contain special symbols like @, #, $, %, ^, &, *, (, ), or similar characters.`;
  }

  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’-]*$/u.test(trimmedName)) {
    return `${fieldLabel} can only contain letters, numbers, spaces, apostrophes, and hyphens.`;
  }

  const normalized = trimmedName.toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized.includes("chatmini") || normalized.includes("chat-mini")) {
    return "The name 'Chat-mini' cannot be used for impersonation or misleading purposes.";
  }

  const restrictedWords = ["fuck", "shit", "bitch", "hate", "nazi", "slur", "bomb", "terror"];
  if (restrictedWords.some((word) => normalized.includes(word))) {
    return `${fieldLabel} contains restricted or offensive language.`;
  }

  return "";
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

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUD_NAME ||
    process.env.CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_KEY ||
    process.env.CLOUDINARY_API_SECRET ||
    process.env.CLOUDINARY_SECRET ||
    process.env.CLOUDINARY_URL
  );
}

async function uploadMediaFile(file, folderName = "uploads") {
  if (!file || !file.path) {
    return null;
  }

  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  const normalizedFolder = String(folderName || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\/?/i, "")
    .replace(/\/+$/, "")
    .trim();

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: normalizedFolder || "uploads",
      resource_type: "auto"
    });

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return result?.secure_url || result?.url || null;
  } catch (error) {
    const cloudinaryFailure = new Error(
      `Cloudinary upload failed for ${file.originalname || file.filename}: ${error?.message || "Unknown Cloudinary error"}`
    );
    console.error(cloudinaryFailure.message);
    throw cloudinaryFailure;
  }
}

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
      name = IFNULL(VALUES(name), name),
      email = IFNULL(VALUES(email), email),
      profile_pic = IFNULL(VALUES(profile_pic), profile_pic)
  `;

  db.query(query, [safeUserId, name, email, profilePic], (err) => {
    if (err) {
      if (callback) {
        callback(err);
      }
      return;
    }

    maybeCreateWelcomeNotification(safeUserId);

    if (callback) {
      callback(null);
      return;
    }

    return Promise.resolve();
  });
}

function extractActorNameFromMessage(message = "") {
  const raw = String(message || "").trim();
  if (!raw) {
    return "User";
  }

  const match = raw.match(/^(.+?)(?:\s+(?:liked|commented|shared|started|followed|replied))(?:\s+.*)?$/i);
  if (match && match[1] && match[1] !== "Someone" && match[1] !== "User") {
    return match[1];
  }

  return raw.startsWith("Welcome to") ? "User" : (raw.split(" ")[0] || "User");
}

function maybeCreateWelcomeNotification(userId, callback = null) {
  if (callback) {
    callback(null);
  }
  return Promise.resolve(null);
}

const recommendationStopWords = new Set([
  "about", "after", "again", "all", "also", "always", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "between", "but", "by", "can", "could", "did", "do",
  "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have",
  "having", "he", "her", "here", "hers", "him", "his", "how", "i", "if", "in", "into", "is", "it",
  "its", "itself", "just", "me", "more", "most", "my", "no", "nor", "not", "of", "off", "on", "once",
  "only", "or", "other", "our", "out", "over", "own", "same", "she", "should", "so", "some", "such",
  "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "will", "with", "you", "your", "yours"
]);

function getRecommendationTokens(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && token.length > 2 && !recommendationStopWords.has(token));
}

function normalizeTopicToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .find((token) => token && token.length > 2) || "";
}

function extractPostTopics(text = "") {
  const rawText = String(text || "");
  const hashtagMatches = [...rawText.matchAll(/#([a-zA-Z0-9_]+)/g)]
    .map((match) => normalizeTopicToken(match[1]))
    .filter(Boolean);

  return [...new Set(hashtagMatches)].slice(0, 15);
}

function savePostTopics(postId, content = "", source = "auto", callback = null) {
  const safePostId = Number(postId || 0);
  if (!db || !Number.isFinite(safePostId)) {
    if (typeof callback === "function") {
      callback && callback(null);
    }
    return;
  }

  const topics = [...new Set(extractPostTopics(content))];
  if (!topics.length) {
    if (typeof callback === "function") {
      callback && callback(null);
    }
    return;
  }

  db.query("DELETE FROM post_topics WHERE post_id = ?", [safePostId], (deleteErr) => {
    if (deleteErr) {
      console.warn("POST TOPIC CLEAR ERROR:", deleteErr.message);
      if (typeof callback === "function") {
        callback(deleteErr);
      }
      return;
    }

    let insertedCount = 0;
    topics.forEach((topic) => {
      db.query(
        "INSERT INTO post_topics (post_id, topic, source, weight) VALUES (?, ?, ?, ?)",
        [safePostId, topic, source || "auto", 1],
        (insertErr) => {
          if (insertErr) {
            console.warn("POST TOPIC INSERT ERROR:", insertErr.message);
          }

          insertedCount += 1;
          if (insertedCount >= topics.length && typeof callback === "function") {
            callback(null);
          }
        }
      );
    });
  });
}

function addUserTopicWeight(userId, content = "", weight = 1, callback = null) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId || !db) {
    if (typeof callback === "function") {
      callback && callback(null);
    }
    return;
  }

  const topics = [...new Set(extractPostTopics(content))];
  if (!topics.length) {
    if (typeof callback === "function") {
      callback && callback(null);
    }
    return;
  }

  let appliedCount = 0;
  const normalizedWeight = Number(weight) || 1;
  topics.forEach((topic) => {
    db.query(
      "INSERT INTO user_topic_weights (user_id, topic, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = weight + VALUES(weight), updated_at = CURRENT_TIMESTAMP",
      [safeUserId, topic, normalizedWeight],
      (err) => {
        if (err) {
          console.warn("USER TOPIC UPDATE ERROR:", err.message);
        }

        appliedCount += 1;
        if (appliedCount >= topics.length && typeof callback === "function") {
          callback(null);
        }
      }
    );
  });
}

function getUserTopicWeights(userId, callback = null) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId || !db) {
    if (typeof callback === "function") {
      callback(null, {});
    }
    return;
  }

  db.query(
    "SELECT topic, weight FROM user_topic_weights WHERE user_id = ?",
    [safeUserId],
    (err, rows) => {
      if (err) {
        console.warn("USER TOPIC LOAD ERROR:", err.message);
        if (typeof callback === "function") {
          callback(err, {});
        }
        return;
      }

      const topicMap = {};
      (rows || []).forEach((row) => {
        if (row?.topic) {
          topicMap[String(row.topic)] = Number(row.weight || 0);
        }
      });

      if (typeof callback === "function") {
        callback(null, topicMap);
      }
    }
  );
}

function getPostTopicMap(postIds = [], callback = null) {
  const safeIds = Array.from(new Set((postIds || []).map((postId) => Number(postId)).filter((postId) => Number.isFinite(postId))));
  if (!safeIds.length || !db) {
    if (typeof callback === "function") {
      callback(null, {});
    }
    return;
  }

  const placeholders = safeIds.map(() => "?").join(",");
  db.query(
    `SELECT post_id, topic FROM post_topics WHERE post_id IN (${placeholders})`,
    safeIds,
    (err, rows) => {
      if (err) {
        console.warn("POST TOPIC LOAD ERROR:", err.message);
        if (typeof callback === "function") {
          callback(err, {});
        }
        return;
      }

      const topicMap = {};
      (rows || []).forEach((row) => {
        const postId = String(row.post_id);
        if (!topicMap[postId]) {
          topicMap[postId] = [];
        }
        topicMap[postId].push(String(row.topic || ""));
      });

      if (typeof callback === "function") {
        callback(null, topicMap);
      }
    }
  );
}

function scoreRecommendationPost(post = {}, userHistory = []) {
  const safePost = post || {};
  const postId = Number(safePost.id || 0);
  const postCreatorId = String(safePost.user_id || "").trim();
  const postContent = String(safePost.content || "");
  const postMediaType = String(safePost.media_type || "").trim();
  const postTokens = new Set(getRecommendationTokens(postContent));

  let score = 0;
  score += Number(safePost.like_count || 0) * 0.15;
  score += Number(safePost.comment_count || 0) * 0.25;

  const createdAt = safePost.created_at ? new Date(safePost.created_at) : new Date();
  const ageHours = Math.max(1, (Date.now() - createdAt.getTime()) / 3600000);
  const recencyBoost = Math.max(0, 1 - Math.min(ageHours / 168, 1));
  score += recencyBoost * 8;

  if (!Array.isArray(userHistory) || !userHistory.length) {
    return score;
  }

  const userPreferenceTokens = new Set();
  const creatorAffinityMap = new Map();
  const seenPostIds = new Set();

  for (const entry of userHistory) {
    const historyContent = String(entry?.post_content || "");
    if (historyContent) {
      getRecommendationTokens(historyContent).forEach((token) => userPreferenceTokens.add(token));
    }

    const targetUserId = String(entry?.target_user_id || "").trim();
    const entryCreatorId = String(entry?.post_user_id || "").trim();
    const eventType = String(entry?.event_type || "").toLowerCase();
    const eventWeight = Number(entry?.weight || 1);
    const typeWeightMap = {
      like: 10,
      comment: 12,
      share: 10,
      follow_user: 15,
      comment_like: 8,
      view: 3
    };

    if (postCreatorId && targetUserId && postCreatorId === targetUserId) {
      creatorAffinityMap.set(postCreatorId, (creatorAffinityMap.get(postCreatorId) || 0) + (typeWeightMap[eventType] || 2) * eventWeight);
    }

    if (postCreatorId && entryCreatorId && postCreatorId === entryCreatorId) {
      creatorAffinityMap.set(postCreatorId, (creatorAffinityMap.get(postCreatorId) || 0) + (eventType === "follow_user" ? 12 : (typeWeightMap[eventType] || 5)) * eventWeight);
    }

    if (entry?.post_id != null) {
      seenPostIds.add(String(entry.post_id));
    }
  }

  const creatorAffinityScore = creatorAffinityMap.get(postCreatorId) || 0;
  if (creatorAffinityScore > 0) {
    score += creatorAffinityScore * 1.6;
  }

  const preferredTokenMatches = [...userPreferenceTokens].filter((token) => postTokens.has(token));
  if (preferredTokenMatches.length) {
    score += preferredTokenMatches.length * 12;
  }

  const hasBeenSeen = seenPostIds.has(String(postId));
  if (!hasBeenSeen && (creatorAffinityScore > 0 || preferredTokenMatches.length > 0)) {
    score += 24;
  }

  for (const entry of userHistory) {
    const eventType = String(entry?.event_type || "").toLowerCase();
    const targetUserId = String(entry?.target_user_id || "").trim();
    const eventWeight = Number(entry?.weight || 1);
    const entryPostId = Number(entry?.post_id || 0);
    const entryCreatorId = String(entry?.post_user_id || "").trim();
    const entryContent = String(entry?.post_content || "");
    const entryMediaType = String(entry?.post_media_type || "").trim();
    const overlap = getRecommendationTokens(entryContent).filter((token) => postTokens.has(token));

    if (postCreatorId && targetUserId && postCreatorId === targetUserId) {
      score += eventWeight * 11;
    }

    if (postCreatorId && entryCreatorId && postCreatorId === entryCreatorId) {
      score += eventType === "follow_user" ? 15 : (eventWeight * 9);
    }

    if (postId && entryPostId && postId === entryPostId) {
      score += eventType === "like" ? 14 : 10;
    }

    if (targetUserId && postCreatorId && targetUserId === postCreatorId) {
      score += eventType === "follow_user" ? 12 : 5;
    }

    if (entryContent && overlap.length) {
      score += overlap.length * 6 * Math.max(1, eventWeight);
    }

    if (entryMediaType && postMediaType && entryMediaType === postMediaType) {
      score += 3;
    }

    if (eventType === "share") {
      score += 3;
    }

    if (eventType === "comment") {
      score += 2;
    }
  }

  return score;
}

function getRecommendationHistoryForUser(userId, callback = null) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId || !db) {
    if (typeof callback === "function") {
      callback(null, []);
    }
    return;
  }

  db.query(
    `
      SELECT r.user_id, r.post_id, r.target_user_id, r.event_type, r.weight,
             p.user_id AS post_user_id,
             p.content AS post_content,
             p.media_type AS post_media_type
      FROM recommendation_events r
      LEFT JOIN posts p ON p.id = r.post_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 250
    `,
    [safeUserId],
    (err, rows) => {
      if (err) {
        console.warn("RECOMMENDATION HISTORY ERROR:", err.message);
        if (typeof callback === "function") {
          callback(err, []);
        }
        return;
      }

      if (typeof callback === "function") {
        callback(null, Array.isArray(rows) ? rows : []);
      }
    }
  );
}

function trackRecommendationEvent({ userId, postId = null, targetUserId = null, eventType, weight = 1 }, callback = null) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId || !db || !eventType) {
    if (typeof callback === "function") {
      callback && callback(null);
    }
    return;
  }

  const normalizedPostId = postId !== null && postId !== undefined && postId !== "" ? Number(postId) : null;
  const normalizedTargetUserId = targetUserId && String(targetUserId).trim() ? String(targetUserId).trim() : null;

  db.query(
    "INSERT INTO recommendation_events (user_id, post_id, target_user_id, event_type, weight) VALUES (?, ?, ?, ?, ?)",
    [safeUserId, Number.isFinite(normalizedPostId) ? normalizedPostId : null, normalizedTargetUserId, String(eventType), Number(weight) || 1],
    (err) => {
      if (err) {
        console.warn("RECOMMENDATION EVENT ERROR:", err.message);
      }
      if (typeof callback === "function") {
        callback(err || null);
      }
    }
  );
}

function initializeDatabaseSchema() {
  if (!db) return;

  const runSchemaQuery = (query, next) => {
    db.query(query, (err) => {
      if (err) {
        console.error("SCHEMA INIT ERROR:", err.message);
        return next ? next(err) : null;
      }
      return next ? next() : null;
    });
  };

  const ensureColumn = (tableName, columnName, columnDefinition, callback) => {
    db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName], (err, rows) => {
      if (err) {
        console.error("SCHEMA CHECK ERROR:", err.message);
        return callback(err);
      }

      if (rows && rows.length) {
        return callback();
      }

      db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (alterErr) => {
        if (alterErr) {
          console.error("SCHEMA ALTER ERROR:", alterErr.message);
          return callback(alterErr);
        }

        callback();
      });
    });
  };

  const createSchema = async () => {
    try {
      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS posts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            content TEXT,
            media_type ENUM('text', 'photo', 'video') DEFAULT 'text',
            media_url VARCHAR(255),
            media_urls TEXT,
            likes_count INT DEFAULT 0,
            report_count INT DEFAULT 0,
            is_flagged TINYINT(1) DEFAULT 0,
            report_status ENUM('active', 'taken_down') DEFAULT 'active',
            viewer_discretion TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        ensureColumn("posts", "report_count", "INT DEFAULT 0", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("posts", "is_flagged", "TINYINT(1) DEFAULT 0", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("posts", "report_status", "ENUM('active', 'taken_down') DEFAULT 'active'", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("posts", "original_name", "VARCHAR(255) NULL", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("posts", "saved_filename", "VARCHAR(255) NULL", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("posts", "viewer_discretion", "TINYINT(1) DEFAULT 0", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("posts", "followers_only", "TINYINT(1) DEFAULT 0", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("posts", "comments_disabled", "TINYINT(1) DEFAULT 0", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("posts", "followers_comments_only", "TINYINT(1) DEFAULT 0", (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS comments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            post_id INT NOT NULL,
            reply_to INT NULL,
            comment TEXT NOT NULL,
            like_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (reply_to) REFERENCES comments(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        ensureColumn("comments", "reply_to", "INT NULL", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("comments", "like_count", "INT DEFAULT 0", (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS comment_likes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            comment_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_comment_like (user_id, comment_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS follows (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            following_user_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_follow (user_id, following_user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS recommendation_events (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            post_id INT NULL,
            target_user_id VARCHAR(255) NULL,
            event_type ENUM('like', 'share', 'comment', 'follow_user', 'comment_like', 'view') NOT NULL,
            weight DECIMAL(5,2) DEFAULT 1.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_recommendation_user_created (user_id, created_at DESC),
            INDEX idx_recommendation_post (post_id),
            INDEX idx_recommendation_target_user (target_user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS post_topics (
            id INT PRIMARY KEY AUTO_INCREMENT,
            post_id INT NOT NULL,
            topic VARCHAR(100) NOT NULL,
            source ENUM('hashtag', 'keyword', 'manual', 'auto') DEFAULT 'auto',
            weight DECIMAL(5,2) DEFAULT 1.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_post_topic (post_id, topic),
            INDEX idx_post_topic_topic (topic),
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS user_topic_weights (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            topic VARCHAR(100) NOT NULL,
            weight DECIMAL(7,2) DEFAULT 0.00,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_topic (user_id, topic),
            INDEX idx_user_topic_weight (user_id, topic),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS recent_searches (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            query VARCHAR(255) NOT NULL,
            searched_user_id VARCHAR(255) NULL,
            searched_user_name VARCHAR(255) NULL,
            searched_user_avatar VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_recent_search_user_created (user_id, created_at DESC),
            INDEX idx_recent_search_query (query),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        ensureColumn("recent_searches", "searched_user_id", "VARCHAR(255) NULL", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("recent_searches", "searched_user_name", "VARCHAR(255) NULL", (err) => err ? reject(err) : resolve());
      });
      await new Promise((resolve, reject) => {
        ensureColumn("recent_searches", "searched_user_avatar", "VARCHAR(500) NULL", (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS messages (
            id INT PRIMARY KEY AUTO_INCREMENT,
            sender_user_id VARCHAR(255) NOT NULL,
            recipient_user_id VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_messages_thread (sender_user_id, recipient_user_id, created_at),
            INDEX idx_messages_recipient_created (recipient_user_id, created_at DESC),
            FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          CREATE TABLE IF NOT EXISTS notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            recipient_user_id VARCHAR(255) NOT NULL,
            actor_user_id VARCHAR(255) NOT NULL,
            type ENUM('follow', 'like', 'comment', 'comment_like', 'share', 'welcome', 'message') NOT NULL,
            target_type ENUM('user', 'post', 'comment') NOT NULL,
            target_id VARCHAR(255) NULL,
            message TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notifications_user_created (recipient_user_id, created_at DESC),
            INDEX idx_notifications_unread (recipient_user_id, is_read),
            FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => err ? reject(err) : resolve());
      });

      await new Promise((resolve, reject) => {
        runSchemaQuery(`
          ALTER TABLE notifications
          MODIFY COLUMN type ENUM('follow', 'like', 'comment', 'comment_like', 'share', 'welcome', 'message') NOT NULL
        `, (err) => err ? reject(err) : resolve());
      });

      console.log("Database schema initialized.");
    } catch (error) {
      console.error("SCHEMA INIT ERROR:", error.message);
    }
  };

  createSchema();
}

function upsertUserProfile({ userId, firstName, lastName, dob, email, profilePic, verified }, callback) {
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
  const safeVerified = verified !== undefined && verified !== null ? Number(Boolean(verified)) : null;
  const fullName = [safeFirstName, safeLastName].filter(Boolean).join(" ") || null;

  const columns = ["id", "name", "email", "profile_pic", "first_name", "last_name", "dob"];
  const values = [safeUserId, fullName, safeEmail, safeProfilePic, safeFirstName, safeLastName, safeDob];
  const updates = [
    "name = COALESCE(VALUES(name), name)",
    "email = COALESCE(VALUES(email), email)",
    "profile_pic = COALESCE(VALUES(profile_pic), profile_pic)",
    "first_name = COALESCE(VALUES(first_name), first_name)",
    "last_name = COALESCE(VALUES(last_name), last_name)",
    "dob = COALESCE(VALUES(dob), dob)"
  ];

  if (safeVerified !== null) {
    columns.push("verified");
    values.push(safeVerified);
    updates.push("verified = VALUES(verified)");
  }

  const placeholders = columns.map(() => "?").join(", ");
  const query = `
    INSERT INTO users (${columns.join(", ")})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates.join(", ")}
  `;

  db.query(query, values, (err) => {
    if (err) {
      if (callback) {
        callback(err);
      }
      return;
    }

    maybeCreateWelcomeNotification(safeUserId);

    if (callback) {
      callback(null);
      return;
    }

    return Promise.resolve();
  });
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
  }

  savePostsToFile();
}

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

fs.mkdirSync(tempUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 3
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large. Please choose a smaller file under 25MB." });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "Too many files uploaded." });
    }

    return res.status(400).json({ error: error.message || "Upload failed" });
  }

  if (error) {
    return res.status(500).json({ error: error.message || "Upload failed" });
  }

  next();
});

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

app.get("/api/hashtags/suggestions", (req, res) => {
  const rawQuery = String(req.query?.q || req.query?.term || "").trim();
  const normalizedQuery = rawQuery.replace(/^#+/, "").toLowerCase();

  if (!isDbEnabled()) {
    return res.json([]);
  }

  const isEmptyQuery = !normalizedQuery;
  const sql = isEmptyQuery
    ? `SELECT topic AS tag, COUNT(*) AS usage_count
       FROM post_topics
       GROUP BY topic
       ORDER BY usage_count DESC, topic ASC
       LIMIT 8`
    : `SELECT topic AS tag, COUNT(*) AS usage_count
       FROM post_topics
       WHERE topic LIKE ?
       GROUP BY topic
       ORDER BY usage_count DESC, topic ASC
       LIMIT 8`;

  const params = isEmptyQuery ? [] : [`${normalizedQuery}%`];

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.warn("HASHTAG SUGGESTION ERROR:", err.message);
      return res.status(500).json({ error: err.message });
    }

    const suggestions = (rows || [])
      .map((row) => String(row?.tag || "").trim())
      .filter(Boolean);

    return res.json(suggestions);
  });
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

app.post("/api/profile-picture", upload.single("profilePic"), async (req, res) => {
  const userId = req.body.user_id || "anonymous";
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No profile picture uploaded" });
  }

  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    return res.status(400).json({ error: "Profile picture must be an image" });
  }

  try {
    const imageUrl = await uploadMediaFile(file, `profile-pictures/${userId}`);

    if (!imageUrl) {
      return res.status(500).json({ error: "Failed to upload profile picture to Cloudinary." });
    }

    ensureUserRecord(userId, {
      profile_pic: imageUrl,
      name: req.body?.name,
      email: req.body?.email
    }, (userErr) => {
      if (userErr) {
        console.error("PROFILE PIC DB UPDATE ERROR:", userErr);
        return res.status(500).json({ error: userErr.message || "Failed to save profile picture" });
      }

      return res.json({
        success: true,
        user_id: userId,
        url: imageUrl,
        file: file.filename
      });
    });
  } catch (error) {
    console.error("PROFILE PIC UPLOAD ERROR:", error);
    return res.status(500).json({ error: error.message || "Failed to upload profile picture" });
  }
});

app.post("/api/recent-searches", (req, res) => {
  if (!isDbEnabled()) {
    return res.json({ recentSearches: [] });
  }

  const userId = String(req.body?.user_id || req.query?.user_id || "").trim();
  const rawQuery = String(req.body?.query || req.query?.query || "").trim();
  const query = sanitizeRecentSearchQuery(rawQuery);
  const searchedUserId = String(req.body?.searched_user_id || req.query?.searched_user_id || "").trim() || null;
  const searchedUserName = String(req.body?.searched_user_name || req.query?.searched_user_name || "").trim() || null;
  const searchedUserAvatar = String(req.body?.searched_user_avatar || req.query?.searched_user_avatar || "").trim() || null;

  if (!userId || !query) {
    return res.status(400).json({ error: "Missing user id or search query" });
  }

  db.query(
    `
      DELETE FROM recent_searches
      WHERE user_id = ?
        AND query = ?
        AND COALESCE(searched_user_id, '') = ?
    `,
    [userId, query, searchedUserId || ""],
    () => {
      db.query(
        `
          INSERT INTO recent_searches (user_id, query, searched_user_id, searched_user_name, searched_user_avatar)
          VALUES (?, ?, ?, ?, ?)
        `,
        [userId, query, searchedUserId, searchedUserName, searchedUserAvatar],
        (err) => {
          if (err) {
            console.error("RECENT SEARCH INSERT ERROR:", err);
            return res.status(500).json({ error: err.message });
          }

          db.query(
            `
              SELECT id, query, searched_user_id, searched_user_name, searched_user_avatar
              FROM recent_searches
              WHERE user_id = ?
              ORDER BY created_at DESC, id DESC
              LIMIT 10
            `,
            [userId],
            (listErr, rows) => {
              if (listErr) {
                console.error("RECENT SEARCH LIST ERROR:", listErr);
                return res.status(500).json({ error: listErr.message });
              }

              const dedupedRows = dedupeRecentSearchEntries((rows || []).map((row) => ({
                id: row.id,
                user_id: userId,
                query: row.query,
                searched_user_id: row.searched_user_id,
                searched_user_name: row.searched_user_name,
                searched_user_avatar: row.searched_user_avatar
              })));

              return res.json({
                recentSearches: dedupedRows.map((row) => ({
                  id: row.id,
                  query: row.query,
                  searched_user_id: row.searched_user_id,
                  searched_user_name: row.searched_user_name,
                  searched_user_avatar: row.searched_user_avatar
                }))
              });
            }
          );
        }
      );
    }
  );
});

app.get("/api/recent-searches", (req, res) => {
  if (!isDbEnabled()) {
    return res.json({ recentSearches: [] });
  }

  const userId = String(req.query?.user_id || "").trim();

  if (!userId) {
    return res.json({ recentSearches: [] });
  }

  db.query(
    `
      SELECT id, query, searched_user_id, searched_user_name, searched_user_avatar
      FROM recent_searches
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 10
    `,
    [userId],
    (err, rows) => {
      if (err) {
        console.error("RECENT SEARCH FETCH ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      const dedupedRows = dedupeRecentSearchEntries((rows || []).map((row) => ({
        id: row.id,
        user_id: userId,
        query: row.query,
        searched_user_id: row.searched_user_id,
        searched_user_name: row.searched_user_name,
        searched_user_avatar: row.searched_user_avatar
      })));

      return res.json({
        recentSearches: dedupedRows.map((row) => ({
          id: row.id,
          query: row.query,
          searched_user_id: row.searched_user_id,
          searched_user_name: row.searched_user_name,
          searched_user_avatar: row.searched_user_avatar
        }))
      });
    }
  );
});

app.delete("/api/recent-searches/:id", (req, res) => {
  if (!isDbEnabled()) {
    return res.json({ ok: true, deleted: 0 });
  }

  const recentSearchId = Number(req.params?.id || "");
  const userId = String(req.query?.user_id || req.body?.user_id || "").trim();

  if (!Number.isFinite(recentSearchId) || !userId) {
    return res.status(400).json({ error: "Missing recent search id or user id" });
  }

  db.query(
    `DELETE FROM recent_searches WHERE id = ? AND user_id = ?`,
    [recentSearchId, userId],
    (err, result) => {
      if (err) {
        console.error("RECENT SEARCH DELETE ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      return res.json({ ok: true, deleted: result?.affectedRows || 0 });
    }
  );
});

app.delete("/api/recent-searches", (req, res) => {
  if (!isDbEnabled()) {
    return res.json({ ok: true, deleted: 0 });
  }

  const userId = String(req.query?.user_id || req.body?.user_id || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  db.query(
    `DELETE FROM recent_searches WHERE user_id = ?`,
    [userId],
    (err, result) => {
      if (err) {
        console.error("RECENT SEARCH CLEAR ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      return res.json({ ok: true, deleted: result?.affectedRows || 0 });
    }
  );
});

app.get("/api/search", (req, res) => {
  const searchTerm = String(req.query?.q || "").trim();

  if (!searchTerm) {
    return res.json({ users: [], posts: [] });
  }

  const likeTerm = `%${searchTerm}%`;

  if (!isDbEnabled()) {
    const filteredPosts = inMemoryPosts.filter((post) => {
      const haystack = [
        post?.content || "",
        post?.original_name || "",
        post?.saved_filename || "",
        getDisplayNameForUser(post?.user_id || "") || ""
      ].join(" ").toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    }).slice(0, 20);

    return res.json({
      users: [],
      posts: filteredPosts
    });
  }

  const userQuery = `
    SELECT id, name, email, first_name, last_name, profile_pic
    FROM users
    WHERE is_hidden = 0
      AND account_status = 'active'
      AND (
        name LIKE ?
        OR email LIKE ?
        OR first_name LIKE ?
        OR last_name LIKE ?
      )
    ORDER BY
      CASE
        WHEN name LIKE ? THEN 0
        WHEN first_name LIKE ? THEN 1
        WHEN last_name LIKE ? THEN 2
        WHEN email LIKE ? THEN 3
        ELSE 4
      END,
      LENGTH(COALESCE(name, '')),
      name ASC,
      first_name ASC,
      last_name ASC,
      email ASC
    LIMIT 20
  `;

  const postQuery = `
    SELECT p.*, 
      COALESCE((SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id), 0) AS like_count,
      COALESCE((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id), 0) AS comment_count
    FROM posts p
    INNER JOIN users u ON u.id = p.user_id
    WHERE u.is_hidden = 0
      AND u.account_status = 'active'
      AND (
        p.content LIKE ?
        OR p.media_url LIKE ?
      )
    ORDER BY p.created_at DESC
    LIMIT 20
  `;

  const prefixTerm = `${searchTerm}%`;
  const containsTerm = `%${searchTerm}%`;

  db.query(userQuery, [prefixTerm, prefixTerm, prefixTerm, prefixTerm, prefixTerm, prefixTerm, prefixTerm, prefixTerm], (userErr, userRows) => {
    if (userErr) {
      console.error("USER SEARCH ERROR:", userErr);
      return res.status(500).json({ error: userErr.message });
    }

    const resolveUsers = (rows) => (rows || []).map((row) => ({
      user_id: row.id,
      id: row.id,
      name: row.name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "User",
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      email: row.email || "",
      profile_pic: row.profile_pic || null
    }));

    const finalUserRows = userRows && userRows.length ? userRows : [];
    const users = resolveUsers(finalUserRows);

    if (!finalUserRows.length) {
      db.query(userQuery, [containsTerm, containsTerm, containsTerm, containsTerm, containsTerm, containsTerm, containsTerm, containsTerm], (fallbackErr, fallbackRows) => {
        if (fallbackErr) {
          console.error("USER SEARCH FALLBACK ERROR:", fallbackErr);
          return res.status(500).json({ error: fallbackErr.message });
        }

        db.query(postQuery, [likeTerm, likeTerm], (postErr, postRows) => {
          if (postErr) {
            console.error("POST SEARCH ERROR:", postErr);
            return res.status(500).json({ error: postErr.message });
          }

          return res.json({
            users: resolveUsers(fallbackRows || []),
            posts: (postRows || []).map((post) => {
              const storedMediaUrls = normalizeStoredMediaUrls(post.media_urls || post.media_url);
              const resolvedMediaUrls = storedMediaUrls.length
                ? storedMediaUrls.map((url) => normalizeMediaUrlForPublic(url, req))
                : (post.media_url ? [normalizeMediaUrlForPublic(post.media_url, req)] : []);

              return {
                ...post,
                media_urls: resolvedMediaUrls,
                media_url: resolvedMediaUrls[0] || null,
                is_flagged: Boolean(post.is_flagged),
                report_count: Number(post.report_count || 0),
                likes_count: Number(post.like_count || post.likes_count || 0),
                like_count: Number(post.like_count || post.likes_count || 0),
                comment_count: Number(post.comment_count || 0),
                liked_by_current_user: false,
                liked: false
              };
            }).filter((post) => !(post.is_flagged || Number(post.report_count || 0) >= 10))
          });
        });
      });
      return;
    }

    db.query(postQuery, [likeTerm, likeTerm], (postErr, postRows) => {
      if (postErr) {
        console.error("POST SEARCH ERROR:", postErr);
        return res.status(500).json({ error: postErr.message });
      }

      const users = resolveUsers(finalUserRows);

      const posts = (postRows || []).map((post) => {
        const storedMediaUrls = normalizeStoredMediaUrls(post.media_urls || post.media_url);
        const resolvedMediaUrls = storedMediaUrls.length
          ? storedMediaUrls.map((url) => normalizeMediaUrlForPublic(url, req))
          : (post.media_url ? [normalizeMediaUrlForPublic(post.media_url, req)] : []);

        return {
          ...post,
          media_urls: resolvedMediaUrls,
          media_url: resolvedMediaUrls[0] || null,
          is_flagged: Boolean(post.is_flagged),
          report_count: Number(post.report_count || 0),
          likes_count: Number(post.like_count || post.likes_count || 0),
          like_count: Number(post.like_count || post.likes_count || 0),
          comment_count: Number(post.comment_count || 0),
          liked_by_current_user: false,
          liked: false
        };
      }).filter((post) => !(post.is_flagged || Number(post.report_count || 0) >= 10));

      return res.json({ users, posts });
    });
  });
});

app.get("/api/users", (req, res) => {
  const searchTerm = String(req.query?.q || "").trim();

  if (!isDbEnabled()) {
    return res.json([]);
  }

  if (!searchTerm) {
    db.query(
      `
        SELECT id, name, email, first_name, last_name, profile_pic
        FROM users
        WHERE is_hidden = 0
          AND account_status = 'active'
        ORDER BY name, first_name, last_name, email
        LIMIT 20
      `,
      [],
      (err, rows) => {
        if (err) {
          console.error("USER SEARCH LIST ERROR:", err);
          return res.status(500).json({ error: err.message });
        }

        return res.json((rows || []).map((row) => ({
          user_id: row.id,
          id: row.id,
          name: row.name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "User",
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          email: row.email || "",
          profile_pic: row.profile_pic || null
        })));
      }
    );
    return;
  }

  const likeTerm = `%${searchTerm}%`;
  const prefixTerm = `${searchTerm}%`;
  const userLookupQuery = `
    SELECT id, name, email, first_name, last_name, profile_pic
    FROM users
    WHERE is_hidden = 0
      AND account_status = 'active'
      AND (
        name LIKE ?
        OR email LIKE ?
        OR first_name LIKE ?
        OR last_name LIKE ?
      )
    ORDER BY
      CASE
        WHEN name LIKE ? THEN 0
        WHEN first_name LIKE ? THEN 1
        WHEN last_name LIKE ? THEN 2
        WHEN email LIKE ? THEN 3
        ELSE 4
      END,
      LENGTH(name),
      name ASC,
      first_name ASC,
      last_name ASC,
      email ASC
    LIMIT 20
  `;

  db.query(userLookupQuery, [prefixTerm, prefixTerm, prefixTerm, prefixTerm, prefixTerm, prefixTerm, prefixTerm, prefixTerm], (err, rows) => {
    if (err) {
      console.error("USER SEARCH ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    if (rows && rows.length) {
      return res.json((rows || []).map((row) => ({
        user_id: row.id,
        id: row.id,
        name: row.name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "User",
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        email: row.email || "",
        profile_pic: row.profile_pic || null
      })));
    }

    db.query(userLookupQuery, [likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm], (fallbackErr, fallbackRows) => {
      if (fallbackErr) {
        console.error("USER SEARCH FALLBACK ERROR:", fallbackErr);
        return res.status(500).json({ error: fallbackErr.message });
      }

      return res.json((fallbackRows || []).map((row) => ({
        user_id: row.id,
        id: row.id,
        name: row.name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "User",
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        email: row.email || "",
        profile_pic: row.profile_pic || null
      })));
    });
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
    "SELECT id, name, email, first_name, last_name, dob, profile_pic, verified FROM users WHERE id = ? AND is_hidden = 0 AND account_status = 'active' LIMIT 1",
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
        profile_pic: row.profile_pic || null,
        verified: Number(row.verified || 0) === 1
      });
    }
  );
});

app.get("/api/users/:userId/following", (req, res) => {
  const userId = String(req.params.userId || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({
      user_id: userId,
      following: []
    });
  }

  db.execute(
    `SELECT u.id, u.name, u.first_name, u.last_name, u.profile_pic, f.created_at
     FROM follows f
     INNER JOIN users u ON u.id = f.following_user_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error("FOLLOWING LIST ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      const following = (rows || []).map((row) => {
        const displayName = String(row?.name || [row?.first_name, row?.last_name].filter(Boolean).join(" ") || "User").trim() || "User";

        return {
          id: row?.id || null,
          name: displayName,
          first_name: row?.first_name || "",
          last_name: row?.last_name || "",
          profile_pic: row?.profile_pic || null,
          created_at: row?.created_at || null
        };
      });

      return res.json({
        user_id: userId,
        following
      });
    }
  );
});

app.get("/api/users/:userId/following-suggestions", (req, res) => {
  const userId = String(req.params.userId || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({
      user_id: userId,
      suggestions: []
    });
  }

  db.execute(
    `SELECT DISTINCT u.id, u.name, u.first_name, u.last_name, u.profile_pic
     FROM follows f1
     INNER JOIN follows f2 ON f2.user_id = f1.following_user_id
     INNER JOIN users u ON u.id = f2.following_user_id
     LEFT JOIN follows existing ON existing.user_id = ? AND existing.following_user_id = u.id
     WHERE f1.user_id = ?
       AND u.id <> ?
       AND existing.id IS NULL
     ORDER BY u.name ASC
     LIMIT 20`,
    [userId, userId, userId],
    (err, rows) => {
      if (err) {
        console.error("FOLLOWING SUGGESTIONS ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      const suggestions = (rows || []).map((row) => {
        const displayName = String(row?.name || [row?.first_name, row?.last_name].filter(Boolean).join(" ") || "User").trim() || "User";

        return {
          id: row?.id || null,
          name: displayName,
          first_name: row?.first_name || "",
          last_name: row?.last_name || "",
          profile_pic: row?.profile_pic || null
        };
      });

      return res.json({
        user_id: userId,
        suggestions
      });
    }
  );
});

app.get("/api/users/:userId/follow-status", (req, res) => {
  const targetUserId = String(req.params.userId || "").trim();
  const viewerUserId = String(req.query?.user_id || "").trim();

  if (!targetUserId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({
      target_user_id: targetUserId,
      follower_count: 0,
      following_count: 0,
      isFollowing: false
    });
  }

  db.query("SELECT COUNT(*) AS follower_count FROM follows WHERE following_user_id = ?", [targetUserId], (countErr, countRows) => {
    if (countErr) {
      console.error("FOLLOW COUNT ERROR:", countErr);
      return res.status(500).json({ error: countErr.message });
    }

    const followerCount = Number(countRows?.[0]?.follower_count || 0);

    db.query("SELECT COUNT(*) AS following_count FROM follows WHERE user_id = ?", [targetUserId], (followingErr, followingRows) => {
      if (followingErr) {
        console.error("FOLLOWING COUNT ERROR:", followingErr);
        return res.status(500).json({ error: followingErr.message });
      }

      const followingCount = Number(followingRows?.[0]?.following_count || 0);

      if (!viewerUserId) {
        return res.json({
          target_user_id: targetUserId,
          follower_count: followerCount,
          following_count: followingCount,
          isFollowing: false
        });
      }

      db.query("SELECT 1 FROM follows WHERE user_id = ? AND following_user_id = ? LIMIT 1", [viewerUserId, targetUserId], (followErr, followRows) => {
        if (followErr) {
          console.error("FOLLOW STATUS ERROR:", followErr);
          return res.status(500).json({ error: followErr.message });
        }

        return res.json({
          target_user_id: targetUserId,
          follower_count: followerCount,
          following_count: followingCount,
          isFollowing: Boolean(followRows && followRows.length)
        });
      });
    });
  });
});

app.get("/api/users/:userId/stats", (req, res) => {
  const userId = String(req.params.userId || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({
      user_id: userId,
      post_count: 0,
      total_likes: 0,
      follower_count: 0,
      following_count: 0
    });
  }

  db.query(
    "SELECT COUNT(*) AS post_count FROM posts WHERE user_id = ?",
    [userId],
    (postErr, postRows) => {
      if (postErr) {
        console.error("USER POST COUNT ERROR:", postErr);
        return res.status(500).json({ error: postErr.message });
      }

      const postCount = Number(postRows?.[0]?.post_count || 0);

      db.query(
        `SELECT COUNT(*) AS total_likes
         FROM likes l
         INNER JOIN posts p ON p.id = l.post_id
         WHERE p.user_id = ?`,
        [userId],
        (likeErr, likeRows) => {
          if (likeErr) {
            console.error("USER LIKE COUNT ERROR:", likeErr);
            return res.status(500).json({ error: likeErr.message });
          }

          const totalLikes = Number(likeRows?.[0]?.total_likes || 0);

          db.query("SELECT COUNT(*) AS follower_count FROM follows WHERE following_user_id = ?", [userId], (followerErr, followerRows) => {
            if (followerErr) {
              console.error("USER FOLLOWER COUNT ERROR:", followerErr);
              return res.status(500).json({ error: followerErr.message });
            }

            db.query("SELECT COUNT(*) AS following_count FROM follows WHERE user_id = ?", [userId], (followingErr, followingRows) => {
              if (followingErr) {
                console.error("USER FOLLOWING COUNT ERROR:", followingErr);
                return res.status(500).json({ error: followingErr.message });
              }

              return res.json({
                user_id: userId,
                post_count: postCount,
                total_likes: totalLikes,
                follower_count: Number(followerRows?.[0]?.follower_count || 0),
                following_count: Number(followingRows?.[0]?.following_count || 0)
              });
            });
          });
        }
      );
    }
  );
});

app.get("/api/users/:userId/activity", (req, res) => {
  const userId = String(req.params.userId || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({
      user_id: userId,
      range: "12_months",
      data: Array.from({ length: 12 }, (_, index) => {
        const now = new Date();
        const month = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
        return {
          month: month.toLocaleString("en-US", { month: "short" }),
          posts: 0,
          likes: 0
        };
      })
    });
  }

  const activityPayload = Array.from({ length: 12 }, (_, index) => {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return {
      key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
      label: month.toLocaleString("en-US", { month: "short" }),
      posts: 0,
      likes: 0
    };
  });

  const monthMap = new Map(activityPayload.map((item) => [item.key, item]));

  db.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COUNT(*) AS posts
     FROM posts
     WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')`,
    [userId],
    (postErr, postRows) => {
      if (postErr) {
        console.error("USER ACTIVITY POST COUNT ERROR:", postErr);
        return res.status(500).json({ error: postErr.message });
      }

      (postRows || []).forEach((row) => {
        const key = String(row?.month_key || "");
        if (monthMap.has(key)) {
          monthMap.get(key).posts = Number(row?.posts || 0);
        }
      });

      db.query(
        `SELECT DATE_FORMAT(p.created_at, '%Y-%m') AS month_key, COUNT(*) AS likes
         FROM likes l
         INNER JOIN posts p ON p.id = l.post_id
         WHERE p.user_id = ? AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(p.created_at, '%Y-%m')`,
        [userId],
        (likeErr, likeRows) => {
          if (likeErr) {
            console.error("USER ACTIVITY LIKE COUNT ERROR:", likeErr);
            return res.status(500).json({ error: likeErr.message });
          }

          (likeRows || []).forEach((row) => {
            const key = String(row?.month_key || "");
            if (monthMap.has(key)) {
              monthMap.get(key).likes = Number(row?.likes || 0);
            }
          });

          return res.json({
            user_id: userId,
            range: "12_months",
            data: activityPayload.map((item) => ({
              month: item.label,
              posts: item.posts,
              likes: item.likes
            }))
          });
        }
      );
    }
  );
});

app.post("/api/users/:userId/follow", (req, res) => {
  const targetUserId = String(req.params.userId || "").trim();
  const viewerUserId = String(req.body?.user_id || "").trim();

  if (!targetUserId) {
    return res.status(400).json({ error: "Missing target user id" });
  }

  if (!viewerUserId) {
    return res.status(401).json({ error: "Please sign in to follow users." });
  }

  if (viewerUserId === targetUserId) {
    return res.status(400).json({ error: "You cannot follow yourself." });
  }

  if (!isDbEnabled()) {
    return res.json({
      target_user_id: targetUserId,
      isFollowing: false,
      follower_count: 0,
      following_count: 0
    });
  }

  db.query("SELECT id FROM follows WHERE user_id = ? AND following_user_id = ? LIMIT 1", [viewerUserId, targetUserId], (checkErr, checkRows) => {
    if (checkErr) {
      console.error("FOLLOW CHECK ERROR:", checkErr);
      return res.status(500).json({ error: checkErr.message });
    }

    const isFollowing = Boolean(checkRows && checkRows.length);
    const action = isFollowing
      ? "DELETE FROM follows WHERE user_id = ? AND following_user_id = ?"
      : "INSERT INTO follows (user_id, following_user_id) VALUES (?, ?)";

    db.query(action, [viewerUserId, targetUserId], (updateErr) => {
      if (updateErr) {
        console.error("FOLLOW UPDATE ERROR:", updateErr);
        return res.status(500).json({ error: updateErr.message });
      }

      db.query("SELECT COUNT(*) AS follower_count FROM follows WHERE following_user_id = ?", [targetUserId], (countErr, countRows) => {
        if (countErr) {
          console.error("FOLLOW COUNT ERROR:", countErr);
          return res.status(500).json({ error: countErr.message });
        }

        const followerCount = Number(countRows?.[0]?.follower_count || 0);

        db.query("SELECT COUNT(*) AS following_count FROM follows WHERE user_id = ?", [targetUserId], (followingErr, followingRows) => {
          if (followingErr) {
            console.error("FOLLOWING COUNT ERROR:", followingErr);
            return res.status(500).json({ error: followingErr.message });
          }

          const followingCount = Number(followingRows?.[0]?.following_count || 0);
          const nextFollowingState = !isFollowing;

          if (!isFollowing) {
            ensureUserRecord(viewerUserId, {
              name: req.body?.name,
              email: req.body?.email,
              profile_pic: req.body?.profile_pic
            }, (profileErr) => {
              if (profileErr) {
                console.warn("FOLLOW PROFILE ENSURE ERROR:", profileErr.message);
              }

              trackRecommendationEvent({
                userId: viewerUserId,
                targetUserId,
                eventType: "follow_user",
                weight: 3
              });

              insertNotification({
                recipient_user_id: targetUserId,
                actor_user_id: viewerUserId,
                type: "follow",
                target_type: "user",
                target_id: viewerUserId,
                message: `${req.body?.name || "Someone"} started following you.`
              }).catch((notificationErr) => {
                console.warn("FOLLOW NOTIFICATION ERROR:", notificationErr.message);
              });
            });
          }

          return res.json({
            target_user_id: targetUserId,
            isFollowing: nextFollowingState,
            follower_count: followerCount,
            following_count: followingCount
          });
        });
      });
    });
  });
});

app.get("/api/notifications", (req, res) => {
  const userId = String(req.query?.user_id || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json([]);
  }

  db.query(
    "DELETE FROM notifications WHERE recipient_user_id = ? AND created_at < DATE_SUB(NOW(), INTERVAL 15 DAY)",
    [userId],
    (deleteErr) => {
      if (deleteErr) {
        console.warn("NOTIFICATION CLEANUP ERROR:", deleteErr.message);
      }

      db.query(
        `
          SELECT n.*, 
                 u.name AS actor_name,
                 u.profile_pic AS actor_profile_pic,
                 COALESCE(u.name, (SELECT us.name FROM users us WHERE us.id = n.actor_user_id AND us.is_hidden = 0 AND us.account_status = 'active' LIMIT 1)) AS resolved_actor_name,
                 COALESCE(u.profile_pic, (SELECT us.profile_pic FROM users us WHERE us.id = n.actor_user_id AND us.is_hidden = 0 AND us.account_status = 'active' LIMIT 1)) AS resolved_actor_profile_pic
          FROM notifications n
          LEFT JOIN users u ON u.id = n.actor_user_id AND u.is_hidden = 0 AND u.account_status = 'active'
          WHERE n.recipient_user_id = ?
          ORDER BY n.created_at DESC
          LIMIT 30
        `,
        [userId],
        (err, rows) => {
          if (err) {
            console.error("NOTIFICATION SELECT ERROR:", err);
            return res.status(500).json({ error: err.message });
          }

          return res.json((rows || []).map((row) => ({
            ...row,
            actor_profile_pic: row.resolved_actor_profile_pic || row.actor_profile_pic || null,
            actor_name: row.resolved_actor_name || row.actor_name || extractActorNameFromMessage(row.message) || "User",
            is_read: Number(row.is_read || 0) === 1
          })));
        }
      );
    }
  );
});

app.get("/api/notifications/unread-count", (req, res) => {
  const userId = String(req.query?.user_id || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({ unread_count: 0 });
  }

  db.query(
    "DELETE FROM notifications WHERE recipient_user_id = ? AND created_at < DATE_SUB(NOW(), INTERVAL 15 DAY)",
    [userId],
    (cleanupErr) => {
      if (cleanupErr) {
        console.warn("NOTIFICATION COUNT CLEANUP ERROR:", cleanupErr.message);
      }

      db.query(
        "SELECT COUNT(*) AS unread_count FROM notifications WHERE recipient_user_id = ? AND is_read = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 15 DAY)",
        [userId],
        (err, rows) => {
          if (err) {
            console.error("NOTIFICATION COUNT ERROR:", err);
            return res.status(500).json({ error: err.message });
          }

          return res.json({ unread_count: Number(rows?.[0]?.unread_count || 0) });
        }
      );
    }
  );
});

app.post("/api/notifications/read", (req, res) => {
  const userId = String(req.body?.user_id || "").trim();
  const notificationId = req.body?.notification_id !== undefined && req.body?.notification_id !== null && req.body?.notification_id !== ""
    ? Number(req.body.notification_id)
    : null;

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({ success: true });
  }

  if (notificationId && Number.isFinite(notificationId)) {
    db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?",
      [notificationId, userId],
      (err) => {
        if (err) {
          console.error("MARK NOTIFICATION READ ERROR:", err);
          return res.status(500).json({ error: err.message });
        }
        return res.json({ success: true });
      }
    );
    return;
  }

  db.query(
    "UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ?",
    [userId],
    (err) => {
      if (err) {
        console.error("MARK ALL NOTIFICATIONS READ ERROR:", err);
        return res.status(500).json({ error: err.message });
      }
      return res.json({ success: true });
    }
  );
});

app.post("/api/notifications/clear", (req, res) => {
  const userId = String(req.body?.user_id || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({ success: true });
  }

  db.query(
    "DELETE FROM notifications WHERE recipient_user_id = ?",
    [userId],
    (err) => {
      if (err) {
        console.error("CLEAR NOTIFICATIONS ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      return res.json({ success: true });
    }
  );
});

app.get("/api/messages/conversations", (req, res) => {
  const userId = String(req.query?.user_id || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json([]);
  }

  db.query(
    `
      SELECT other_user_id, sender_user_id, message, created_at
      FROM (
        SELECT recipient_user_id AS other_user_id, sender_user_id, message, created_at
        FROM messages
        WHERE sender_user_id = ?
        UNION ALL
        SELECT sender_user_id AS other_user_id, sender_user_id, message, created_at
        FROM messages
        WHERE recipient_user_id = ?
      ) combined
      ORDER BY created_at ASC
    `,
    [userId, userId],
    (err, rows) => {
      if (err) {
        console.error("MESSAGE CONVERSATIONS ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      const grouped = {};
      (rows || []).forEach((row) => {
        const otherUserId = String(row.other_user_id || "").trim();
        if (!otherUserId) return;

        if (!grouped[otherUserId]) {
          grouped[otherUserId] = [];
        }

        grouped[otherUserId].push({
          id: row.id || null,
          sender_user_id: row.sender_user_id,
          text: row.message,
          message: row.message,
          mine: String(row.sender_user_id) === String(userId),
          created_at: row.created_at
        });
      });

      return res.json(Object.entries(grouped).map(([otherUserId, messages]) => ({
        user_id: otherUserId,
        messages: messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      })));
    }
  );
});

app.get("/api/messages", (req, res) => {
  const userId = String(req.query?.user_id || "").trim();
  const otherUserId = String(req.query?.other_user_id || "").trim();

  if (!userId || !otherUserId) {
    return res.status(400).json({ error: "Missing user ids" });
  }

  if (!isDbEnabled()) {
    return res.json([]);
  }

  db.query(
    `
      SELECT id, sender_user_id, recipient_user_id, message, created_at
      FROM messages
      WHERE (sender_user_id = ? AND recipient_user_id = ?) OR (sender_user_id = ? AND recipient_user_id = ?)
      ORDER BY created_at ASC
    `,
    [userId, otherUserId, otherUserId, userId],
    (err, rows) => {
      if (err) {
        console.error("MESSAGE LOAD ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      return res.json((rows || []).map((row) => ({
        id: row.id,
        sender_user_id: row.sender_user_id,
        recipient_user_id: row.recipient_user_id,
        message: row.message,
        created_at: row.created_at
      })));
    }
  );
});

app.post("/api/messages", (req, res) => {
  const senderUserId = String(req.body?.sender_user_id || "").trim();
  const recipientUserId = String(req.body?.recipient_user_id || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!senderUserId || !recipientUserId || !message) {
    return res.status(400).json({ error: "Missing required message fields" });
  }

  if (!isDbEnabled()) {
    return res.json({
      success: true,
      message: {
        id: null,
        sender_user_id: senderUserId,
        recipient_user_id: recipientUserId,
        message,
        created_at: new Date().toISOString()
      }
    });
  }

  db.query(
    `INSERT INTO messages (sender_user_id, recipient_user_id, message) VALUES (?, ?, ?)` ,
    [senderUserId, recipientUserId, message],
    (err, result) => {
      if (err) {
        console.error("MESSAGE SAVE ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      return res.json({
        success: true,
        message: {
          id: result.insertId,
          sender_user_id: senderUserId,
          recipient_user_id: recipientUserId,
          message,
          created_at: new Date().toISOString()
        }
      });
    }
  );
});

app.post("/api/notifications/message", (req, res) => {
  const recipientUserId = String(req.body?.recipient_user_id || "").trim();
  const actorUserId = String(req.body?.actor_user_id || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!recipientUserId || !actorUserId) {
    return res.status(400).json({ error: "Missing recipient or actor user id" });
  }

  if (!message) {
    return res.status(400).json({ error: "Missing notification message" });
  }

  if (!isDbEnabled()) {
    return res.json({ success: true, notification: { recipient_user_id: recipientUserId, actor_user_id: actorUserId } });
  }

  insertNotification({
    recipient_user_id: recipientUserId,
    actor_user_id: actorUserId,
    type: "message",
    target_type: "user",
    target_id: actorUserId,
    message
  })
    .then(() => res.json({ success: true }))
    .catch((err) => {
      console.error("MESSAGE NOTIFICATION INSERT ERROR:", err);
      return res.status(500).json({ error: err.message });
    });
});

app.post("/api/profile", (req, res) => {
  const userId = req.body?.user_id || req.body?.userId || "";
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const dob = String(req.body?.dob || "").trim();
  const email = String(req.body?.email || "").trim();
  const profilePic = String(req.body?.profile_pic || "").trim();
  const verifiedProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "verified");
  const verified = verifiedProvided ? req.body?.verified : undefined;

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || firstName || lastName || "";
  const nameError = validateDisplayNamePolicy(fullName, "Name");
  if (nameError) {
    return res.status(400).json({ error: nameError });
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

  upsertUserProfile({ userId, firstName, lastName, dob, email, profilePic, verified }, (err) => {
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
        profile_pic: profilePic || null,
        verified: verified !== undefined && verified !== null ? Number(Boolean(verified)) : undefined
      }
    });
  });
});

app.post("/api/posts", upload.array("file", 3), async (req, res) => {
  const user_id = req.body.user_id || "anonymous";
  const commonContent = (req.body.content || "").trim();
  const postAccessSettings = normalizePostAccessSettings(req.body || {});
  const viewerDiscretion = req.body?.viewer_discretion !== undefined && req.body?.viewer_discretion !== null
    ? Number(Boolean(Number(req.body.viewer_discretion)))
    : 0;
  const files = Array.isArray(req.files) ? req.files : [];

  if (!files.length) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const imageCount = files.filter((file) => file?.mimetype?.startsWith("image/")).length;
  const videoCount = files.filter((file) => file?.mimetype?.startsWith("video/")).length;

  if (videoCount > 1) {
    return res.status(400).json({ error: "You can upload only 1 video per post." });
  }

  if (imageCount + videoCount > 3) {
    return res.status(400).json({ error: "You can upload up to 3 items per post. Choose up to 3 images or 1 video." });
  }

  try {
    const mediaUrls = await Promise.all(files.map(async (file) => {
      const uploadedUrl = await uploadMediaFile(file, `posts/${user_id}`);
      if (!uploadedUrl) {
        throw new Error(`Cloudinary upload failed for ${file.originalname || "media file"}.`);
      }
      return uploadedUrl;
    }));
    const firstOriginalName = files[0]?.originalname || "uploaded file";
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
        viewer_discretion: viewerDiscretion,
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
      INSERT INTO posts (user_id, content, media_type, media_url, media_urls, original_name, saved_filename, viewer_discretion, followers_only, comments_disabled, followers_comments_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

      db.query(query, [
        String(user_id),
        content,
        media_type,
        mediaUrls[0] || null,
        JSON.stringify(mediaUrls),
        firstOriginalName,
        files[0]?.filename || null,
        viewerDiscretion,
        postAccessSettings.followersOnly ? 1 : 0,
        postAccessSettings.commentsDisabled ? 1 : 0,
        postAccessSettings.followersCommentsOnly ? 1 : 0
      ], (err, results) => {
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
          viewer_discretion: viewerDiscretion,
          followers_only: postAccessSettings.followersOnly ? 1 : 0,
          comments_disabled: postAccessSettings.commentsDisabled ? 1 : 0,
          followers_comments_only: postAccessSettings.followersCommentsOnly ? 1 : 0,
          success: true,
          is_gallery: mediaUrls.length > 1
        };

        savePostTopics(savedPost.id, content, "keyword", (topicErr) => {
          if (topicErr) {
            console.warn("POST TOPIC SAVE ERROR:", topicErr.message || topicErr);
          }
        });

        res.json({
          success: true,
          post: savedPost,
          posts: [savedPost]
        });
      });
    });
  } catch (error) {
    console.error("POST UPLOAD ERROR:", error);
    return res.status(500).json({ error: error.message || "Failed to upload media" });
  }
});

app.get("/api/posts", (req, res) => {
  const publicBaseUrl = getPublicBaseUrl(req);
  const viewerUserId = req.query?.user_id ? String(req.query.user_id).trim() : "";
  const feedMode = String(req.query?.feed_mode || "for_you").trim().toLowerCase();

  if (!isDbEnabled()) {
    pruneMissingMediaPosts();
    return res.json(inMemoryPosts
      .filter((post) => !(post.is_flagged || Number(post.report_count || 0) >= 10))
      .slice(0, 20));
  }

  const isFollowingMode = viewerUserId && feedMode === "following";
  const query = isFollowingMode
    ? `
      SELECT p.*, 
        COALESCE((SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id), 0) AS like_count,
        COALESCE((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id), 0) AS comment_count,
        CASE WHEN EXISTS (SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) THEN 1 ELSE 0 END AS liked_by_current_user,
        CASE WHEN EXISTS (SELECT 1 FROM follows f WHERE f.user_id = ? AND f.following_user_id = p.user_id) THEN 1 ELSE 0 END AS followed_creator
      FROM posts p
      INNER JOIN users u ON u.id = p.user_id
      WHERE u.is_hidden = 0
        AND u.account_status = 'active'
        AND EXISTS (SELECT 1 FROM follows f WHERE f.user_id = ? AND f.following_user_id = p.user_id)
      ORDER BY p.created_at DESC
    `
    : viewerUserId
      ? `
        SELECT p.*, 
          COALESCE((SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id), 0) AS like_count,
          COALESCE((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id), 0) AS comment_count,
          CASE WHEN EXISTS (SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) THEN 1 ELSE 0 END AS liked_by_current_user
        FROM posts p
        INNER JOIN users u ON u.id = p.user_id
        WHERE u.is_hidden = 0
          AND u.account_status = 'active'
        ORDER BY p.created_at DESC
      `
      : `
        SELECT p.*, 
          COALESCE((SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id), 0) AS like_count,
          COALESCE((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id), 0) AS comment_count
        FROM posts p
        INNER JOIN users u ON u.id = p.user_id
        WHERE u.is_hidden = 0
          AND u.account_status = 'active'
        ORDER BY p.created_at DESC
      `;

  const params = isFollowingMode
    ? [viewerUserId, viewerUserId, viewerUserId]
    : viewerUserId
      ? [viewerUserId]
      : [];

  db.query(query, params, (err, results) => {
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

        const normalizedPost = {
          ...post,
          media_urls: resolvedMediaUrls,
          media_url: resolvedMediaUrls[0] || null,
          is_flagged: Boolean(post.is_flagged),
          report_count: Number(post.report_count || 0),
          viewer_discretion: Number(post.viewer_discretion || post.content_view_discretion || 0),
          followers_only: Number(post.followers_only || 0),
          comments_disabled: Number(post.comments_disabled || 0),
          followers_comments_only: Number(post.followers_comments_only || 0),
          likes_count: Number(post.like_count || post.likes_count || 0),
          like_count: Number(post.like_count || post.likes_count || 0),
          comment_count: Number(post.comment_count || 0),
          liked_by_current_user: Boolean(viewerUserId && Number(post.liked_by_current_user || 0)),
          liked: Boolean(viewerUserId && Number(post.liked_by_current_user || 0)),
          followed_creator: Boolean(Number(post.followed_creator || 0))
        };

        return {
          ...normalizedPost,
          can_view: canUserViewPost(normalizedPost, { viewerUserId, isFollowing: Boolean(normalizedPost.followed_creator) }),
          can_comment: canUserCommentOnPost(normalizedPost, { viewerUserId, isFollowing: Boolean(normalizedPost.followed_creator) })
        };
      })
      .filter(post => !(post.is_flagged || Number(post.report_count || 0) >= 10 || (viewerUserId && !post.can_view)));

    if (!viewerUserId) {
      return res.json(fixedResults);
    }

    if (isFollowingMode) {
      return res.json(fixedResults);
    }

    getRecommendationHistoryForUser(viewerUserId, (historyErr, userHistory) => {
      getUserTopicWeights(viewerUserId, (topicErr, userTopicWeights) => {
        const topicMap = topicErr ? {} : (userTopicWeights || {});
        const postIds = fixedResults.map((post) => post.id).filter((postId) => postId != null);

        getPostTopicMap(postIds, (postTopicErr, postTopicMap) => {
          const topicLookup = postTopicErr ? {} : (postTopicMap || {});

          const rankedResults = fixedResults
            .map((post) => {
              const postTopics = topicLookup[String(post.id)] || [];
              const topicMatchScore = postTopics.reduce((sum, topic) => sum + Number(topicMap[String(topic)] || 0), 0);
              const baseScore = scoreRecommendationPost(post, historyErr ? [] : userHistory);

              return {
                ...post,
                topic_match_score: topicMatchScore,
                recommendation_score: baseScore + (topicMatchScore * 8)
              };
            })
            .sort((a, b) => {
              const scoreDelta = Number(b.recommendation_score || 0) - Number(a.recommendation_score || 0);
              if (scoreDelta !== 0) {
                return scoreDelta;
              }
              return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            });

          return res.json(rankedResults.map(({ recommendation_score, topic_match_score, ...post }) => post));
        });
      });
    });
  });
});

app.get("/api/posts/:id/likes", (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.query?.user_id ? String(req.query.user_id).trim() : "";

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!isDbEnabled()) {
    return res.status(503).json({ error: "Database is not enabled for likes." });
  }

  db.query("SELECT COUNT(*) AS total_likes FROM likes WHERE post_id = ?", [postId], (countErr, countRows) => {
    if (countErr) {
      console.error("LIKE COUNT ERROR:", countErr);
      return res.status(500).json({ error: countErr.message });
    }

    const base = {
      post_id: postId,
      likeCount: Number(countRows?.[0]?.total_likes || 0)
    };

    if (!userId) {
      return res.json(base);
    }

    db.query("SELECT id FROM likes WHERE post_id = ? AND user_id = ? LIMIT 1", [postId, userId], (likedErr, likedRows) => {
      if (likedErr) {
        console.error("LIKE STATUS ERROR:", likedErr);
        return res.status(500).json({ error: likedErr.message });
      }

      return res.json({
        ...base,
        liked: Boolean(likedRows?.length)
      });
    });
  });
});

app.post("/api/posts/:id/like", (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.body?.user_id ? String(req.body.user_id).trim() : "";

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.status(503).json({ error: "Database is not enabled for likes." });
  }

  db.query("SELECT id FROM posts WHERE id = ?", [postId], (postErr, postRows) => {
    if (postErr) {
      console.error("LIKE POST SELECT ERROR:", postErr);
      return res.status(500).json({ error: postErr.message });
    }

    if (!postRows?.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    ensureUserRecord(userId, {
      name: req.body?.name,
      email: req.body?.email,
      profile_pic: req.body?.profile_pic
    }, (userErr) => {
      if (userErr) {
        console.error("LIKE USER ENSURE ERROR:", userErr);
        return res.status(500).json({ error: userErr.message });
      }

      db.query("SELECT id FROM likes WHERE post_id = ? AND user_id = ? LIMIT 1", [postId, userId], (selectErr, likeRows) => {
        if (selectErr) {
          console.error("LIKE SELECT ERROR:", selectErr);
          return res.status(500).json({ error: selectErr.message });
        }

        const alreadyLiked = Boolean(likeRows?.length);
        const sql = alreadyLiked
          ? "DELETE FROM likes WHERE post_id = ? AND user_id = ?"
          : "INSERT INTO likes (post_id, user_id) VALUES (?, ?)";
        const params = alreadyLiked ? [postId, userId] : [postId, userId];

        db.query(sql, params, (opErr) => {
          if (opErr) {
            console.error("LIKE TOGGLE ERROR:", opErr);
            return res.status(500).json({ error: opErr.message });
          }

          db.query("SELECT COUNT(*) AS total_likes FROM likes WHERE post_id = ?", [postId], (countErr, countRows) => {
            if (countErr) {
              console.error("LIKE COUNT UPDATE ERROR:", countErr);
              return res.status(500).json({ error: countErr.message });
            }

            const likeCount = Number(countRows?.[0]?.total_likes || 0);
            db.query("UPDATE posts SET likes_count = ? WHERE id = ?", [likeCount, postId], (updateErr) => {
              if (updateErr) {
                console.error("POST LIKE COUNT UPDATE ERROR:", updateErr);
                return res.status(500).json({ error: updateErr.message });
              }

              if (!alreadyLiked) {
                db.query("SELECT user_id, content FROM posts WHERE id = ? LIMIT 1", [postId], (postOwnerErr, postOwnerRows) => {
                  if (!postOwnerErr && postOwnerRows?.[0] && String(postOwnerRows[0].user_id) !== String(userId)) {
                    insertNotification({
                      recipient_user_id: postOwnerRows[0].user_id,
                      actor_user_id: userId,
                      type: "like",
                      target_type: "post",
                      target_id: String(postId),
                      message: `${req.body?.name || "Someone"} liked your post.`
                    }).catch((notificationErr) => {
                      console.warn("POST LIKE NOTIFICATION ERROR:", notificationErr.message);
                    });
                  }

                  if (!postOwnerErr && postOwnerRows?.[0]) {
                    addUserTopicWeight(userId, String(postOwnerRows[0].content || ""), 5, () => {});
                  }

                  trackRecommendationEvent({
                    userId,
                    postId,
                    targetUserId: postOwnerRows?.[0]?.user_id || null,
                    eventType: "like",
                    weight: 2.5
                  });

                  return res.json({
                    success: true,
                    liked: true,
                    likeCount,
                    status: "liked"
                  });
                });
                return;
              }

              return res.json({
                success: true,
                liked: false,
                likeCount,
                status: "unliked"
              });
            });
          });
        });
      });
    });
  });
});

app.post("/api/posts/:id/share", (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.body?.user_id ? String(req.body.user_id).trim() : "";

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.json({ success: true, shared: true });
  }

  db.query("SELECT user_id, content FROM posts WHERE id = ? LIMIT 1", [postId], (postErr, postRows) => {
    if (postErr) {
      console.error("SHARE POST SELECT ERROR:", postErr);
      return res.status(500).json({ error: postErr.message });
    }

    const ownerUserId = postRows?.[0]?.user_id;
    const postContent = String(postRows?.[0]?.content || "");
    if (ownerUserId && String(ownerUserId) !== String(userId)) {
      ensureUserRecord(userId, {
        name: req.body?.name,
        email: req.body?.email,
        profile_pic: req.body?.profile_pic
      }, (profileErr) => {
        if (profileErr) {
          console.warn("SHARE PROFILE ENSURE ERROR:", profileErr.message);
        }

        insertNotification({
          recipient_user_id: ownerUserId,
          actor_user_id: userId,
          type: "share",
          target_type: "post",
          target_id: String(postId),
          message: `${req.body?.name || "Someone"} shared your post.`
        }).catch((notificationErr) => {
          console.warn("SHARE NOTIFICATION ERROR:", notificationErr.message);
        });
      });
    }

    if (postContent) {
      addUserTopicWeight(userId, postContent, 7, () => {});
    }

    trackRecommendationEvent({
      userId,
      postId,
      targetUserId: ownerUserId || null,
      eventType: "share",
      weight: 2
    });

    return res.json({ success: true, shared: true });
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
    return res.status(503).json({ error: "Database is not enabled for post reports." });
  }

  db.query("SELECT id FROM posts WHERE id = ? LIMIT 1", [postId], (postCheckErr, postRows) => {
    if (postCheckErr) {
      console.error("REPORT POST CHECK ERROR:", postCheckErr);
      return res.status(500).json({ error: postCheckErr.message });
    }

    if (!postRows?.length) {
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

app.post("/api/posts/:id/viewer-discretion", (req, res) => {
  const postId = Number(req.params.id);
  const value = req.body?.viewer_discretion !== undefined && req.body?.viewer_discretion !== null
    ? Number(Boolean(Number(req.body.viewer_discretion)))
    : 0;

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!isDbEnabled()) {
    return res.status(503).json({ error: "Database is not enabled for manual viewer discretion updates." });
  }

  db.query("UPDATE posts SET viewer_discretion = ? WHERE id = ?", [value, postId], (err, result) => {
    if (err) {
      console.error("VIEWER DISCRETION UPDATE ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json({
      success: true,
      post_id: postId,
      viewer_discretion: value
    });
  });
});

function buildNestedCommentTree(comments) {
  const safeComments = Array.isArray(comments) ? comments : [];
  const commentsById = new Map();
  const roots = [];

  safeComments.forEach((comment) => {
    const normalized = {
      ...comment,
      id: Number(comment.id),
      post_id: Number(comment.post_id),
      reply_to: comment.reply_to != null ? Number(comment.reply_to) : null,
      like_count: Number(comment.like_count || comment.likes_count || 0),
      reply_count: Number(comment.reply_count || 0),
      replies: []
    };

    commentsById.set(String(normalized.id), normalized);
  });

  safeComments.forEach((comment) => {
    const normalized = commentsById.get(String(comment.id));
    if (!normalized) {
      return;
    }

    const parentId = normalized.reply_to != null ? String(normalized.reply_to) : null;
    if (parentId && commentsById.has(parentId)) {
      const parent = commentsById.get(parentId);
      if (parent) {
        parent.replies.push(normalized);
      }
    } else {
      roots.push(normalized);
    }
  });

  const sortReplies = (list) =>
    [...list].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .map((item) => ({
        ...item,
        replies: sortReplies(item.replies || [])
      }));

  return sortReplies(roots).map((comment) => ({
    ...comment,
    reply_count: Number(comment.reply_count || comment.replies.length || 0)
  }));
}

app.get("/api/comments/:postId", (req, res) => {
  const postId = Number(req.params.postId);

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!isDbEnabled()) {
    const comments = buildNestedCommentTree(
      normalizeCommentRows(inMemoryComments)
        .filter((comment) => Number(comment.post_id) === postId)
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        .map((comment) => ({
          ...comment,
          reply_count: Number(comment.reply_count || 0),
          like_count: Number(comment.like_count || 0),
          reply_to: comment.reply_to ?? null,
          replies: Array.isArray(comment.replies) ? comment.replies : []
        }))
    );

    return res.json(comments);
  }

  db.query("SELECT user_id, comments_disabled FROM posts WHERE id = ? LIMIT 1", [postId], (postErr, postRows) => {
    if (postErr) {
      console.error("COMMENT CHECK POST ERROR:", postErr);
      return res.status(500).json({ error: postErr.message });
    }

    const post = postRows && postRows[0] ? postRows[0] : null;
    if (post && Number(post.comments_disabled || 0) === 1) {
      return res.json([]);
    }

    db.query(
      `
        SELECT c.*, 
          u.name,
          u.first_name,
          u.last_name,
          u.profile_pic,
          CONCAT(COALESCE(u.first_name, ''), IF(COALESCE(u.last_name, '') = '', '', CONCAT(' ', u.last_name))) AS user_name,
          COALESCE((SELECT COUNT(*) FROM comments reply WHERE reply.reply_to = c.id), 0) AS reply_count,
          COALESCE((SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id), 0) AS like_count
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id AND u.is_hidden = 0 AND u.account_status = 'active'
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `,
      [postId],
      (err, results) => {
        if (err) {
          console.error("DB COMMENT SELECT ERROR:", err);
          return res.status(500).json({ error: err.message });
        }

        const comments = buildNestedCommentTree((results || []).map((comment) => ({
          ...comment,
          user_name: comment.user_name || comment.name || comment.first_name || "User",
          profile_pic: comment.profile_pic || null,
          created_at: comment.created_at || new Date().toISOString(),
          reply_count: Number(comment.reply_count || 0),
          like_count: Number(comment.like_count || 0),
          reply_to: comment.reply_to ?? null,
          replies: []
        })));

        return res.json(comments);
      }
    );
  });
});

app.post("/api/comments", (req, res) => {
  const { post_id, user_id, content, reply_to } = req.body || {};
  const safePostId = Number(post_id);
  const safeUserId = user_id ? String(user_id) : "anonymous";
  const safeContent = String(content || "").trim();
  const safeReplyTo = reply_to !== undefined && reply_to !== null && reply_to !== "" ? Number(reply_to) : null;

  if (!Number.isFinite(safePostId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!safeContent) {
    return res.status(400).json({ error: "Missing comment text" });
  }

  if (safeReplyTo !== null && !Number.isFinite(safeReplyTo)) {
    return res.status(400).json({ error: "Invalid reply target" });
  }

  db.query("SELECT user_id, comments_disabled, followers_comments_only FROM posts WHERE id = ? LIMIT 1", [safePostId], (postCheckErr, postRows) => {
    if (postCheckErr) {
      console.error("COMMENT POLICY CHECK ERROR:", postCheckErr);
      return res.status(500).json({ error: postCheckErr.message });
    }

    const post = postRows && postRows[0] ? postRows[0] : null;
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const shouldBlockComments = Number(post.comments_disabled || 0) === 1;
    const followersOnlyComments = Number(post.followers_comments_only || 0) === 1;
    const isAuthor = String(post.user_id) === String(safeUserId);

    if (shouldBlockComments) {
      return res.status(403).json({ error: "Comments are disabled for this post." });
    }

    if (followersOnlyComments && !isAuthor) {
      db.query("SELECT 1 FROM follows WHERE user_id = ? AND following_user_id = ? LIMIT 1", [safeUserId, post.user_id], (followErr, followRows) => {
        if (followErr) {
          console.error("COMMENT FOLLOW CHECK ERROR:", followErr);
          return res.status(500).json({ error: followErr.message });
        }

        if (!followRows || !followRows.length) {
          return res.status(403).json({ error: "Only followers can comment on this post." });
        }

        continueCommentCreate();
      });
      return;
    }

    continueCommentCreate();
  });

  function continueCommentCreate() {
    if (!isDbEnabled()) {
      const comment = {
        id: Date.now(),
        user_id: safeUserId,
        post_id: safePostId,
        comment: safeContent,
        reply_to: safeReplyTo,
        like_count: 0,
        reply_count: 0,
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
        "INSERT INTO comments (user_id, post_id, comment, reply_to) VALUES (?, ?, ?, ?)",
        [safeUserId, safePostId, safeContent, safeReplyTo],
        (err, results) => {
          if (err) {
            console.error("DB COMMENT INSERT ERROR:", err);
            return res.status(500).json({ error: err.message });
          }

          db.query("SELECT user_id, content FROM posts WHERE id = ? LIMIT 1", [safePostId], (postErr, postRows) => {
            if (!postErr && postRows?.[0]) {
              if (String(postRows[0].content || "").trim()) {
                addUserTopicWeight(safeUserId, String(postRows[0].content || ""), 6, () => {});
              }
              trackRecommendationEvent({
                userId: safeUserId,
                postId: safePostId,
                targetUserId: String(postRows[0].user_id || "").trim() || null,
                eventType: "comment",
                weight: 1.5
              });
            }
            if (!postErr && postRows?.[0] && String(postRows[0].user_id) !== String(safeUserId)) {
              insertNotification({
                recipient_user_id: postRows[0].user_id,
                actor_user_id: safeUserId,
                type: "comment",
                target_type: "post",
                target_id: String(safePostId),
                message: `${req.body?.name || "Someone"} commented on your post.`
              }).catch((notificationErr) => {
                console.warn("COMMENT NOTIFICATION ERROR:", notificationErr.message);
              });
            }

            return res.json({
              success: true,
              comment: {
                id: results.insertId,
                user_id: safeUserId,
                post_id: safePostId,
                comment: safeContent,
                reply_to: safeReplyTo,
                like_count: 0,
                reply_count: 0,
                created_at: new Date().toISOString()
              }
            });
          });
        }
      );
    });
  }
});

app.post("/api/comments/:id/like", (req, res) => {
  const commentId = Number(req.params.id);
  const userId = req.body?.user_id || req.query?.user_id;

  if (!Number.isFinite(commentId)) {
    return res.status(400).json({ error: "Invalid comment id" });
  }

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!isDbEnabled()) {
    return res.status(503).json({ error: "Database is not enabled for comment likes." });
  }

  db.query("SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ? LIMIT 1", [commentId, String(userId)], (selectErr, likeRows) => {
    if (selectErr) {
      console.error("COMMENT LIKE SELECT ERROR:", selectErr);
      return res.status(500).json({ error: selectErr.message });
    }

    const alreadyLiked = Boolean(likeRows?.length);
    const operation = alreadyLiked
      ? "DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?"
      : "INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)";

    db.query(operation, [commentId, String(userId)], (opErr) => {
      if (opErr) {
        console.error("COMMENT LIKE TOGGLE ERROR:", opErr);
        return res.status(500).json({ error: opErr.message });
      }

      db.query("SELECT COUNT(*) AS total_likes FROM comment_likes WHERE comment_id = ?", [commentId], (countErr, countRows) => {
        if (countErr) {
          console.error("COMMENT LIKE COUNT ERROR:", countErr);
          return res.status(500).json({ error: countErr.message });
        }

        const likeCount = Number(countRows?.[0]?.total_likes || 0);
        db.query("UPDATE comments SET like_count = ? WHERE id = ?", [likeCount, commentId], (updateErr) => {
          if (updateErr) {
            console.error("COMMENT LIKE UPDATE ERROR:", updateErr);
            return res.status(500).json({ error: updateErr.message });
          }

          if (!alreadyLiked) {
            db.query("SELECT c.user_id, c.post_id FROM comments c WHERE c.id = ? LIMIT 1", [commentId], (commentUserErr, commentUserRows) => {
              if (!commentUserErr && commentUserRows?.[0] && String(commentUserRows[0].user_id) !== String(userId)) {
                insertNotification({
                  recipient_user_id: commentUserRows[0].user_id,
                  actor_user_id: userId,
                  type: "comment_like",
                  target_type: "comment",
                  target_id: String(commentId),
                  message: `${req.body?.name || "Someone"} liked your comment.`
                }).catch((notificationErr) => {
                  console.warn("COMMENT LIKE NOTIFICATION ERROR:", notificationErr.message);
                });
              }

              if (commentUserRows?.[0]) {
                trackRecommendationEvent({
                  userId,
                  postId: commentUserRows[0].post_id,
                  targetUserId: commentUserRows[0].user_id,
                  eventType: "comment_like",
                  weight: 1.2
                });
              }

              return res.json({
                success: true,
                liked: true,
                likeCount,
                status: "liked"
              });
            });
            return;
          }

          return res.json({
            success: true,
            liked: false,
            likeCount,
            status: "unliked"
          });
        });
      });
    });
  });
});

app.delete("/api/posts/:id", (req, res) => {
  const postId = Number(req.params.id);
  const requestingUserId = req.body?.user_id || req.query?.user_id || null;

  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!isDbEnabled()) {
    return res.status(400).json({ error: "Database is disabled; delete is unavailable while using local-only mode." });
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
  const viewerDiscretion = req.body?.viewer_discretion !== undefined && req.body?.viewer_discretion !== null
    ? Number(Boolean(Number(req.body.viewer_discretion)))
    : 0;
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
      viewer_discretion: viewerDiscretion,
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
    INSERT INTO posts (user_id, content, media_type, viewer_discretion)
    VALUES (?, ?, 'text', ?)
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

    db.query(query, [String(safeUserId), safeContent, viewerDiscretion], (err, results) => {
      if (err) {
        console.error("TEXT POST ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      savePostTopics(results.insertId, safeContent, "keyword", (topicErr) => {
        if (topicErr) {
          console.warn("TEXT POST TOPIC SAVE ERROR:", topicErr.message || topicErr);
        }
      });

      res.json({
        id: results.insertId,
        success: true,
        viewer_discretion: viewerDiscretion
      });
    });
  });
});

initializeDatabaseSchema();

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});


function insertNotification({
  recipient_user_id,
  actor_user_id,
  type,
  target_type,
  target_id,
  message
}) {
  if (!recipient_user_id || !actor_user_id || recipient_user_id === actor_user_id) return;

  return new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO notifications
       (recipient_user_id, actor_user_id, type, target_type, target_id, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recipient_user_id, actor_user_id, type, target_type, String(target_id || ""), message],
      (err, result) => err ? reject(err) : resolve(result)
    );
  });
}
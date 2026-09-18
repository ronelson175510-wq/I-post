const fs = require("fs");
const mysql = require("mysql2");

const isRemoteDb = Boolean(
  process.env.DB_HOST &&
  process.env.DB_HOST !== "127.0.0.1" &&
  process.env.DB_HOST !== "localhost"
);

const hasDbConfig =
  process.env.DB_ENABLED === "true" ||
  Boolean(process.env.DB_HOST || process.env.DB_USER || process.env.DB_NAME || process.env.DB_PASSWORD);

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bookme",
  port: Number(process.env.DB_PORT || 3306),
  multipleStatements: true
};

if (isRemoteDb) {
  const sslOptions = {
    rejectUnauthorized: false
  };

  if (process.env.DB_SSL_CA && fs.existsSync(process.env.DB_SSL_CA)) {
    sslOptions.ca = fs.readFileSync(process.env.DB_SSL_CA);
    sslOptions.rejectUnauthorized = true;
  }

  dbConfig.ssl = sslOptions;
}

const db = hasDbConfig
  ? mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000
    })
  : null;

if (db) {
  db.on("connection", () => {
    console.log("MySQL connected!");
  });

  db.on("error", (err) => {
    console.error("MySQL pool error:", err.message);
  });
} else {
  console.log("Database not enabled. Running without MySQL.");
}

module.exports = {
  db,
  isDbEnabled: () => Boolean(db)
};
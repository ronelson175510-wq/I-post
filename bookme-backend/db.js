const mysql = require("mysql2");

const hasDbConfig =
  process.env.DB_ENABLED === "true" ||
  Boolean(process.env.DB_HOST || process.env.DB_USER || process.env.DB_NAME || process.env.DB_PASSWORD);

const db = hasDbConfig
  ? mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "bookme",
      port: Number(process.env.DB_PORT || 3306)
    })
  : null;

if (db) {
  db.connect(err => {
    if (err) {
      console.error("MySQL not connected yet:", err.message);
      return;
    }

    console.log("MySQL connected!");
  });
} else {
  console.log("Database not enabled. Running without MySQL.");
}

module.exports = {
  db,
  isDbEnabled: () => Boolean(db)
};
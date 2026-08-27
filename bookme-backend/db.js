const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bookme",
  port: Number(process.env.DB_PORT || 3306)
});

db.connect(err => {
  if (err) {
    console.error("MySQL not connected yet:", err.message);
    return;
  }

  console.log("MySQL connected!");
});

module.exports = db;
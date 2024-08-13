const path = require("path")
const sqlite3 = require("sqlite3")

const dbPath = path.join('./transactions.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    duration INTEGER,
                                                    created_at TEXT,
                                                    expires_at TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               first_name TEXT,
                                               last_name TEXT,
                                               phone_number TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    client_id INTEGER,
                                                    from_date TEXT,
                                                    to_date TEXT,
                                                    price REAL,
                                                    FOREIGN KEY (client_id) REFERENCES clients(id)
            )
    `);
});


module.exports = db
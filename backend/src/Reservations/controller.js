const express = require("express");
const router = express.Router();
const db = require("../dbController");

router.get("/", async (req, res) => {
    try {
        db.all('SELECT * FROM reservations', [], (err, rows) => {
            if (err || rows == null) {
                console.error('Error fetching reservations:', err);
                res.status(500).json({error: err});
            } else {
                res.json(rows);
            }
        });
    } catch (e) {
        res.status(500).json({error: e});
    }
});

router.get("/search", async (req, res) => {
    const { q } = req.query;
    try {
        db.all(`
            SELECT r.id,
                   c.first_name || ' ' || c.last_name AS client_name,
                   r.from_date,
                   r.to_date,
                   r.price,
                   c.phone_number AS client_number
            FROM reservations r
                     JOIN clients c ON r.client_id = c.id
            WHERE c.first_name LIKE ? OR c.last_name LIKE ?
        `, [`%${q}%`, `%${q}%`], (err, rows) => {
            if (err || rows == null) {
                console.error('Error searching reservations:', err);
                res.status(500).json({error: err});
            } else {
                res.json(rows);
            }
        });
    } catch (e) {
        res.status(500).json({error: e});
    }
});

router.post("/add-reservation", async (req, res) => {
    const { clientId, fromDate, toDate, price } = req.body;
    try {
        db.run('INSERT INTO reservations (client_id, from_date, to_date, price) VALUES (?, ?, ?, ?)', [clientId, fromDate, toDate, price], function(err) {
            if (err) {
                console.error('Error inserting reservation:', err);
                res.status(500).json({error: err});
            } else {
                console.log('Reservation created successfully.');
                res.json({ clientId, fromDate, toDate, price, id: this.lastID });
            }
        });
    } catch (e) {
        res.status(500).json({error: e});
    }
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const reservationQuery = `
            SELECT r.id,
                   c.first_name,
                   c.last_name,
                   r.from_date,
                   r.to_date,
                   r.price
            FROM reservations r
            JOIN clients c ON r.client_id = c.id
            WHERE r.id = ?
        `;

        db.get(reservationQuery, [id], (err, row) => {
            if (err || row == null) {
                console.error('Error fetching reservation:', err);
                res.status(500).json({error: err});
            } else if (!row) {
                res.status(404).json({error: 'Reservation not found'});
            } else {
                res.json(row);
            }
        });
    } catch (e) {
        res.status(500).json({error: e});
    }
});

module.exports = router;

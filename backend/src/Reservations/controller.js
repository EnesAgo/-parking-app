const express = require("express");
const router = express.Router()

const db = require("../dbController")
router.get("/", async (req, res) => {

    try{

        db.all('SELECT * FROM reservations', [], (err, rows) => {
            if (err) {
                console.error('Error fetching reservations:', err);
                res.json({error: err}).status(500)
            } else {
                res.json(rows)
            }
        });

    } catch (e) {
        res.json({error: e}).status(500)
    }

})

router.get("/search", async (req, res) => {
    const {q} = req.query

    try {

        db.all(`
            SELECT r.id,
                   c.first_name || ' ' || c.last_name AS client_name,
                   r.from_date,
                   r.to_date,
                   r.price ,
                   c.phone_number as client_number
            FROM reservations r
                     JOIN clients c ON r.client_id = c.id
            WHERE c.first_name LIKE ? OR c.last_name LIKE ?
        `, [`%${q}%`, `%${q}%`], (err, rows) => {
            if (err) {
                console.error('Error searching reservations:', err);
                res.json([])
            } else {
                res.json(rows)
            }
        });

    } catch (e) {
        res.json({error: e}).status(500)
    }
})

router.post("/add-reservation", async (req, res) => {
    const { clientId, fromDate, toDate, price } = req.body;

    try{
        db.run('INSERT INTO reservations (client_id, from_date, to_date, price) VALUES (?, ?, ?, ?)', [clientId, fromDate, toDate, price], function(err) {
            if (err) {
                console.error('Error inserting reservation:', err);
                res.json({error: err}).status(500)
            } else {
                console.log('Reservation created successfully.');
                res.json({ clientId, fromDate, toDate, price, id: this.lastID })
            }
        });
    } catch (e) {
        res.json({error: e}).status(500)
    }
})

module.exports = router
const express = require("express");
const router = express.Router()
const moment = require('moment-timezone');

const db = require("../dbController")

router.get("/", async (req, res) => {

    const id = req.params.id

    try{

        db.all('SELECT * FROM transactions', [], (err, row) => {
            if (err || row == null) {
                console.error('Error fetching transaction:', err);
                res.json({error: err}).status(500)
            } else {
                res.json({data: {...row, date:moment(row.created_at).format('DD-MM-YYYY HH:mm:ss')}})
            }
        });

    } catch (e) {
        res.json({error: e}).status(500)
    }

})
router.get("/:id", async (req, res) => {

    const id = req.params.id

    try{

        db.get('SELECT * FROM transactions WHERE id = ?', [id], (err, row) => {
            if (err || row == null) {
                console.error('Error fetching transaction:', err);
                res.json({error: err}).status(500)
            } else {
                res.json({data: {...row, date:moment(row.created_at).format('DD-MM-YYYY HH:mm:ss')}})
            }
        });

    } catch (e) {
        res.json({error: e}).status(500)
    }

})

router.post("/add-transaction", async (req, res) => {
    const { duration } = req.body;
    const formattedCreatedAt = moment().tz('Europe/Skopje').format('YYYY-MM-DD HH:mm:ss');
    const expiresAtFormatted = duration > 0
        ? moment(formattedCreatedAt).add(duration, 'hours').format('YYYY-MM-DD HH:mm:ss')
        : null;

    try {
        db.run('INSERT INTO transactions (duration, created_at, expires_at) VALUES (?, ?, ?)', [duration, formattedCreatedAt, expiresAtFormatted], function(err) {
            if (err) {
                console.error('Error inserting transaction:', err);
                return res.status(500).json({ error: err.message });
            } else {
                const transactionId = this.lastID;
                console.log('Transaction inserted successfully.');
                return res.status(200).json({
                    data: {
                        duration,
                        createdAt: formattedCreatedAt,
                        expiresAt: expiresAtFormatted,
                        transactionId
                    }
                });
            }
        });
    } catch (e) {
        console.error('Unexpected error:', e);
        return res.status(500).json({ error: e.message });
    }
});



module.exports = router
const express = require("express");
const router = express.Router()

const db = require("../dbController")
router.get("/", async (req, res) => {

    try{

        db.all('SELECT * FROM clients', [], (err, rows) => {
            if (err) {
                console.error('Error fetching clients:', err);
                res.json({error: err}).status(500)
            } else {
                res.json(rows)
            }
        });

    } catch (e) {
        res.json({error: e}).status(500)
    }

})

router.post("/add-client", async (req, res) => {
    const { firstName, lastName, phoneNumber } = req.body;

    try{
        db.run('INSERT INTO clients (first_name, last_name, phone_number) VALUES (?,?,?)', [firstName, lastName, phoneNumber], function(err) {
            if (err) {
                console.error('Error inserting client:', err);
                res.json({error: err}).status(500)
            } else {
                console.log('Client inserted successfully.');
                db.all('SELECT * FROM clients', [], (err, rows) => {
                    if (err) {
                        console.error('Error fetching clients:', err);
                        res.json({error: "Error fetching clients:", err: err})
                    } else {
                        res.json(rows)
                    }
                });
            }
        });
    } catch (e) {
        res.json({error: e}).status(500)
    }
})

module.exports = router
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json({ limit: '10000mb' }));

const clientRouter = require("./src/Clients/controller");
const transactionRouter = require("./src/Transactions/controller");
const reservationRouter = require("./src/Reservations/controller");
const uploadRouter = require("./src/upload");

app.get("/", (req, res) => {
    res.json("Hello World!");
});

app.use('/clients', clientRouter);
app.use('/transactions', transactionRouter);
app.use('/reservations', reservationRouter);
app.use('/upload', uploadRouter);

const PORT = process.env.PORT || 3001;
const TOKEN = process.env.ACCESS_TOKEN;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    scheduleUploads();
});

function uploadDatabase() {
    const dbPath = path.join(__dirname, 'transactions.db');
    const uploadUrl = 'https://parkingmeta.mk/upload.php';

    fs.readFile(dbPath, (err, fileData) => {
        if (err) {
            console.error('Error reading the database file:', err);
            return;
        }

        const formData = new FormData();
        formData.append('file', new Blob([fileData]), 'transactions.db');

        fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + TOKEN
            },
            body: formData
        })
            .then(response => response.text())
            .then(data => {
                console.log('Database file uploaded successfully:', data);
            })
            .catch(error => {
                console.error('Error uploading database file:', error);
            });
    });
}

function scheduleUploads() {
    setTimeout(() => {
        uploadDatabase();
        setInterval(uploadDatabase, 12 * 60 * 60 * 1000);
    }, 12 * 60 * 60 * 1000);
}

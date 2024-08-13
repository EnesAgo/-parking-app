const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');



require('dotenv').config()

const app = express();

//cors
app.use(cors({
    origin: "*",
    methods: ["GET","POST","PUT","DELETE"]
}))

// app.use(express.static('public'));
app.use(express.json({limit: '10000mb'}));

const clientRouter = require("./src/Clients/controller")
const transactionRouter = require("./src/Transactions/controller")
const reservationRouter = require("./src/Reservations/controller")

app.get("/", (req, res) => {
    res.json("hello world")
})


app.use('/clients', clientRouter)
app.use('/transactions', transactionRouter)
app.use('/reservations', reservationRouter)


app.listen(process.env.PORT || 3001 );
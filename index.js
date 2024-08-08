const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment-timezone');

const dbPath = path.join(app.getAppPath(), 'transactions.db');
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
            full_name TEXT,
            phone_number TEXT
        )
    `);
});

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    win.loadFile('index.html');

    ipcMain.on('store-transaction', (event, data) => {
        const { duration, expiresAt } = data;
        const formattedCreatedAt = moment().tz('Europe/Skopje').format('YYYY-MM-DD HH:mm:ss');
        const expiresAtFormatted = duration > 0 ? moment(expiresAt).tz('Europe/Skopje').format('YYYY-MM-DD HH:mm:ss') : null;

        db.run('INSERT INTO transactions (duration, created_at, expires_at) VALUES (?, ?, ?)', [duration, formattedCreatedAt, expiresAtFormatted], function(err) {
            if (err) {
                console.error('Error inserting transaction:', err);
                event.reply('store-transaction-reply', { success: false, error: err.message });
            } else {
                const transactionId = this.lastID;
                console.log('Transaction inserted successfully.');
                event.reply('store-transaction-reply', { success: true, id: transactionId });
                if (duration > 0) {
                    printTicket(duration, formattedCreatedAt, expiresAtFormatted);
                } else {
                    printTicket(duration, formattedCreatedAt, null);
                }
            }
        });
    });

    ipcMain.on('get-transaction', (event, data) => {
        db.get('SELECT * FROM transactions WHERE id = ?', [data.id], (err, row) => {
            if (err || row == undefined) {
                console.error('Error fetching transaction:', err);
                event.reply('get-transaction-reply', { success: false, error: err?.message || "not found" });
            } else {
                const { ticketExpired, hoursExpired, extraCharge } = isTicketExpired(row.expires_at);
                const ticketData = {
                    ...row,
                    date: moment(row.created_at).format('DD-MM-YYYY HH:mm:ss'),
                    ticketExpired,
                    hoursExpired,
                    extraCharge
                };
                event.reply('get-transaction-reply', { success: true, transaction: ticketData });
            }
        });
    });

    ipcMain.on('print-ticket', (event, ticketContent) => {
        win.webContents.send('print-ticket-renderer', ticketContent);
        win.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
            if (!success) {
                console.error(`Printing failed. Error: ${errorType}`);
            }
        });
    });

    ipcMain.on('add-client', (event, data) => {
        const { firstName, lastName, phoneNumber } = data;

        const fullName = `${firstName} ${lastName}`
        console.log(fullName)

        db.run('INSERT INTO clients (first_name, last_name, full_name, phone_number) VALUES (?, ?, ?, ?)', [firstName, lastName, fullName, phoneNumber], function(err) {
            if (err) {
                console.error('Error inserting client:', err);
            } else {
                console.log('Client inserted successfully.');
            }
        });
    });


    ipcMain.on('get-client', (event, data) => {
        db.all('SELECT * FROM clients WHERE full_name LIKE ?', [`%${data.fullName}%`], (err, row) => {
            if (err || row == undefined) {
                console.error('Error fetching transaction:', err);
                event.reply('get-client-reply', { success: false, error: err?.message || "not found" });
            } else {
                console.log(row)
                event.reply('get-client-reply', { success: true, data: row });
            }
        });
    });



    win.on('closed', () => {
        db.close();
    });
}

function isTicketExpired(expirationTime) {
    const now = moment();
    const expiresAt = moment(expirationTime);
    const hoursExpired = expiresAt.isBefore(now) ? now.diff(expiresAt, 'hours') : 0;
    const ticketExpired = hoursExpired > 0;
    const extraCharge = ticketExpired ? hoursExpired * 100 : 0;
    return { ticketExpired, hoursExpired, extraCharge };
}

function printTicket(duration, createdAt, expiresAt) {
    const formattedCreatedAt = moment(createdAt).format('HH:mm');
    const formattedExpiresAt = expiresAt ? moment(expiresAt).format('HH:mm') : '';
    const dateToday = moment().format('DD.MM.YYYY');

    let ticketContentOnly = `
        <html>
        <head>
            <title>Parking Ticket</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .ticket { text-align: center; }
                h1, h3 { margin: 5px; }
                .box { display: block; margin: 10px auto; width: 150px; height: 150px; border: 2px solid black; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <h1>Parking Meta</h1>
                <h3>${dateToday}</h3>
                <div class="box"></div>
                <h3>Time Created: ${formattedCreatedAt}</h3>
    `;

    if (duration > 0) {
        ticketContentOnly += `
            <h3>Duration: ${duration} hour${duration > 1 ? 's' : ''}</h3>
            <h3>Expiring At: ${formattedExpiresAt}</h3>
        `;
    }

    ticketContentOnly += `
            </div>
        </body>
        </html>
    `;

    ipcMain.emit('print-ticket', ticketContentOnly);
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

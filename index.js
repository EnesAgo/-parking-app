const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment-timezone');
const QRCode = require("qrcode")

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
        const expiresAtFormatted = moment(expiresAt).tz('Europe/Skopje').format('YYYY-MM-DD HH:mm:ss');

        db.run('INSERT INTO transactions (duration, created_at, expires_at) VALUES (?, ?, ?)', [duration, formattedCreatedAt, expiresAtFormatted], function(err) {
            if (err) {
                console.error('Error inserting transaction:', err);
                event.reply('store-transaction-reply', { success: false, error: err.message });
            } else {
                console.log('Transaction inserted successfully.');
                event.reply('store-transaction-reply', { success: true });
                printTicket(duration, formattedCreatedAt, expiresAtFormatted);
            }
        });
    });

    ipcMain.on('get-transaction', (event, data) => {
        db.get('SELECT * FROM transactions WHERE id = ?', [data.id], (err, row) => {
            if (err) {
                console.error('Error fetching transaction:', err);
                event.reply('get-transaction-reply', { success: false, error: err.message });
            } else {
                const hoursDiff = calculateHoursDifference(row.created_at, row.expires_at);
                event.reply('get-transaction-reply', { success: true, transaction: row, hoursDiff });
            }
        });
    });

    ipcMain.on('print-ticket', (event, ticketContent) => {
        // win.webContents.send('print-ticket-renderer', ticketContent);

        setTimeout(() => {
            win.webContents.send('print-ticket-renderer', ticketContent);
            win.webContents.print({ silent: true, printBackground: true }, (success, errorType) => {
                if (!success) {
                    console.error(`Printing failed. Error: ${errorType}`);
                }
            });
        }, 3000);
    });

    win.on('closed', () => {
        db.close();
    });
}

function printTicket(duration, createdAt, expiresAt) {
    const formattedCreatedAt = moment(createdAt).format('HH:mm');
    const formattedExpiresAt = moment(expiresAt).format('HH:mm');
    const dateToday = moment().format('DD.MM.YYYY');

        const ticketContentOnly = `
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
                    <div class="box">
                        <h3>helloo</h3>
<!--                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" shape-rendering="crispEdges"><path fill="#ffffff" d="M0 0h29v29H0z"/><path stroke="#000000" d="M4 4.5h7m2 0h1m1 0h1m2 0h7M4 5.5h1m5 0h1m1 0h3m1 0h1m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m2 0h3m2 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m2 0h1m1 0h2m1 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h5m1 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m2 0h3m2 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h7M14 11.5h1M4 12.5h1m1 0h1m1 0h1m1 0h1m2 0h1m2 0h1m3 0h1m2 0h1M4 13.5h1m1 0h4m4 0h2m1 0h1m1 0h1m1 0h1m1 0h1M7 14.5h1m2 0h2m3 0h1m1 0h3m2 0h1m1 0h1M4 15.5h3m4 0h1m1 0h5m1 0h3m1 0h2M4 16.5h1m1 0h1m2 0h3m3 0h1m1 0h3m2 0h3M12 17.5h1m5 0h1m3 0h1M4 18.5h7m5 0h1m3 0h1M4 19.5h1m5 0h1m7 0h1m3 0h2M4 20.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1M4 21.5h1m1 0h3m1 0h1m2 0h3m1 0h1m1 0h1m1 0h1m1 0h1M4 22.5h1m1 0h3m1 0h1m1 0h2m1 0h1m1 0h3m1 0h2m1 0h1M4 23.5h1m5 0h1m3 0h4m1 0h3M4 24.5h7m1 0h1m1 0h2m1 0h3m1 0h2m1 0h1"/></svg>-->
                    </div>
                   
                    
                    <h3>Time Created: ${formattedCreatedAt}</h3>
                    <h3>Duration: ${duration} hour${duration > 1 ? 's' : ''}</h3>
                    <h3>Expiring At: ${formattedExpiresAt}</h3>

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

function calculateHoursDifference(start, end) {
    const startTime = moment(start);
    const endTime = moment(end);
    return endTime.diff(startTime, 'hours');
}

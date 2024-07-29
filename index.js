const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment-timezone');

const dbPath = path.join(app.getAppPath(), 'transactions.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(
        `CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            duration INTEGER,
            created_at TEXT,
            expires_at TEXT
        )`
    );
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
                const transactionId = this.lastID;
                console.log('Transaction inserted successfully.');
                event.reply('store-transaction-reply', { success: true, id: transactionId });
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
        setTimeout(() => {
            win.webContents.send('print-ticket-renderer', ticketContent);
            win.webContents.print({ silent: true, printBackground: true }, (success, errorType) => {
                if (!success) {
                    console.error(`Printing failed. Error: ${errorType}`);
                }
            });
        }, 2000);
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

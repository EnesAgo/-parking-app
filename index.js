try {
    require('electron-reloader')(module)
} catch (_) {}


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
            }
        });
    });

    ipcMain.on('get-transaction', (event, data) => {
        console.log(data.id)
        db.get('SELECT * FROM transactions WHERE id = ?', [data.id], (err, row) => {
            if (err) {
                console.error('Error fetching transaction:', err);
                event.reply('get-transaction-reply', { success: false, error: err.message });
            } else {
                console.log(row)
                const currentTime = moment(new Date())
                const expireDate = moment(row.expires_at)

                if(moment(currentTime).isAfter(moment(row.expires_at))){
                    let hoursDiff = currentTime.diff(expireDate, 'hours');
                    console.log(hoursDiff)
                    event.reply('get-transaction-reply', { success: true, transaction: {...row, hoursDiff: hoursDiff}});
                } else{
                    event.reply('get-transaction-reply', { success: true, transaction: {...row, hoursDiff: 0} });

                }

            }
        });
    });

    win.on('closed', () => {
        db.close();
    });
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

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
                                               phone_number TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    client_id INTEGER,
                                                    from_date TEXT,
                                                    to_date TEXT,
                                                    price REAL,
                                                    FOREIGN KEY (client_id) REFERENCES clients(id)
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

        db.run('INSERT INTO clients (first_name, last_name, phone_number) VALUES (?,?,?)', [firstName, lastName, phoneNumber], function(err) {
            if (err) {
                console.error('Error inserting client:', err);
            } else {
                console.log('Client inserted successfully.');
                event.reply('add-client-reply', { success: true });
                db.all('SELECT * FROM clients', [], (err, rows) => {
                    if (err) {
                        console.error('Error fetching clients:', err);
                    } else {
                        event.sender.send('update-client-list', rows);
                    }
                });
            }
        });
    });

    ipcMain.on('get-clients', (event) => {
        db.all('SELECT * FROM clients', [], (err, rows) => {
            if (err) {
                console.error('Error fetching clients:', err);
                event.reply('load-clients', []);
            } else {
                event.reply('load-clients', rows);
            }
        });
    });

    const QRCode = require('qrcode');

    function generateQRCode(qrID) {
        return new Promise((resolve, reject) => {
            QRCode.toString(qrID, { type: 'svg' }, (err, svg) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(svg);
                }
            });
        });
    }


    async function printReservationTicket(reservationId) {
        try {
            const reservationQuery = `SELECT r.id, c.first_name, c.last_name, c.phone_number, r.from_date, r.to_date, r.price
                                  FROM reservations r
                                  JOIN clients c ON r.client_id = c.id
                                  WHERE r.id = ?`;
            db.get(reservationQuery, [reservationId], async (err, row) => {
                if (err) {
                    console.error('Error fetching reservation:', err);
                    return;
                }

                const countDays = Math.abs(moment(row.from_date).diff(moment(row.to_date), 'days'))+1
                const formattedFromDate = moment(row.from_date).format('DD.MM.YYYY HH:mm');
                const formattedToDate = moment(row.to_date).format('DD.MM.YYYY HH:mm');
                const dateToday = moment().format('DD.MM.YYYY');
                const qrID = row.id.toString();

                const qrCodeSvg = await generateQRCode(qrID);

                let ticketContent = `
                <html>
                <head>
                    <title>Parking Ticket</title>
                    <style>
                        html,body {
                            width: 100%;
                            height: 100%
                        }
                        body {
                            font-family: Poppins;
                            font-size: 16px;
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        }
                        .ticket {
                            text-align: center;
                            width: 100%;
                            height: 100%;
                            padding: 20px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 20px;
                        }

                    </style>
                </head>
                <body>
                    <div class="ticket">                        
                        <p style="font-size:40px;font-weight:900;text-align:center;margin:0;">Parking Meta</p>
                        <p style="text-align: center;margin:0;font-size:30px">${dateToday}</p>
                        <div class="box" style="margin:0; display:flex; justify-content:center; width:200px">${qrCodeSvg}</div>
                        <p style="text-align: center;margin:0;font-size:30px;font-weight:700;">Client: ${row.first_name} ${row.last_name}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin:0;width:100%; height:30px";><h3 style="font-size:20px">Start Date:</h3><p style="font-weight:700;font-size:25px">${formattedFromDate}</p></div>
                       <div style="display:flex;justify-content:space-between;align-items:center;margin:0;width:100%; height:30px;"><h3 style="font-size:20px">End Date:</h3><p style="font-weight:700; font-size:25px;">${formattedToDate}</p></div>
                       <div style="display:flex;justify-content:space-between;align-items:center;margin:0;width:100%; height:30px;"><h3 style="font-size:20px">Days:</h3><p style="font-weight:700; font-size:25px;">${countDays}</p></div>
                       <div style="display:flex;justify-content:space-between;align-items:center;margin:0;width:100%; height:30px;"><h3 style="font-size:20px">Price:</h3><p style="font-weight:700; font-size:25px;">${Math.round(row.price)} mkd</p></div>
                </div>
                </body>
                </html>
            `;

                let ticketWindow = new BrowserWindow({
                    width: 350,
                    height: 600,
                    title: 'Print Ticket',
                    show: false,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false
                    }
                });

                ticketWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(ticketContent)}`);

                ticketWindow.webContents.on('did-finish-load', () => {
                    ticketWindow.show();

                    setTimeout(() => {
                        ticketWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
                            if (!success) {
                                console.error('Failed to print:', errorType);
                            }
                            ticketWindow.close();
                        });
                    }, 1000);
                });

            });
        } catch (error) {
            console.error('Error generating reservation ticket:', error);
        }
    }




    ipcMain.on('create-reservation', (event, data) => {
        const { clientId, fromDate, toDate, price } = data;

        db.run('INSERT INTO reservations (client_id, from_date, to_date, price) VALUES (?, ?, ?, ?)', [clientId, fromDate, toDate, price], function(err) {
            if (err) {
                console.error('Error inserting reservation:', err);
                event.reply('create-reservation-reply', { success: false, error: err.message });
            } else {
                console.log('Reservation created successfully.');
                event.reply('create-reservation-reply', { success: true, id: this.lastID });
                printReservationTicket(this.lastID);
            }
        });
    });


    ipcMain.on('search-reservations', (event, query) => {
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
        `, [`%${query}%`, `%${query}%`], (err, rows) => {
            if (err) {
                console.error('Error searching reservations:', err);
                event.reply('search-reservations-reply', []);
            } else {
                event.reply('search-reservations-reply', rows);
            }
        });
    });



    win.on('closed', () => {
        db.close();
    });
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

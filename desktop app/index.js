const { app, BrowserWindow, ipcMain } = require('electron');
const moment = require('moment-timezone');
const axios = require('axios');
const QRCode = require('qrcode');

const BASE_URL = 'http://localhost:3001';

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

    ipcMain.on('store-transaction', async (event, data) => {
        const { duration } = data;
        const formattedCreatedAt = moment().tz('Europe/Skopje').format('YYYY-MM-DD HH:mm:ss');
        const expiresAtFormatted = duration > 0
            ? moment(formattedCreatedAt).add(duration, 'hours').format('YYYY-MM-DD HH:mm:ss')
            : null;

        try {
            const response = await axios.post(`${BASE_URL}/transactions/add-transaction`, {
                duration,
                created_at: formattedCreatedAt,
                expires_at: expiresAtFormatted
            });

            if (response.status === 200 && response.data.data) {
                const { transactionId } = response.data.data;
                console.log('Transaction inserted successfully.');
                event.reply('store-transaction-reply', { success: true, id: transactionId });

                printTicket(duration, formattedCreatedAt, expiresAtFormatted || null);
            } else {
                console.error('Unexpected API response:', response.data);
                throw new Error('Failed to insert transaction');
            }
        } catch (error) {
            console.error('Error inserting transaction:', error.message);
            if (error.response) {
            }
            event.reply('store-transaction-reply', { success: false, error: error.message });
        }
    });

    ipcMain.on('print-ticket', (event, ticketContent) => {
        win.webContents.send('print-ticket-renderer', ticketContent);
        win.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
            if (!success) {
                console.error(`Printing failed. Error: ${errorType}`);
            }
        });
    });

    ipcMain.on('add-client', async (event, data) => {
        const { firstName, lastName, phoneNumber } = data;

        try {
            await axios.post(`${BASE_URL}/clients/add-client`, {
                firstName,
                lastName,
                phoneNumber
            });

            const response = await axios.get(`${BASE_URL}/clients`);
            const clients = response.data;

            event.reply('add-client-reply', { success: true });
            event.sender.send('update-client-list', clients);
        } catch (error) {
            console.error('Error handling client request:', error);
            event.reply('add-client-reply', { success: false, error: error.message });
        }
    });

    ipcMain.on('get-clients', async (event) => {
        try {
            const response = await axios.get(`${BASE_URL}/clients`);
            const clients = response.data;
            event.reply('load-clients', clients);
        } catch (error) {
            console.error('Error fetching clients:', error);
            event.reply('load-clients', []);
        }
    });

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
            const response = await axios.get(`${BASE_URL}/reservations/${reservationId}`);
            const row = response.data;
            if (!row) {
                console.error('Reservation not found');
                return;
            }

            const countDays = Math.abs(moment(row.from_date).diff(moment(row.to_date), 'days')) + 1;
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
                    padding: 5px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }
            </style>
        </head>
        <body>
            <div class="ticket">                        
                <p style="font-size:40px;font-weight:900;text-align:center;margin:0;">Parking Meta</p>
                <p style="text-align: center;margin:0;font-size:30px">${dateToday}</p>
                <div class="box" style="margin:0; display:flex; justify-content:center; width:200px">${qrCodeSvg}</div>
                <p style="text-align: center;margin:0;font-size:20px;font-weight:600;">Client: ${row.first_name} ${row.last_name}</p>
                <div style="display:flex;justify-content:space-between;align-items:center;margin:0;width:100%; height:30px";><h3 style="font-size:20px">Start Date:</h3><p style="font-weight:500;font-size:20px">${formattedFromDate}</p></div>
               <div style="display:flex;justify-content:space-between;align-items:center;margin:0;width:100%; height:30px;"><h3 style="font-size:20px">End Date:</h3><p style="font-weight:500; font-size:20px;">${formattedToDate}</p></div>
               <div style="display:flex;justify-content:space-between;align-items:center;margin:0;width:100%; height:30px;"><h3 style="font-size:20px">Days:</h3><p style="font-weight:500; font-size:20px;">${countDays}</p></div>
               <div style="display:flex;justify-content:space-between;align-items:center;margin:0;width:100%; height:30px;"><h3 style="font-size:20px">Price:</h3><p style="font-weight:500; font-size:20px;">${Math.round(row.price)}</p></div>
        </div>
        </body>
        </html>
        `;

            let ticketWindow = new BrowserWindow({
                width: 350,
                height: 620,
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

        } catch (error) {
            console.error('Error generating reservation ticket:', error);
            console.error('Full error details:', error.response ? error.response.data : error.message);
        }
    }

    ipcMain.on('create-reservation', async (event, data) => {
        const { clientId, fromDate, toDate, price } = data;

        try {
            const response = await axios.post(`${BASE_URL}/reservations/add-reservation`, {
                clientId,
                fromDate,
                toDate,
                price
            });

            const { id } = response.data;
            event.reply('create-reservation-reply', { success: true, id });

            printReservationTicket(id);
        } catch (error) {
            console.error('Error creating reservation:', error);
            event.reply('create-reservation-reply', { success: false, error: error.message });
        }
    });

    ipcMain.on('search-reservations', async (event, query) => {
        try {
            const response = await axios.get(`${BASE_URL}/reservations/search`, {
                params: { q: query }
            });
            event.reply('search-reservations-reply', response.data);
        } catch (error) {
            console.error('Error searching reservations:', error);
            event.reply('search-reservations-reply', []);
        }
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

const dotenv = require('dotenv');
dotenv.config();

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token === ACCESS_TOKEN) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Invalid or missing token' });
    }
};

module.exports = authenticateToken;

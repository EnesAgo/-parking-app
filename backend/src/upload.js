const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    const targetPath = path.join(__dirname, '..', 'uploads', file.originalname);

    fs.rename(file.path, targetPath, (err) => {
        if (err) {
            return res.status(500).send('Error moving the file.');
        }
        res.send('File uploaded successfully.');
    });
});

module.exports = router;

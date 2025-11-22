const express = require('express');
const multer = require('multer');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const VALID_TOKEN = "abc123";   // token test

// API 1: verify-token
app.post('/api/verify-token', (req, res) => {
  const { token } = req.body;
  if (token === VALID_TOKEN) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: "Token sai rồi bro" });
  }
});

// API 2: session/start → tạo thư mục Bangkok
app.post('/api/session/start', (req, res) => {
  const { token, userName } = req.body;
  if (token !== VALID_TOKEN) return res.status(401).json({ ok: false });

  const safeName = userName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const now = moment().tz('Asia/Bangkok');
  const folderName = `${now.format('DD_MM_YYYY_HH_mm')}_${safeName}`;
  const folderPath = path.join(UPLOADS_DIR, folderName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(path.join(folderPath, 'meta.json'), JSON.stringify({
      userName,
      startedAt: now.toISOString(),
      timeZone: 'Asia/Bangkok',
      files: []
    }, null, 2));
  }

  res.json({ ok: true, folder: folderName });
});

app.listen(5000, () => {
  console.log('Backend đang chạy ở http://localhost:5000');
});
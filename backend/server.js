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

const VALID_TOKEN = "abc123";   // đổi sau nếu muốn

// API 1: verify-token
app.post('/api/verify-token', (req, res) => {
  const { token } = req.body;
  if (token === VALID_TOKEN) res.json({ ok: true });
  else res.status(401).json({ ok: false, error: "Token sai" });
});

// API 2: session/start
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

// Cấu hình multer cho upload-one
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder;
    cb(null, path.join(UPLOADS_DIR, folder));
  },
  filename: (req, file, cb) => {
    const idx = req.body.questionIndex;
    cb(null, `Q${idx}.webm`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'video/webm') cb(null, true);
    else cb(new Error('Chỉ chấp nhận video/webm'));
  }
});

// API 3: upload-one
app.post('/api/upload-one', (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, error: err.message });

    const { token, folder, questionIndex } = req.body;
    if (token !== VALID_TOKEN) return res.status(401).json({ ok: false });

    const folderPath = path.join(UPLOADS_DIR, folder);
    const metaPath = path.join(folderPath, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath));
    meta.files = meta.files || [];
    meta.files.push(`Q${questionIndex}.webm`);
    meta[`Q${questionIndex}UploadedAt`] = moment().tz('Asia/Bangkok').toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    res.json({ ok: true, savedAs: `Q${questionIndex}.webm` });
  });
});

// API 4: session/finish
app.post('/api/session/finish', (req, res) => {
  const { token, folder, questionsCount } = req.body;
  if (token !== VALID_TOKEN) return res.status(401).json({ ok: false });

  const metaPath = path.join(UPLOADS_DIR, folder, 'meta.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath));
    meta.finishedAt = moment().tz('Asia/Bangkok').toISOString();
    meta.questionsCount = questionsCount;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  }
  res.json({ ok: true });
});

app.listen(5000, () => {
  console.log('Backend FULL 4 API chạy tại http://localhost:5000');
  console.log('Test ngay: POST /api/session/start → tạo thư mục Bangkok');
});
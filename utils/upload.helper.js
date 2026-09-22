const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function processImagePayload(dataObj) {
  if (!dataObj || typeof dataObj !== 'object') return dataObj;

  const result = { ...dataObj };

  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string' && val.startsWith('data:')) {
      try {
        const matches = val.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mime = matches[1].toLowerCase();
          const base64Data = matches[2];
          let ext = 'bin';
          if (mime.includes('image/png')) ext = 'png';
          else if (mime.includes('image/jpeg') || mime.includes('image/jpg')) ext = 'jpg';
          else if (mime.includes('image/webp')) ext = 'webp';
          else if (mime.includes('pdf')) ext = 'pdf';
          else if (mime.includes('image/')) ext = mime.split('/')[1] || 'png';
          else if (mime.includes('/')) ext = mime.split('/')[1] || 'bin';

          const prefix = mime.includes('image/') ? 'img' : 'file';
          const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
          const filePath = path.join(UPLOADS_DIR, filename);
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          result[key] = filename;
        }
      } catch (err) {
        console.error('Failed to save upload payload file:', err);
      }
    }
  }

  return result;
}

module.exports = {
  processImagePayload,
  UPLOADS_DIR
};

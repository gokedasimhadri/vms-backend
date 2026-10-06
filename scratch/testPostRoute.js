const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testPost() {
  try {
    const secret = process.env.JWT_SECRET || 'vms_secret_key_2024';
    const token = jwt.sign({ id: '1', username: 'vms', role: 'ADMIN', branch: 'ALL' }, secret);

    const res1 = await postJson('http://localhost:1002/gettingvehicletripdata', {
      fdate: '2026-09-23',
      tdate: '2026-09-23',
      subTab: 'generatereport'
    }, {
      'Authorization': `Bearer ${token}`
    });
    console.log('res1:', res1);

  } catch (err) {
    console.error('Error testing POST routes:', err.message);
  }
}

testPost();

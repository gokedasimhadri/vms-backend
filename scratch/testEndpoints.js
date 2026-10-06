const http = require('http');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function testEndpoints() {
  try {
    const res1 = await getJson('http://localhost:1002/api/getVehicleTripdata?subTab=entrydata&branch=ALL');
    console.log('GET /getVehicleTripdata (entrydata): count =', res1?.data?.length || 0);

    const res2 = await getJson('http://localhost:1002/api/getVehicleTripdata?subTab=generatereport&branch=ALL&fromDate=2026-09-01&toDate=2026-10-06');
    console.log('GET /getVehicleTripdata (generatereport 2026-09-01 to 2026-10-06): count =', res2?.data?.length || 0);

    process.exit(0);
  } catch (err) {
    console.error('Error testing endpoint:', err.message);
    process.exit(1);
  }
}

testEndpoints();

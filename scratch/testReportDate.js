const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log('Testing GET /api/getVehicleTripdata without date filter...');
  const resNoDate = await get('http://localhost:1002/api/getVehicleTripdata?subTab=generatereport&branch=ALL');
  console.log('No date count:', Array.isArray(resNoDate?.data) ? resNoDate.data.length : resNoDate);

  console.log('\nTesting GET /api/getVehicleTripdata with date filter (2026-09-01 to 2026-10-06)...');
  const resWithDate = await get('http://localhost:1002/api/getVehicleTripdata?subTab=generatereport&branch=ALL&fromDate=2026-09-01&toDate=2026-10-06');
  console.log('With date count:', Array.isArray(resWithDate?.data) ? resWithDate.data.length : resWithDate);
}

test();

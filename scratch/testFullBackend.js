const mongoose = require('mongoose');
const vehiclesController = require('../modules/vehicles/vehicles.controller');

async function testBackend() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    console.log('Connected to MongoDB');

    // Test 1: Query for 2026-09-23 to 2026-09-23 (A date that HAS data in DB)
    const req1 = {
      user: { username: 'vms', role: 'ADMIN', branch: 'ALL' },
      query: {
        subTab: 'generatereport',
        branch: 'ALL',
        fromDate: '2026-09-23',
        toDate: '2026-09-23'
      }
    };
    const res1 = {
      json: (data) => console.log('\nResult for 2026-09-23 to 2026-09-23 count:', data.count)
    };
    await vehiclesController.getVehicleTripdata(req1, res1);

    // Test 2: Query for 2026-10-06 to 2026-10-06 (Today - No data in DB)
    const req2 = {
      user: { username: 'vms', role: 'ADMIN', branch: 'ALL' },
      query: {
        subTab: 'generatereport',
        branch: 'ALL',
        fromDate: '2026-10-06',
        toDate: '2026-10-06'
      }
    };
    const res2 = {
      json: (data) => console.log('\nResult for 2026-10-06 to 2026-10-06 count:', data.count)
    };
    await vehiclesController.getVehicleTripdata(req2, res2);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testBackend();

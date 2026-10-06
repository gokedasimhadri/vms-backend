const mongoose = require('mongoose');
const vehiclesController = require('../modules/vehicles/vehicles.controller');

async function testAllQueries() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    console.log('Connected to MongoDB');

    // Test 1: No dates (Initial view)
    const req1 = {
      user: { username: 'vms', role: 'ADMIN', branch: 'ALL' },
      query: { subTab: 'generatereport', branch: 'ALL', fromDate: '', toDate: '' }
    };
    const res1 = {
      json: (data) => console.log('1. Initial View (No date): count =', data.count)
    };
    await vehiclesController.getVehicleTripdata(req1, res1);

    // Test 2: Specific Date range (Sept 23 - Sept 23)
    const req2 = {
      user: { username: 'vms', role: 'ADMIN', branch: 'ALL' },
      query: { subTab: 'generatereport', branch: 'ALL', fromDate: '2026-09-23', toDate: '2026-09-23' }
    };
    const res2 = {
      json: (data) => console.log('2. Date range (2026-09-23 to 2026-09-23): count =', data.count)
    };
    await vehiclesController.getVehicleTripdata(req2, res2);

    // Test 3: Date range (Sept 1 - Oct 6)
    const req3 = {
      user: { username: 'vms', role: 'ADMIN', branch: 'ALL' },
      query: { subTab: 'generatereport', branch: 'ALL', fromDate: '2026-09-01', toDate: '2026-10-06' }
    };
    const res3 = {
      json: (data) => console.log('3. Date range (2026-09-01 to 2026-10-06): count =', data.count)
    };
    await vehiclesController.getVehicleTripdata(req3, res3);

    // Test 4: Single day (Oct 6 - Oct 6)
    const req4 = {
      user: { username: 'vms', role: 'ADMIN', branch: 'ALL' },
      query: { subTab: 'generatereport', branch: 'ALL', fromDate: '2026-10-06', toDate: '2026-10-06' }
    };
    const res4 = {
      json: (data) => console.log('4. Date range (2026-10-06 to 2026-10-06): count =', data.count)
    };
    await vehiclesController.getVehicleTripdata(req4, res4);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testAllQueries();

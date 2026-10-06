const mongoose = require('mongoose');
const vehiclesController = require('../modules/vehicles/vehicles.controller');

async function testDates() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');

    const testCases = [
      { fromDate: '2026-09-22', toDate: '2026-09-22' },
      { fromDate: '2026-09-23', toDate: '2026-09-23' },
      { fromDate: '2026-10-04', toDate: '2026-10-04' },
      { fromDate: '2026-10-05', toDate: '2026-10-05' },
      { fromDate: '2026-10-06', toDate: '2026-10-06' },
      { fromDate: '2026-09-01', toDate: '2026-10-06' }
    ];

    for (const tc of testCases) {
      const req = {
        user: { username: 'vms', role: 'ADMIN', branch: 'ALL' },
        query: {
          subTab: 'generatereport',
          branch: 'ALL',
          fromDate: tc.fromDate,
          toDate: tc.toDate
        }
      };

      let count = 0;
      const res = {
        json: (data) => {
          count = data.count || 0;
        }
      };

      await vehiclesController.getVehicleTripdata(req, res);
      console.log(`Date range ${tc.fromDate} to ${tc.toDate} -> Count: ${count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testDates();

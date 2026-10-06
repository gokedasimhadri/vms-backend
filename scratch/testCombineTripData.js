const mongoose = require('mongoose');
const vehiclesController = require('../modules/vehicles/vehicles.controller');

async function testCombine() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const req = {
      user: { username: 'vms', role: 'ADMIN', branch: 'ALL' },
      query: {
        subTab: 'generatereport',
        branch: 'ALL',
        fromDate: '2026-10-06',
        toDate: '2026-10-06'
      }
    };

    const res = {
      json: (data) => {
        console.log('Result count for 2026-10-06:', data.count, 'collection:', data.collection);
        if (data.data && data.data.length > 0) {
          console.log('Sample first record:', data.data[0]);
        }
      }
    };

    await vehiclesController.getVehicleTripdata(req, res);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testCombine();

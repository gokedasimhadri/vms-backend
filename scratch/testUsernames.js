const mongoose = require('mongoose');
const vehiclesController = require('../modules/vehicles/vehicles.controller');

async function testUsernames() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');

    const usernames = [
      'vms', 'vc', 'vmskkd', 'BRANCH_ADMIN',
      'adckkd', 'adcengg', 'srikkd', 'ajckkd', 'adcpdp', 'adcmkvs',
      'adcho', 'adckkdiit', 'adcadmin', 'adcats', 'adcakp', 'adcgdv',
      'adcndl', 'adcongole', 'adcvzm', 'adcmtm', 'adcsnr', 'aus', 'adctnk',
      'adchbg', 'adcbvrmd', 'adcasn', 'adcjkpur', 'adcamp', 'adcbvrm', 'adceluru'
    ];

    for (const u of usernames) {
      const req = {
        user: u === 'BRANCH_ADMIN' ? { username: 'branchadmin', role: 'BRANCH_ADMIN', branches: ['PITHAPURAM-AA'] } : { username: u, role: 'USER' },
        query: {
          subTab: 'generatereport',
          branch: 'ALL',
          fromDate: '2026-10-06',
          toDate: '2026-10-06'
        }
      };

      let count = 0;
      const res = {
        json: (data) => {
          count = data.count || 0;
        }
      };

      await vehiclesController.getVehicleTripdata(req, res);
      console.log(`Username: ${u.padEnd(15)} -> Count: ${count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testUsernames();

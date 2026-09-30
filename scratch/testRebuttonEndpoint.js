const mongoose = require('mongoose');
const { getVehicleTyresData } = require('../modules/vehicle-tyres/vehicle-tyres.controller');

async function testRebuttonMapping() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');

    const req = {
      query: { type: 'rebutton', search: 'R0161891123' },
      user: { role: 'ADMIN', username: 'vms' }
    };
    const res = {
      json: (data) => {
        console.log('API Response count:', data.count);
        if (data.data && data.data.length > 0) {
          const item = data.data[0];
          console.log('Sample item mapping:', {
            tyreno: item.tyreno,
            society: item.society,
            branch: item.branch,
            vehicleregno: item.vehicleregno,
            position: item.position,
            sizeoftyre: item.sizeoftyre,
            omr: item.omr,
            cmr: item.cmr,
            dateofreplacement: item.dateofreplacement,
            reason: item.reason
          });
        }
      },
      status: (code) => ({
        json: (err) => console.error('Status:', code, err)
      })
    };

    await getVehicleTyresData(req, res);
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testRebuttonMapping();

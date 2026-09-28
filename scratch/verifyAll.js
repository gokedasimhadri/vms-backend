const mongoose = require('mongoose');
require('dotenv').config();
const { getBatteriesData } = require('../modules/batteries/batteries.controller');
const { getBusBreakdownData } = require('../modules/bus-breakdown/bus-breakdown.controller');

async function verifyNewRequirements() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const adchrUser = await db.collection('login').findOne({ username: 'adchr' });

  const reqUser = {
    id: adchrUser._id.toString(),
    username: adchrUser.username,
    role: adchrUser.role,
    branch: adchrUser.branch,
    branches: adchrUser.branches
  };

  console.log('=== VERIFYING BATTERIES -> BATTERY CHANGE REPORT ===');
  const mockResBattery = {
    json: (res) => {
      console.log(`[Battery Change Report] Count: ${res.count}, Collection: ${res.collection}, Status: SUCCESS`);
      if (res.data && res.data.length > 0) {
        console.log('Sample Battery Change Record:', {
          society: res.data[0].society,
          branch: res.data[0].branch,
          batterymake: res.data[0].batterymake,
          batterycapacity: res.data[0].batterycapacity,
          batterynumber: res.data[0].batterynumber,
          frombusno: res.data[0].frombusno,
          tobusno: res.data[0].tobusno,
          initialfitmentdate: res.data[0].initialfitmentdate,
          presentfitmentdate: res.data[0].presentfitmentdate,
          remarks: res.data[0].remarks
        });
      }
    },
    status: () => mockResBattery
  };
  await getBatteriesData({ user: reqUser, query: { type: 'reports' } }, mockResBattery);

  console.log('\n=== VERIFYING BUS BREAKDOWN LOGS ===');
  const mockResBreakdown = {
    json: (res) => {
      console.log(`[Bus Breakdown] Count: ${res.count}, Status: SUCCESS`);
      if (res.data && res.data.length > 0) {
        console.log('Sample Bus Breakdown Record:', {
          society: res.data[0].society,
          branch: res.data[0].branch,
          busno: res.data[0].busno,
          drivername: res.data[0].drivername,
          driverphoneno: res.data[0].driverphoneno,
          breakedownplace: res.data[0].breakedownplace,
          complaint: res.data[0].complaint,
          date: res.data[0].date,
          message_received_time: res.data[0].message_received_time,
          work_assign_time: res.data[0].work_assign_time,
          work_complete_time: res.data[0].work_complete_time,
          status: res.data[0].status,
          spare_part: res.data[0].spare_part,
          spare_part_amount: res.data[0].spare_part_amount,
          travel_allowance: res.data[0].travel_allowance,
          food_allowance: res.data[0].food_allowance,
          noofworkers: res.data[0].noofworkers,
          totalamount: res.data[0].totalamount
        });
      }
    },
    status: () => mockResBreakdown
  };
  await getBusBreakdownData({ user: reqUser, query: {} }, mockResBreakdown);

  console.log('\n=== VERIFICATION COMPLETE ===');
  process.exit(0);
}

verifyNewRequirements().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

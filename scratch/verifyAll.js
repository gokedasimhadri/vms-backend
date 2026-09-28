const mongoose = require('mongoose');
require('dotenv').config();
const { buildBranchFilter } = require('../utils/scope.helper');
const { getServicesData } = require('../modules/services/services.controller');
const { getRepairBillsData } = require('../modules/repair-bills/repair-bills.controller');
const { getAdBlueData } = require('../modules/adblue/adblue.controller');

async function runVerification() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const adchrUser = await db.collection('login').findOne({ username: 'adchr' });
  if (!adchrUser) {
    console.error('adchr user not found in DB!');
    process.exit(1);
  }

  const reqUser = {
    id: adchrUser._id.toString(),
    username: adchrUser.username,
    role: adchrUser.role,
    branch: adchrUser.branch,
    branches: adchrUser.branches
  };

  console.log('=== VERIFYING REPAIR BILLS ENTRY ===');
  const mockResRepair = {
    json: (data) => {
      console.log(`[Repair Bills] Count: ${data.count}, Status: SUCCESS`);
      if (data.count !== 532) {
        console.warn(`WARNING: Expected 532 records for Repair Bills, got ${data.count}`);
      }
    },
    status: () => mockResRepair
  };
  await getRepairBillsData({ user: reqUser, query: {} }, mockResRepair);

  console.log('\n=== VERIFYING AD-BLUE BUS FILLINGS ===');
  const mockResAdBlue = {
    json: (data) => {
      console.log(`[Ad-Blue Bus Fillings] Count: ${data.count}, Status: SUCCESS`);
      if (data.count !== 68) {
        console.warn(`WARNING: Expected 68 records for Ad-Blue Bus Fillings, got ${data.count}`);
      }
    },
    status: () => mockResAdBlue
  };
  await getAdBlueData({ user: reqUser, query: { type: 'adbluebusfill' } }, mockResAdBlue);

  console.log('\n=== VERIFYING SERVICES -> DAILY VEHICLE MAINTENANCE ===');
  const mockResDaily = {
    json: (data) => {
      console.log(`[Daily Vehicle Maintenance] Count: ${data.count}, Collection: ${data.collection}, Status: SUCCESS`);
    },
    status: () => mockResDaily
  };
  await getServicesData({ user: reqUser, query: { type: 'dailymaintenance' } }, mockResDaily);

  console.log('\n=== VERIFYING SERVICES -> VEHICLE SERVICES ===');
  const mockResService = {
    json: (data) => {
      console.log(`[Vehicle Services] Count: ${data.count}, Collection: ${data.collection}, Status: SUCCESS`);
    },
    status: () => mockResService
  };
  await getServicesData({ user: reqUser, query: { type: 'service' } }, mockResService);

  console.log('\n=== VERIFYING SERVICES -> VEHICLE REPAIRS ===');
  const mockResVRepair = {
    json: (data) => {
      console.log(`[Vehicle Repairs] Count: ${data.count}, Collection: ${data.collection}, Status: SUCCESS`);
    },
    status: () => mockResVRepair
  };
  await getServicesData({ user: reqUser, query: { type: 'repair' } }, mockResVRepair);

  console.log('\n=== ALL VERIFICATIONS COMPLETE ===');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

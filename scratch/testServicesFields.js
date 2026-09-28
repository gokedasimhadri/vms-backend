const mongoose = require('mongoose');
require('dotenv').config();
const { getServicesData } = require('../modules/services/services.controller');

async function testServicesFields() {
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

  console.log('=== DAILY VEHICLE MAINTENANCE SAMPLE OUTPUT ===');
  const mockResDaily = {
    json: (res) => {
      const sample = res.data[0];
      console.log('Sample Daily Doc:', {
        society: sample.society,
        branch: sample.branch,
        model: sample.model,
        vehicleno: sample.vehicleno,
        waterservicing: sample.waterservicing,
        engineoil: sample.engineoil,
        chasis: sample.chasis,
        springs: sample.springs,
        centerjoints: sample.centerjoints,
        allubolts: sample.allubolts,
        airfilling: sample.airfilling,
        greesing: sample.greesing,
        batterymaintenance: sample.batterymaintenance,
        lights: sample.lights,
        glasses: sample.glasses,
        bodypaint: sample.bodypaint,
        seats: sample.seats,
        gearoil: sample.gearoil,
        difoil: sample.difoil,
        brakeoil: sample.brakeoil,
        atfoil: sample.atfoil,
        radiatorwater: sample.radiatorwater,
        meterreading: sample.meterreading,
        dateofmaintenance: sample.dateofmaintenance,
        remarks: sample.remarks
      });
    },
    status: () => mockResDaily
  };
  await getServicesData({ user: reqUser, query: { type: 'dailymaintenance' } }, mockResDaily);

  console.log('\n=== VEHICLE SERVICES SAMPLE OUTPUT ===');
  const mockResService = {
    json: (res) => {
      const sample = res.data[0];
      console.log('Sample Service Doc:', {
        society: sample.society,
        branch: sample.branch,
        model: sample.model,
        vehicleno: sample.vehicleno,
        date: sample.date,
        serviceparts: sample.serviceparts,
        duration: sample.duration,
        lastservicingreading: sample.lastservicingreading,
        presentservicingreading: sample.presentservicingreading,
        kms: sample.kms,
        remainderreading: sample.remainderreading,
        remarks: sample.remarks
      });
    },
    status: () => mockResService
  };
  await getServicesData({ user: reqUser, query: { type: 'service' } }, mockResService);

  console.log('\n=== VEHICLE REPAIRS SAMPLE OUTPUT ===');
  const mockResRepair = {
    json: (res) => {
      const sample = res.data[0];
      console.log('Sample Repair Doc:', {
        society: sample.society,
        branch: sample.branch,
        model: sample.model,
        vehicleno: sample.vehicleno,
        attendantname: sample.attendantname,
        date: sample.date,
        description: sample.description,
        intime: sample.intime,
        outtime: sample.outtime,
        meterreading: sample.meterreading,
        remarks: sample.remarks
      });
    },
    status: () => mockResRepair
  };
  await getServicesData({ user: reqUser, query: { type: 'repair' } }, mockResRepair);

  process.exit(0);
}

testServicesFields().catch(err => {
  console.error('Error testing services fields:', err);
  process.exit(1);
});

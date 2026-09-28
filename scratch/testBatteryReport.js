const mongoose = require('mongoose');
require('dotenv').config();
const { getAdminVehicleRegNos } = require('../utils/scope.helper');

async function testBatteryChangeReport() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const user = await db.collection('login').findOne({ username: 'adchr' });
  const regNos = await getAdminVehicleRegNos(user, db);

  const queryByReg = {
    $or: [
      { fromregno: { $in: regNos } },
      { toregno: { $in: regNos } },
      { frombusno: { $in: regNos } },
      { tobusno: { $in: regNos } }
    ]
  };

  const countByReg = await db.collection('batterychangereport').countDocuments(queryByReg);
  console.log('batterychangereport count for adchr by regNos:', countByReg);

  const queryCombo = {
    $or: [
      { fromregno: { $in: regNos } },
      { toregno: { $in: regNos } },
      { frombusno: { $in: regNos } },
      { tobusno: { $in: regNos } },
      { branch: { $in: user.branches } }
    ]
  };

  const countCombo = await db.collection('batterychangereport').countDocuments(queryCombo);
  console.log('batterychangereport count for adchr combo:', countCombo);

  const sampleDoc = await db.collection('batterychangereport').findOne(queryCombo);
  console.log('batterychangereport sample keys:', Object.keys(sampleDoc || {}));
  console.log('batterychangereport sample:', sampleDoc);

  process.exit(0);
}
testBatteryChangeReport().catch(err => { console.error(err); process.exit(1); });

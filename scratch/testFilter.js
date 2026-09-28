const mongoose = require('mongoose');
require('dotenv').config();
const { getAdminVehicleRegNos } = require('../utils/scope.helper');

async function testFilter() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const user = await db.collection('login').findOne({ username: 'adchr' });
  const regNos = await getAdminVehicleRegNos(user, db);

  const regOrFilter = {
    $or: [
      { busnumber: { $in: regNos } },
      { regno: { $in: regNos } },
      { vehicleregno: { $in: regNos } },
      { vehicleno: { $in: regNos } }
    ]
  };

  const repairbillsCount = await db.collection('repairbills').countDocuments(regOrFilter);
  console.log('repairbills count with regOrFilter:', repairbillsCount);

  const adblueCount = await db.collection('AdBlueBusfill').countDocuments(regOrFilter);
  console.log('AdBlueBusfill count with regOrFilter:', adblueCount);

  const dailyCount = await db.collection('dailyvehicle').countDocuments(regOrFilter);
  console.log('dailyvehicle count with regOrFilter:', dailyCount);

  const serviceCount = await db.collection('vehicleservice').countDocuments(regOrFilter);
  console.log('vehicleservice count with regOrFilter:', serviceCount);

  const vrepairCount = await db.collection('vehiclerepair').countDocuments(regOrFilter);
  console.log('vehiclerepair count with regOrFilter:', vrepairCount);

  process.exit(0);
}
testFilter().catch(err => { console.error(err); process.exit(1); });

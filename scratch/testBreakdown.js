const mongoose = require('mongoose');
require('dotenv').config();
const { getAdminVehicleRegNos } = require('../utils/scope.helper');

async function testBreakdownCount() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const user = await db.collection('login').findOne({ username: 'adchr' });
  const regNos = await getAdminVehicleRegNos(user, db);

  const queryByReg = {
    $or: [
      { busno: { $in: regNos } },
      { vehicleno: { $in: regNos } },
      { vehicleregno: { $in: regNos } },
      { regno: { $in: regNos } }
    ]
  };

  const countByReg = await db.collection('busbreakedown').countDocuments(queryByReg);
  console.log('busbreakedown count for adchr by regNos:', countByReg);

  const queryCombo = {
    $or: [
      { busno: { $in: regNos } },
      { vehicleno: { $in: regNos } },
      { vehicleregno: { $in: regNos } },
      { regno: { $in: regNos } },
      { branch: { $in: user.branches } }
    ]
  };

  const countCombo = await db.collection('busbreakedown').countDocuments(queryCombo);
  console.log('busbreakedown count for adchr combo:', countCombo);

  process.exit(0);
}
testBreakdownCount().catch(err => { console.error(err); process.exit(1); });

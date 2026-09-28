const mongoose = require('mongoose');
require('dotenv').config();
const { getAdminVehicleRegNos } = require('../utils/scope.helper');

async function testAdchrQueries() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const user = await db.collection('login').findOne({ username: 'adchr' });
  console.log('User:', user.username, 'Role:', user.role, 'Branches count:', user.branches.length);

  const regNos = await getAdminVehicleRegNos(user, db);
  console.log('Admin vehicle regNos count:', regNos.length);

  // 1. repairbills
  const repairQueryByReg = { busnumber: { $in: regNos } };
  const repairCountByReg = await db.collection('repairbills').countDocuments(repairQueryByReg);
  console.log('repairbills count by busnumber in regNos:', repairCountByReg);

  const repairQueryByBranch = { branch: { $in: user.branches } };
  const repairCountByBranch = await db.collection('repairbills').countDocuments(repairQueryByBranch);
  console.log('repairbills count by branch in user.branches:', repairCountByBranch);

  const repairQueryCombo = {
    $or: [
      { busnumber: { $in: regNos } },
      { vehicleregno: { $in: regNos } },
      { regno: { $in: regNos } },
      { branch: { $in: user.branches } }
    ]
  };
  const repairCountCombo = await db.collection('repairbills').countDocuments(repairQueryCombo);
  console.log('repairbills combo count for adchr:', repairCountCombo);

  // 2. dailyvehicle
  const dailyQuery = {
    $or: [
      { regno: { $in: regNos } },
      { vehicleno: { $in: regNos } },
      { vehicleregno: { $in: regNos } },
      { branch: { $in: user.branches } }
    ]
  };
  const dailyCount = await db.collection('dailyvehicle').countDocuments(dailyQuery);
  console.log('dailyvehicle combo count for adchr:', dailyCount);

  // 3. vehicleservice
  const serviceQuery = {
    $or: [
      { vehicleregno: { $in: regNos } },
      { regno: { $in: regNos } },
      { vehicleno: { $in: regNos } },
      { branch: { $in: user.branches } }
    ]
  };
  const serviceCount = await db.collection('vehicleservice').countDocuments(serviceQuery);
  console.log('vehicleservice combo count for adchr:', serviceCount);

  // 4. vehiclerepair
  const vRepairQuery = {
    $or: [
      { regno: { $in: regNos } },
      { vehicleno: { $in: regNos } },
      { vehicleregno: { $in: regNos } },
      { branch: { $in: user.branches } }
    ]
  };
  const vRepairCount = await db.collection('vehiclerepair').countDocuments(vRepairQuery);
  console.log('vehiclerepair combo count for adchr:', vRepairCount);

  // 5. AdBlueBusfill
  const adblueQueryByReg = { regno: { $in: regNos } };
  const adblueCountByReg = await db.collection('AdBlueBusfill').countDocuments(adblueQueryByReg);
  console.log('AdBlueBusfill count by regno in regNos:', adblueCountByReg);

  const adblueQueryCombo = {
    $or: [
      { regno: { $in: regNos } },
      { vehicleregno: { $in: regNos } },
      { branch: { $in: user.branches } }
    ]
  };
  const adblueCountCombo = await db.collection('AdBlueBusfill').countDocuments(adblueQueryCombo);
  console.log('AdBlueBusfill combo count for adchr:', adblueCountCombo);

  process.exit(0);
}
testAdchrQueries().catch(err => { console.error(err); process.exit(1); });

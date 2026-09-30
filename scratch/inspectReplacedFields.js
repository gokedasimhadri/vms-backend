const mongoose = require('mongoose');

async function checkFields() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const docs = await db.collection('replacedvehicle').find({}).limit(50).toArray();
    console.log('Total sample docs:', docs.length);
    docs.slice(0, 10).forEach((d, idx) => {
      console.log(`Doc ${idx + 1}:`, {
        tyreno: d.tyreno,
        omr: d.omr,
        removal: d.removal,
        cmr: d.cmr,
        fittingomr: d.fittingomr,
        dateofreplacement: d.dateofreplacement,
        replacementdate: d.replacementdate,
        removedate: d.removedate
      });
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFields();

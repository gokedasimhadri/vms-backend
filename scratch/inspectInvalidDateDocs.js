const mongoose = require('mongoose');

async function inspectInvalidDates() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const docs = await db.collection('vehicletripdata').find({ date: 'Invalid date' }).limit(10).toArray();

    console.log('--- SAMPLE DOCS WITH date: "Invalid date" ---');
    docs.forEach((d, i) => {
      console.log(`[${i+1}] _id: ${d._id} | Timestamp: ${d.Timestamp} | uploaddate: ${d.uploaddate} | date_dt: ${d.date_dt} | uploaddate_dt: ${d.uploaddate_dt} | branch: ${d.branch}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectInvalidDates();

const mongoose = require('mongoose');

async function checkSeptDates() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const septDocs = await db.collection('vehicletripdata').find({
      $or: [
        { date: { $regex: '2026-09|09-2026|09/2026' } },
        { uploaddate: { $regex: '2026-09|09-2026|09/2026' } }
      ]
    }).limit(100).toArray();

    const septDates = new Set();
    septDocs.forEach(d => {
      if (d.date) septDates.add(d.date);
      if (d.uploaddate) septDates.add(d.uploaddate);
    });

    console.log('Sample September dates in vehicletripdata:', Array.from(septDates).slice(0, 30));
    console.log('Total September docs found in sample:', septDocs.length);

    // Test querying 2026-09-22
    const d22 = await db.collection('vehicletripdata').find({
      $or: [
        { date: '22-09-2026' },
        { uploaddate: '22-09-2026' },
        { date: '2026-09-22' },
        { uploaddate: '2026-09-22' }
      ]
    }).toArray();
    console.log('Docs for 2026-09-22 count:', d22.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSeptDates();

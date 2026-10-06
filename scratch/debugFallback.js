const mongoose = require('mongoose');

async function debugFallback() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const branchFilter = {};
    const fallbackQuery = { ...branchFilter };
    const latestDoc = await db.collection("vehicletripdata").findOne(fallbackQuery, { sort: { _id: -1 } });
    console.log('latestDoc:', latestDoc);

    if (latestDoc && (latestDoc.uploaddate || latestDoc.date)) {
      const lDate = latestDoc.uploaddate || latestDoc.date;
      console.log('lDate:', lDate);
      fallbackQuery.$or = [{ uploaddate: lDate }, { date: lDate }];
      console.log('fallbackQuery:', JSON.stringify(fallbackQuery));
      const docs = await db.collection("vehicletripdata").find(fallbackQuery).limit(10).toArray();
      console.log('docs count:', docs.length);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugFallback();

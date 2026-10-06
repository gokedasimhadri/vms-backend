const mongoose = require('mongoose');

async function inspectDates() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const count = await db.collection('vehicletripdata').countDocuments();
    console.log('Total vehicletripdata count:', count);

    // Get 20 docs with different timestamps
    const sample = await db.collection('vehicletripdata').find({}).sort({ _id: -1 }).limit(20).toArray();

    console.log('\n--- SAMPLE DOCS FROM VEHICLETRIPDATA ---');
    sample.forEach((d, idx) => {
      const tsDate = d.Timestamp ? new Date(d.Timestamp).toISOString() : 'NO_TS';
      console.log(`[${idx+1}] _id: ${d._id} | date: ${d.date} | uploaddate: ${d.uploaddate} | Timestamp: ${d.Timestamp} (${tsDate}) | branch: ${d.branch}`);
    });

    // Check count of docs per date in vehicletripdata for the top 10 most frequent dates
    const pipeline = [
      { $group: { _id: "$date", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ];
    const dateCounts = await db.collection('vehicletripdata').aggregate(pipeline).toArray();
    console.log('\n--- TOP 20 MOST FREQUENT DATES IN VEHICLETRIPDATA ---');
    console.log(dateCounts);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectDates();

const mongoose = require('mongoose');

async function debugDates() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    console.log('--- ALL DISTINCT DATES IN vehicletripdata ---');
    const dataDates = await db.collection('vehicletripdata').distinct('date');
    console.log('vehicletripdata distinct dates (sample first 20):', dataDates.slice(0, 20));
    console.log('vehicletripdata distinct dates total count:', dataDates.length);

    console.log('\n--- ALL DISTINCT UPLOADDATES IN vehicletripdata ---');
    const dataUploadDates = await db.collection('vehicletripdata').distinct('uploaddate');
    console.log('vehicletripdata distinct uploaddates (sample first 20):', dataUploadDates.slice(0, 20));

    console.log('\n--- SEARCH FOR 04-10-2026 or 2026-10-04 or Oct 4 2026 IN DB ---');
    const oct4CountData = await db.collection('vehicletripdata').countDocuments({
      $or: [
        { date: { $regex: '04-10-2026|2026-10-04|04/10/2026' } },
        { uploaddate: { $regex: '04-10-2026|2026-10-04|04/10/2026' } }
      ]
    });
    console.log('vehicletripdata records matching 04-10-2026:', oct4CountData);

    const oct4CountTrip = await db.collection('vehicletrip').countDocuments({
      $or: [
        { date: { $regex: '04-10-2026|2026-10-04|04/10/2026' } },
        { uploaddate: { $regex: '04-10-2026|2026-10-04|04/10/2026' } }
      ]
    });
    console.log('vehicletrip records matching 04-10-2026:', oct4CountTrip);

    // Let's check Latest 30 dates in vehicletripdata
    const latestDocs = await db.collection('vehicletripdata').find({}).sort({ _id: -1 }).limit(30).toArray();
    console.log('\n--- Latest 30 docs in vehicletripdata ---');
    const dateCounts = {};
    latestDocs.forEach(d => {
      const k = d.date || d.uploaddate || 'NO_DATE';
      dateCounts[k] = (dateCounts[k] || 0) + 1;
    });
    console.log('Date distribution in latest 30 docs:', dateCounts);

    // Check min/max Timestamp in vehicletripdata
    const minTimestampDoc = await db.collection('vehicletripdata').findOne({}, { sort: { Timestamp: 1 } });
    const maxTimestampDoc = await db.collection('vehicletripdata').findOne({}, { sort: { Timestamp: -1 } });
    console.log('\nMin Timestamp doc:', minTimestampDoc?.date, minTimestampDoc?.uploaddate, minTimestampDoc?.Timestamp, new Date(minTimestampDoc?.Timestamp));
    console.log('Max Timestamp doc:', maxTimestampDoc?.date, maxTimestampDoc?.uploaddate, maxTimestampDoc?.Timestamp, new Date(maxTimestampDoc?.Timestamp));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugDates();

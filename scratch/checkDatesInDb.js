const mongoose = require('mongoose');

async function checkDates() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    console.log('--- Checking vehicletrip ---');
    const tripDates = await db.collection('vehicletrip').distinct('date');
    console.log('vehicletrip distinct dates:', tripDates);
    const tripUploadDates = await db.collection('vehicletrip').distinct('uploaddate');
    console.log('vehicletrip distinct uploaddates:', tripUploadDates);

    console.log('\n--- Checking vehicletripdata ---');
    const dataDates = await db.collection('vehicletripdata').find({}).sort({ _id: -1 }).limit(10).toArray();
    console.log('Latest 10 vehicletripdata docs dates and upload dates:');
    dataDates.forEach(d => {
      console.log(`_id: ${d._id}, date: ${d.date}, uploaddate: ${d.uploaddate}, Timestamp: ${d.Timestamp}, branch: ${d.branch}`);
    });

    const oct6TripDataCount = await db.collection('vehicletripdata').countDocuments({
      $or: [
        { date: '06-10-2026' },
        { uploaddate: '06-10-2026' },
        { date: '2026-10-06' },
        { uploaddate: '2026-10-06' }
      ]
    });
    console.log('\nvehicletripdata count for 06-10-2026 string:', oct6TripDataCount);

    const oct6VehTripCount = await db.collection('vehicletrip').countDocuments({
      $or: [
        { date: '06-10-2026' },
        { uploaddate: '06-10-2026' },
        { date: '2026-10-06' },
        { uploaddate: '2026-10-06' }
      ]
    });
    console.log('vehicletrip count for 06-10-2026 string:', oct6VehTripCount);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDates();

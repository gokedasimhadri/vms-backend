const mongoose = require('mongoose');

async function checkTrips() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const tripsCount = await db.collection('vehicletrip').countDocuments();
    const tripDataCount = await db.collection('vehicletripdata').countDocuments();

    console.log('vehicletrip total count:', tripsCount);
    console.log('vehicletripdata total count:', tripDataCount);

    const sampleTrips = await db.collection('vehicletrip').find({}).limit(5).toArray();
    console.log('\nSample vehicletrip docs:', JSON.stringify(sampleTrips, null, 2));

    const sampleTripData = await db.collection('vehicletripdata').find({}).sort({_id: -1}).limit(5).toArray();
    console.log('\nSample vehicletripdata docs:', JSON.stringify(sampleTripData, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTrips();

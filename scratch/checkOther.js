const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const docs = await mongoose.connection.db.collection('busfill')
    .find({ vehicletype: { ": ['Private', 'Stores', 'Power House'] } })
 .limit(3)
 .toArray();
 console.log('Sample Other Fillings from busfill:', JSON.stringify(docs, null, 2));

 const counts = await mongoose.connection.db.collection('busfill').aggregate([
 { $group: { _id: '$vehicletype', count: { $sum: 1 } } }
 ]).toArray();
 console.log('Counts by vehicletype:', counts);
 process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
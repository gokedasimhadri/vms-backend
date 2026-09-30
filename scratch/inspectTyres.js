const mongoose = require('mongoose');

async function checkTyres() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Check replacedvehicle
    if (collections.some(c => c.name === 'replacedvehicle')) {
      const doc = await db.collection('replacedvehicle').findOne({
        $or: [{ tyreno: /R0161891123/i }, { tyre_number: /R0161891123/i }]
      });
      console.log('replacedvehicle doc for R0161891123:', doc);

      const sampleReplaced = await db.collection('replacedvehicle').find({}).limit(3).toArray();
      console.log('Sample replacedvehicle docs:', sampleReplaced);
    }

    // Check vehicletyres
    if (collections.some(c => c.name === 'vehicletyres')) {
      const doc2 = await db.collection('vehicletyres').findOne({
        $or: [{ tyreno: /R0161891123/i }, { tyre_number: /R0161891123/i }]
      });
      console.log('vehicletyres doc for R0161891123:', doc2);
    }

    // Check tyrestatus
    if (collections.some(c => c.name === 'tyrestatus')) {
      const doc3 = await db.collection('tyrestatus').findOne({
        $or: [{ tyreno: /R0161891123/i }, { tyre_number: /R0161891123/i }]
      });
      console.log('tyrestatus doc for R0161891123:', doc3);
    }

    // Check rebuttontyres or any other tyre collection
    for (const c of collections) {
      if (c.name.includes('tyre') || c.name.includes('rebutton') || c.name.includes('replace')) {
        const match = await db.collection(c.name).findOne({
          $or: [{ tyreno: /R0161891123/i }, { tyre_number: /R0161891123/i }]
        });
        if (match) {
          console.log(`FOUND in ${c.name}:`, match);
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkTyres();

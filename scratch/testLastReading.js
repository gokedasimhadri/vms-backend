const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/vms').then(async () => {
  const db = mongoose.connection.db;
  const regNo = 'AP05TC6071';
  const cleanReg = regNo.replace(/[^a-zA-Z0-9]/g, '');
  const regex = new RegExp(cleanReg.split('').join('[^a-zA-Z0-9]*'), 'i');
  
  const lastAdblue = await db.collection('AdBlueBusfill')
    .find({
      $or: [{ regno: regex }, { vehicleregno: regex }],
      cmr: { $exists: true, $ne: '' }
    })
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
    
  console.log('Last adblue doc for AP05TC6071:', lastAdblue[0] ? { regno: lastAdblue[0].regno, cmr: lastAdblue[0].cmr, omr: lastAdblue[0].omr } : 'none');
  process.exit(0);
});

const mongoose = require('mongoose');

exports.getVehicleTyresData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'tyres';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    if (type === 'status') {
      const docs = await db.collection('tyrestatus').find(filter).limit(200).toArray();
      return res.json({ type: 'status', count: docs.length, data: docs });
    }

    const docs = await db.collection('vehicletyres').find(filter).limit(200).toArray();
    res.json({
      type: 'tyres',
      count: docs.length,
      data: docs
    });
  } catch (error) {
    console.error('Error fetching vehicle tyres data:', error);
    res.status(500).json({ message: 'Error fetching vehicle tyres data' });
  }
};

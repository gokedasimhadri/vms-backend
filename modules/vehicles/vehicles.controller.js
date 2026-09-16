const mongoose = require('mongoose');

exports.getVehiclesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'branch';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    if (type === 'branch') {
      const docs = await db.collection('branchvehicle').find(filter).limit(200).toArray();
      return res.json({ type: 'branch', count: docs.length, data: docs });
    }

    if (type === 'info') {
      const docs = await db.collection('vehicleinfo').find(filter).limit(200).toArray();
      return res.json({ type: 'info', count: docs.length, data: docs });
    }

    if (type === 'accidents') {
      const docs = await db.collection('vehicleaccident').find(filter).limit(200).toArray();
      return res.json({ type: 'accidents', count: docs.length, data: docs });
    }

    if (type === 'makes') {
      const docs = await db.collection('vehiclemake').find({}).limit(100).toArray();
      return res.json({ type: 'makes', count: docs.length, data: docs });
    }

    res.json({ type, data: [] });
  } catch (error) {
    console.error('Error fetching vehicles data:', error);
    res.status(500).json({ message: 'Error fetching vehicles data' });
  }
};

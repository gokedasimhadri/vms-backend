const mongoose = require('mongoose');

exports.getServicesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'service';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    if (type === 'repair') {
      const docs = await db.collection('vehiclerepair').find(filter).limit(200).toArray();
      return res.json({ type: 'repair', count: docs.length, data: docs });
    }

    const docs = await db.collection('vehicleservice').find(filter).limit(200).toArray();
    res.json({
      type: 'service',
      count: docs.length,
      data: docs
    });
  } catch (error) {
    console.error('Error fetching services data:', error);
    res.status(500).json({ message: 'Error fetching services data' });
  }
};

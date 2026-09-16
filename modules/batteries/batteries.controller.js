const mongoose = require('mongoose');

exports.getBatteriesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'vehiclewise';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    if (type === 'reports') {
      const docs = await db.collection('batterychangereport').find(filter).limit(200).toArray();
      return res.json({ type: 'reports', count: docs.length, data: docs });
    }

    const docs = await db.collection('vehiclewisebattery').find(filter).limit(200).toArray();
    res.json({
      type: 'vehiclewise',
      count: docs.length,
      data: docs
    });
  } catch (error) {
    console.error('Error fetching batteries data:', error);
    res.status(500).json({ message: 'Error fetching batteries data' });
  }
};

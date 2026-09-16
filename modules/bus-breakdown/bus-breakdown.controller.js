const mongoose = require('mongoose');

exports.getBusBreakdownData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    const docs = await db.collection('busbreakedown').find(filter).limit(200).toArray();
    res.json({
      type: 'busbreakdown',
      count: docs.length,
      data: docs
    });
  } catch (error) {
    console.error('Error fetching bus breakdown data:', error);
    res.status(500).json({ message: 'Error fetching bus breakdown data' });
  }
};

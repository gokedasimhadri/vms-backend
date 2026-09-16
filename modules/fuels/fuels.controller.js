const mongoose = require('mongoose');

exports.getFuelsData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'fuel';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    const collectionMap = {
      fuel: 'fuel',
      fuelbunk: 'fuelbunk',
      fuelfill: 'fuelfill',
      busfill: 'busfill'
    };

    const targetCollection = collectionMap[type] || 'fuel';
    const docs = await db.collection(targetCollection).find(filter).limit(200).toArray();

    res.json({
      type,
      count: docs.length,
      data: docs
    });
  } catch (error) {
    console.error('Error fetching fuels data:', error);
    res.status(500).json({ message: 'Error fetching fuels data' });
  }
};

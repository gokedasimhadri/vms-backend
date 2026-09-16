const mongoose = require('mongoose');

exports.getAdBlueData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'AdBlue';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    const collectionMap = {
      AdBlue: 'AdBlue',
      AdBlueBunk: 'AdBlueBunk',
      AdBlueBusfill: 'AdBlueBusfill',
      AdBlueFuelfill: 'AdBlueFuelfill'
    };

    const targetCollection = collectionMap[type] || 'AdBlue';
    const docs = await db.collection(targetCollection).find(filter).limit(200).toArray();

    res.json({
      type,
      count: docs.length,
      data: docs
    });
  } catch (error) {
    console.error('Error fetching Ad-Blue data:', error);
    res.status(500).json({ message: 'Error fetching Ad-Blue data' });
  }
};

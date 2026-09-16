const mongoose = require('mongoose');

exports.getRepairBillsData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    const docs = await db.collection('repairbills').find(filter).limit(200).toArray();
    res.json({
      type: 'repairbills',
      count: docs.length,
      data: docs
    });
  } catch (error) {
    console.error('Error fetching repair bills data:', error);
    res.status(500).json({ message: 'Error fetching repair bills data' });
  }
};

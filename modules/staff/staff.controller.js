const mongoose = require('mongoose');

exports.getStaffData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'bus';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    if (type === 'bus') {
      const docs = await db.collection('busstaff').find(filter).limit(200).toArray();
      return res.json({
        type: 'bus',
        count: docs.length,
        data: docs
      });
    }

    if (type === 'office') {
      const docs = await db.collection('officestaff').find(filter).limit(200).toArray();
      return res.json({
        type: 'office',
        count: docs.length,
        data: docs
      });
    }

    if (type === 'cleaner') {
      const docs = await db.collection('buscleaner').find(filter).limit(200).toArray();
      return res.json({
        type: 'cleaner',
        count: docs.length,
        data: docs
      });
    }

    if (type === 'designations') {
      const docs = await db.collection('Designation').find({}).limit(100).toArray();
      return res.json({
        type: 'designations',
        data: docs
      });
    }

    res.json({ type, data: [] });
  } catch (error) {
    console.error('Error fetching staff data:', error);
    res.status(500).json({ message: 'Error fetching staff data' });
  }
};

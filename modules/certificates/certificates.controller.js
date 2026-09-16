const mongoose = require('mongoose');

exports.getCertificatesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'pollution';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    const collectionMap = {
      pollution: 'pollution',
      fitness: 'fitness',
      roadtax: 'roadtax',
      roadpermit: 'roadpermit',
      insurance: 'insurance',
      rta: 'rta',
      insuranceclaim: 'insuranceclaim'
    };

    const targetCollection = collectionMap[type] || 'pollution';
    const docs = await db.collection(targetCollection).find(filter).limit(200).toArray();

    res.json({
      type,
      count: docs.length,
      data: docs
    });
  } catch (error) {
    console.error('Error fetching certificates data:', error);
    res.status(500).json({ message: 'Error fetching certificates data' });
  }
};

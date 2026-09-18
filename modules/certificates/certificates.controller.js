const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const collectionMap = {
  pollution: 'pollution',
  fitness: 'fitness',
  roadtax: 'roadtax',
  roadpermit: 'roadpermit',
  insurance: 'insurance',
  rta: 'rta',
  insuranceclaim: 'insuranceclaim',
  challan: 'vehiclechallan'
};

exports.getCertificatesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'pollution').toLowerCase();
    const targetCollection = collectionMap[type] || 'pollution';
    const branchFilter = buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { regno: { $regex: search, $options: 'i' } },
        { vehicleregno: { $regex: search, $options: 'i' } },
        { certificate: { $regex: search, $options: 'i' } },
        { policy: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const docs = await db.collection(targetCollection)
      .find(query)
      .sort({ _id: -1 })
      .limit(500)
      .toArray();

    res.json({
      type,
      collection: targetCollection,
      count: docs.length,
      data: docs.map(d => ({ ...d, id: d._id.toString() }))
    });
  } catch (error) {
    console.error('Error fetching certificates data:', error);
    res.status(500).json({ message: 'Error fetching certificates data' });
  }
};

exports.createCertificateItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'pollution').toLowerCase();
    const targetCollection = collectionMap[type] || 'pollution';

    const data = {
      ...req.body,
      createdAt: new Date()
    };
    delete data.type;

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating certificate record:', error);
    res.status(500).json({ message: 'Failed to create certificate record' });
  }
};

exports.updateCertificateItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'pollution';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.type;

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Certificate updated successfully' });
  } catch (error) {
    console.error('Error updating certificate record:', error);
    res.status(500).json({ message: 'Failed to update certificate record' });
  }
};

exports.deleteCertificateItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'pollution';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Error deleting certificate record:', error);
    res.status(500).json({ message: 'Failed to delete certificate record' });
  }
};

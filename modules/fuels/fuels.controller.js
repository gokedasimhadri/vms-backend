const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const collectionMap = {
  suppliers: 'fuelsuppliers',
  fuelsuppliers: 'fuelsuppliers',
  bunk: 'fuelbunk',
  fuelbunk: 'fuelbunk',
  servicing: 'bunkservicing',
  bunkservicing: 'bunkservicing',
  fuelfill: 'fuelfill',
  bunkfillings: 'fuelfill',
  busfill: 'busfill',
  busfillings: 'busfill',
  entrydata: 'busfill',
  generatereport: 'busfill',
  searchbusreport: 'busfill',
  fuel: 'fuelsuppliers'
};

exports.getFuelsData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'busfill').toLowerCase();
    const targetCollection = collectionMap[type] || 'busfill';

    // suppliers & fuelbunk can be global; others are branch scoped
    const branchFilter = (type === 'suppliers' || type === 'fuelsuppliers' || type === 'bunk' || type === 'fuelbunk')
      ? {}
      : buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { regno: { $regex: search, $options: 'i' } },
        { vehicleregno: { $regex: search, $options: 'i' } },
        { drivername: { $regex: search, $options: 'i' } },
        { bunkname: { $regex: search, $options: 'i' } },
        { fuelsupplier: { $regex: search, $options: 'i' } }
      ];
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
    console.error('Error fetching fuels data:', error);
    res.status(500).json({ message: 'Error fetching fuels data' });
  }
};

exports.createFuelItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'busfill').toLowerCase();
    const targetCollection = collectionMap[type] || 'busfill';

    const data = {
      ...req.body,
      createdAt: new Date()
    };
    delete data.type;

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating fuel record:', error);
    res.status(500).json({ message: 'Failed to create fuel record' });
  }
};

exports.updateFuelItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'busfill';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.type;

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Fuel record updated successfully' });
  } catch (error) {
    console.error('Error updating fuel record:', error);
    res.status(500).json({ message: 'Failed to update fuel record' });
  }
};

exports.deleteFuelItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'busfill';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Fuel record deleted successfully' });
  } catch (error) {
    console.error('Error deleting fuel record:', error);
    res.status(500).json({ message: 'Failed to delete fuel record' });
  }
};

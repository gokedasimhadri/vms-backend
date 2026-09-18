const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

exports.getVehicleTyresData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'tyres').toLowerCase();
    const targetCollection = type === 'status' ? 'tyrestatus' : 'vehicletyres';
    const branchFilter = buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { vehicleregno: { $regex: search, $options: 'i' } },
        { tyremake: { $regex: search, $options: 'i' } },
        { tyreno: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
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
    console.error('Error fetching vehicle tyres data:', error);
    res.status(500).json({ message: 'Error fetching vehicle tyres data' });
  }
};

exports.createVehicleTyreItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'tyres').toLowerCase();
    const targetCollection = type === 'status' ? 'tyrestatus' : 'vehicletyres';

    const data = {
      ...req.body,
      createdAt: new Date()
    };
    delete data.type;

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating tyre record:', error);
    res.status(500).json({ message: 'Failed to create tyre record' });
  }
};

exports.updateVehicleTyreItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = (type || '').toLowerCase() === 'status' ? 'tyrestatus' : 'vehicletyres';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.type;

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Tyre record updated successfully' });
  } catch (error) {
    console.error('Error updating tyre record:', error);
    res.status(500).json({ message: 'Failed to update tyre record' });
  }
};

exports.deleteVehicleTyreItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = (type || '').toLowerCase() === 'status' ? 'tyrestatus' : 'vehicletyres';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Tyre record deleted successfully' });
  } catch (error) {
    console.error('Error deleting tyre record:', error);
    res.status(500).json({ message: 'Failed to delete tyre record' });
  }
};

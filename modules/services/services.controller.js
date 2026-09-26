const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const getTargetCollection = (typeParam) => {
  const t = (typeParam || '').toLowerCase();
  if (t === 'dailymaintenance' || t === 'daily' || t === 'daily_vehicle_maintenance') {
    return 'dailyvehiclemaintenance';
  }
  if (t === 'repair' || t === 'vehiclerepairs' || t === 'vehicle_repairs') {
    return 'vehiclerepair';
  }
  return 'vehicleservice';
};

exports.getServicesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'dailymaintenance').toLowerCase();
    const targetCollection = getTargetCollection(type);
    const branchFilter = await buildBranchFilter(req.user, req.query.branch, db);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { vehicleno: { $regex: search, $options: 'i' } },
        { vehicleregno: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serviceparts: { $regex: search, $options: 'i' } },
        { attendantname: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const docs = await db.collection(targetCollection)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.json({
      type,
      collection: targetCollection,
      count: docs.length,
      data: docs.map(d => ({ ...d, id: d._id.toString() }))
    });
  } catch (error) {
    console.error('Error fetching services data:', error);
    res.status(500).json({ message: 'Error fetching services data' });
  }
};

exports.createServiceItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'dailymaintenance').toLowerCase();
    const targetCollection = getTargetCollection(type);

    const data = {
      ...req.body,
      createdAt: new Date()
    };

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating service record:', error);
    res.status(500).json({ message: 'Failed to create service record' });
  }
};

exports.updateServiceItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = getTargetCollection(type);
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Service record updated successfully' });
  } catch (error) {
    console.error('Error updating service record:', error);
    res.status(500).json({ message: 'Failed to update service record' });
  }
};

exports.deleteServiceItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = getTargetCollection(type);
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Service record deleted successfully' });
  } catch (error) {
    console.error('Error deleting service record:', error);
    res.status(500).json({ message: 'Failed to delete service record' });
  }
};

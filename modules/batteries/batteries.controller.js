const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

exports.getBatteriesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'vehiclewise').toLowerCase();
    const targetCollection = type === 'reports' ? 'batterychangereport' : 'vehiclewisebattery';
    const branchFilter = buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { vehicleregno: { $regex: search, $options: 'i' } },
        { battery_make: { $regex: search, $options: 'i' } },
        { battery_number: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } }
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
    console.error('Error fetching batteries data:', error);
    res.status(500).json({ message: 'Error fetching batteries data' });
  }
};

exports.createBatteryItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'vehiclewise').toLowerCase();
    const targetCollection = type === 'reports' ? 'batterychangereport' : 'vehiclewisebattery';

    const data = {
      ...req.body,
      createdAt: new Date()
    };
    delete data.type;

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating battery record:', error);
    res.status(500).json({ message: 'Failed to create battery record' });
  }
};

exports.updateBatteryItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = (type || '').toLowerCase() === 'reports' ? 'batterychangereport' : 'vehiclewisebattery';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.type;

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Battery record updated successfully' });
  } catch (error) {
    console.error('Error updating battery record:', error);
    res.status(500).json({ message: 'Failed to update battery record' });
  }
};

exports.deleteBatteryItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = (type || '').toLowerCase() === 'reports' ? 'batterychangereport' : 'vehiclewisebattery';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Battery record deleted successfully' });
  } catch (error) {
    console.error('Error deleting battery record:', error);
    res.status(500).json({ message: 'Failed to delete battery record' });
  }
};

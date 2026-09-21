const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const getCollectionForType = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'branch' || t === 'branchvehicle') return 'branchvehicle';
  if (t === 'info' || t === 'vehicleinfo') return 'vehicleinfo';
  if (t === 'accidents' || t === 'vehicleaccident') return 'vehicleaccident';
  if (t === 'makes' || t === 'vehiclemake') return 'vehiclemake';
  if (t === 'trips' || t === 'vehicletrip') return 'vehicletrip';
  if (t === 'challan' || t === 'vehiclechallan') return 'vehiclechallan';
  if (t === 'daily' || t === 'dailyvehicle') return 'dailyvehicle';
  if (t === 'repair' || t === 'vehiclerepair') return 'vehiclerepair';
  if (t === 'vcr') return 'vcr';
  return 'branchvehicle';
};

exports.getVehiclesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'branch';
    const collName = getCollectionForType(type);

    // Vehicle make is global; others are branch-scoped
    const branchFilter = collName === 'vehiclemake' ? {} : buildBranchFilter(req.user, req.query.branch);
    
    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { vehicleregno: { $regex: search, $options: 'i' } },
        { regno: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { drivername: { $regex: search, $options: 'i' } },
        { staffname: { $regex: search, $options: 'i' } }
      ];
    }

    const docs = await db.collection(collName)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.json({
      type,
      collection: collName,
      count: docs.length,
      data: docs.map(d => ({ ...d, id: d._id.toString() }))
    });
  } catch (error) {
    console.error('Error fetching vehicles data:', error);
    res.status(500).json({ message: 'Error fetching vehicles data' });
  }
};

exports.createVehicleItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.params.type || req.body.type || 'branch';
    const collName = getCollectionForType(type);

    const data = {
      ...req.body,
      createdAt: new Date()
    };
    delete data.type;

    const result = await db.collection(collName).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating vehicle record:', error);
    res.status(500).json({ message: 'Failed to create vehicle record' });
  }
};

exports.updateVehicleItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collName = getCollectionForType(type);
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.type;

    await db.collection(collName).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Vehicle record updated successfully' });
  } catch (error) {
    console.error('Error updating vehicle record:', error);
    res.status(500).json({ message: 'Failed to update vehicle record' });
  }
};

exports.deleteVehicleItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collName = getCollectionForType(type);
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(collName).deleteOne(filter);
    res.json({ success: true, message: 'Vehicle record deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle record:', error);
    res.status(500).json({ message: 'Failed to delete vehicle record' });
  }
};

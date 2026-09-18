const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const collectionMap = {
  adblue: 'AdBlue',
  adbluebunk: 'AdBlueBunk',
  adbluebusfill: 'AdBlueBusfill',
  adbluefuelfill: 'AdBlueFuelfill'
};

exports.getAdBlueData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'adbluebusfill').toLowerCase();
    const targetCollection = collectionMap[type] || 'AdBlueBusfill';

    const branchFilter = (type === 'adblue' || type === 'adbluebunk')
      ? {}
      : buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { regno: { $regex: search, $options: 'i' } },
        { vehicleregno: { $regex: search, $options: 'i' } },
        { drivername: { $regex: search, $options: 'i' } },
        { bunkname: { $regex: search, $options: 'i' } }
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
    console.error('Error fetching Ad-Blue data:', error);
    res.status(500).json({ message: 'Error fetching Ad-Blue data' });
  }
};

exports.createAdBlueItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'adbluebusfill').toLowerCase();
    const targetCollection = collectionMap[type] || 'AdBlueBusfill';

    const data = {
      ...req.body,
      createdAt: new Date()
    };
    delete data.type;

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating Ad-Blue record:', error);
    res.status(500).json({ message: 'Failed to create Ad-Blue record' });
  }
};

exports.updateAdBlueItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'AdBlueBusfill';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;
    delete updateData.type;

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Ad-Blue record updated successfully' });
  } catch (error) {
    console.error('Error updating Ad-Blue record:', error);
    res.status(500).json({ message: 'Failed to update Ad-Blue record' });
  }
};

exports.deleteAdBlueItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'AdBlueBusfill';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Ad-Blue record deleted successfully' });
  } catch (error) {
    console.error('Error deleting Ad-Blue record:', error);
    res.status(500).json({ message: 'Failed to delete Ad-Blue record' });
  }
};

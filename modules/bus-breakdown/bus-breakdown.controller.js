const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

exports.getBusBreakdownData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branchFilter = buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { busno: { $regex: search, $options: 'i' } },
        { drivername: { $regex: search, $options: 'i' } },
        { complaint: { $regex: search, $options: 'i' } },
        { breakedownplace: { $regex: search, $options: 'i' } }
      ];
    }

    const docs = await db.collection('busbreakedown')
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.json({
      type: 'busbreakdown',
      count: docs.length,
      data: docs.map(d => ({ ...d, id: d._id.toString() }))
    });
  } catch (error) {
    console.error('Error fetching bus breakdown data:', error);
    res.status(500).json({ message: 'Error fetching bus breakdown data' });
  }
};

exports.createBusBreakdownItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const data = {
      ...req.body,
      createdAt: new Date()
    };

    const result = await db.collection('busbreakedown').insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating bus breakdown record:', error);
    res.status(500).json({ message: 'Failed to create bus breakdown record' });
  }
};

exports.updateBusBreakdownItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await db.collection('busbreakedown').updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Bus breakdown record updated successfully' });
  } catch (error) {
    console.error('Error updating bus breakdown record:', error);
    res.status(500).json({ message: 'Failed to update bus breakdown record' });
  }
};

exports.deleteBusBreakdownItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection('busbreakedown').deleteOne(filter);
    res.json({ success: true, message: 'Bus breakdown record deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus breakdown record:', error);
    res.status(500).json({ message: 'Failed to delete bus breakdown record' });
  }
};

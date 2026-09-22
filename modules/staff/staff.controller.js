const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const getCollectionForType = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'designations' || t === 'designation') return 'Designation';
  if (t === 'office_staff' || t === 'office' || t === 'officestaff') return 'officestaff';
  if (t === 'busstaff_information' || t === 'bus' || t === 'busstaff') return 'busstaff';
  if (t === 'buscleaner_information' || t === 'cleaner' || t === 'buscleaner') return 'buscleaner';
  if (t === 'opting_staff_information' || t === 'opting' || t === 'optingstaff') return 'optingstaff';
  if (t === 'staff_meeting_register' || t === 'meeting' || t === 'staffmeeting') return 'staffmeeting';
  if (t === 'staff_remarks' || t === 'remarks' || t === 'busremarks') return 'busremarks';
  return null;
};

exports.getStaffData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'Designations';
    const collName = getCollectionForType(type);

    if (!collName) {
      return res.json({ type, count: 0, data: [] });
    }

    // Designation is global, others are branch-scoped
    const branchFilter = collName === 'Designation'
      ? {}
      : buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { staffname: { $regex: search, $options: 'i' } },
        { cleanername: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { vehicleno: { $regex: search, $options: 'i' } }
      ];
    }

    const docs = await db.collection(collName)
      .find(query)
      .sort({ _id: -1 })
      .limit(1000)
      .toArray();

    return res.json({
      type,
      collection: collName,
      count: docs.length,
      data: docs.map(d => ({ ...d, id: d._id.toString() }))
    });
  } catch (error) {
    console.error('Error fetching staff data:', error);
    res.status(500).json({ message: 'Error fetching staff data' });
  }
};

exports.createStaffItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type } = req.params;
    const collName = getCollectionForType(type);
    if (!collName) {
      return res.status(400).json({ message: 'Invalid staff category' });
    }
    const payload = {
      ...req.body,
      createdAt: new Date()
    };
    const result = await db.collection(collName).insertOne(payload);
    res.status(201).json({ success: true, id: result.insertedId, data: payload });
  } catch (error) {
    console.error('Error creating staff item:', error);
    res.status(500).json({ message: 'Failed to create item' });
  }
};

exports.updateStaffItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collName = getCollectionForType(type);
    if (!collName) {
      return res.status(400).json({ message: 'Invalid staff category' });
    }
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await db.collection(collName).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    console.error('Error updating staff item:', error);
    res.status(500).json({ message: 'Failed to update item' });
  }
};

exports.deleteStaffItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collName = getCollectionForType(type);
    if (!collName) {
      return res.status(400).json({ message: 'Invalid staff category' });
    }
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    await db.collection(collName).deleteOne(filter);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff item:', error);
    res.status(500).json({ message: 'Failed to delete item' });
  }
};

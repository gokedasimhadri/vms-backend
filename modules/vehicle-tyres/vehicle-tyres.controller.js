const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

exports.getVehicleTyresData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'tyres').toLowerCase();
    const isTrack = type === 'tracktyre' || type === 'track';
    const targetCollection = type === 'status' ? 'tyrestatus' : (type === 'rebutton' || isTrack) ? 'rebuttontyres' : 'vehicletyres';
    const branchFilter = buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { vehicleregno: { $regex: search, $options: 'i' } },
        { tyremake: { $regex: search, $options: 'i' } },
        { tyreno: { $regex: search, $options: 'i' } },
        { frombusno: { $regex: search, $options: 'i' } },
        { tobusno: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }

    let docs = await db.collection(targetCollection)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    if (isTrack) {
      // If rebuttontyres is empty or search returns no docs, also check vehicletyres
      if (docs.length === 0 && req.query.search) {
        const vtDocs = await db.collection('vehicletyres')
          .find(query)
          .sort({ _id: -1 })
          .toArray();
        docs = vtDocs.map(d => ({
          ...d,
          frombusno: '-',
          tobusno: d.vehicleregno || '-',
          dateofreplacement: d.dateoffitting || d.date || '-'
        }));
      }

      // Compute total shift counts for each tyre number across rebuttontyres and vehicletyres
      const allRebuttonDocs = await db.collection('rebuttontyres').find({}).toArray();
      const shiftCountMap = {};
      allRebuttonDocs.forEach(r => {
        const tNo = (r.tyreno || r.tyre_number || '').trim().toUpperCase();
        if (tNo) {
          shiftCountMap[tNo] = (shiftCountMap[tNo] || 0) + 1;
        }
      });

      docs = docs.map(d => {
        const tNo = (d.tyreno || d.tyre_number || '').trim().toUpperCase();
        const shiftCount = shiftCountMap[tNo] || (d.frombusno && d.tobusno && d.frombusno !== d.tobusno ? 1 : (d.vehicleregno ? 1 : 0));
        return {
          ...d,
          frombusno: d.frombusno || '-',
          tobusno: d.tobusno || d.vehicleregno || '-',
          shift_count: shiftCount,
          id: d._id.toString()
        };
      });

      return res.json({
        type,
        collection: targetCollection,
        count: docs.length,
        data: docs
      });
    }

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
    const t = (req.params.type || req.body.type || 'tyres').toLowerCase();
    const isTrack = t === 'tracktyre' || t === 'track';
    const targetCollection = t === 'status' ? 'tyrestatus' : (t === 'rebutton' || isTrack) ? 'rebuttontyres' : 'vehicletyres';

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
    const t = (type || '').toLowerCase();
    const isTrack = t === 'tracktyre' || t === 'track';
    const targetCollection = t === 'status' ? 'tyrestatus' : (t === 'rebutton' || isTrack) ? 'rebuttontyres' : 'vehicletyres';
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
    const t = (type || '').toLowerCase();
    const isTrack = t === 'tracktyre' || t === 'track';
    const targetCollection = t === 'status' ? 'tyrestatus' : (t === 'rebutton' || isTrack) ? 'rebuttontyres' : 'vehicletyres';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Tyre record deleted successfully' });
  } catch (error) {
    console.error('Error deleting tyre record:', error);
    res.status(500).json({ message: 'Failed to delete tyre record' });
  }
};

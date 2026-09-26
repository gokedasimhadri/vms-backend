const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

exports.getVehicleTyresData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'tyres').toLowerCase();
    const isTrack = type === 'tracktyre' || type === 'track';
    const targetCollection = type === 'status' ? 'tyrestatus' : (type === 'rebutton' || isTrack) ? 'replacedvehicle' : 'vehicletyres';
    const branchFilter = await buildBranchFilter(req.user, req.query.branch, db);

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
      // If replacedvehicle is empty or search returns no docs, also check vehicletyres
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

      // Compute total shift counts for each tyre number across replacedvehicle and vehicletyres
      const allRebuttonDocs = await db.collection('replacedvehicle').find({}).toArray();
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

    const mappedDocs = docs.map(d => {
      const omrVal = d.omr;
      const cmrVal = d.cmr || d.removal;
      let calcKms = d.totalkms;
      if ((calcKms === undefined || calcKms === null || calcKms === '') && omrVal && cmrVal && !isNaN(Number(omrVal)) && !isNaN(Number(cmrVal))) {
        calcKms = Number(cmrVal) - Number(omrVal);
      }
      return {
        ...d,
        cmr: cmrVal !== undefined && cmrVal !== null ? cmrVal : '-',
        dateofreplacement: d.dateofreplacement || d.replacementdate || d.removedate || '-',
        totalkms: calcKms !== undefined && calcKms !== null ? calcKms : '-',
        status: d.status || (type === 'rebutton' ? 'Replaced' : 'Active'),
        id: d._id.toString()
      };
    });

    res.json({
      type,
      collection: targetCollection,
      count: mappedDocs.length,
      data: mappedDocs
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
    const targetCollection = t === 'status' ? 'tyrestatus' : (t === 'rebutton' || isTrack) ? 'replacedvehicle' : 'vehicletyres';

    const data = {
      ...req.body,
      createdAt: new Date()
    };

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
    const targetCollection = t === 'status' ? 'tyrestatus' : (t === 'rebutton' || isTrack) ? 'replacedvehicle' : 'vehicletyres';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

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
    const targetCollection = t === 'status' ? 'tyrestatus' : (t === 'rebutton' || isTrack) ? 'replacedvehicle' : 'vehicletyres';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Tyre record deleted successfully' });
  } catch (error) {
    console.error('Error deleting tyre record:', error);
    res.status(500).json({ message: 'Failed to delete tyre record' });
  }
};


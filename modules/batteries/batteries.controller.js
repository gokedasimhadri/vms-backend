const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

exports.getBatteriesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'vehiclewise').toLowerCase();
    const isTrack = type === 'trackbattery' || type === 'track';
    const targetCollection = (type === 'reports' || isTrack) ? 'batterychangereport' : 'vehiclewisebattery';
    const branchFilter = buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { vehicleregno: { $regex: search, $options: 'i' } },
        { battery_make: { $regex: search, $options: 'i' } },
        { battery_number: { $regex: search, $options: 'i' } },
        { frombusno: { $regex: search, $options: 'i' } },
        { tobusno: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } }
      ];
    }

    let docs = await db.collection(targetCollection)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    if (isTrack) {
      // If batterychangereport is empty or search returns no docs, also check vehiclewisebattery
      if (docs.length === 0 && req.query.search) {
        const vwDocs = await db.collection('vehiclewisebattery')
          .find(query)
          .sort({ _id: -1 })
          .toArray();
        docs = vwDocs.map(d => ({
          ...d,
          frombusno: '-',
          tobusno: d.vehicleregno || '-',
          initialfitmentdate: d.fitment_date || '-',
          presentfitmentdate: d.fitment_date || '-'
        }));
      }

      // Compute total shift counts for each battery_number across both collections
      const allChangeReports = await db.collection('batterychangereport').find({}).toArray();
      const shiftCountMap = {};
      allChangeReports.forEach(r => {
        const bNo = (r.battery_number || '').trim().toUpperCase();
        if (bNo) {
          shiftCountMap[bNo] = (shiftCountMap[bNo] || 0) + 1;
        }
      });

      docs = docs.map(d => {
        const bNo = (d.battery_number || '').trim().toUpperCase();
        const shiftCount = shiftCountMap[bNo] || (d.frombusno && d.tobusno && d.frombusno !== d.tobusno ? 1 : 0);
        return {
          ...d,
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
    console.error('Error fetching batteries data:', error);
    res.status(500).json({ message: 'Error fetching batteries data' });
  }
};

exports.createBatteryItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'vehiclewise').toLowerCase();
    const isReportOrTrack = type === 'reports' || type === 'trackbattery' || type === 'track';
    const targetCollection = isReportOrTrack ? 'batterychangereport' : 'vehiclewisebattery';

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
    const t = (type || '').toLowerCase();
    const isReportOrTrack = t === 'reports' || t === 'trackbattery' || t === 'track';
    const targetCollection = isReportOrTrack ? 'batterychangereport' : 'vehiclewisebattery';
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
    const t = (type || '').toLowerCase();
    const isReportOrTrack = t === 'reports' || t === 'trackbattery' || t === 'track';
    const targetCollection = isReportOrTrack ? 'batterychangereport' : 'vehiclewisebattery';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Battery record deleted successfully' });
  } catch (error) {
    console.error('Error deleting battery record:', error);
    res.status(500).json({ message: 'Failed to delete battery record' });
  }
};

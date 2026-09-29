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
      : await buildBranchFilter(req.user, req.query.branch, db);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      const searchFilter = {
        $or: [
          { regno: { $regex: search, $options: 'i' } },
          { vehicleregno: { $regex: search, $options: 'i' } },
          { busnumber: { $regex: search, $options: 'i' } },
          { drivername: { $regex: search, $options: 'i' } },
          { bunkname: { $regex: search, $options: 'i' } }
        ]
      };
      query = branchFilter.$or ? { $and: [branchFilter, searchFilter] } : { ...branchFilter, ...searchFilter };
    }

    let docs = await db.collection(targetCollection)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    const fromDate = req.query.fromDate || req.query.fromdate;
    const toDate = req.query.toDate || req.query.todate;
    if (fromDate || toDate) {
      const parseIso = (val) => {
        if (!val) return null;
        const str = String(val).trim();
        if (!str || ['null', 'undefined', 'invalid date'].includes(str.toLowerCase())) return null;
        const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
        const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (yyyymmdd) return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
        const dt = new Date(str);
        if (!isNaN(dt.getTime())) {
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        }
        return null;
      };

      const fromStr = parseIso(fromDate);
      const toStr = parseIso(toDate);

      docs = docs.filter(d => {
        let docDate = parseIso(d.date) || parseIso(d.filldate) || parseIso(d.billdate) || parseIso(d.date_dt) || parseIso(d.createdAt);
        if (!docDate && d.Timestamp) {
          const dt = new Date(d.Timestamp);
          if (!isNaN(dt.getTime())) {
            docDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          }
        }
        if (!docDate) return true;
        if (fromStr && docDate < fromStr) return false;
        if (toStr && docDate > toStr) return false;
        return true;
      });
    }

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

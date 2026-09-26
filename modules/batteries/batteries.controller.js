const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

function parseDate(val) {
  if (!val || val === 'Invalid date') return null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
    const parts = val.split('-');
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  const dt = new Date(val);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDate(dt) {
  if (!dt || isNaN(dt.getTime())) return '-';
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}-${m}-${y}`;
}

function cleanDateStr(val) {
  if (!val || val === 'Invalid date') return '-';
  return val;
}

exports.getBatteriesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'vehiclewise').toLowerCase();
    const isTrack = type === 'trackbattery' || type === 'track';
    const targetCollection = (type === 'reports' || isTrack) ? 'batterychangereport' : 'vehiclewisebattery';
    const branchFilter = await buildBranchFilter(req.user, req.query.branch, db);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { vehicleregno: { $regex: search, $options: 'i' } },
        { battery_make: { $regex: search, $options: 'i' } },
        { batterymake: { $regex: search, $options: 'i' } },
        { battery_number: { $regex: search, $options: 'i' } },
        { batterynumber: { $regex: search, $options: 'i' } },
        { frombusno: { $regex: search, $options: 'i' } },
        { fromregno: { $regex: search, $options: 'i' } },
        { tobusno: { $regex: search, $options: 'i' } },
        { toregno: { $regex: search, $options: 'i' } },
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
        docs = vwDocs;
      }

      // Compute total shift counts for each battery_number across both collections
      const allChangeReports = await db.collection('batterychangereport').find({}).toArray();
      const shiftCountMap = {};
      allChangeReports.forEach(r => {
        const bNo = (r.battery_number || r.batterynumber || r.batteryno || '').trim().toUpperCase();
        if (bNo) {
          shiftCountMap[bNo] = (shiftCountMap[bNo] || 0) + 1;
        }
      });

      const mappedTrackDocs = docs.map(d => {
        const bMake = d.battery_make || d.batterymake || d.make || '-';
        const bCap = d.battery_capacity || d.batterycapacity || d.capacity || '-';
        const bNo = d.battery_number || d.batterynumber || d.batteryno || '-';
        const bNoUpper = String(bNo).trim().toUpperCase();
        const fromBus = d.frombusno || d.fromregno || '-';
        const toBus = d.tobusno || d.toregno || d.vehicleregno || '-';
        const shiftCount = shiftCountMap[bNoUpper] || (fromBus !== '-' && toBus !== '-' && fromBus !== toBus ? 1 : (d.vehicleregno ? 1 : 0));

        const initFit = cleanDateStr(d.initialfitmentdate || d.fitment_date);
        const presFit = cleanDateStr(d.presentfitmentdate || d.fitment_date);

        return {
          ...d,
          battery_make: bMake,
          batterymake: bMake,
          battery_capacity: bCap,
          batterycapacity: bCap,
          battery_number: bNo,
          batterynumber: bNo,
          frombusno: fromBus,
          fromregno: fromBus,
          tobusno: toBus,
          toregno: toBus,
          initialfitmentdate: initFit,
          presentfitmentdate: presFit,
          shift_count: shiftCount,
          id: d._id.toString()
        };
      });

      return res.json({
        type,
        collection: targetCollection,
        count: mappedTrackDocs.length,
        data: mappedTrackDocs
      });
    }

    // Standard mapping for reports / vehiclewisebattery
    const mappedDocs = docs.map(d => {
      const bMake = d.battery_make || d.batterymake || d.make || '-';
      const bCap = d.battery_capacity || d.batterycapacity || d.capacity || '-';
      const bNo = d.battery_number || d.batterynumber || d.batteryno || '-';
      const fromBus = d.frombusno || d.fromregno || '-';
      const toBus = d.tobusno || d.toregno || d.vehicleregno || '-';

      const initFit = cleanDateStr(d.initialfitmentdate || d.fitment_date);
      const presFit = cleanDateStr(d.presentfitmentdate || d.fitment_date);

      // Fitment date formatting
      let fitDateStr = cleanDateStr(d.fitment_date || d.initialfitmentdate);

      // Compute or format expired_date for vehiclewise
      let expDateStr = cleanDateStr(d.expired_date || d.expireddate);

      if (expDateStr === '-' || expDateStr === 'Invalid date') {
        const fitDt = parseDate(fitDateStr) || (d.fitment_date_dt ? new Date(d.fitment_date_dt) : null);
        const warnMonths = parseInt(String(d.warranty || '').replace(/\D/g, ''), 10);
        if (fitDt && warnMonths) {
          const computed = new Date(fitDt);
          computed.setMonth(computed.getMonth() + warnMonths);
          expDateStr = formatDate(computed);
        } else if (d.expired_date_dt) {
          const dtObj = new Date(d.expired_date_dt);
          if (!isNaN(dtObj.getTime())) {
            expDateStr = formatDate(dtObj);
          }
        }
      }

      return {
        ...d,
        battery_make: bMake,
        batterymake: bMake,
        battery_capacity: bCap,
        batterycapacity: bCap,
        battery_number: bNo,
        batterynumber: bNo,
        frombusno: fromBus,
        fromregno: fromBus,
        tobusno: toBus,
        toregno: toBus,
        initialfitmentdate: initFit,
        presentfitmentdate: presFit,
        fitment_date: fitDateStr,
        expired_date: expDateStr,
        expireddate: expDateStr,
        vehicleregno: d.vehicleregno || d.vehicleno || d.busno || '-',
        status: d.status || 'ACTIVE',
        remarks: d.remarks || '-',
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

    const body = req.body;
    const bMake = body.battery_make || body.batterymake || body.make;
    const bCap = body.battery_capacity || body.batterycapacity || body.capacity;
    const bNo = body.battery_number || body.batterynumber || body.batteryno;
    const fromBus = body.frombusno || body.fromregno;
    const toBus = body.tobusno || body.toregno;

    const data = {
      ...body,
      battery_make: bMake,
      batterymake: bMake,
      battery_capacity: bCap,
      batterycapacity: bCap,
      battery_number: bNo,
      batterynumber: bNo,
      frombusno: fromBus,
      fromregno: fromBus,
      tobusno: toBus,
      toregno: toBus,
      createdAt: new Date()
    };

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

    if (updateData.battery_make || updateData.batterymake) {
      const val = updateData.battery_make || updateData.batterymake;
      updateData.battery_make = val;
      updateData.batterymake = val;
    }
    if (updateData.battery_capacity || updateData.batterycapacity) {
      const val = updateData.battery_capacity || updateData.batterycapacity;
      updateData.battery_capacity = val;
      updateData.batterycapacity = val;
    }
    if (updateData.battery_number || updateData.batterynumber) {
      const val = updateData.battery_number || updateData.batterynumber;
      updateData.battery_number = val;
      updateData.batterynumber = val;
    }
    if (updateData.frombusno || updateData.fromregno) {
      const val = updateData.frombusno || updateData.fromregno;
      updateData.frombusno = val;
      updateData.fromregno = val;
    }
    if (updateData.tobusno || updateData.toregno) {
      const val = updateData.tobusno || updateData.toregno;
      updateData.tobusno = val;
      updateData.toregno = val;
    }

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


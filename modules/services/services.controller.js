const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const getTargetCollection = (typeParam) => {
  const t = (typeParam || '').toLowerCase();
  if (t === 'dailymaintenance' || t === 'daily' || t === 'daily_vehicle_maintenance') {
    return 'dailyvehicle';
  }
  if (t === 'repair' || t === 'vehiclerepairs' || t === 'vehicle_repairs') {
    return 'vehiclerepair';
  }
  return 'vehicleservice';
};

exports.getServicesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'dailymaintenance').toLowerCase();
    const targetCollection = getTargetCollection(type);
    const branchFilter = await buildBranchFilter(req.user, req.query.branch, db);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      const searchFilter = {
        $or: [
          { vehicleno: { $regex: search, $options: 'i' } },
          { vehicleregno: { $regex: search, $options: 'i' } },
          { regno: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
          { serviceparts: { $regex: search, $options: 'i' } },
          { attendantname: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
      query = branchFilter.$or ? { $and: [branchFilter, searchFilter] } : { ...branchFilter, ...searchFilter };
    }

    const docs = await db.collection(targetCollection)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    // Build vehicle map for metadata lookup (society, model)
    const vehicleDocs = await db.collection('branchvehicle')
      .find({})
      .project({ vehicleregno: 1, regno: 1, busno: 1, vehicleno: 1, society: 1, Society: 1, model: 1, Model: 1, branch: 1 })
      .toArray();

    const vehicleMap = {};
    vehicleDocs.forEach(v => {
      const reg = (v.vehicleregno || v.regno || v.busno || v.vehicleno || '').trim().toUpperCase();
      if (reg) {
        vehicleMap[reg] = {
          society: v.society || v.Society || '',
          model: v.model || v.Model || '',
          branch: v.branch || ''
        };
      }
    });

    const mappedDocs = docs.map(d => {
      const id = d._id.toString();
      const regNo = (d.vehicleno || d.vehicleregno || d.regno || d.busno || '').trim();
      const regKey = regNo.toUpperCase();
      const meta = vehicleMap[regKey] || {};

      const societyVal = (d.society && d.society !== 'null') ? d.society : (meta.society || '-');
      const modelVal = (d.model && d.model !== 'null') ? d.model : (meta.model || '-');

      if (targetCollection === 'dailyvehicle') {
        return {
          ...d,
          id,
          society: societyVal,
          model: modelVal,
          vehicleno: regNo || '-',
          vehicleregno: regNo || '-',
          regno: regNo || '-',
          waterservicing: d.waterservicing || d.waterservice || '-',
          engineoil: d.engineoil || '-',
          chasis: d.chasis || '-',
          springs: d.springs || '-',
          centerjoints: d.centerjoints || '-',
          allubolts: d.allubolts || d.ubolts || '-',
          airfilling: d.airfilling || d.airfillings || '-',
          greesing: d.greesing || '-',
          batterymaintenance: d.batterymaintenance || d.battery || '-',
          lights: d.lights || '-',
          glasses: d.glasses || '-',
          bodypaint: d.bodypaint || '-',
          seats: d.seats || '-',
          gearoil: d.gearoil || '-',
          difoil: d.difoil || '-',
          brakeoil: d.brakeoil || d.breakoil || '-',
          atfoil: d.atfoil || '-',
          radiatorwater: d.radiatorwater || d.radiator || '-',
          meterreading: d.meterreading || d.meter || d.reading || '-',
          dateofmaintenance: d.dateofmaintenance || d.date || '-',
          date: d.date || d.dateofmaintenance || '-',
          remarks: d.remarks || '-'
        };
      }

      if (targetCollection === 'vehicleservice') {
        const lastR = parseFloat(d.lastservicingreading || d.lastreading) || 0;
        const presR = parseFloat(d.presentservicingreading || d.presentreading || d.newcmr) || 0;
        let calcKms = d.kms;
        if (calcKms === null || calcKms === undefined || calcKms === '' || calcKms === 0) {
          if (presR > lastR) {
            calcKms = presR - lastR;
          } else {
            calcKms = '-';
          }
        }

        return {
          ...d,
          id,
          society: societyVal,
          model: modelVal,
          vehicleno: regNo || '-',
          vehicleregno: regNo || '-',
          regno: regNo || '-',
          serviceparts: d.serviceparts || d.servicingparts || '-',
          duration: d.duration || '-',
          lastservicingreading: d.lastservicingreading || d.lastreading || '-',
          lastreading: d.lastreading || d.lastservicingreading || '-',
          presentservicingreading: d.presentservicingreading || d.presentreading || d.newcmr || '-',
          presentreading: d.presentreading || d.presentservicingreading || d.newcmr || '-',
          kms: calcKms,
          remainderreading: d.remainderreading || d.remainder || '-',
          remainder: d.remainder || d.remainderreading || '-',
          date: d.date || '-',
          remarks: d.remarks || '-'
        };
      }

      if (targetCollection === 'vehiclerepair') {
        return {
          ...d,
          id,
          society: societyVal,
          model: modelVal,
          vehicleno: regNo || '-',
          vehicleregno: regNo || '-',
          regno: regNo || '-',
          attendantname: d.attendantname || d.staffname || d.attendant || '-',
          staffname: d.staffname || d.attendantname || d.attendant || '-',
          meterreading: d.meterreading || d.reading || d.meter || '-',
          reading: d.reading || d.meterreading || d.meter || '-',
          description: d.description || d.repairdescription || '-',
          intime: d.intime || '-',
          outtime: d.outtime || '-',
          date: d.date || '-',
          remarks: d.remarks || '-'
        };
      }

      return {
        ...d,
        id,
        society: societyVal,
        model: modelVal,
        vehicleno: regNo || '-'
      };
    });

    res.json({
      type,
      collection: targetCollection,
      count: mappedDocs.length,
      data: mappedDocs
    });
  } catch (error) {
    console.error('Error fetching services data:', error);
    res.status(500).json({ message: 'Error fetching services data' });
  }
};

exports.createServiceItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'dailymaintenance').toLowerCase();
    const targetCollection = getTargetCollection(type);

    const data = {
      ...req.body,
      createdAt: new Date()
    };

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating service record:', error);
    res.status(500).json({ message: 'Failed to create service record' });
  }
};

exports.updateServiceItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = getTargetCollection(type);
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Service record updated successfully' });
  } catch (error) {
    console.error('Error updating service record:', error);
    res.status(500).json({ message: 'Failed to update service record' });
  }
};

exports.deleteServiceItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = getTargetCollection(type);
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Service record deleted successfully' });
  } catch (error) {
    console.error('Error deleting service record:', error);
    res.status(500).json({ message: 'Failed to delete service record' });
  }
};

const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const collectionMap = {
  suppliers: 'fuel',
  fuelsuppliers: 'fuel',
  fuel: 'fuel',
  bunk: 'fuelbunk',
  fuelbunk: 'fuelbunk',
  servicing: 'bunkservicing',
  bunkservicing: 'bunkservicing',
  fuelfill: 'fuelfill',
  bunkfillings: 'fuelfill',
  busfill: 'busfill',
  busfillings: 'busfill',
  entrydata: 'busfill',
  generatereport: 'busfill',
  searchbusreport: 'busfill',
};

exports.getFuelsData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'busfill').toLowerCase();
    const targetCollection = collectionMap[type] || 'busfill';

    // suppliers & fuelfill can be global; others are branch scoped if branch is present
    const branchFilter = (type === 'suppliers' || type === 'fuelsuppliers' || type === 'fuel' || type === 'fuelfill' || type === 'bunkfillings')
      ? {}
      : buildBranchFilter(req.user, req.query.branch);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { regno: { $regex: search, $options: 'i' } },
        { vehicleregno: { $regex: search, $options: 'i' } },
        { drivername: { $regex: search, $options: 'i' } },
        { bunkname: { $regex: search, $options: 'i' } },
        { bunk: { $regex: search, $options: 'i' } },
        { fuelsupplier: { $regex: search, $options: 'i' } },
        { bunksupplier: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { companyname: { $regex: search, $options: 'i' } },
        { branch: { $regex: search, $options: 'i' } }
      ];
    }

    const docs = await db.collection(targetCollection)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    const mappedDocs = docs.map(d => {
      const id = d._id.toString();
      
      if (targetCollection === 'fuel') {
        return {
          ...d,
          id,
          companyname: d.companyname || d.name || d.suppliername || ''
        };
      }

      if (targetCollection === 'fuelbunk') {
        return {
          ...d,
          id,
          branchname: d.branchname || d.branch || '',
          bunkcapacity: d.bunkcapacity || d.capacity || ''
        };
      }

      if (targetCollection === 'bunkservicing') {
        return {
          ...d,
          id,
          branch: d.branch || d.branchname || '',
          companyname: d.companyname || d.supplier || d.bunksupplier || '',
          reason: d.reason || '',
          date: d.date || '',
          description: d.description || '',
          remarks: d.remarks || ''
        };
      }

      if (targetCollection === 'fuelfill') {
        const totalCalc = (d.totalrate !== undefined && d.totalrate !== null && d.totalrate !== '')
          ? d.totalrate
          : ((d.trate !== undefined && d.trate !== null && d.trate !== '')
            ? d.trate
            : ((d.quantity && d.rate) ? (parseFloat(d.quantity) * parseFloat(d.rate)).toFixed(2) : ''));

        return {
          ...d,
          id,
          bunk: d.bunk || d.bunkname || '',
          bunkname: d.bunkname || d.bunk || '',
          fuelsupplier: d.fuelsupplier || d.bunksupplier || d.supplier || '',
          bunksupplier: d.bunksupplier || d.fuelsupplier || d.supplier || '',
          billno: d.billno || '',
          billdate: d.billdate || '',
          filldate: d.filldate || '',
          tankerno: d.tankerno || d.regno || '',
          quantity: d.quantity || '',
          rate: d.rate || d.frate || '',
          totalrate: totalCalc,
          trate: d.trate || totalCalc
        };
      }

      // Default: busfill
      return {
        ...d,
        id,
        token_no: d.token_no || d.token || '',
        token_issued_by: d.token_issued_by || d.issuedby || '',
        filled_Qty: d.filled_Qty || d.fquantity || d.quantity || '',
        capacity: d.capacity || d.fueltank || '',
        rate: d.rate || d.frate || '',
        totalrate: d.totalrate || d.total || ''
      };
    });

    res.json({
      type,
      collection: targetCollection,
      count: mappedDocs.length,
      data: mappedDocs
    });
  } catch (error) {
    console.error('Error fetching fuels data:', error);
    res.status(500).json({ message: 'Error fetching fuels data' });
  }
};

exports.createFuelItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'busfill').toLowerCase();
    const targetCollection = collectionMap[type] || 'busfill';

    const data = {
      ...req.body,
      createdAt: new Date()
    };

    // Maintain field compatibility
    if (targetCollection === 'fuel') {
      if (data.companyname && !data.name) data.name = data.companyname;
      if (data.name && !data.companyname) data.companyname = data.name;
    } else if (targetCollection === 'fuelbunk') {
      if (data.branchname && !data.branch) data.branch = data.branchname;
      if (data.bunkcapacity && !data.capacity) data.capacity = data.bunkcapacity;
    } else if (targetCollection === 'fuelfill') {
      if (data.bunk && !data.bunkname) data.bunkname = data.bunk;
      if (data.fuelsupplier && !data.bunksupplier) data.bunksupplier = data.fuelsupplier;
      if (data.totalrate && !data.trate) data.trate = data.totalrate;
    }

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating fuel record:', error);
    res.status(500).json({ message: 'Failed to create fuel record' });
  }
};

exports.updateFuelItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'busfill';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    if (targetCollection === 'fuel') {
      if (updateData.companyname && !updateData.name) updateData.name = updateData.companyname;
    } else if (targetCollection === 'fuelbunk') {
      if (updateData.branchname && !updateData.branch) updateData.branch = updateData.branchname;
      if (updateData.bunkcapacity && !updateData.capacity) updateData.capacity = updateData.bunkcapacity;
    } else if (targetCollection === 'fuelfill') {
      if (updateData.bunk && !updateData.bunkname) updateData.bunkname = updateData.bunk;
      if (updateData.fuelsupplier && !updateData.bunksupplier) updateData.bunksupplier = updateData.fuelsupplier;
      if (updateData.totalrate && !updateData.trate) updateData.trate = updateData.totalrate;
    }

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Fuel record updated successfully' });
  } catch (error) {
    console.error('Error updating fuel record:', error);
    res.status(500).json({ message: 'Failed to update fuel record' });
  }
};

exports.deleteFuelItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'busfill';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Fuel record deleted successfully' });
  } catch (error) {
    console.error('Error deleting fuel record:', error);
    res.status(500).json({ message: 'Failed to delete fuel record' });
  }
};


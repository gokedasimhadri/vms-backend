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
      : await buildBranchFilter(req.user, req.query.branch, db);

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

    const fromDate = req.query.fromDate || req.query.fromdate;
    const toDate = req.query.toDate || req.query.todate;

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

    if (fromStr || toStr) {
      let datesListIso = [];
      let datesListDdmmyyyy = [];

      if (fromStr && toStr) {
        let curr = new Date(fromStr + 'T00:00:00.000Z');
        const end = new Date(toStr + 'T00:00:00.000Z');
        let safetyCounter = 0;
        while (curr <= end && safetyCounter < 400) {
          const y = curr.getUTCFullYear();
          const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
          const d = String(curr.getUTCDate()).padStart(2, '0');
          datesListIso.push(`${y}-${m}-${d}`);
          datesListDdmmyyyy.push(`${d}-${m}-${y}`);
          curr.setUTCDate(curr.getUTCDate() + 1);
          safetyCounter++;
        }
      } else if (fromStr) {
        const [y, m, d] = fromStr.split('-');
        datesListIso.push(fromStr);
        datesListDdmmyyyy.push(`${d}-${m}-${y}`);
      } else if (toStr) {
        const [y, m, d] = toStr.split('-');
        datesListIso.push(toStr);
        datesListDdmmyyyy.push(`${d}-${m}-${y}`);
      }

      const allDateStrings = Array.from(new Set([...datesListIso, ...datesListDdmmyyyy]));
      const dateConditions = [];

      if (allDateStrings.length > 0) {
        dateConditions.push({ date: { $in: allDateStrings } });
        dateConditions.push({ filldate: { $in: allDateStrings } });
        dateConditions.push({ billdate: { $in: allDateStrings } });
        dateConditions.push({ date_dt: { $in: allDateStrings } });
      }

      const startMs = fromStr ? new Date(`${fromStr}T00:00:00.000Z`).getTime() - (24 * 3600 * 1000) : 0;
      const endMs = toStr ? new Date(`${toStr}T23:59:59.999Z`).getTime() + (24 * 3600 * 1000) : 4102444800000;
      const tsCond = {};
      if (fromStr) tsCond.$gte = startMs;
      if (toStr) tsCond.$lte = endMs;
      dateConditions.push({ Timestamp: tsCond });

      const dateOrQuery = { $or: dateConditions };
      if (query.$or) {
        query = { $and: [query, dateOrQuery] };
      } else {
        query = { ...query, ...dateOrQuery };
      }
    }

    let docs = await db.collection(targetCollection)
      .find(query)
      .sort({ Timestamp: 1, _id: 1 })
      .toArray();

    if (fromStr || toStr) {
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
      const rateVal = d.rate || d.frate || '';
      const qtyVal = d.quantity || d.fquantity || d.filled_Qty || '';
      const totalVal = (d.total !== undefined && d.total !== null && d.total !== '')
        ? d.total
        : ((d.totalrate !== undefined && d.totalrate !== null && d.totalrate !== '')
          ? d.totalrate
          : (d.trate || ''));

      let formattedTotal = totalVal;
      if (totalVal !== '' && totalVal !== null && !isNaN(Number(totalVal))) {
        formattedTotal = Number(totalVal).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      }

      return {
        ...d,
        id,
        type: d.type || d.vehicletype || 'Own Vehicle',
        model: d.model || '',
        vehicleregno: d.vehicleregno || d.regno || '',
        regno: d.regno || d.vehicleregno || '',
        society: d.society || '',
        branch: d.branch || '',
        drivername: d.drivername || '',
        fuelsupplier: d.fuelsupplier || d.bunksupplier || d.supplier || '',
        date: d.date || d.filldate || '',
        rate: rateVal ? (isNaN(Number(rateVal)) ? rateVal : Number(rateVal).toFixed(2)) : '',
        quantity: qtyVal ? (isNaN(Number(qtyVal)) ? qtyVal : Number(qtyVal).toFixed(2)) : '',
        total: formattedTotal,
        totalrate: formattedTotal,
        tokenno: d.tokenno || d.token_no || d.token || '',
        tokenissuedby: d.tokenissuedby || d.token_issued_by || d.issuedby || '',
        omr: d.omr ?? '',
        cmr: d.cmr ?? '',
        kms: d.kms ?? '',
        avgkmpl: d.avgkmpl !== undefined && d.avgkmpl !== null && d.avgkmpl !== '' ? (typeof d.avgkmpl === 'number' ? d.avgkmpl.toFixed(1) : d.avgkmpl) : '',
        grade: d.grade ?? '',
        description: d.description ?? ''
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


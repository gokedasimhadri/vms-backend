const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');
const {
  buildExpiryFilter,
  getTodayFormatted,
  updateRoadTaxStatus,
  updateCertificateStatuses
} = require('../../utils/expiryQuery.helper');

const collectionMap = {
  pollution: 'pollution',
  fitness: 'fitness',
  roadtax: 'roadtax',
  roadpermit: 'roadpermit',
  insurance: 'insurance',
  rta: 'rta',
  insuranceclaim: 'insuranceclaim',
  challan: 'vehiclechallan'
};

/**
 * GET /api/certificates/rta-expired
 * Returns expired RTA records for today (or requested date) scoped to the user's role & branch.
 */
exports.getRtaExpired = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const targetDate = req.query.date || getTodayFormatted();

    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: 'expireddate',
      targetDate
    });

    const docs = await db.collection('rta')
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: docs.length,
      data: docs.map(d => ({ ...d, id: d._id.toString() }))
    });
  } catch (error) {
    console.error('Failed to fetch expired RTA vehicles:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expired RTA vehicles',
      error: error.message
    });
  }
};

/**
 * GET /api/certificates/expired/:type
 * Reusable endpoint for all vehicle document expiry types (rta, pollution, fitness, insurance, roadtax, roadpermit).
 */
exports.getExpiredCertificates = async (req, res) => {
  const type = (req.params.type || req.query.type || 'rta').toLowerCase();
  try {
    const db = mongoose.connection.db;
    const collectionName = collectionMap[type] || type;
    const targetDate = req.query.date || getTodayFormatted();

    // RTA records match expireddate; other certificate collections match status 'on' (or date fields)
    const isRta = type === 'rta';
    const dateField = isRta ? 'expireddate' : null;
    // If roadtax, update road tax status based on target/today's date (reference.js line 11734)
    if (type === 'roadtax') {
      await updateRoadTaxStatus(db, targetDate);
    }

    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField,
      targetDate,
      extraConditions
    });

    const docs = await db.collection(collectionName)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      type,
      collection: collectionName,
      count: docs.length,
      data: docs.map(d => ({ ...d, id: d._id.toString() }))
    });
  } catch (error) {
    console.error(`Failed to fetch expired ${type} records:`, error);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch expired ${type} records`,
      error: error.message
    });
  }
};

/**
 * GET /api/certificates/alerts-summary
 * Aggregates live alert counts across all 6 certificate types scoped to the authenticated user.
 */
exports.getAlertsSummary = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const user = req.user;
    const targetDate = req.query.date || getTodayFormatted();

    // Synchronize alert statuses based on today's date (roadtax, roadpermit, pollution, fitness, insurance)
    await updateCertificateStatuses(db, targetDate);

    const [rtaQuery, polQuery, fitQuery, insQuery, taxQuery, pmtQuery] = await Promise.all([
      buildExpiryFilter({ user, db, dateField: 'expireddate', targetDate }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on' } }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on' } }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on' } }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on' } }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on' } }),
    ]);

    const [rta, pollution, fitness, insurance, roadTax, roadPermit] = await Promise.all([
      db.collection('rta').countDocuments(rtaQuery).catch(() => 0),
      db.collection('pollution').countDocuments(polQuery).catch(() => 0),
      db.collection('fitness').countDocuments(fitQuery).catch(() => 0),
      db.collection('insurance').countDocuments(insQuery).catch(() => 0),
      db.collection('roadtax').countDocuments(taxQuery).catch(() => 0),
      db.collection('roadpermit').countDocuments(pmtQuery).catch(() => 0),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        rta,
        pollution,
        fitness,
        roadTax,
        roadPermit,
        insurance
      }
    });
  } catch (error) {
    console.error('Failed to fetch certificate alerts summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate alerts summary',
      error: error.message
    });
  }
};

/**
 * POST /api/certificates/update-roadtax-status
 * GET /api/certificates/update-roadtax-status
 * Explicitly updates road tax status based on today's date (or requested date query/body).
 * Matches reference.js line 11734:
 * if (today == ddate) -> status: 'on'
 * else if (today == valid) -> status: 'off'
 */
exports.triggerRoadTaxStatusUpdate = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const targetDate = req.body?.date || req.query?.date || getTodayFormatted();
    const result = await updateRoadTaxStatus(db, targetDate);
    return res.status(200).json({
      success: true,
      message: `Road tax status updated based on date: ${targetDate}`,
      ...result
    });
  } catch (error) {
    console.error('Failed to update road tax status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update road tax status',
      error: error.message
    });
  }
};

exports.getCertificatesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.query.type || 'pollution').toLowerCase();
    const targetCollection = collectionMap[type] || 'pollution';
    const branchFilter = await buildBranchFilter(req.user, req.query.branch, db);

    // If fetching roadtax data, update status based on today's date
    if (type === 'roadtax') {
      await updateRoadTaxStatus(db, req.query.date || getTodayFormatted());
    }

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { regno: { $regex: search, $options: 'i' } },
        { vehicleregno: { $regex: search, $options: 'i' } },
        { certificate: { $regex: search, $options: 'i' } },
        { policy: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const docs = await db.collection(targetCollection)
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    const mappedDocs = docs.map(d => {
      const id = d._id.toString();
      const vehicleregno = d.vehicleregno || d.regno || '';
      const validupto = d.validupto || d.valid || '';
      const upload = d.upload || d.file || '';

      if (targetCollection === 'rta') {
        return {
          ...d,
          id,
          vehicleregno,
          dateofregistration: d.dateofregistration || d.date || '',
          chasisno: d.chasisno || d.chasis || '',
          engineno: d.engineno || d.engine || '',
          cubiccapacity: d.cubiccapacity || d.cc || '',
          wheelbase: d.wheelbase || d.wheel || '',
          sittingcapacity: d.sittingcapacity || d.capacity || '',
          upload
        };
      }

      if (targetCollection === 'pollution') {
        return {
          ...d,
          id,
          vehicleregno,
          validupto,
          upload
        };
      }

      if (targetCollection === 'fitness') {
        return {
          ...d,
          id,
          vehicleregno,
          certificateno: d.certificateno || d.certificate || '',
          validupto,
          upload
        };
      }

      if (targetCollection === 'roadtax') {
        return {
          ...d,
          id,
          vehicleregno,
          chalanno: d.chalanno || d.certificate || d.chalan || '',
          validupto,
          upload
        };
      }

      if (targetCollection === 'roadpermit') {
        return {
          ...d,
          id,
          vehicleregno,
          certificateno: d.certificateno || d.certificate || '',
          validupto,
          upload
        };
      }

      if (targetCollection === 'insurance') {
        return {
          ...d,
          id,
          vehicleregno,
          upload
        };
      }

      if (targetCollection === 'vehiclechallan') {
        return {
          ...d,
          id,
          vehicleregno,
          challanno: d.challanno || d.certificate || d.challan || '',
          file: d.file || d.upload || '',
          upload: d.upload || d.file || ''
        };
      }

      if (targetCollection === 'insuranceclaim') {
        return {
          ...d,
          id,
          vehicleregno,
          dateofclaimintimation: d.dateofclaimintimation || d.date || '',
          claimedno: d.claimedno || d.claimno || '',
          damagedescription: d.damagedescription || d.description || '',
          file: d.file || d.upload || '',
          upload: d.upload || d.file || ''
        };
      }

      return {
        ...d,
        id,
        vehicleregno,
        validupto,
        upload
      };
    });

    res.json({
      type,
      collection: targetCollection,
      count: mappedDocs.length,
      data: mappedDocs
    });
  } catch (error) {
    console.error('Error fetching certificates data:', error);
    res.status(500).json({ message: 'Error fetching certificates data' });
  }
};

exports.createCertificateItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = (req.params.type || req.body.type || 'pollution').toLowerCase();
    const targetCollection = collectionMap[type] || 'pollution';

    const data = {
      ...req.body,
      createdAt: new Date()
    };

    if (targetCollection === 'rta') {
      if (data.vehicleregno && !data.regno) data.regno = data.vehicleregno;
      if (data.dateofregistration && !data.date) data.date = data.dateofregistration;
      if (data.chasisno && !data.chasis) data.chasis = data.chasisno;
      if (data.engineno && !data.engine) data.engine = data.engineno;
      if (data.cubiccapacity && !data.cc) data.cc = data.cubiccapacity;
      if (data.wheelbase && !data.wheel) data.wheel = data.wheelbase;
      if (data.sittingcapacity && !data.capacity) data.capacity = data.sittingcapacity;
      if (data.upload && !data.file) data.file = data.upload;
    } else if (targetCollection === 'fitness' || targetCollection === 'roadpermit') {
      if (data.vehicleregno && !data.regno) data.regno = data.vehicleregno;
      if (data.certificateno && !data.certificate) data.certificate = data.certificateno;
      if (data.validupto && !data.valid) data.valid = data.validupto;
      if (data.upload && !data.file) data.file = data.upload;
    } else if (targetCollection === 'roadtax') {
      if (data.vehicleregno && !data.regno) data.regno = data.vehicleregno;
      if (data.chalanno && !data.certificate) data.certificate = data.chalanno;
      if (data.validupto && !data.valid) data.valid = data.validupto;
      if (data.upload && !data.file) data.file = data.upload;
    } else if (targetCollection === 'pollution') {
      if (data.vehicleregno && !data.regno) data.regno = data.vehicleregno;
      if (data.validupto && !data.valid) data.valid = data.validupto;
      if (data.upload && !data.file) data.file = data.upload;
    } else if (targetCollection === 'insurance') {
      if (data.vehicleregno && !data.regno) data.regno = data.vehicleregno;
      if (data.upload && !data.file) data.file = data.upload;
    } else if (targetCollection === 'insuranceclaim') {
      if (data.vehicleregno && !data.regno) data.regno = data.vehicleregno;
      if (data.dateofclaimintimation && !data.date) data.date = data.dateofclaimintimation;
      if (data.claimedno && !data.claimno) data.claimno = data.claimedno;
      if (data.damagedescription && !data.description) data.description = data.damagedescription;
    }

    const result = await db.collection(targetCollection).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating certificate record:', error);
    res.status(500).json({ message: 'Failed to create certificate record' });
  }
};

exports.updateCertificateItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'pollution';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    if (targetCollection === 'rta') {
      if (updateData.vehicleregno && !updateData.regno) updateData.regno = updateData.vehicleregno;
      if (updateData.dateofregistration && !updateData.date) updateData.date = updateData.dateofregistration;
      if (updateData.chasisno && !updateData.chasis) updateData.chasis = updateData.chasisno;
      if (updateData.engineno && !updateData.engine) updateData.engine = updateData.engineno;
      if (updateData.cubiccapacity && !updateData.cc) updateData.cc = updateData.cubiccapacity;
      if (updateData.wheelbase && !updateData.wheel) updateData.wheel = updateData.wheelbase;
      if (updateData.sittingcapacity && !updateData.capacity) updateData.capacity = updateData.sittingcapacity;
      if (updateData.upload && !updateData.file) updateData.file = updateData.upload;
    } else if (targetCollection === 'fitness' || targetCollection === 'roadpermit') {
      if (updateData.vehicleregno && !updateData.regno) updateData.regno = updateData.vehicleregno;
      if (updateData.certificateno && !updateData.certificate) updateData.certificate = updateData.certificateno;
      if (updateData.validupto && !updateData.valid) updateData.valid = updateData.validupto;
      if (updateData.upload && !updateData.file) updateData.file = updateData.upload;
    } else if (targetCollection === 'roadtax') {
      if (updateData.vehicleregno && !updateData.regno) updateData.regno = updateData.vehicleregno;
      if (updateData.chalanno && !updateData.certificate) updateData.certificate = updateData.chalanno;
      if (updateData.validupto && !updateData.valid) updateData.valid = updateData.validupto;
      if (updateData.upload && !updateData.file) updateData.file = updateData.upload;
    } else if (targetCollection === 'pollution') {
      if (updateData.vehicleregno && !updateData.regno) updateData.regno = updateData.vehicleregno;
      if (updateData.validupto && !updateData.valid) updateData.valid = updateData.validupto;
      if (updateData.upload && !updateData.file) updateData.file = updateData.upload;
    } else if (targetCollection === 'insurance') {
      if (updateData.vehicleregno && !updateData.regno) updateData.regno = updateData.vehicleregno;
      if (updateData.upload && !updateData.file) updateData.file = updateData.upload;
    } else if (targetCollection === 'insuranceclaim') {
      if (updateData.vehicleregno && !updateData.regno) updateData.regno = updateData.vehicleregno;
      if (updateData.dateofclaimintimation && !updateData.date) updateData.date = updateData.dateofclaimintimation;
      if (updateData.claimedno && !updateData.claimno) updateData.claimno = updateData.claimedno;
      if (updateData.damagedescription && !updateData.description) updateData.description = updateData.damagedescription;
    }

    await db.collection(targetCollection).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Certificate updated successfully' });
  } catch (error) {
    console.error('Error updating certificate record:', error);
    res.status(500).json({ message: 'Failed to update certificate record' });
  }
};

exports.deleteCertificateItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const targetCollection = collectionMap[(type || '').toLowerCase()] || 'pollution';
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(targetCollection).deleteOne(filter);
    res.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Error deleting certificate record:', error);
    res.status(500).json({ message: 'Failed to delete certificate record' });
  }
};

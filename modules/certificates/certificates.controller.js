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
    const branchFilter = buildBranchFilter(req.user, req.query.branch);

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

    res.json({
      type,
      collection: targetCollection,
      count: docs.length,
      data: docs.map(d => ({ ...d, id: d._id.toString() }))
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
    delete data.type;

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
    delete updateData.type;

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

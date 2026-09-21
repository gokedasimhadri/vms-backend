const mongoose = require('mongoose');
const {
  buildExpiryFilter,
  getTodayFormatted,
  updateRoadTaxStatus,
  updateCertificateStatuses
} = require('../../utils/expiryQuery.helper');

exports.getOverview = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branch = req.query.branch;
    const user = req.user;
    const today = getTodayFormatted();

    // Update road tax and certificate alert statuses based on today's date (reference.js lines 9630, 10340, 11041, 11734)
    await updateCertificateStatuses(db, today);

    const filter = branch && branch !== 'ALL' ? { branch } : {};

    // KMPL Performance: calculate Day-Wise only (reference.js line 5154)
    const kmplDateParam = req.query.kmplDate || req.query.date;
    let kmplDateQuery;
    let selectedKmplDate;
    if (kmplDateParam) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(kmplDateParam)) {
        const parts = kmplDateParam.split('-');
        kmplDateQuery = { $in: [kmplDateParam, `${parts[2]}-${parts[1]}-${parts[0]}`] };
        selectedKmplDate = kmplDateParam;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(kmplDateParam)) {
        const parts = kmplDateParam.split('-');
        kmplDateQuery = { $in: [kmplDateParam, `${parts[2]}-${parts[1]}-${parts[0]}`] };
        selectedKmplDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        kmplDateQuery = kmplDateParam;
        selectedKmplDate = kmplDateParam;
      }
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      const ddmmyyyy = `${d}-${m}-${y}`;
      kmplDateQuery = { $in: [iso, ddmmyyyy] };
      selectedKmplDate = iso;
    }

    // Build branch-permission scoped queries for Certificate(Alerts)
    const [rtaQuery, polQuery, fitQuery, insQuery, taxQuery, pmtQuery] = await Promise.all([
      buildExpiryFilter({ user, db, dateField: 'expireddate', targetDate: today, extraConditions: filter }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on', ...filter } }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on', ...filter } }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on', ...filter } }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on', ...filter } }),
      buildExpiryFilter({ user, db, dateField: null, extraConditions: { status: 'on', ...filter } })
    ]);

    const [
      branchVehicleCount,
      vehicleAccidentsCount,
      officeStaffCount,
      busStaffCount,
      transferCount,
      pollutionCount,
      fitnessCount,
      insuranceCount,
      roadTaxCount,
      roadPermitCount,
      rtaCount,
      batteryAgg,
      tyreAgg,
      exceededTripsCount,
      busFillAgg,
      busBreakdownCount,
      rawServices
    ] = await Promise.all([
      db.collection('branchvehicle').countDocuments(filter).catch(() => 0),
      db.collection('vehicleaccident').countDocuments(filter).catch(() => 0),
      db.collection('officestaff').countDocuments().catch(() => 0),
      db.collection('busstaff').countDocuments(filter).catch(() => 0),
      db.collection('transfer').countDocuments().catch(() => 0),
      db.collection('pollution').countDocuments(polQuery).catch(() => 0),
      db.collection('fitness').countDocuments(fitQuery).catch(() => 0),
      db.collection('insurance').countDocuments(insQuery).catch(() => 0),
      db.collection('roadtax').countDocuments(taxQuery).catch(() => 0),
      db.collection('roadpermit').countDocuments(pmtQuery).catch(() => 0),
      db.collection('rta').countDocuments(rtaQuery).catch(() => 0),
      db.collection('vehiclewisebattery').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray().catch(() => []),
      db.collection('tyrestatus').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray().catch(() => []),
      db.collection('vehicletripdata').countDocuments({
        result: /exceed/i,
        $or: [
          { uploaddate: kmplDateQuery },
          { date: kmplDateQuery }
        ],
        ...filter
      }).catch(async () => {
        return db.collection('vehicletrip').countDocuments({ result: /exceed/i, ...filter }).catch(() => 0);
      }),
      db.collection('busfill').aggregate([
        {
          $match: {
            date: kmplDateQuery,
            grade: { $in: ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'] },
            ...filter
          }
        },
        { $group: { _id: { $toUpper: '$grade' }, count: { $sum: 1 } } }
      ]).toArray().catch(() => []),
      db.collection('busbreakedown').countDocuments(filter).catch(() => 0),
      db.collection('vehicleservice').find(filter).project({
        society: 1,
        branch: 1,
        model: 1,
        vehicleregno: 1,
        vehicleno: 1,
        date: 1,
        serviceparts: 1,
        duration: 1,
        lastreading: 1,
        presentreading: 1,
        remainder: 1,
        kms: 1,
        remarks: 1
      }).limit(500).toArray().catch(() => [])
    ]);

    // Parse Battery Summary
    const batterySummary = {
      unassigned: 0,
      active: 0,
      condemn: 0,
      dead: 0,
      theft: 0,
      warrantyExpired: 0
    };
    if (batteryAgg && batteryAgg.length > 0) {
      batteryAgg.forEach(item => {
        const status = (item._id || '').toLowerCase();
        if (!item._id) batterySummary.unassigned = item.count;
        else if (status === 'active') batterySummary.active = item.count;
        else if (status === 'condemn') batterySummary.condemn = item.count;
        else if (status === 'dead') batterySummary.dead = item.count;
        else if (status === 'theft') batterySummary.theft = item.count;
        else if (status.includes('warranty') || status.includes('expired')) batterySummary.warrantyExpired = item.count;
      });
    }

    // Parse Tyres Summary
    const tyresSummary = {
      unassigned: 0,
      active: 0
    };
    if (tyreAgg && tyreAgg.length > 0) {
      tyreAgg.forEach(item => {
        if (!item._id) tyresSummary.unassigned = item.count;
        else if ((item._id || '').toLowerCase() === 'active') tyresSummary.active = item.count;
      });
    }

    // Parse KMPL Grade Performance from busfill
    const kmplPerformance = {
      aGrade: 0,
      bGrade: 0,
      cGrade: 0,
      dGrade: 0
    };
    if (busFillAgg && busFillAgg.length > 0) {
      busFillAgg.forEach(g => {
        const grade = (g._id || '').toUpperCase();
        if (grade === 'A') kmplPerformance.aGrade = g.count;
        else if (grade === 'B') kmplPerformance.bGrade = g.count;
        else if (grade === 'C') kmplPerformance.cGrade = g.count;
        else if (grade === 'D') kmplPerformance.dGrade = g.count;
      });
    }

    // Format services
    const mappedServices = (rawServices || []).map(s => {
      const last = parseFloat(s.lastreading) || 0;
      const present = parseFloat(s.presentreading) || 0;
      const rem = parseFloat(s.remainder) || 0;
      const diff = (present > 0 && last >= 0) ? (present - last) : (parseFloat(s.kms) || 0);
      return {
        id: s._id,
        society: s.society || '',
        branch: s.branch || '',
        model: s.model || '',
        vehicleno: s.vehicleregno || s.vehicleno || '',
        date: s.date || '',
        parts: s.serviceparts || '',
        duration: s.duration || '',
        lastreading: s.lastreading ?? '0',
        presentreading: s.presentreading ?? '',
        kms: diff > 0 ? diff : (s.kms ?? ''),
        remainder: s.remainder ?? '',
        remarks: s.remarks || '',
        isDue: rem > 0 && diff >= rem
      };
    });

    let services = mappedServices.filter(s => s.isDue);
    if (services.length === 0) {
      services = mappedServices;
    }
    services.sort((a, b) => (a.society || '').localeCompare(b.society || ''));

    res.json({
      adminSummary: {
        handOvers: '0/0',
        issues: '0/0',
        transfers: transferCount || 0
      },
      staffSummary: {
        officeStaff: officeStaffCount || 0,
        busStaff: busStaffCount || 0
      },
      fuelsSummary: {
        busFillings: kmplPerformance.aGrade + kmplPerformance.bGrade + kmplPerformance.cGrade + kmplPerformance.dGrade
      },
      vehiclesSummary: {
        branchVehicleInfo: branchVehicleCount || 0,
        vehicleAccidents: vehicleAccidentsCount || 0
      },
      licenseSummary: {
        licenseExpired: 0
      },
      batterySummary,
      tyresSummary,
      certificateAlerts: {
        rta: rtaCount || 0,
        pollution: pollutionCount || 0,
        fitness: fitnessCount || 0,
        roadTax: roadTaxCount || 0,
        roadPermit: roadPermitCount || 0,
        insurance: insuranceCount || 0
      },
      kmplDate: selectedKmplDate,
      kmplPerformance,
      exceededTrips: exceededTripsCount || 0,
      busBreakdowns: busBreakdownCount || 0,
      services
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Error fetching dashboard overview data' });
  }
};

// =========================================================================
// 10 EXACT LEGACY DASHBOARD ENDPOINTS (CROSS-CHECKED WITH reference.js)
// =========================================================================

// 1. GET /RtaExpired (reference.js line 8937)
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
    const docs = await db.collection('rta').find(query).toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in RtaExpired:', err);
    res.status(500).send([]);
  }
};

// 2. GET /PollutionExpired (reference.js line 10333)
exports.getPollutionExpired = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null,
      extraConditions: { status: 'on' }
    });
    const docs = await db.collection('pollution').find(query).toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in PollutionExpired:', err);
    res.status(500).send([]);
  }
};

// 3. GET /FitnessExpired (reference.js line 11034)
exports.getFitnessExpired = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null,
      extraConditions: { status: 'on' }
    });
    const docs = await db.collection('fitness').find(query).toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in FitnessExpired:', err);
    res.status(500).send([]);
  }
};

// 4. GET /RoadtaxExpired (reference.js line 11727)
exports.getRoadtaxExpired = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const today = req.query.date || getTodayFormatted();

    // Update road tax status based on today's date (reference.js line 11734):
    // if today == ddate -> status: 'on'
    // else if today == valid -> status: 'off'
    await updateRoadTaxStatus(db, today);

    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null,
      extraConditions: { status: 'on' }
    });
    const docs = await db.collection('roadtax').find(query).toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in RoadtaxExpired:', err);
    res.status(500).send([]);
  }
};

// 5. GET /RoadpermitExpired (reference.js line 12423)
exports.getRoadpermitExpired = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null,
      extraConditions: { status: 'on' }
    });
    const docs = await db.collection('roadpermit').find(query).toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in RoadpermitExpired:', err);
    res.status(500).send([]);
  }
};

// 6. GET /InsuranceExpired (reference.js line 9623)
exports.getInsuranceExpired = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null,
      extraConditions: { status: 'on' }
    });
    const docs = await db.collection('insurance').find(query).toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in InsuranceExpired:', err);
    res.status(500).send([]);
  }
};

// 7. GET /getBusfilldata (reference.js line 5154)
exports.getBusfilldata = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const dateParam = req.query.date || req.query.kmplDate;
    let dateFilter;
    if (dateParam) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        const parts = dateParam.split('-');
        dateFilter = { $in: [dateParam, `${parts[2]}-${parts[1]}-${parts[0]}`] };
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateParam)) {
        const parts = dateParam.split('-');
        dateFilter = { $in: [dateParam, `${parts[2]}-${parts[1]}-${parts[0]}`] };
      } else {
        dateFilter = dateParam;
      }
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      dateFilter = { $in: [`${y}-${m}-${d}`, `${d}-${m}-${y}`] };
    }

    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null,
      extraConditions: { date: dateFilter }
    });
    const docs = await db.collection('busfill')
      .find(query)
      .sort({ _id: -1 })
      .limit(500)
      .toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in getBusfilldata:', err);
    res.status(500).send([]);
  }
};

// 8. GET /vehicletripexceed (reference.js line 5882)
exports.getVehicletripexceed = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const dateParam = req.query.date || req.query.tripDate || req.query.kmplDate;
    let dateFilter;
    if (dateParam) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        const parts = dateParam.split('-');
        dateFilter = { $in: [dateParam, `${parts[2]}-${parts[1]}-${parts[0]}`] };
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateParam)) {
        const parts = dateParam.split('-');
        dateFilter = { $in: [dateParam, `${parts[2]}-${parts[1]}-${parts[0]}`] };
      } else {
        dateFilter = dateParam;
      }
    } else {
      const today = getTodayFormatted(); // DD-MM-YYYY
      const parts = today.split('-');
      const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
      dateFilter = { $in: [today, iso] };
    }

    const branchParam = req.query.branch;
    const extraConditions = {
      result: /exceed/i,
      $or: [
        { uploaddate: dateFilter },
        { date: dateFilter }
      ]
    };
    if (branchParam && branchParam !== 'ALL') {
      extraConditions.branch = branchParam;
    }

    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null,
      extraConditions
    });

    const docs = await db.collection('vehicletripdata')
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.send(docs);
  } catch (err) {
    console.error('Error in vehicletripexceed:', err);
    res.status(500).send([]);
  }
};

// 9. GET /getVehicleservice (reference.js line 8179)
exports.getVehicleservice = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null
    });
    const docs = await db.collection('vehicleservice')
      .find(query)
      .sort({ _id: -1 })
      .limit(500)
      .toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in getVehicleservice:', err);
    res.status(500).send([]);
  }
};

// 10. GET /getBusbreakedowndata (reference.js line 17232)
exports.getBusbreakedowndata = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const query = await buildExpiryFilter({
      user: req.user,
      db,
      dateField: null
    });
    const docs = await db.collection('busbreakedown')
      .find(query)
      .sort({ _id: -1 })
      .limit(200)
      .toArray();
    res.send(docs);
  } catch (err) {
    console.error('Error in getBusbreakedowndata:', err);
    res.status(500).send([]);
  }
};



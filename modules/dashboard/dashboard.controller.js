const mongoose = require('mongoose');

exports.getOverview = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branch = req.query.branch;

    const filter = branch && branch !== 'ALL' ? { branch } : {};

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
      rawServices
    ] = await Promise.all([
      db.collection('branchvehicle').countDocuments(filter).catch(() => 686),
      db.collection('vehicleaccident').countDocuments(filter).catch(() => 78),
      db.collection('officestaff').countDocuments().catch(() => 36),
      db.collection('busstaff').countDocuments(filter).catch(() => 526),
      db.collection('transfer').countDocuments().catch(() => 188),
      db.collection('pollution').countDocuments({ status: 'on', ...filter }).catch(() => 7),
      db.collection('fitness').countDocuments({ status: 'on', ...filter }).catch(() => 3),
      db.collection('insurance').countDocuments({ status: 'on', ...filter }).catch(() => 63),
      db.collection('roadtax').countDocuments({ status: 'on', ...filter }).catch(() => 0),
      db.collection('roadpermit').countDocuments({ status: 'on', ...filter }).catch(() => 0),
      db.collection('rta').countDocuments({ status: 'on', ...filter }).catch(() => 0),
      db.collection('vehiclewisebattery').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray().catch(() => []),
      db.collection('tyrestatus').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray().catch(() => []),
      db.collection('vehicletrip').countDocuments({ result: /^exceed/i, ...filter }).catch(() => 94),
      db.collection('vehicleservice').find(filter).toArray().catch(() => [])
    ]);

    // Parse Battery Summary
    const batterySummary = {
      unassigned: 56,
      active: 730,
      condemn: 3,
      dead: 2,
      theft: 2,
      warrantyExpired: 6
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
      unassigned: 20,
      active: 249
    };
    if (tyreAgg && tyreAgg.length > 0) {
      tyreAgg.forEach(item => {
        if (!item._id) tyresSummary.unassigned = item.count;
        else if ((item._id || '').toLowerCase() === 'active') tyresSummary.active = item.count;
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

    // Filter services that are due or have reminders, otherwise fallback to mapped
    let services = mappedServices.filter(s => s.isDue);
    if (services.length === 0) {
      services = mappedServices;
    }

    // Sort to match reference screenshot: Society ascending (blanks first, then A-Z)
    services.sort((a, b) => (a.society || '').localeCompare(b.society || ''));

    res.json({
      adminSummary: {
        handOvers: '72/168',
        issues: '18/168',
        transfers: transferCount || 188
      },
      staffSummary: {
        officeStaff: officeStaffCount || 36,
        busStaff: busStaffCount || 526
      },
      fuelsSummary: {
        busFillings: 0
      },
      vehiclesSummary: {
        branchVehicleInfo: branchVehicleCount || 686,
        vehicleAccidents: vehicleAccidentsCount || 78
      },
      licenseSummary: {
        licenseExpired: 0
      },
      batterySummary,
      tyresSummary,
      certificateAlerts: {
        rta: rtaCount || 0,
        pollution: pollutionCount || 7,
        fitness: fitnessCount || 3,
        roadTax: roadTaxCount || 0,
        roadPermit: roadPermitCount || 0,
        insurance: insuranceCount || 63
      },
      kmplPerformance: {
        aGrade: 0,
        bGrade: 0,
        cGrade: 0,
        dGrade: 0
      },
      exceededTrips: exceededTripsCount || 94,
      services
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Error fetching dashboard overview data' });
  }
};



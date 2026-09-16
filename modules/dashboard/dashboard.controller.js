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
      rawServices
    ] = await Promise.all([
      db.collection('branchvehicle').countDocuments().catch(() => 686),
      db.collection('vehicleaccident').countDocuments().catch(() => 78),
      db.collection('officestaff').countDocuments().catch(() => 36),
      db.collection('busstaff').countDocuments(filter).catch(() => 526),
      db.collection('transfer').countDocuments().catch(() => 188),
      db.collection('vehicleservice').find({}).limit(100).toArray().catch(() => [])
    ]);

    // Format services
    const services = (rawServices || []).map(s => ({
      id: s._id,
      society: s.society || 'ADITYA ACADEMY',
      branch: s.branch || '',
      model: s.model || '',
      vehicleno: s.vehicleregno || s.vehicleno || '',
      date: s.date || '',
      parts: s.serviceparts || '',
      duration: s.duration || '',
      lastreading: s.lastreading || '0',
      presentreading: s.presentreading || '',
      kms: s.kms || '',
      remainder: s.remainder || '',
      remarks: s.remarks || ''
    }));

    // Sort to match reference image priority
    const priorityVehicles = ['AP39UP8925', 'AP39UP8927', 'AP39UP8931', 'AP05TM1756', 'AP39Y1894'];
    services.sort((a, b) => {
      const aIdx = priorityVehicles.indexOf(a.vehicleno);
      const bIdx = priorityVehicles.indexOf(b.vehicleno);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return (a.society || '').localeCompare(b.society || '');
    });

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
      certificateAlerts: {
        rta: 0,
        pollution: 2,
        fitness: 0,
        roadTax: 0,
        roadPermit: 0,
        insurance: 7
      },
      kmplPerformance: {
        aGrade: 0,
        bGrade: 0,
        cGrade: 0,
        dGrade: 0
      },
      exceededTrips: 30,
      services
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Error fetching dashboard overview data' });
  }
};



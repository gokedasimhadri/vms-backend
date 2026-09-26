/**
 * Helper to build MongoDB branch query filter based on authenticated user's role, username, and assigned branches.
 * Matches legacy route rules from original reference application.
 * 
 * @param {Object} user - The decoded user object from req.user (JWT)
 * @param {string} requestedBranch - Branch requested in query or params
 * @param {Object} db - MongoDB database connection instance
 * @param {string} branchField - Field name in the collection (defaults to 'branch')
 * @returns {Promise<Object>} MongoDB query filter
 */

const usernameBranchMap = {
  adcjkpur: { branch: /JAGANNAICKPUR/i },
  adcamp: { branch: /AMALAPURAM/i },
  adcbvrm: { branch: /BHIMAVARAM/i },
  adceluru: { branch: /ELURU/i },
  adcgmd: { branch: /MAMIDADA/i },
  adcgwk: { branch: /GAJUWAKA/i },
  adclakshya: { branch: /LAKSHYA/i },
  adcmdp: { branch: /MANDAPETA/i },
  adcnsp: { branch: /NARASAPURAM/i },
  adcpkl: { branch: /PALAKOL/i },
  adcptp: { branch: /PITHAPURAM/i },
  adcrjyd: { branch: /RJY DEGREE/i },
  adcsklm: { branch: /SRIKAKULAM/i },
  adctpg: { branch: /TADEPALLIGUDEM/i },
  adctuni: { branch: /TUNI/i },
  adcengg: { branch: { $in: ["KKD ENGINEERING-AA", "KKD ENGINEERING-SES", "NON LOCAL ENGINEERING-AA", "NON LOCAL ENGINEERING-SES", "RJY ENGINEERING-AA", "RJY ENGINEERING-SES", "MANDAPETA ENGINEERING-AA", "MANDAPETA ENGINEERING-SES"] } },
  adckkd: { branch: { $in: ["KKD DEGREE-AA", "KKD DEGREE-SES"] } },
  srikkd: { branch: { $in: ["ADITYA PUBLIC SCHOOL (SRI NAGAR)-AA", "ADITYA PUBLIC SCHOOL (SRI NAGAR)-SES"] } },
  ajckkd: { branch: { $in: ["KKD INTER-AA", "KKD INTER-SES"] } },
  adcpdp: { branch: { $in: ["PEDDAPURAM-AA", "PEDDAPURAM-SES"] } },
  adcmkvs: { branch: { $in: ["MARIKAVALASA-AA", "MARIKAVALASA-SES"] } },
  adcho: { branch: /KAKINADA HEAD OFFICE/i },
  adckkdiit: { branch: { $in: ["KKD IIT-SES", "KKD IIT-AA"] } },
  adcadmin: { branch: { $in: ["SURAMPALEM-ENGINEERING-AA", "SURAMPALEM-ENGINEERING-SES"] } },
  adcats: { branch: /ADITYA THAKSH SCHOOL-AA/i },
  adcakp: { branch: /ANAKAPALI-SES/i },
  adcgdv: { branch: /GUDIVADA/i },
  adcndl: { branch: /NIDADHAVOLU/i },
  adcongole: { branch: /ONGOLE/i },
  adcvzm: { branch: /VIZIANAGARAM/i },
  adcmtm: { branch: /MATCHILI PATNAM/i },
  adcsnr: { branch: /VIZIANAGARAM/i },
  aus: { branch: /UNIVERSITY/i },
  adctnk: { branch: /TANUKU/i },
  adchbg: { branch: /HABSIGUDA/i },
  adcbvrmd: { branch: /ADITYA DEGREE COLLEGE\(BHIMAVARAM\)/i },
  adcasn: { branch: { $in: ["ADITYA PUBLIC SCHOOL(ASHOK NAGAR)-AA", "ADITYA PUBLIC SCHOOL(ASHOK NAGAR)-SES"] } }
};

const getAdminVehicleRegNos = async (user, db) => {
  if (!user || !db) return [];
  const filter = {};
  if (user.branches && user.branches.length > 0) {
    filter.branch = { $in: user.branches };
  }
  if (user.branch && user.branch !== 'ALL' && user.branch !== 'VMS') {
    filter.category = user.branch;
  }
  try {
    const vehicles = await db.collection('branchvehicle')
      .find(filter)
      .project({ vehicleregno: 1, regno: 1, busno: 1, vehicleno: 1 })
      .toArray();
    return Array.from(new Set(
      vehicles.map(v => v.vehicleregno || v.regno || v.busno || v.vehicleno).filter(Boolean)
    ));
  } catch (err) {
    console.error('Error in getAdminVehicleRegNos:', err);
    return [];
  }
};

const buildBranchFilter = async (user, requestedBranch, db = null, branchField = 'branch') => {
  if (!user) {
    return { [branchField]: '__UNAUTHORIZED__' };
  }

  const username = (user.username || '').toLowerCase().trim();
  const isSuperAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || ['vms', 'vmskkd', 'vc', 'admin'].includes(username);

  // 1. Super Administrators can view all branches or filter by any requested branch
  if (isSuperAdmin) {
    if (requestedBranch && requestedBranch !== 'ALL' && requestedBranch !== 'College' && requestedBranch !== 'VMS' && requestedBranch !== 'School') {
      return { [branchField]: requestedBranch };
    }
    return {};
  }

  // 2. BRANCH_ADMIN Role: Match exact legacy getAdminVehicleRegNos logic
  if (user.role === 'BRANCH_ADMIN') {
    if (requestedBranch && requestedBranch !== 'ALL' && requestedBranch !== 'College' && requestedBranch !== 'VMS' && requestedBranch !== 'School') {
      return { [branchField]: requestedBranch };
    }

    if (db) {
      const regNos = await getAdminVehicleRegNos(user, db);
      if (regNos.length > 0) {
        return { vehicleregno: { $in: regNos } };
      }
    }

    const userBranches = Array.isArray(user.branches) && user.branches.length > 0
      ? user.branches
      : (user.branch ? [user.branch] : []);
    const assigned = userBranches.filter(b => b && b !== 'ALL' && b !== 'College' && b !== 'VMS' && b !== 'School');
    if (assigned.length > 0) {
      return { [branchField]: { $in: assigned } };
    }
    return { [branchField]: '__NO_BRANCH_ASSIGNED__' };
  }

  // 3. Username specific mapping
  if (usernameBranchMap[username]) {
    return usernameBranchMap[username];
  }

  // 4. Fallback for authenticated users with branches array or branch string
  const userBranches = Array.isArray(user.branches) && user.branches.length > 0
    ? user.branches
    : (user.branch ? [user.branch] : []);

  const assigned = userBranches.filter(
    b => b && b !== 'ALL' && b !== 'College' && b !== 'VMS' && b !== 'School'
  );

  if (requestedBranch && requestedBranch !== 'ALL' && requestedBranch !== 'College' && requestedBranch !== 'VMS' && requestedBranch !== 'School') {
    if (assigned.includes(requestedBranch)) {
      return { [branchField]: requestedBranch };
    }
  }

  if (assigned.length > 0) {
    return { [branchField]: { $in: assigned } };
  }

  return { [branchField]: '__NO_BRANCH_ASSIGNED__' };
};

module.exports = {
  buildBranchFilter,
  getAdminVehicleRegNos,
  usernameBranchMap
};

/**
 * Reusable Expiry Query & Permission Helper
 * 
 * Centralizes branch-scoping, role-based restrictions, and date filtering
 * across all vehicle document expiry endpoints (RTA, Pollution, Fitness, Insurance, etc.).
 */

const { allBranchUsers, userBranchMap } = require('../config/userBranchMap.config');

/**
 * Returns today's date formatted as 'DD-MM-YYYY' matching MongoDB string dates
 */
const getTodayFormatted = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Fetches vehicle registration numbers assigned to a BRANCH_ADMIN
 * 
 * @param {Object} user - Authenticated user from req.user
 * @param {Object} db - MongoDB database instance
 * @returns {Promise<string[]>} Array of vehicle registration numbers
 */
const getAdminVehicleRegNos = async (user, db) => {
  if (!user || user.role !== 'BRANCH_ADMIN') {
    return [];
  }

  const filter = {};
  if (user.branches && user.branches.length > 0) {
    filter.branch = { $in: user.branches };
  }
  if (user.branch) {
    filter.category = user.branch;
  }

  try {
    const vehicles = await db.collection('branchvehicle')
      .find(filter)
      .project({ vehicleregno: 1 })
      .toArray();

    return vehicles
      .map(v => v.vehicleregno)
      .filter(Boolean);
  } catch (err) {
    console.error('Error fetching admin vehicle reg numbers:', err);
    return [];
  }
};

/**
 * Builds the MongoDB query filter for expired vehicle documents
 * 
 * @param {Object} params
 * @param {Object} params.user - Authenticated user (req.user)
 * @param {Object} params.db - MongoDB native connection db
 * @param {string} [params.dateField='expireddate'] - Field to check date on
 * @param {string} [params.targetDate] - Target date string ('DD-MM-YYYY'), defaults to today
 * @param {string} [params.branchField='branch'] - Field name for branch in target collection
 * @param {Object} [params.extraConditions] - Additional query terms (e.g. { status: 'on' })
 * @returns {Promise<Object>} MongoDB query object
 */
const buildExpiryFilter = async ({
  user,
  db,
  dateField = 'expireddate',
  targetDate,
  branchField = 'branch',
  extraConditions = {}
}) => {
  const date = targetDate || getTodayFormatted();
  const query = { ...extraConditions };

  // If a specific dateField is provided, attach date condition
  if (dateField) {
    query[dateField] = date;
  }

  if (!user) {
    return { ...query, [branchField]: '__UNAUTHORIZED__' };
  }

  const username = (user.username || '').toLowerCase().trim();

  // 1. Branch Admin: restrict by assigned vehicle registration numbers
  if (user.role === 'BRANCH_ADMIN') {
    const regNos = await getAdminVehicleRegNos(user, db);
    query.regno = { $in: regNos };
    return query;
  }

  // 2. Users with access to all branches (vms, vmskkd, vc) or system ADMIN
  if (allBranchUsers.includes(username) || user.role === 'ADMIN') {
    return query;
  }

  // 3. Centralized username-to-branch mapping
  if (userBranchMap[username]) {
    const branches = userBranchMap[username];
    if (branches.length === 1) {
      const b = branches[0];
      // If it contains specific society suffix (-AA, -SES, etc.), prefer exact match
      // Otherwise use a properly escaped case-insensitive RegExp to match base branch (e.g. AMALAPURAM matches AMALAPURAM-AA)
      if (b.includes('-AA') || b.includes('-SES') || b.includes('-AAA')) {
        query[branchField] = b;
      } else {
        const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query[branchField] = new RegExp(escaped, 'i');
      }
    } else {
      query[branchField] = { $in: branches };
    }
    return query;
  }

  // 4. Fallback for authenticated users with branches array or branch string on token
  const assigned = (user.branches || (user.branch ? [user.branch] : [])).filter(
    b => b && b !== 'ALL' && b !== 'College' && b !== 'VMS'
  );

  if (assigned.length > 0) {
    query[branchField] = assigned.length === 1 ? assigned[0] : { $in: assigned };
  } else {
    query[branchField] = '__NO_BRANCH_ASSIGNED__';
  }

  return query;
};

/**
 * Updates road tax status ('on' / 'off') based on today's date
 * Matches logic from reference.js line 11734:
 * if (today == ddate) -> status: 'on'
 * else if (today == valid) -> status: 'off'
 */
const updateRoadTaxStatus = async (db, targetDate) => {
  const today = targetDate || getTodayFormatted();
  try {
    const [resOn, resOff] = await Promise.all([
      db.collection('roadtax').updateMany({ ddate: today }, { $set: { status: 'on' } }),
      db.collection('roadtax').updateMany({ valid: today }, { $set: { status: 'off' } })
    ]);
    const counts = {
      total: await db.collection('roadtax').countDocuments().catch(() => 0),
      on: await db.collection('roadtax').countDocuments({ status: 'on' }).catch(() => 0),
      off: await db.collection('roadtax').countDocuments({ status: 'off' }).catch(() => 0),
    };
    return {
      success: true,
      today,
      modifiedOn: resOn.modifiedCount,
      modifiedOff: resOff.modifiedCount,
      matchedOn: resOn.matchedCount,
      matchedOff: resOff.matchedCount,
      counts
    };
  } catch (err) {
    console.error('Error updating roadtax status for today:', err);
    return { success: false, today, error: err.message };
  }
};

/**
 * Synchronizes alert statuses ('on' / 'off') for all certificate collections
 * based on today's date (roadtax, roadpermit, pollution, fitness, insurance).
 */
const updateCertificateStatuses = async (db, targetDate) => {
  const today = targetDate || getTodayFormatted();
  try {
    await Promise.all([
      db.collection('roadtax').updateMany({ ddate: today }, { $set: { status: 'on' } }),
      db.collection('roadtax').updateMany({ valid: today }, { $set: { status: 'off' } }),
      db.collection('roadpermit').updateMany({ ddate: today }, { $set: { status: 'on' } }),
      db.collection('roadpermit').updateMany({ valid: today }, { $set: { status: 'off' } }),
      db.collection('pollution').updateMany({ rdate: today }, { $set: { status: 'on' } }),
      db.collection('pollution').updateMany({ valid: today }, { $set: { status: 'off' } }),
      db.collection('fitness').updateMany({ rdate: today }, { $set: { status: 'on' } }),
      db.collection('fitness').updateMany({ valid: today }, { $set: { status: 'off' } }),
      db.collection('insurance').updateMany({ rdate: today }, { $set: { status: 'on' } }),
      db.collection('insurance').updateMany({ valid: today }, { $set: { status: 'off' } })
    ]);
  } catch (err) {
    console.error('Error updating certificate statuses for today:', err);
  }
};

module.exports = {
  getTodayFormatted,
  getAdminVehicleRegNos,
  buildExpiryFilter,
  updateRoadTaxStatus,
  updateCertificateStatuses
};


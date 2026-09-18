/**
 * Helper to build MongoDB branch query filter based on authenticated user's role and assigned branches.
 * 
 * @param {Object} user - The decoded user object from req.user (JWT)
 * @param {string} requestedBranch - Branch requested in query or params
 * @param {string} branchField - Field name in the collection (defaults to 'branch')
 * @returns {Object} MongoDB query filter
 */
const buildBranchFilter = (user, requestedBranch, branchField = 'branch') => {
  if (!user) {
    return { [branchField]: '__UNAUTHORIZED__' };
  }

  // Administrators can view all branches or filter by any requested branch
  if (user.role === 'ADMIN') {
    if (requestedBranch && requestedBranch !== 'ALL' && requestedBranch !== 'College' && requestedBranch !== 'VMS') {
      return { [branchField]: requestedBranch };
    }
    return {};
  }

  // Non-Admin: strictly scoped to assigned branches
  const assigned = (user.branches || (user.branch ? [user.branch] : [])).filter(
    b => b && b !== 'ALL' && b !== 'College' && b !== 'VMS'
  );

  // If user requested a specific branch, allow only if it's within their assigned branches
  if (requestedBranch && assigned.includes(requestedBranch)) {
    return { [branchField]: requestedBranch };
  }

  // Fallback to all assigned branches
  if (assigned.length > 0) {
    return { [branchField]: { $in: assigned } };
  }

  // User has no assigned branches
  return { [branchField]: '__NO_BRANCH_ASSIGNED__' };
};

module.exports = {
  buildBranchFilter
};

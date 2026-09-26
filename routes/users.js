const express = require('express');
const router = express.Router();
const User = require('../modules/auth/user.model');

const isVmsUserPayload = (user) => {
  if (!user) return false;
  const usernameLower = (user.username || '').toLowerCase();
  const roleUpper = (user.role || '').toUpperCase();
  const branch = user.branch || '';
  return ['vms', 'vmskkd', 'vc', 'admin'].includes(usernameLower) ||
         ['ADMIN', 'SUPER_ADMIN'].includes(roleUpper) ||
         branch === 'VMS' || branch === 'ALL';
};

// Restrict all /users endpoints to privileged VMS Admin users only
router.use((req, res, next) => {
  if (!req.user || !isVmsUserPayload(req.user)) {
    return res.status(403).json({ message: 'Access denied: User Management is restricted to VMS Admin users only.' });
  }
  next();
});

/**
 * GET /users
 * Fetch all users from 'login' collection with optional filtering (search, role, branch)
 */
router.get('/', async (req, res) => {
  try {
    const { search, role, branch } = req.query;
    const query = {};

    if (role && role !== 'ALL') {
      query.role = role;
    }

    if (branch && branch !== 'ALL') {
      query.$or = [
        { branch: branch },
        { branches: branch }
      ];
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      const searchConditions = [
        { username: regex },
        { name: regex },
        { branch: regex }
      ];
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const users = await User.find(query).sort({ _id: -1 }).select('-passwordHash');

    return res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Error fetching users list' });
  }
});

/**
 * GET /users/:id
 * Get single user by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Error fetching user details' });
  }
});

/**
 * POST /users
 * Create a new user in 'login' collection
 */
router.post('/', async (req, res) => {
  try {
    const { username, name, password, role, branch, branches } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();

    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.status(400).json({ message: `User with username '${normalizedUsername}' already exists` });
    }

    const passwordHash = await User.hashPassword(password);

    let parsedBranches = [];
    if (Array.isArray(branches)) {
      parsedBranches = branches.filter(Boolean);
    } else if (typeof branches === 'string' && branches.trim()) {
      parsedBranches = branches.split(',').map(b => b.trim()).filter(Boolean);
    }

    const newUser = new User({
      username: normalizedUsername,
      name: name ? String(name).trim() : normalizedUsername,
      passwordHash,
      role: role || 'BRANCH_USER',
      branch: branch ? String(branch).trim() : '',
      branches: parsedBranches
    });

    await newUser.save();

    const resultDoc = newUser.toObject();
    delete resultDoc.passwordHash;

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: resultDoc
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: error.message || 'Error creating user' });
  }
});

/**
 * PUT /users/:id
 * Update user details or reset password
 */
router.put('/:id', async (req, res) => {
  try {
    const { username, name, password, role, branch, branches } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) {
      const normalizedUsername = String(username).trim().toLowerCase();
      if (normalizedUsername !== user.username) {
        const existing = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({ message: `Username '${normalizedUsername}' is already taken` });
        }
        user.username = normalizedUsername;
      }
    }

    if (name !== undefined) user.name = String(name).trim();
    if (role !== undefined) user.role = String(role).trim();
    if (branch !== undefined) user.branch = String(branch).trim();

    if (branches !== undefined) {
      if (Array.isArray(branches)) {
        user.branches = branches.filter(Boolean);
      } else if (typeof branches === 'string') {
        user.branches = branches.split(',').map(b => b.trim()).filter(Boolean);
      }
    }

    if (password && String(password).trim().length > 0) {
      user.passwordHash = await User.hashPassword(String(password).trim());
    }

    await user.save();

    const resultDoc = user.toObject();
    delete resultDoc.passwordHash;

    return res.json({
      success: true,
      message: 'User updated successfully',
      data: resultDoc
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: error.message || 'Error updating user' });
  }
});

/**
 * DELETE /users/:id
 * Delete user record
 */
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
});

module.exports = router;

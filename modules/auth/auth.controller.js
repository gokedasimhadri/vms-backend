const User = require('./user.model');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, name, branch } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const normalizedUsername = username.toLowerCase().trim();

    // Check if user already exists
    const query = [{ username: normalizedUsername }];
    if (email) {
      query.push({ email: email.toLowerCase().trim() });
    }
    const existingUser = await User.findOne({ $or: query });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this username or email already exists' });
    }

    // Create new user with hashed password
    const passwordHash = await User.hashPassword(password);
    const user = new User({
      username: normalizedUsername,
      email: email ? email.toLowerCase().trim() : undefined,
      passwordHash,
      name: name || username,
      branch: branch || '',
      role: 'BRANCH_USER',
    });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user with username (or email) and password, and return JWT
exports.login = async (req, res) => {
  try {
    const identifier = (req.body.username || req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Escape regex characters for safe exact case-insensitive match
    const escaped = identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Find all matching users by username or email (to support accounts with multiple branches)
    const users = await User.find({
      $or: [
        { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escaped}$`, 'i') } }
      ]
    });

    if (!users || users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password against matching user records
    let matchedUser = null;
    for (const u of users) {
      const isMatch = await u.comparePassword(password);
      if (isMatch) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Collect all branches associated with this username
    const allBranches = [
      ...new Set([
        ...(matchedUser.branches || []),
        ...users.map(u => u.branch).filter(Boolean)
      ])
    ];

    // Generate JWT
    const payload = {
      user: {
        id: matchedUser._id,
        username: matchedUser.username,
        name: matchedUser.name || matchedUser.username,
        role: matchedUser.role || 'BRANCH_USER',
        branch: matchedUser.branch || (allBranches[0] || ''),
        branches: allBranches,
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: payload.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};


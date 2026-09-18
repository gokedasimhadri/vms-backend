const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
    sparse: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    default: 'BRANCH_USER',
  },
  branch: {
    type: String,
    default: '',
  },
  branches: {
    type: [String],
    default: [],
  },
}, { 
  timestamps: true,
  collection: 'login'
});

// Method to compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  const hash = this.passwordHash;
  if (!hash) return false;
  return await bcrypt.compare(candidatePassword, hash);
};

// Static helper to hash passwords
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

module.exports = mongoose.model('User', userSchema);


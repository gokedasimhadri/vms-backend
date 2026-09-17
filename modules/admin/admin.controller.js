const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

exports.getAdminData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'stages';
    const selectedBranch = req.query.branch;

    // 1. Extract logged account's username and branch from query, headers, or JWT token
    let username = req.query.username || req.headers['x-user-username'];
    let userBranch = req.query.userBranch || req.headers['x-user-branch'];

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        if (decoded && decoded.user) {
          username = username || decoded.user.username;
          userBranch = userBranch || decoded.user.branch;
        }
      } catch (err) {
        // Ignore token verification errors and proceed
      }
    }

    // 2. Fetch logged user document from login collection to get their assigned branches array
    let branchesList = [];
    if (username) {
      const userQuery = { username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } };
      if (userBranch && userBranch !== 'ALL') {
        userQuery.branch = userBranch;
      }
      let userDoc = await db.collection('login').findOne(userQuery);
      if (!userDoc) {
        userDoc = await db.collection('login').findOne({
          username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
        });
      }

      if (userDoc) {
        if (Array.isArray(userDoc.branches) && userDoc.branches.length > 0) {
          branchesList = userDoc.branches;
        } else if (userDoc.branch && userDoc.branch !== 'College') {
          branchesList = [userDoc.branch];
        }
      }
    }

    // 3. Construct filter:
    // If a specific sub-branch is selected (and not 'ALL' or 'College'), filter by that branch.
    // Otherwise, filter by the logged account's assigned branches list.
    let filter = {};
    if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'College') {
      filter = { branch: selectedBranch };
    } else if (branchesList.length > 0) {
      filter = { branch: { $in: branchesList } };
    } else if (selectedBranch && selectedBranch !== 'ALL') {
      filter = { branch: selectedBranch };
    }

    if (type === 'stages') {
      const docs = await db.collection('stages').find(filter).limit(2000).toArray();
      return res.json({
        type: 'stages',
        data: docs.map((d, i) => ({
          sno: i + 1,
          id: d._id,
          society: d.society || '',
          branch: d.branch || '',
          regno: d.regno || '',
          name: d.name || '',
          sequenceno: d.sequenceno || '',
          amount: d.amount || '0',
          students: d.students || '0'
        }))
      });
    }

    if (type === 'routes') {
      const docs = await db.collection('route').find(filter).limit(2000).toArray();
      return res.json({
        type: 'routes',
        data: docs.map((d, i) => ({
          sno: i + 1,
          id: d._id,
          society: d.society || '',
          branch: d.branch || '',
          routename: d.routename || '',
          distance: d.distance || 0,
          routeregno: d.routeregno || ''
        }))
      });
    }

    if (type === 'transfers') {
      const docs = await db.collection('transfer').find(filter).limit(2000).toArray();
      return res.json({
        type: 'transfers',
        data: docs.map((d, i) => ({
          sno: i + 1,
          id: d._id,
          society: d.society || '',
          branch: d.branch || '',
          make: d.make || '',
          model: d.model || '',
          regno: d.regno || '',
          transferbranch: d.transferbranch || '',
          transferdate: d.transferdate || '',
          cmr: d.cmr || ''
        }))
      });
    }

    if (type === 'route_details') {
      const docs = await db.collection('routedetails').find(filter).limit(2000).toArray().catch(() => []);
      return res.json({
        type: 'route_details',
        data: docs.map((d, i) => ({
          sno: i + 1,
          id: d._id,
          society: d.society || '',
          branch: d.branch || '',
          routename: d.routename || '',
          startpoint: d.startpoint || '',
          distance: d.distance || '',
          regno: d.regno || '',
          starttime: d.starttime || ''
        }))
      });
    }

    res.json({ type, data: [] });
  } catch (error) {
    console.error('Error in getAdminData:', error);
    res.status(500).json({ message: 'Server error fetching admin data' });
  }
};

exports.createStage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { society, branch, regno, name, sequenceno, amount, students } = req.body;
    const result = await db.collection('stages').insertOne({
      society: society || 'ADITYA ACADEMY',
      branch: branch || '',
      regno: (regno || '').toUpperCase(),
      name: name || '',
      sequenceno: sequenceno || '1',
      amount: amount || '0',
      students: students || '0',
      createdAt: new Date()
    });
    res.status(201).json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Create stage error:', error);
    res.status(500).json({ message: 'Error creating stage' });
  }
};

exports.deleteAdminItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collectionMap = {
      stages: 'stages',
      routes: 'route',
      transfers: 'transfer',
      route_details: 'routedetails'
    };
    const colName = collectionMap[type] || 'stages';
    const { ObjectId } = mongoose.Types;
    await db.collection(colName).deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('Delete admin item error:', error);
    res.status(500).json({ message: 'Error deleting item' });
  }
};

exports.getStageFormOptions = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // 1. Identify logged-in account from query, headers, or JWT token
    let username = req.query.username || req.headers['x-user-username'];
    let userBranch = req.query.userBranch || req.headers['x-user-branch'];

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        if (decoded && decoded.user) {
          username = username || decoded.user.username;
          userBranch = userBranch || decoded.user.branch;
        }
      } catch (err) {}
    }

    // 2. Fetch all societies from 'society' collection
    const societyDocs = await db.collection('society').find({}).sort({ name: 1 }).toArray();
    const societies = societyDocs.map(s => s.name).filter(Boolean);

    // 3. Check mapping with session account in 'login' collection to get branches array
    let branches = [];
    if (username) {
      const userQuery = { username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } };
      if (userBranch && userBranch !== 'ALL') {
        userQuery.branch = userBranch;
      }
      let userDoc = await db.collection('login').findOne(userQuery);
      if (!userDoc) {
        userDoc = await db.collection('login').findOne({
          username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
        });
      }

      if (userDoc) {
        if (Array.isArray(userDoc.branches) && userDoc.branches.length > 0) {
          branches = userDoc.branches;
        } else if (userDoc.branch && userDoc.branch !== 'College') {
          branches = [userDoc.branch];
        }
      }
    }

    res.json({
      societies,
      branches
    });
  } catch (error) {
    console.error('Error in getStageFormOptions:', error);
    res.status(500).json({ message: 'Server error fetching form options' });
  }
};


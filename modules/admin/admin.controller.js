const mongoose = require('mongoose');

exports.getAdminData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'stages';
    const selectedBranch = req.query.branch;

    // Branch scope from req.user (single source of truth from JWT)
    const user = req.user || {};
    const isAdmin = user.role === 'ADMIN';
    const assignedBranches = (user.branches || (user.branch ? [user.branch] : [])).filter(
      b => b && b !== 'ALL' && b !== 'College' && b !== 'VMS'
    );

    // Construct filter:
    // Non-admins can only view their assigned branches; requested branch outside assigned set is ignored
    let filter = {};
    if (isAdmin) {
      if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'College' && selectedBranch !== 'VMS') {
        filter = { branch: selectedBranch };
      }
    } else {
      if (selectedBranch && assignedBranches.includes(selectedBranch)) {
        filter = { branch: selectedBranch };
      } else if (assignedBranches.length > 0) {
        filter = { branch: { $in: assignedBranches } };
      }
    }

    const normType = (type || 'societies').toLowerCase();

    if (normType === 'societies' || normType === 'society') {
      const docs = await db.collection('society').find({}).sort({ name: 1 }).limit(1000).toArray();
      return res.json({
        type: 'societies',
        data: docs.map((d, i) => ({
          sno: i + 1,
          id: d._id,
          name: d.name || '',
          societyname: d.name || ''
        }))
      });
    }

    if (normType === 'branches' || normType === 'branch') {
      const docs = await db.collection('branch').find({}).sort({ name: 1 }).limit(1000).toArray();
      return res.json({
        type: 'branches',
        data: docs.map((d, i) => ({
          sno: i + 1,
          id: d._id,
          society: d.test || d.society || '',
          branchname: d.name || '',
          name: d.name || ''
        }))
      });
    }

    if (normType === 'transfers') {
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

    if (normType === 'route_details') {
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

    if (normType === 'handovers' || normType === 'handover') {
      const docs = await db.collection('handovers').find(filter).limit(1000).toArray().catch(() => []);
      return res.json({
        type: 'handovers',
        data: docs.map((d, i) => ({
          sno: i + 1,
          id: d._id,
          society: d.society || '',
          branch: d.branch || '',
          regno: d.regno || '',
          date: d.date || '',
          driver: d.driver || d.staffname || '',
          status: d.status || 'Completed'
        }))
      });
    }

    if (normType === 'issues' || normType === 'issue') {
      const docs = await db.collection('issues').find(filter).limit(1000).toArray().catch(() => []);
      return res.json({
        type: 'issues',
        data: docs.map((d, i) => ({
          sno: i + 1,
          id: d._id,
          society: d.society || '',
          branch: d.branch || '',
          regno: d.regno || '',
          date: d.date || '',
          description: d.description || d.remarks || '',
          status: d.status || 'Pending'
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
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: Admin role required' });
    }

    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collectionMap = {
      societies: 'society',
      society: 'society',
      branches: 'branch',
      branch: 'branch',
      stages: 'stages',
      routes: 'route',
      transfers: 'transfer',
      route_details: 'routedetails',
      handovers: 'handovers',
      issues: 'issues'
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

    // Fetch all societies from 'society' collection
    const societyDocs = await db.collection('society').find({}).sort({ name: 1 }).toArray();
    const societies = societyDocs.map(s => s.name).filter(Boolean);

    // Fetch branches directly from req.user
    const user = req.user || {};
    let branches = [];
    if (Array.isArray(user.branches) && user.branches.length > 0) {
      branches = user.branches;
    } else if (user.branch && user.branch !== 'College') {
      branches = [user.branch];
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

exports.createAdminItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type } = req.params;
    const collectionMap = {
      societies: 'society',
      society: 'society',
      branches: 'branch',
      branch: 'branch',
      stages: 'stages',
      routes: 'route',
      transfers: 'transfer',
      route_details: 'routedetails',
      handovers: 'handovers',
      issues: 'issues'
    };
    const colName = collectionMap[type] || type;
    const data = {
      ...req.body,
      createdAt: new Date()
    };
    const result = await db.collection(colName).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Create admin item error:', error);
    res.status(500).json({ message: 'Error creating admin item' });
  }
};

exports.updateAdminItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collectionMap = {
      societies: 'society',
      society: 'society',
      branches: 'branch',
      branch: 'branch',
      stages: 'stages',
      routes: 'route',
      transfers: 'transfer',
      route_details: 'routedetails',
      handovers: 'handovers',
      issues: 'issues'
    };
    const colName = collectionMap[type] || type;
    const { ObjectId } = mongoose.Types;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await db.collection(colName).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update admin item error:', error);
    res.status(500).json({ message: 'Error updating admin item' });
  }
};


const mongoose = require('mongoose');

exports.getAdminData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'stages';
    const branch = req.query.branch;
    const filter = branch && branch !== 'ALL' ? { branch } : {};

    if (type === 'stages') {
      const docs = await db.collection('stages').find(filter).limit(200).toArray();
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
      const docs = await db.collection('route').find(filter).limit(200).toArray();
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
      const docs = await db.collection('transfer').find(filter).limit(200).toArray();
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
      const docs = await db.collection('routedetails').find(filter).limit(200).toArray().catch(() => []);
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

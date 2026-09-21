const mongoose = require('mongoose');

exports.getAdminData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'stages';
    const selectedBranch = req.query.branch;

    // Branch scope from req.user (single source of truth from JWT)
    const user = req.user || {};
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.username === 'vms' || user.username === 'vmskkd' || user.username === 'vc' || user.branch === 'VMS' || user.branch === 'ALL';
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
          ...d,
          sno: i + 1,
          id: d._id.toString(),
          _id: d._id.toString(),
          name: d.name || d.society || d.societyname || '',
          societyname: d.name || d.society || d.societyname || '',
          society: d.name || d.society || d.societyname || ''
        }))
      });
    }

    if (normType === 'branches' || normType === 'branch') {
      const docs = await db.collection('branch').find({}).sort({ name: 1 }).limit(1000).toArray();
      return res.json({
        type: 'branches',
        data: docs.map((d, i) => {
          const rawSoc = d.test || d.society || '';
          const socList = Array.isArray(d.societies) && d.societies.length > 0
            ? d.societies
            : (rawSoc ? rawSoc.split(',').map(s => s.trim()).filter(Boolean) : []);
          return {
            ...d,
            sno: i + 1,
            id: d._id.toString(),
            _id: d._id.toString(),
            society: rawSoc,
            societies: socList,
            branchname: d.name || d.branchname || '',
            name: d.name || d.branchname || ''
          };
        })
      });
    }

    if (normType === 'transfers' || normType === 'transfer') {
      const docs = await db.collection('transfer').find(filter).limit(2000).toArray();
      return res.json({
        type: 'transfers',
        data: docs.map((d, i) => ({
          ...d,
          sno: i + 1,
          id: d._id.toString(),
          _id: d._id.toString(),
          society: d.society || '',
          branch: d.branch || '',
          make: d.make || '',
          model: d.model || '',
          regno: d.regno || '',
          service: d.service || '',
          transferbranch: d.transferbranch || '',
          transferdate: d.transferdate || '',
          cmr: d.cmr || ''
        }))
      });
    }

    if (normType === 'route_details' || normType === 'routedetails') {
      const docs = await db.collection('routedetails').find(filter).limit(2000).toArray().catch(() => []);
      return res.json({
        type: 'route_details',
        data: docs.map((d, i) => ({
          ...d,
          sno: i + 1,
          id: d._id.toString(),
          _id: d._id.toString(),
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
          ...d,
          sno: i + 1,
          id: d._id.toString(),
          _id: d._id.toString(),
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
          ...d,
          sno: i + 1,
          id: d._id.toString(),
          _id: d._id.toString(),
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
      society: society || '',
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

const getColName = (type) => {
  const cleanType = (type || '').toLowerCase().trim();
  const collectionMap = {
    societies: 'society',
    society: 'society',
    branches: 'branch',
    branch: 'branch',
    stages: 'stages',
    stage: 'stages',
    routes: 'route',
    route: 'route',
    transfers: 'transfer',
    transfer: 'transfer',
    route_details: 'routedetails',
    routedetails: 'routedetails',
    handovers: 'handovers',
    handover: 'handovers',
    issues: 'issues',
    issue: 'issues'
  };
  return collectionMap[cleanType] || cleanType;
};

exports.deleteAdminItem = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const colName = getColName(type);
    const { ObjectId } = mongoose.Types;
    const filter = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };
    const result = await db.collection(colName).deleteOne(filter);
    res.json({ success: true, message: 'Item deleted', deletedCount: result.deletedCount });
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

function extractBranchKeywords(branchName) {
  if (!branchName) return [];
  const parenMatch = branchName.match(/\(([^)]+)\)/);
  const words = [];
  if (parenMatch) {
    words.push(parenMatch[1].trim());
  }
  const cleaned = branchName.replace(/-[A-Za-z0-9]+$/, '').trim();
  const parts = cleaned.split(/[\s()\-]+/).filter(w => 
    w.length > 3 && !['ADITYA', 'COLLEGE', 'SCHOOL', 'PUBLIC', 'DEGREE', 'JUNIOR', 'CAMPUS', 'HEAD', 'OFFICE'].includes(w.toUpperCase())
  );
  return [...new Set([...words, ...parts])].filter(Boolean);
}

exports.getRouteFormOptions = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branch = (req.query.branch || '').trim();
    const society = (req.query.society || '').trim();

    let routes = [];
    let stages = [];

    // 1. If branch is provided, try exact match first
    if (branch && branch !== 'ALL' && branch !== 'College') {
      [routes, stages] = await Promise.all([
        db.collection('route').find({ branch }).project({ routename: 1, branch: 1, society: 1, distance: 1 }).toArray(),
        db.collection('stages').find({ branch }).project({ name: 1, branch: 1, society: 1 }).toArray()
      ]);

      // 2. If no exact match or partial, extract branch keywords (e.g. BHIMAVARAM from ADITYA DEGREE COLLEGE(BHIMAVARAM)-AAA)
      if (routes.length === 0 || stages.length === 0) {
        const kws = extractBranchKeywords(branch);
        if (kws.length > 0) {
          const regex = new RegExp(kws.join('|'), 'i');
          const [kwRoutes, kwStages] = await Promise.all([
            routes.length === 0 ? db.collection('route').find({ branch: regex }).project({ routename: 1, branch: 1, society: 1, distance: 1 }).toArray() : [],
            stages.length === 0 ? db.collection('stages').find({ branch: regex }).project({ name: 1, branch: 1, society: 1 }).toArray() : []
          ]);
          if (routes.length === 0 && kwRoutes.length > 0) routes = kwRoutes;
          if (stages.length === 0 && kwStages.length > 0) stages = kwStages;
        }
      }
    }

    // 3. If society is provided and still no routes/stages found, match society
    if ((routes.length === 0 || stages.length === 0) && society && society !== 'ALL') {
      const [socRoutes, socStages] = await Promise.all([
        routes.length === 0 ? db.collection('route').find({ society: new RegExp(society, 'i') }).project({ routename: 1, branch: 1, society: 1, distance: 1 }).toArray() : [],
        stages.length === 0 ? db.collection('stages').find({ society: new RegExp(society, 'i') }).project({ name: 1, branch: 1, society: 1 }).toArray() : []
      ]);
      if (routes.length === 0 && socRoutes.length > 0) routes = socRoutes;
      if (stages.length === 0 && socStages.length > 0) stages = socStages;
    }

    // 4. Fallback to all routes and stages so the dropdown is NEVER empty
    if (routes.length === 0 || stages.length === 0) {
      const [allRoutes, allStages] = await Promise.all([
        routes.length === 0 ? db.collection('route').find({}).project({ routename: 1, branch: 1, society: 1, distance: 1 }).toArray() : [],
        stages.length === 0 ? db.collection('stages').find({}).project({ name: 1, branch: 1, society: 1 }).toArray() : []
      ]);
      if (routes.length === 0) routes = allRoutes;
      if (stages.length === 0) stages = allStages;
    }

    const uniqueRoutes = Array.from(new Set(routes.map(r => (r.routename || '').trim()).filter(Boolean))).sort();
    const uniqueStages = Array.from(new Set(stages.map(s => (s.name || '').trim()).filter(Boolean))).sort();

    res.json({
      status: 'success',
      data: {
        routes: uniqueRoutes,
        stages: uniqueStages,
        routesWithDetails: routes
      },
      routes: uniqueRoutes,
      stages: uniqueStages,
      routesWithDetails: routes
    });
  } catch (error) {
    console.error('Error in getRouteFormOptions:', error);
    res.status(500).json({ message: 'Server error fetching route form options' });
  }
};

exports.getTransferFormOptions = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const vehiclemakeDocs = await db.collection('vehiclemake').find({}).toArray();
    const makes = Array.from(new Set(vehiclemakeDocs.map(m => (m.name || '').trim()).filter(Boolean))).sort();
    const models = Array.from(new Set(vehiclemakeDocs.map(m => (m.model || '').trim()).filter(Boolean))).sort();

    const [infoMakes, infoModels] = await Promise.all([
      db.collection('vehicleinfo').distinct('make'),
      db.collection('vehicleinfo').distinct('model')
    ]);

    const allMakes = Array.from(new Set([...makes, ...infoMakes.map(m => (m || '').trim()).filter(Boolean)])).sort();
    const allModels = Array.from(new Set([...models, ...infoModels.map(m => (m || '').trim()).filter(Boolean)])).sort();

    res.json({
      status: 'success',
      data: {
        makes: allMakes,
        models: allModels,
        vehicleMakes: vehiclemakeDocs
      },
      makes: allMakes,
      models: allModels,
      vehicleMakes: vehiclemakeDocs
    });
  } catch (error) {
    console.error('Error in getTransferFormOptions:', error);
    res.status(500).json({ message: 'Server error fetching transfer form options' });
  }
};

function formatTimeToAmPm(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}:\d{2}\s*(am|pm)$/i.test(str)) return str.toLowerCase();
  const ampmMatch = str.match(/(am|pm)/i);
  let period = ampmMatch ? ampmMatch[1].toLowerCase() : '';
  const numMatch = str.match(/(\d{1,2}):(\d{2})/);
  if (!numMatch) return str;
  let h = parseInt(numMatch[1], 10);
  const m = numMatch[2];
  if (!period) {
    if (h >= 12) {
      period = 'pm';
      if (h > 12) h -= 12;
    } else {
      period = 'am';
      if (h === 0) h = 12;
    }
  } else {
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
  }
  const paddedH = String(h).padStart(2, '0');
  return `${paddedH}:${m}:00 ${period}`;
}

exports.createAdminItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type } = req.params;
    const colName = getColName(type);

    // Branch collection: store exact count of branch records matching selected societies
    // Format strictly matches reference image 1: ONLY { name, test }
    if (colName === 'branch') {
      const branchName = (req.body.name || req.body.branchname || '').trim();
      let selectedSocieties = [];
      if (Array.isArray(req.body.societies) && req.body.societies.length > 0) {
        selectedSocieties = req.body.societies.map(s => String(s).trim()).filter(Boolean);
      } else if (req.body.society || req.body.test) {
        const str = req.body.society || req.body.test;
        selectedSocieties = str.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (selectedSocieties.length === 0) {
        return res.status(400).json({ message: 'At least one society must be selected' });
      }

      // Fetch societies directly from society collection in database
      const dbSocieties = await db.collection('society').find({}).toArray();
      const dbSocietyNames = dbSocieties
        .map(s => (s.name || s.society || s.societyname || '').trim())
        .filter(Boolean);

      // Create one branch document per selected society using name from society collection
      const docsToInsert = selectedSocieties.map(soc => {
        const matchedName = dbSocietyNames.find(
          dbName => dbName.toLowerCase() === soc.toLowerCase()
        ) || soc;

        return {
          name: branchName,
          test: matchedName
        };
      });

      const result = await db.collection('branch').insertMany(docsToInsert);
      return res.status(201).json({
        success: true,
        count: docsToInsert.length,
        insertedIds: result.insertedIds,
        data: docsToInsert
      });
    }

    const payload = {
      ...req.body,
      createdAt: new Date()
    };

    if (colName === 'society') {
      if (payload.name && !payload.societyname) payload.societyname = payload.name;
      if (payload.societyname && !payload.name) payload.name = payload.societyname;
      if (payload.name && !payload.society) payload.society = payload.name;
    } else if (colName === 'handovers') {
      if (payload.driver && !payload.staffname) payload.staffname = payload.driver;
      if (payload.staffname && !payload.driver) payload.driver = payload.staffname;
    } else if (colName === 'issues') {
      if (payload.description && !payload.remarks) payload.remarks = payload.description;
      if (payload.remarks && !payload.description) payload.description = payload.remarks;
    } else if (colName === 'routedetails') {
      if (payload.starttime) {
        payload.starttime = formatTimeToAmPm(payload.starttime);
      }
    } else if (colName === 'transfer') {
      if (payload.transferdate) {
        const td = String(payload.transferdate).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(td)) {
          const [y, m, d] = td.split('-');
          payload.transferdate = `${d}-${m}-${y}`;
          payload.transferdate_dt = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
        } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(td)) {
          const [d, m, y] = td.split('-');
          payload.transferdate = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
          payload.transferdate_dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`);
        }
      }
    }

    const result = await db.collection(colName).insertOne(payload);
    res.status(201).json({ success: true, id: result.insertedId, data: payload });
  } catch (error) {
    console.error('Create admin item error:', error);
    res.status(500).json({ message: error.message || 'Error creating admin item' });
  }
};

exports.updateAdminItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const colName = getColName(type);
    const { ObjectId } = mongoose.Types;
    const filter = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };

    // Branch collection: strictly keep ONLY { name, test }
    if (colName === 'branch') {
      const rawName = (req.body.name || req.body.branchname || '').trim();
      const soc = (Array.isArray(req.body.societies) && req.body.societies.length > 0)
        ? req.body.societies[0].trim()
        : (req.body.society || req.body.test || '').trim();

      const updateData = {
        name: rawName,
        test: soc
      };
      const result = await db.collection('branch').updateOne(
        filter,
        {
          $set: updateData,
          $unset: { society: '', societies: '', branch: '', branchname: '', createdAt: '' }
        }
      );
      return res.json({
        success: true,
        message: 'Branch updated successfully',
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      });
    }

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    if (colName === 'society') {
      if (updateData.name && !updateData.societyname) updateData.societyname = updateData.name;
      if (updateData.societyname && !updateData.name) updateData.name = updateData.societyname;
      if (updateData.name && !updateData.society) updateData.society = updateData.name;
    } else if (colName === 'handovers') {
      if (updateData.driver && !updateData.staffname) updateData.staffname = updateData.driver;
      if (updateData.staffname && !updateData.driver) updateData.driver = updateData.staffname;
    } else if (colName === 'issues') {
      if (updateData.description && !updateData.remarks) updateData.remarks = updateData.description;
      if (updateData.remarks && !updateData.description) updateData.description = updateData.remarks;
    } else if (colName === 'routedetails') {
      if (updateData.starttime) {
        updateData.starttime = formatTimeToAmPm(updateData.starttime);
      }
    } else if (colName === 'transfer') {
      if (updateData.transferdate) {
        const td = String(updateData.transferdate).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(td)) {
          const [y, m, d] = td.split('-');
          updateData.transferdate = `${d}-${m}-${y}`;
          updateData.transferdate_dt = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
        } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(td)) {
          const [d, m, y] = td.split('-');
          updateData.transferdate = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
          updateData.transferdate_dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`);
        }
      }
    }

    const result = await db.collection(colName).updateOne(filter, { $set: updateData });
    res.json({
      success: true,
      message: 'Item updated successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Update admin item error:', error);
    res.status(500).json({ message: error.message || 'Error updating admin item' });
  }
};

exports.searchVehicleInfo = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const queryVal = (
      req.body.value ||
      req.body.val ||
      req.query.value ||
      req.query.val ||
      req.query.query ||
      ''
    ).trim();

    if (!queryVal) {
      return res.json([]);
    }

    const safeVal = queryVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docs = await db.collection('vehicleinfo')
      .find({ regno: new RegExp(safeVal, 'i') })
      .project({ regno: 1, make: 1, model: 1, type: 1, _id: 1 })
      .limit(30)
      .toArray();

    res.json(docs);
  } catch (error) {
    console.error('Search vehicle info error:', error);
    res.status(500).json({ message: 'Error searching vehicle info' });
  }
};


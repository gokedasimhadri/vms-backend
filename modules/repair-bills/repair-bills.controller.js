const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

/**
 * Get Repair Bills with branch scoping and optional bus search
 */
exports.getRepairBillsData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branchFilter = buildBranchFilter(req.user, req.query.branch);
    
    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { busnumber: { $regex: search, $options: 'i' } },
        { vehicleregno: { $regex: search, $options: 'i' } },
        { vouchernumber: { $regex: search, $options: 'i' } },
        { vendorname: { $regex: search, $options: 'i' } },
        { materialinformation: { $regex: search, $options: 'i' } },
        { materialinfo: { $regex: search, $options: 'i' } }
      ];
    }

    if (req.query.fromDate || req.query.toDate) {
      query.repairdate = {};
      if (req.query.fromDate) query.repairdate.$gte = req.query.fromDate;
      if (req.query.toDate) query.repairdate.$lte = req.query.toDate;
    }

    const docs = await db.collection('repairbills')
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    const mappedDocs = docs.map(d => {
      const matInfo = d.materialinfo || d.materialinformation || d.material_info || d.materials || '-';
      const busNo = d.busnumber || d.vehicleregno || d.busno || d.vehicleno || '-';
      const soc = d.society || d.Society || '-';
      const mod = d.model || d.Model || '-';

      return {
        ...d,
        society: soc,
        model: mod,
        busnumber: busNo,
        vehicleregno: busNo,
        materialinfo: matInfo,
        materialinformation: matInfo,
        remarks: d.remarks || '-',
        id: d._id.toString()
      };
    });

    res.json({
      type: 'repairbills',
      count: mappedDocs.length,
      data: mappedDocs
    });
  } catch (error) {
    console.error('Error fetching repair bills data:', error);
    res.status(500).json({ message: 'Error fetching repair bills data' });
  }
};

/**
 * Generate next sequential voucher number: AEI/{branch}/{seq}
 */
exports.generateVoucherNumber = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branchName = req.query.branch || 'DEFAULT';

    const result = await db.collection('repairbills').aggregate([
      {
        $match: {
          vouchernumber: { $regex: /^AEI\//, $ne: '' }
        }
      },
      {
        $project: {
          vouchernumber: 1,
          voucherParts: { $split: ['$vouchernumber', '/'] }
        }
      },
      {
        $project: {
          vouchernumber: 1,
          numericPart: {
            $convert: {
              input: { $arrayElemAt: ['$voucherParts', 2] },
              to: 'int',
              onError: 0,
              onNull: 0
            }
          }
        }
      },
      {
        $match: {
          numericPart: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          maxVoucher: { $max: '$numericPart' }
        }
      }
    ]).toArray();

    let nextNumber = 1;
    if (result && result.length > 0 && result[0].maxVoucher !== null && result[0].maxVoucher !== undefined) {
      nextNumber = result[0].maxVoucher + 1;
    }

    const newVoucherNumber = `AEI/${branchName}/${nextNumber}`;
    res.json({ voucherNumber: newVoucherNumber });
  } catch (error) {
    console.error('Error generating voucher number:', error);
    res.status(500).json({ message: 'Error generating voucher number' });
  }
};

/**
 * Create a new repair bill
 */
exports.createRepairBill = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const body = req.body;
    const matInfo = body.materialinfo || body.materialinformation || body.material_info || '';

    const repairData = {
      society: body.society || body.Society || '',
      branch: body.branch || '',
      busnumber: (body.busnumber || body.vehicleregno || '').toUpperCase(),
      repairtype: body.repairtype || '',
      model: body.model || body.Model || '',
      description: body.description || '',
      vendorname: body.vendorname || '',
      amount: parseFloat(body.amount) || 0,
      vouchernumber: body.vouchernumber || '',
      materialinfo: matInfo,
      materialinformation: matInfo,
      remarks: body.remarks || '',
      repairdate: body.repairdate || new Date().toISOString().slice(0, 10),
      createdAt: new Date()
    };

    const result = await db.collection('repairbills').insertOne(repairData);
    res.status(201).json({ success: true, id: result.insertedId, data: repairData });
  } catch (error) {
    console.error('Error creating repair bill:', error);
    res.status(500).json({ message: 'Error creating repair bill' });
  }
};

/**
 * Update an existing repair bill
 */
exports.updateRepairBill = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    if (updateData.materialinfo || updateData.materialinformation) {
      const val = updateData.materialinfo || updateData.materialinformation;
      updateData.materialinfo = val;
      updateData.materialinformation = val;
    }

    await db.collection('repairbills').updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Repair bill updated successfully' });
  } catch (error) {
    console.error('Error updating repair bill:', error);
    res.status(500).json({ message: 'Error updating repair bill' });
  }
};

/**
 * Delete a repair bill
 */
exports.deleteRepairBill = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection('repairbills').deleteOne(filter);
    res.json({ success: true, message: 'Repair bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting repair bill:', error);
    res.status(500).json({ message: 'Error deleting repair bill' });
  }
};


const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

exports.getBusBreakdownData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const branchFilter = await buildBranchFilter(req.user, req.query.branch, db);

    let query = { ...branchFilter };
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { busno: { $regex: search, $options: 'i' } },
        { vehicleno: { $regex: search, $options: 'i' } },
        { drivername: { $regex: search, $options: 'i' } },
        { complaint: { $regex: search, $options: 'i' } },
        { natureofcomplaint: { $regex: search, $options: 'i' } },
        { breakedownplace: { $regex: search, $options: 'i' } }
      ];
    }

    const docs = await db.collection('busbreakedown')
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    // Filter out completely null/empty documents
    const validDocs = docs.filter(d => {
      const bus = d.busno || d.vehicleno || d.vehicleregno || d.regno;
      const driver = d.drivername || d.driver || d.staffname;
      const place = d.breakedownplace || d.place || d.breakdownplace;
      const comp = d.complaint || d.natureofcomplaint || d.nature_of_complaint;
      return !!(bus || driver || place || comp);
    });

    const mappedDocs = validDocs.map(d => {
      const bus = d.busno || d.vehicleno || d.vehicleregno || d.regno || '-';
      const driver = d.drivername || d.driver || d.staffname || '-';
      const phone = d.driverphoneno || d.driverphone || d.phone || '-';
      const place = d.breakedownplace || d.breakdownplace || d.place || '-';
      const comp = d.complaint || d.natureofcomplaint || d.nature_of_complaint || '-';
      const msgTime = d.messagetime || d.message_received_time || d.messagereceivetime || d.messageReceivedTime || '-';
      const assignTime = d.assignedtime || d.work_assign_time || d.workassignedtime || d.workAssignedTime || '-';
      const compTime = d.completedtime || d.work_complete_time || d.workcompletedtime || d.workCompletedTime || '-';
      const status = d.status || d.workstatus || d.work_status || 'Completed';
      const spareParts = d.spareparts || d.spare_part || d.sparepartsutilised || d.spare_parts || '-';
      const spareAmt = d.sparepartamount !== undefined && d.sparepartamount !== null ? d.sparepartamount : (d.spare_part_amount !== undefined && d.spare_part_amount !== null ? d.spare_part_amount : (d.spartpartamount !== undefined && d.spartpartamount !== null ? d.spartpartamount : '-'));
      const travelAmt = d.travellingallowance !== undefined && d.travellingallowance !== null ? d.travellingallowance : (d.travel_allowance !== undefined && d.travel_allowance !== null ? d.travel_allowance : '-');
      const foodAmt = d.foodallowance !== undefined && d.foodallowance !== null ? d.foodallowance : (d.food_allowance !== undefined && d.food_allowance !== null ? d.food_allowance : '-');
      const workersCount = d.noofworkers !== undefined && d.noofworkers !== null ? d.noofworkers : (Array.isArray(d.workers) ? d.workers.filter(w => w && (w.worker || w.workername || w.worker_designation)).length : '-');
      const total = d.totalamount !== undefined && d.totalamount !== null ? d.totalamount : (d.amount !== undefined && d.amount !== null ? d.amount : '-');

      return {
        ...d,
        busno: bus,
        vehicleno: bus,
        society: d.society || '-',
        branch: d.branch || '-',
        drivername: driver,
        driverphoneno: phone,
        breakedownplace: place,
        complaint: comp,
        natureofcomplaint: comp,
        date: d.date || '-',
        messagetime: msgTime,
        message_received_time: msgTime,
        messagereceivetime: msgTime,
        assignedtime: assignTime,
        work_assign_time: assignTime,
        workassignedtime: assignTime,
        completedtime: compTime,
        work_complete_time: compTime,
        workcompletedtime: compTime,
        status: status,
        workstatus: status,
        spareparts: spareParts,
        spare_part: spareParts,
        sparepartsutilised: spareParts,
        sparepartamount: spareAmt,
        spare_part_amount: spareAmt,
        spartpartamount: spareAmt,
        travellingallowance: travelAmt,
        travel_allowance: travelAmt,
        foodallowance: foodAmt,
        food_allowance: foodAmt,
        noofworkers: workersCount,
        totalamount: total,
        id: d._id.toString()
      };
    });

    res.json({
      type: 'busbreakdown',
      count: mappedDocs.length,
      data: mappedDocs
    });
  } catch (error) {
    console.error('Error fetching bus breakdown data:', error);
    res.status(500).json({ message: 'Error fetching bus breakdown data' });
  }
};

exports.createBusBreakdownItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const body = req.body;
    const bus = body.busno || body.vehicleno || body.vehicleregno || body.regno;
    const driver = body.drivername || body.driver || body.staffname;
    const phone = body.driverphoneno || body.driverphone || body.phone;
    const place = body.breakedownplace || body.breakdownplace || body.place;
    const comp = body.complaint || body.natureofcomplaint || body.nature_of_complaint;
    const msgTime = body.messagetime || body.message_received_time || body.messagereceivetime || body.messageReceivedTime;
    const assignTime = body.assignedtime || body.work_assign_time || body.workassignedtime || body.workAssignedTime;
    const compTime = body.completedtime || body.work_complete_time || body.workcompletedtime || body.workCompletedTime;
    const status = body.status || body.workstatus || body.work_status || 'Completed';
    const spareParts = body.spareparts || body.spare_part || body.sparepartsutilised || body.spare_parts;
    const spareAmt = body.sparepartamount ?? body.spare_part_amount ?? body.spartpartamount;
    const travelAmt = body.travellingallowance ?? body.travel_allowance;
    const foodAmt = body.foodallowance ?? body.food_allowance;
    const workersCount = body.noofworkers ?? (Array.isArray(body.workers) ? body.workers.filter(w => w && (w.worker || w.workername || w.worker_designation)).length : 0);
    const total = body.totalamount ?? body.amount;

    const data = {
      ...body,
      busno: bus,
      vehicleno: bus,
      drivername: driver,
      driverphoneno: phone,
      breakedownplace: place,
      complaint: comp,
      natureofcomplaint: comp,
      messagetime: msgTime,
      message_received_time: msgTime,
      messagereceivetime: msgTime,
      assignedtime: assignTime,
      work_assign_time: assignTime,
      workassignedtime: assignTime,
      completedtime: compTime,
      work_complete_time: compTime,
      workcompletedtime: compTime,
      status: status,
      workstatus: status,
      spareparts: spareParts,
      spare_part: spareParts,
      sparepartsutilised: spareParts,
      sparepartamount: spareAmt,
      spare_part_amount: spareAmt,
      spartpartamount: spareAmt,
      travellingallowance: travelAmt,
      travel_allowance: travelAmt,
      foodallowance: foodAmt,
      food_allowance: foodAmt,
      noofworkers: workersCount,
      totalamount: total,
      createdAt: new Date()
    };

    const result = await db.collection('busbreakedown').insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating bus breakdown record:', error);
    res.status(500).json({ message: 'Failed to create bus breakdown record' });
  }
};

exports.updateBusBreakdownItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    if (updateData.busno || updateData.vehicleno) {
      const val = updateData.busno || updateData.vehicleno;
      updateData.busno = val;
      updateData.vehicleno = val;
    }
    if (updateData.complaint || updateData.natureofcomplaint) {
      const val = updateData.complaint || updateData.natureofcomplaint;
      updateData.complaint = val;
      updateData.natureofcomplaint = val;
    }
    if (updateData.status || updateData.workstatus) {
      const val = updateData.status || updateData.workstatus;
      updateData.status = val;
      updateData.workstatus = val;
    }
    if (updateData.messagetime || updateData.message_received_time || updateData.messagereceivetime) {
      const val = updateData.messagetime || updateData.message_received_time || updateData.messagereceivetime;
      updateData.messagetime = val;
      updateData.message_received_time = val;
      updateData.messagereceivetime = val;
    }
    if (updateData.assignedtime || updateData.work_assign_time || updateData.workassignedtime) {
      const val = updateData.assignedtime || updateData.work_assign_time || updateData.workassignedtime;
      updateData.assignedtime = val;
      updateData.work_assign_time = val;
      updateData.workassignedtime = val;
    }
    if (updateData.completedtime || updateData.work_complete_time || updateData.workcompletedtime) {
      const val = updateData.completedtime || updateData.work_complete_time || updateData.workcompletedtime;
      updateData.completedtime = val;
      updateData.work_complete_time = val;
      updateData.workcompletedtime = val;
    }

    await db.collection('busbreakedown').updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Bus breakdown record updated successfully' });
  } catch (error) {
    console.error('Error updating bus breakdown record:', error);
    res.status(500).json({ message: 'Failed to update bus breakdown record' });
  }
};

exports.deleteBusBreakdownItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection('busbreakedown').deleteOne(filter);
    res.json({ success: true, message: 'Bus breakdown record deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus breakdown record:', error);
    res.status(500).json({ message: 'Failed to delete bus breakdown record' });
  }
};


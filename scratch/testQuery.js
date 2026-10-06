const mongoose = require('mongoose');
const moment = require('moment');

async function testQuery() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    // Get latest dates in vehicletripdata
    const latestDocs = await db.collection('vehicletripdata').find({}).sort({ _id: -1 }).limit(10).toArray();
    console.log('Latest 10 vehicletripdata dates:');
    latestDocs.forEach(d => {
      console.log('id:', d._id, 'date:', d.date, 'uploaddate:', d.uploaddate, 'branch:', d.branch);
    });

    // Test query for a date range (e.g. 2026-09-01 to 2026-09-30)
    const fromDateParam = '2026-09-01';
    const toDateParam = '2026-09-30';

    const parseDate = (dStr) => {
      if (!dStr) return null;
      const str = String(dStr).trim();
      let m = moment(str, ['YYYY-MM-DD', 'DD-MM-YYYY', 'YYYY/MM/DD', 'DD/MM/YYYY'], true);
      if (!m.isValid()) m = moment(str);
      return m.isValid() ? m : null;
    };

    const fromM = parseDate(fromDateParam);
    const toM = parseDate(toDateParam);
    const dateStrings = new Set();
    const curr = fromM.clone().startOf('day');
    const end = toM.clone().startOf('day');
    let count = 0;
    while (curr.isSameOrBefore(end) && count < 366) {
      dateStrings.add(curr.format('YYYY-MM-DD'));
      dateStrings.add(curr.format('DD-MM-YYYY'));
      dateStrings.add(curr.format('DD/MM/YYYY'));
      dateStrings.add(curr.format('YYYY/MM/DD'));
      curr.add(1, 'day');
      count++;
    }
    const dateStrArr = Array.from(dateStrings);
    const fromDateObj = fromM.clone().startOf('day').toDate();
    const toDateObj = toM.clone().endOf('day').toDate();

    const reportQuery = {
      $or: [
        { uploaddate: { $in: dateStrArr } },
        { date: { $in: dateStrArr } },
        { uploaddate: { $type: "date", $gte: fromDateObj, $lte: toDateObj } },
        { date: { $type: "date", $gte: fromDateObj, $lte: toDateObj } },
        { uploaddate_dt: { $gte: fromDateObj, $lte: toDateObj } },
        { date_dt: { $gte: fromDateObj, $lte: toDateObj } }
      ]
    };

    const results = await db.collection('vehicletripdata').find(reportQuery).limit(5).toArray();
    console.log(`\nQuery for ${fromDateParam} to ${toDateParam} returned: ${results.length} docs`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testQuery();

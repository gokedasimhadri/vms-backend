const mongoose = require('mongoose');
const moment = require('moment');

async function testTimestampQuery() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vms');
    const db = mongoose.connection.db;

    const parseDate = (dStr) => {
      if (!dStr) return null;
      const str = String(dStr).trim();
      let m = moment(str, ['YYYY-MM-DD', 'DD-MM-YYYY', 'YYYY/MM/DD', 'DD/MM/YYYY'], true);
      if (!m.isValid()) m = moment(str);
      return m.isValid() ? m : null;
    };

    const fromStr = '2026-09-01';
    const toStr = '2026-10-06';

    const fromM = parseDate(fromStr);
    const toM = parseDate(toStr);

    const ftime = fromM.startOf('day').valueOf();
    const ttime = toM.endOf('day').valueOf();

    console.log('ftime:', ftime, '(', new Date(ftime).toISOString(), ')');
    console.log('ttime:', ttime, '(', new Date(ttime).toISOString(), ')');

    const query = { Timestamp: { $gte: ftime, $lte: ttime } };
    const docs = await db.collection('vehicletripdata').find(query).toArray();
    console.log('Docs found with Timestamp query:', docs.length);
    if (docs.length > 0) {
      console.log('First doc date:', docs[0].date, 'Timestamp:', docs[0].Timestamp, 'branch:', docs[0].branch);
    }

    // Now test Sept 23 only (2026-09-23 to 2026-09-23)
    const ftime2 = parseDate('2026-09-23').startOf('day').valueOf();
    const ttime2 = parseDate('2026-09-23').endOf('day').valueOf();
    const docs2 = await db.collection('vehicletripdata').find({ Timestamp: { $gte: ftime2, $lte: ttime2 } }).toArray();
    console.log('\nDocs found for 2026-09-23 with Timestamp query:', docs2.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testTimestampQuery();

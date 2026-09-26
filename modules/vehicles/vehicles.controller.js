const mongoose = require('mongoose');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const { buildBranchFilter } = require('../../utils/scope.helper');

const getCollectionForType = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'branch' || t === 'branchvehicle') return 'branchvehicle';
  if (t === 'info' || t === 'vehicleinfo' || t === 'lightmotor' || t === 'heavymotor') return 'vehicleinfo';
  if (t === 'accidents' || t === 'vehicleaccident') return 'vehicleaccident';
  if (t === 'makes' || t === 'vehiclemake') return 'vehiclemake';
  if (t === 'trips' || t === 'vehicletrip' || t === 'vehicletripdata' || t === 'entrydata') return 'vehicletripdata';
  if (t === 'challan' || t === 'vehiclechallan') return 'vehiclechallan';
  if (t === 'daily' || t === 'dailyvehicle') return 'dailyvehicle';
  if (t === 'repair' || t === 'vehiclerepair') return 'vehiclerepair';
  if (t === 'vcr') return 'vcr';
  return 'branchvehicle';
};

exports.getVehiclesData = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const type = req.query.type || 'branch';
    const collName = getCollectionForType(type);

    // Vehicle make is global; others are branch-scoped
    const branchFilter = collName === 'vehiclemake' ? {} : await buildBranchFilter(req.user, req.query.branch, db);

    let query = { ...branchFilter };
    const rawType = (type || '').toLowerCase();
    if (rawType === 'heavymotor') {
      query.type = 'BUS';
    } else if (rawType === 'lightmotor') {
      query.type = { $ne: 'BUS' };
    }

    if (req.query.search) {
      const search = req.query.search.trim();
      const searchQuery = [
        { vehicleregno: { $regex: search, $options: 'i' } },
        { regno: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { drivername: { $regex: search, $options: 'i' } },
        { staffname: { $regex: search, $options: 'i' } },
        { routename: { $regex: search, $options: 'i' } },
        { route: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchQuery }];
        delete query.$or;
      } else {
        query.$or = searchQuery;
      }
    }

    let docs = [];
    const limit = Number(req.query.limit) || 1000;
    if (collName === 'vehicletripdata') {
      const docsTrip = await db.collection('vehicletrip').find(query).sort({ _id: -1 }).limit(limit).toArray().catch(() => []);
      const docsData = await db.collection('vehicletripdata').find(query).sort({ _id: -1 }).limit(limit).toArray().catch(() => []);
      docs = docsTrip.length > 0 ? docsTrip : docsData;
    } else {
      docs = await db.collection(collName)
        .find(query)
        .sort({ _id: -1 })
        .limit(limit)
        .toArray();
    }

    res.json({
      type,
      collection: collName,
      count: docs.length,
      data: docs.map(d => ({
        ...d,
        id: d._id ? d._id.toString() : String(Math.random()),
        make: d.make || d.name || d.vehiclemake || d.makename || '',
        vehicleregno: d.vehicleregno || d.regno || d.vehicleno || d.busnumber || d.vno || d.vehicle_reg_no || '',
        regno: d.regno || d.vehicleregno || d.vehicleno || d.busnumber || d.vno || d.vehicle_reg_no || '',
        route: d.route || d.routename || '',
        routename: d.routename || d.route || '',
        students: d.students !== undefined ? d.students : (d.studentsstrength !== undefined ? d.studentsstrength : ''),
        studentsstrength: d.studentsstrength !== undefined ? d.studentsstrength : (d.students !== undefined ? d.students : ''),
        strength: d.strength !== undefined ? d.strength : (d.fixedstrength !== undefined ? d.fixedstrength : ''),
        fixedstrength: d.fixedstrength !== undefined ? d.fixedstrength : (d.strength !== undefined ? d.strength : ''),
        distance: d.distance !== undefined ? d.distance : (d.distanceinkms !== undefined ? d.distanceinkms : ''),
        kms: (d.kms !== undefined && d.kms !== null && d.kms !== '')
          ? d.kms
          : (d.cmr !== undefined && d.omr !== undefined && !isNaN(Number(d.cmr) - Number(d.omr)) ? (Number(d.cmr) - Number(d.omr)) : ''),
        result: d.result || ((() => {
          const kmsVal = (d.kms !== undefined && d.kms !== null && d.kms !== '') ? Number(d.kms) : (d.cmr && d.omr ? Number(d.cmr) - Number(d.omr) : NaN);
          const distVal = Number(d.distance ?? d.distanceinkms);
          if (!isNaN(kmsVal) && !isNaN(distVal) && kmsVal > distVal) {
            return `exceed${kmsVal - distVal}`;
          }
          return '';
        })())
      }))
    });
  } catch (error) {
    console.error('Error fetching vehicles data:', error);
    res.status(500).json({ message: 'Error fetching vehicles data' });
  }
};

exports.getVehicleTripdata = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // Daily rollover for active trip records in 'vehicletrip'
    const todayDate = moment().format('DD-MM-YYYY');
    try {
      const docsToRollover = await db.collection('vehicletrip').find({ date: { $ne: todayDate } }).toArray();
      if (docsToRollover.length > 0) {
        for (let i = 0; i < docsToRollover.length; i++) {
          const doc = docsToRollover[i];
          const cmrval = doc.cmr || '';
          await db.collection('vehicletrip').updateOne(
            { _id: doc._id },
            {
              $set: {
                date: todayDate,
                students: '',
                omr: cmrval,
                cmr: '',
                kms: '',
                remarks: ''
              }
            }
          );
        }
      }
    } catch (err) {
      console.error('Error in daily trip rollover:', err);
    }

    let branchFilter = {};
    let username = "";

    // --------------------------------------------------
    // 1. USER / BRANCH FILTER
    // --------------------------------------------------
    if (req.user) {
      username = (req.user.username || "").toLowerCase();

      console.log("USER:", req.user);
      console.log("USERNAME:", username);

      // VMS / VC -> access all branches
      if (username === "vms" || username === "vc") {
        branchFilter = {};
      }

      else if (username === "adcjkpur") {
        branchFilter = { branch: /JAGANNAICKPUR/i };
      }

      else if (username === "adcamp") {
        branchFilter = { branch: /AMALAPURAM/i };
      }

      else if (username === "adcbvrm") {
        branchFilter = { branch: /BHIMAVARAM/i };
      }

      else if (username === "adceluru") {
        branchFilter = { branch: /ELURU/i };
      }

      else if (username === "adcgmd") {
        branchFilter = { branch: /MAMIDADA/i };
      }

      else if (username === "adcgwk") {
        branchFilter = { branch: /GAJUWAKA/i };
      }

      else if (username === "adclakshya") {
        branchFilter = { branch: /LAKSHYA/i };
      }

      else if (username === "adcmdp") {
        branchFilter = { branch: /MANDAPETA/i };
      }

      else if (username === "adcnsp") {
        branchFilter = {
          branch: {
            $in: ["AJCNSP", /NARASAPURAM/i]
          }
        };
      }

      else if (username === "adcpkl") {
        branchFilter = { branch: /PALAKOL/i };
      }

      else if (username === "adcptp") {
        branchFilter = { branch: /PITHAPURAM/i };
      }

      else if (username === "adcrjyd") {
        branchFilter = { branch: /RJY DEGREE/i };
      }

      else if (username === "adcsklm") {
        branchFilter = { branch: /SRIKAKULAM/i };
      }

      else if (username === "adctpg") {
        branchFilter = { branch: /TADEPALLIGUDEM/i };
      }

      else if (username === "adctuni") {
        branchFilter = { branch: /TUNI/i };
      }

      else if (username === "adcengg") {
        branchFilter = {
          branch: {
            $in: [
              "KKD ENGINEERING-AA",
              "KKD ENGINEERING-SES",
              "NON LOCAL ENGINEERING-AA",
              "NON LOCAL ENGINEERING-SES",
              "RJY ENGINEERING-AA",
              "RJY ENGINEERING-SES",
              "MANDAPETA ENGINEERING-AA",
              "MANDAPETA ENGINEERING-SES"
            ]
          }
        };
      }

      else if (username === "adckkd") {
        branchFilter = {
          branch: {
            $in: [
              "KKD DEGREE-AA",
              "KKD DEGREE-SES"
            ]
          }
        };
      }

      else if (username === "srikkd") {
        branchFilter = {
          branch: {
            $in: [
              "ADITYA PUBLIC SCHOOL (SRI NAGAR)-AA",
              "ADITYA PUBLIC SCHOOL (SRI NAGAR)-SES"
            ]
          }
        };
      }

      else if (username === "ajckkd") {
        branchFilter = {
          branch: {
            $in: [
              "KKD INTER-AA",
              "KKD INTER-SES"
            ]
          }
        };
      }

      else if (username === "adcpdp") {
        branchFilter = {
          branch: {
            $in: [
              "PEDDAPURAM-AA",
              "PEDDAPURAM-SES"
            ]
          }
        };
      }

      else if (username === "adcmkvs") {
        branchFilter = {
          branch: {
            $in: [
              "MARIKAVALASA-AA",
              "MARIKAVALASA-SES"
            ]
          }
        };
      }

      else if (username === "adcho") {
        branchFilter = {
          branch: /KAKINADA HEAD OFFICE/i
        };
      }

      else if (username === "adckkdiit") {
        branchFilter = {
          branch: {
            $in: [
              "KKD IIT-SES",
              "KKD IIT-AA"
            ]
          }
        };
      }

      else if (username === "adcadmin") {
        branchFilter = {
          branch: {
            $in: [
              "SURAMPALEM-ENGINEERING-AA",
              "SURAMPALEM-ENGINEERING-SES"
            ]
          }
        };
      }

      // Aditya Thaksha
      else if (username === "adcats") {
        branchFilter = {
          branch: /ADITYA THAKSH SCHOOL-AA/i
        };
      }

      // Anakapali Degree
      else if (username === "adcakp") {
        branchFilter = {
          branch: /ANAKAPALI-SES/i
        };
      }

      // Gudivada
      else if (username === "adcgdv") {
        branchFilter = {
          branch: /GUDIVADA/i
        };
      }

      // Nidadhavolu
      else if (username === "adcndl") {
        branchFilter = {
          branch: /NIDADHAVOLU/i
        };
      }

      // Ongole
      else if (username === "adcongole") {
        branchFilter = {
          branch: /ONGOLE/i
        };
      }

      // Vizianagaram
      else if (username === "adcvzm") {
        branchFilter = {
          branch: /VIZIANAGARAM/i
        };
      }

      // Machilipatnam
      else if (username === "adcmtm") {
        branchFilter = {
          branch: /MATCHILI PATNAM/i
        };
      }

      // Vijayawada
      else if (username === "adcsnr") {
        branchFilter = {
          branch: /VIJAYAWADA/i
        };
      }

      // University
      else if (username === "aus") {
        branchFilter = {
          branch: /UNIVERSITY/i
        };
      }

      // Tanuku
      else if (username === "adctnk") {
        branchFilter = {
          branch: /TANUKU/i
        };
      }

      // Habsiguda
      else if (username === "adchbg") {
        branchFilter = {
          branch: /HABSIGUDA/i
        };
      }

      // Aditya Degree College Bhimavaram
      else if (username === "adcbvrmd") {
        branchFilter = {
          branch: /ADITYA DEGREE COLLEGE\(BHIMAVARAM\)/i
        };
      }

      // Ashok Nagar
      else if (username === "adcasn") {
        branchFilter = {
          branch: {
            $in: [
              "ADITYA PUBLIC SCHOOL(ASHOK NAGAR)-AA",
              "ADITYA PUBLIC SCHOOL(ASHOK NAGAR)-SES"
            ]
          }
        };
      }

      // Fallback
      else {
        branchFilter = buildBranchFilter(
          req.user,
          req.query.branch
        );
      }
    }

    // No logged-in user
    else {
      branchFilter = buildBranchFilter(
        null,
        req.query.branch
      );
    }

    console.log("BRANCH FILTER:", branchFilter);

    // --------------------------------------------------
    // 2. BUILD MAIN QUERY
    // --------------------------------------------------

    let query = {
      ...branchFilter
    };

    // --------------------------------------------------
    // 3. SEARCH
    // --------------------------------------------------

    if (req.query.search) {
      const search = req.query.search.trim();

      if (search) {
        const searchQuery = [
          {
            vehicleregno: {
              $regex: search,
              $options: "i"
            }
          },
          {
            regno: {
              $regex: search,
              $options: "i"
            }
          },
          {
            routename: {
              $regex: search,
              $options: "i"
            }
          },
          {
            route: {
              $regex: search,
              $options: "i"
            }
          },
          {
            society: {
              $regex: search,
              $options: "i"
            }
          },
          {
            branch: {
              $regex: search,
              $options: "i"
            }
          }
        ];

        if (query.$or) {
          query.$and = [
            { $or: query.$or },
            { $or: searchQuery }
          ];

          delete query.$or;
        } else {
          query.$or = searchQuery;
        }
      }
    }

    // --------------------------------------------------
    // 4. DATE FILTER
    // --------------------------------------------------

    const fromDateParam = req.query.fromDate || req.query.fromdate;
    const toDateParam = req.query.toDate || req.query.todate;
    const reqDate =
      req.query.date ||
      req.query.uploaddate;

    if (fromDateParam || toDateParam) {
      delete query.uploaddate;
    } else if (reqDate) {
      // Explicit date requested
      query.$or = [
        { uploaddate: reqDate },
        { date: reqDate }
      ];
    }

    // VMS / VC -> preserve old behavior
    else if (username === "vms" || username === "vc") {
      const today = moment().format("DD-MM-YYYY");

      query.uploaddate = today;

      console.log("VMS/VC DATE:", today);
    }

    // Other users -> latest available date
    else {
      const latestDoc = await db
        .collection("vehicletripdata")
        .findOne(
          query,
          {
            sort: {
              _id: -1
            }
          }
        );

      if (latestDoc && latestDoc.uploaddate) {
        query.uploaddate = latestDoc.uploaddate;

        console.log(
          "LATEST UPLOAD DATE:",
          latestDoc.uploaddate
        );
      }
    }

    console.log(
      "FINAL QUERY:",
      JSON.stringify(query, null, 2)
    );

    // --------------------------------------------------
    // 5. FETCH DATA
    // --------------------------------------------------

    const limit = Number(req.query.limit) || 1000;

    let docs = [];
    try {
      const tripQuery = { ...branchFilter };
      if (req.query.search) {
        const search = req.query.search.trim();
        if (search) {
          tripQuery.$or = [
            { vehicleregno: { $regex: search, $options: 'i' } },
            { regno: { $regex: search, $options: 'i' } },
            { routename: { $regex: search, $options: 'i' } },
            { route: { $regex: search, $options: 'i' } },
            { society: { $regex: search, $options: 'i' } },
            { branch: { $regex: search, $options: 'i' } }
          ];
        }
      }
      const tripDocs = await db.collection("vehicletrip").find(tripQuery).sort({ _id: -1 }).toArray();
      if (tripDocs && tripDocs.length > 0) {
        docs = tripDocs;
      } else {
        docs = await db.collection("vehicletripdata").find(query).sort({ _id: -1 }).limit(limit).toArray();
      }
    } catch (err) {
      console.error("Error fetching trip records:", err);
      docs = await db.collection("vehicletripdata").find(query).sort({ _id: -1 }).limit(limit).toArray().catch(() => []);
    }

    console.log("MONGO DOC COUNT:", docs.length);

    if (docs.length > 0) {
      console.log(
        "FIRST DOCUMENT:",
        docs[0]
      );
    }

    // --------------------------------------------------
    // 6. VALID DOCUMENTS
    // --------------------------------------------------

    // Filter out blank rows with empty vehicle registration numbers
    const validDocs = docs.filter(d => {
      const reg = d.vehicleregno || d.regno || d.vehicleno || d.busnumber || d.vno || d.vehicle_reg_no || '';
      return String(reg).trim() !== '';
    });

    console.log(
      "VALID DOC COUNT:",
      validDocs.length
    );

    // --------------------------------------------------
    // 7. FORMAT RESPONSE
    // --------------------------------------------------

    const formattedDocs = validDocs.map(d => {
      const kmsValue =
        (
          d.kms !== undefined &&
          d.kms !== null &&
          d.kms !== ""
        )
          ? d.kms
          : (
            d.cmr !== undefined &&
            d.cmr !== "" &&
            d.omr !== undefined &&
            d.omr !== "" &&
            !isNaN(
              Number(d.cmr) -
              Number(d.omr)
            )
          )
            ? (
              Number(d.cmr) -
              Number(d.omr)
            )
            : "";

      let resultValue =
        d.result || "";

      if (!resultValue) {
        const kmsVal =
          (
            d.kms !== undefined &&
            d.kms !== null &&
            d.kms !== ""
          )
            ? Number(d.kms)
            : (
              d.cmr !== undefined &&
              d.cmr !== "" &&
              d.omr !== undefined &&
              d.omr !== ""
            )
              ? Number(d.cmr) -
              Number(d.omr)
              : NaN;

        const distVal =
          Number(
            d.distance ??
            d.distanceinkms
          );

        if (
          !isNaN(kmsVal) &&
          !isNaN(distVal) &&
          kmsVal > distVal
        ) {
          resultValue =
            `exceed${kmsVal - distVal}`;
        }
      }

      return {
        ...d,

        id: d._id
          ? d._id.toString()
          : String(Math.random()),

        society:
          d.society || "",

        branch:
          d.branch || "",

        vehicleregno:
          d.vehicleregno ||
          d.regno ||
          d.vehicleno ||
          d.busnumber ||
          d.vno ||
          "",

        regno:
          d.regno ||
          d.vehicleregno ||
          d.vehicleno ||
          d.busnumber ||
          d.vno ||
          "",

        route:
          d.route ||
          d.routename ||
          "",

        routename:
          d.routename ||
          d.route ||
          "",

        date:
          d.date ||
          d.uploaddate ||
          "",

        capacity:
          d.capacity !== undefined
            ? d.capacity
            : "",

        students:
          d.students !== undefined
            ? d.students
            : (
              d.studentsstrength !== undefined
                ? d.studentsstrength
                : ""
            ),

        studentsstrength:
          d.studentsstrength !== undefined
            ? d.studentsstrength
            : (
              d.students !== undefined
                ? d.students
                : ""
            ),

        strength:
          d.strength !== undefined
            ? d.strength
            : (
              d.fixedstrength !== undefined
                ? d.fixedstrength
                : ""
            ),

        fixedstrength:
          d.fixedstrength !== undefined
            ? d.fixedstrength
            : (
              d.strength !== undefined
                ? d.strength
                : ""
            ),

        omr:
          d.omr !== undefined
            ? d.omr
            : "",

        cmr:
          d.cmr !== undefined
            ? d.cmr
            : "",

        distance:
          d.distance !== undefined
            ? d.distance
            : (
              d.distanceinkms !== undefined
                ? d.distanceinkms
                : ""
            ),

        kms: kmsValue,

        result: resultValue,

        remarks:
          d.remarks || ""
      };
    });

    // --------------------------------------------------
    // 8. SEND RESPONSE
    // --------------------------------------------------

    return res.json({
      type: "trips",
      collection: "vehicletripdata",
      count: formattedDocs.length,
      data: formattedDocs
    });

  } catch (error) {
    console.error(
      "Error in getVehicleTripdata:",
      error
    );

    return res.status(500).json({
      message:
        "Error fetching vehicle trip data",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
};
// exports.getVehicleTripdata = async (req, res) => {
//   try {
//     const db = mongoose.connection.db;
//     let branchFilter = {};
//     console.log("USER:", req.user);
//     console.log("USERNAME:", req.user?.username);
//     // console.log("BRANCH FILTER:", branchFilter);
//     // console.log("FINAL QUERY:", JSON.stringify(query, null, 2));
//     if (req.user) {
//       const username = (req.user.username || '').toLowerCase();
//       console.log(username);
//       if (username === 'vms' || username === 'vc') {
//         branchFilter = {};
//       }
//       if (username === 'adcjkpur') branchFilter = { branch: /JAGANNAICKPUR/i };
//       else if (username === 'adcamp') branchFilter = { branch: /AMALAPURAM/i };
//       else if (username === 'adcbvrm') branchFilter = { branch: /BHIMAVARAM/i };
//       else if (username === 'adceluru') branchFilter = { branch: /ELURU/i };
//       else if (username === 'adcgmd') branchFilter = { branch: /MAMIDADA/i };
//       else if (username === 'adcgwk') branchFilter = { branch: /GAJUWAKA/i };
//       else if (username === 'adclakshya') branchFilter = { branch: /LAKSHYA/i };
//       else if (username === 'adcmdp') branchFilter = { branch: /MANDAPETA/i };
//       else if (username === 'adcnsp') branchFilter = { branch: { $in: ['AJCNSP', /NARASAPURAM/i] } };
//       else if (username === 'adcpkl') branchFilter = { branch: /PALAKOL/i };
//       else if (username === 'adcptp') branchFilter = { branch: /PITHAPURAM/i };
//       else if (username === 'adcrjyd') branchFilter = { branch: /RJY DEGREE/i };
//       else if (username === 'adcsklm') branchFilter = { branch: /SRIKAKULAM/i };
//       else if (username === 'adctpg') branchFilter = { branch: /TADEPALLIGUDEM/i };
//       else if (username === 'adctuni') branchFilter = { branch: /TUNI/i };
//       else if (username === 'adcengg') branchFilter = { branch: { $in: ['KKD ENGINEERING-AA', 'KKD ENGINEERING-SES', 'NON LOCAL ENGINEERING-AA', 'NON LOCAL ENGINEERING-SES', 'RJY ENGINEERING-AA', 'RJY ENGINEERING-SES', 'MANDAPETA ENGINEERING-AA', 'MANDAPETA ENGINEERING-SES'] } };
//       else if (username === 'adckkd') branchFilter = { branch: { $in: ['KKD DEGREE-AA', 'KKD DEGREE-SES'] } };
//       else if (username === 'srikkd') branchFilter = { branch: { $in: ['ADITYA PUBLIC SCHOOL (SRI NAGAR)-AA', 'ADITYA PUBLIC SCHOOL (SRI NAGAR)-SES'] } };
//       else if (username === 'ajckkd') branchFilter = { branch: { $in: ['KKD INTER-AA', 'KKD INTER-SES'] } };
//       else if (username === 'adcpdp') branchFilter = { branch: { $in: ['PEDDAPURAM-AA', 'PEDDAPURAM-SES'] } };
//       else if (username === 'adcmkvs') branchFilter = { branch: { $in: ['MARIKAVALASA-AA', 'MARIKAVALASA-SES'] } };
//       else if (username === 'adcho') branchFilter = { branch: /KAKINADA HEAD OFFICE/i };
//       else if (username === 'adckkdiit') branchFilter = { branch: { $in: ['KKD IIT-SES', 'KKD IIT-AA'] } };
//       else if (username === 'adcadmin') branchFilter = { branch: { $in: ['SURAMPALEM-ENGINEERING-AA', 'SURAMPALEM-ENGINEERING-SES'] } };
//       else if (username === 'adcats') branchFilter = { branch: /ADITYA THAKSH SCHOOL-AA/i };
//       else if (username === 'adcakp') branchFilter = { branch: /ANAKAPALI-SES/i };
//       else if (username === 'adcgdv') branchFilter = { branch: /GUDIVADA/i };
//       else if (username === 'adcndl') branchFilter = { branch: /NIDADHAVOLU/i };
//       else if (username === 'adcongole') branchFilter = { branch: /ONGOLE/i };
//       else if (username === 'adcvzm') branchFilter = { branch: /VIZIANAGARAM/i };
//       else if (username === 'adcmtm') branchFilter = { branch: /MATCHILI PATNAM/i };
//       else if (username === 'adcsnr') branchFilter = { branch: /VIJAYAWADA/i };
//       else if (username === 'aus') branchFilter = { branch: /UNIVERSITY/i };
//       else if (username === 'adctnk') branchFilter = { branch: /TANUKU/i };
//       else if (username === 'adchbg') branchFilter = { branch: /HABSIGUDA/i };
//       else if (username === 'adcbvrmd') branchFilter = { branch: /ADITYA DEGREE COLLEGE\(BHIMAVARAM\)/i };
//       else if (username === 'adcasn') branchFilter = { branch: { $in: ['ADITYA PUBLIC SCHOOL(ASHOK NAGAR)-AA', 'ADITYA PUBLIC SCHOOL(ASHOK NAGAR)-SES'] } };
//       else {
//         branchFilter = buildBranchFilter(req.user, req.query.branch);
//       }
//     } else {
//       branchFilter = buildBranchFilter(null, req.query.branch);
//     }

//     let query = { ...branchFilter };

//     if (req.query.search) {
//       const search = req.query.search.trim();
//       const searchQuery = [
//         { vehicleregno: { $regex: search, $options: 'i' } },
//         { regno: { $regex: search, $options: 'i' } },
//         { routename: { $regex: search, $options: 'i' } },
//         { route: { $regex: search, $options: 'i' } },
//         { society: { $regex: search, $options: 'i' } },
//         { branch: { $regex: search, $options: 'i' } }
//       ];
//       if (query.$or) {
//         query.$and = [{ $or: query.$or }, { $or: searchQuery }];
//         delete query.$or;
//       } else {
//         query.$or = searchQuery;
//       }
//     }

//     // Target date matching: if explicit date or uploaddate passed, match it; else match latest uploaddate
//     const reqDate = req.query.date || req.query.uploaddate;
//     if (reqDate) {
//       query.$or = [{ uploaddate: reqDate }, { date: reqDate }];
//     } else {
//       const latestDoc = await db.collection('vehicletripdata').findOne(query, { sort: { _id: -1 } });
//       if (latestDoc && latestDoc.uploaddate) {
//         query.uploaddate = latestDoc.uploaddate;
//       }
//     }

//     const limit = Number(req.query.limit) || 1000;
//     const docs = await db.collection('vehicletripdata')
//       .find(query)
//       .sort({ _id: -1 })
//       .limit(limit)
//       .toArray();

//     const validDocs = docs.filter(d => (d.regno || d.vehicleregno || d.society || d.branch) && (d.regno || d.branch || d.routename || d.route));

//     const formattedDocs = validDocs.map(d => ({
//       ...d,
//       id: d._id ? d._id.toString() : String(Math.random()),
//       society: d.society || '',
//       branch: d.branch || '',
//       vehicleregno: d.vehicleregno || d.regno || d.vehicleno || d.busnumber || d.vno || '',
//       regno: d.regno || d.vehicleregno || d.vehicleno || d.busnumber || d.vno || '',
//       route: d.route || d.routename || '',
//       routename: d.routename || d.route || '',
//       date: d.date || d.uploaddate || '',
//       capacity: d.capacity !== undefined ? d.capacity : '',
//       students: d.students !== undefined ? d.students : (d.studentsstrength !== undefined ? d.studentsstrength : ''),
//       studentsstrength: d.studentsstrength !== undefined ? d.studentsstrength : (d.students !== undefined ? d.students : ''),
//       strength: d.strength !== undefined ? d.strength : (d.fixedstrength !== undefined ? d.fixedstrength : ''),
//       fixedstrength: d.fixedstrength !== undefined ? d.fixedstrength : (d.strength !== undefined ? d.strength : ''),
//       omr: d.omr !== undefined ? d.omr : '',
//       cmr: d.cmr !== undefined ? d.cmr : '',
//       distance: d.distance !== undefined ? d.distance : (d.distanceinkms !== undefined ? d.distanceinkms : ''),
//       kms: (d.kms !== undefined && d.kms !== null && d.kms !== '')
//         ? d.kms
//         : (d.cmr && d.omr && !isNaN(Number(d.cmr) - Number(d.omr)) ? (Number(d.cmr) - Number(d.omr)) : ''),
//       result: d.result || ((() => {
//         const kmsVal = (d.kms !== undefined && d.kms !== null && d.kms !== '') ? Number(d.kms) : (d.cmr && d.omr ? Number(d.cmr) - Number(d.omr) : NaN);
//         const distVal = Number(d.distance ?? d.distanceinkms);
//         if (!isNaN(kmsVal) && !isNaN(distVal) && kmsVal > distVal) {
//           return `exceed${kmsVal - distVal}`;
//         }
//         return '';
//       })()),
//       remarks: d.remarks || ''
//     }));

//     res.json({
//       type: 'trips',
//       collection: 'vehicletripdata',
//       count: formattedDocs.length,
//       data: formattedDocs
//     });
//   } catch (error) {
//     console.error('Error in getVehicleTripdata:', error);
//     res.status(500).json({ message: 'Error fetching vehicle trip data' });
//   }
// };

exports.createVehicleItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const subType = req.params.type || 'branch';
    const collName = getCollectionForType(subType);

    const data = {
      ...req.body,
      createdAt: new Date()
    };
    delete data._id;
    delete data.id;

    const rawType = (subType || '').toLowerCase();
    if (collName === 'vehiclemake') {
      if (data.make && !data.name) data.name = data.make;
      if (data.name && !data.make) data.make = data.name;
    }
    if (collName === 'vehicleinfo') {
      if (!data.regno && data.vehicleregno) data.regno = data.vehicleregno;
      if (!data.vehicleregno && data.regno) data.vehicleregno = data.regno;
      if (!data.type) {
        if (rawType === 'heavymotor') data.type = 'BUS';
        else if (rawType === 'lightmotor') data.type = 'VAN';
      }
    }
    if (collName === 'vehicletrip') {
      if (!data.regno && data.vehicleregno) data.regno = data.vehicleregno;
      if (!data.vehicleregno && data.regno) data.vehicleregno = data.regno;
      if (!data.route && data.routename) data.route = data.routename;
      if (data.students !== undefined && data.studentsstrength === undefined) data.studentsstrength = data.students;
      if (data.strength !== undefined && data.fixedstrength === undefined) data.fixedstrength = data.strength;
      if (data.distanceinkms !== undefined && data.distance === undefined) data.distance = data.distanceinkms;

      if ((data.kms === undefined || data.kms === null || data.kms === '') && data.cmr !== undefined && data.omr !== undefined) {
        const diff = Number(data.cmr) - Number(data.omr);
        if (!isNaN(diff)) data.kms = diff;
      }
      const kmsNum = Number(data.kms);
      const distNum = Number(data.distance);
      if (!isNaN(kmsNum) && !isNaN(distNum) && kmsNum > distNum) {
        data.result = `exceed${kmsNum - distNum}`;
      }
    }

    const result = await db.collection(collName).insertOne(data);
    res.status(201).json({ success: true, id: result.insertedId, data });
  } catch (error) {
    console.error('Error creating vehicle record:', error);
    res.status(500).json({ message: error.message || 'Failed to create vehicle record' });
  }
};

exports.bulkCreateVehicleItems = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const subType = req.params.type || 'trips';
    const collName = getCollectionForType(subType);
    const records = req.body.records || (Array.isArray(req.body) ? req.body : []);

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No valid records array provided' });
    }

    const docsToInsert = records.map(r => {
      const item = { ...r, createdAt: new Date() };
      delete item._id;
      delete item.id;

      if (collName === 'vehicletrip') {
        item.society = item.society || '';
        item.branch = item.branch || '';
        item.regno = item.regno || item.vehicleregno || item.vno || item.busnumber || '';
        item.vehicleregno = item.regno;
        item.route = item.route || item.routename || '';
        item.date = item.date || '';
        item.capacity = item.capacity !== undefined ? item.capacity : '';
        item.studentsstrength = item.studentsstrength ?? item.students ?? '';
        item.fixedstrength = item.fixedstrength ?? item.strength ?? '';
        item.omr = item.omr !== undefined ? item.omr : '';
        item.cmr = item.cmr !== undefined ? item.cmr : '';
        item.distance = item.distance ?? item.distanceinkms ?? '';
        item.remarks = item.remarks || '';

        if ((item.kms === undefined || item.kms === null || item.kms === '') && item.cmr !== undefined && item.omr !== undefined) {
          const diff = Number(item.cmr) - Number(item.omr);
          if (!isNaN(diff)) item.kms = diff;
        }
        const kmsNum = Number(item.kms);
        const distNum = Number(item.distance);
        if (!isNaN(kmsNum) && !isNaN(distNum) && kmsNum > distNum) {
          item.result = `exceed${kmsNum - distNum}`;
        } else {
          item.result = item.result || '';
        }
      }

      return item;
    });

    const result = await db.collection(collName).insertMany(docsToInsert);
    res.status(201).json({
      success: true,
      count: result.insertedCount,
      message: `Successfully uploaded ${result.insertedCount} vehicle trip records`
    });
  } catch (error) {
    console.error('Error bulk uploading records:', error);
    res.status(500).json({ message: error.message || 'Bulk upload failed' });
  }
};

exports.updateVehicleItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collName = getCollectionForType(type);
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    if (collName === 'vehiclemake') {
      if (updateData.make && !updateData.name) updateData.name = updateData.make;
      if (updateData.name && !updateData.make) updateData.make = updateData.name;
    }
    if (collName === 'vehicleinfo') {
      if (!updateData.regno && updateData.vehicleregno) updateData.regno = updateData.vehicleregno;
      if (!updateData.vehicleregno && updateData.regno) updateData.vehicleregno = updateData.regno;
    }
    if (collName === 'vehicletrip') {
      if (!updateData.regno && updateData.vehicleregno) updateData.regno = updateData.vehicleregno;
      if (!updateData.vehicleregno && updateData.regno) updateData.vehicleregno = updateData.regno;
      if (!updateData.route && updateData.routename) updateData.route = updateData.routename;

      if ((updateData.kms === undefined || updateData.kms === null || updateData.kms === '') && updateData.cmr !== undefined && updateData.omr !== undefined) {
        const diff = Number(updateData.cmr) - Number(updateData.omr);
        if (!isNaN(diff)) updateData.kms = diff;
      }
      const kmsNum = Number(updateData.kms);
      const distNum = Number(updateData.distance);
      if (!isNaN(kmsNum) && !isNaN(distNum) && kmsNum > distNum) {
        updateData.result = `exceed${kmsNum - distNum}`;
      }
    }

    await db.collection(collName).updateOne(filter, { $set: updateData });
    res.json({ success: true, message: 'Vehicle record updated successfully' });
  } catch (error) {
    console.error('Error updating vehicle record:', error);
    res.status(500).json({ message: error.message || 'Failed to update vehicle record' });
  }
};

exports.deleteVehicleItem = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { type, id } = req.params;
    const collName = getCollectionForType(type);
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };

    await db.collection(collName).deleteOne(filter);
    res.json({ success: true, message: 'Vehicle record deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle record:', error);
    res.status(500).json({ message: 'Failed to delete vehicle record' });
  }
};

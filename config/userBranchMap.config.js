/**
 * Centralized Branch Permission & Mapping Configuration
 * 
 * Maps authenticated usernames to their authorized branch names.
 * Used across all vehicle document expiry APIs (RTA, Pollution, Fitness, Insurance, Road Tax, Road Permit).
 */

const allBranchUsers = ['vms', 'vmskkd', 'vc'];

const userBranchMap = {
  // Single branch mappings
  adcjkpur: ['JAGANNAICKPUR'],
  adcamp: ['AMALAPURAM'],
  adcbvrm: ['BHIMAVARAM'],
  adceluru: ['ELURU'],
  adcgmd: ['MAMIDADA'],
  adcgwk: ['GAJUWAKA'],
  adclakshya: ['LAKSHYA'],
  adcmdp: ['MANDAPETA'],
  adcnsp: ['NARASAPURAM'],
  adcpkl: ['PALAKOL'],
  adcptp: ['PITHAPURAM'],
  adcrjyd: ['RJY DEGREE'],
  adcsklm: ['SRIKAKULAM'],
  adctpg: ['TADEPALLIGUDEM'],
  adctuni: ['TUNI'],

  // Multi branch mappings
  adcengg: [
    'KKD ENGINEERING-AA',
    'KKD ENGINEERING-SES',
    'NON LOCAL ENGINEERING-AA',
    'NON LOCAL ENGINEERING-SES',
    'RJY ENGINEERING-AA',
    'RJY ENGINEERING-SES',
    'MANDAPETA ENGINEERING-AA',
    'MANDAPETA ENGINEERING-SES'
  ],
  adckkd: [
    'KKD DEGREE-AA',
    'KKD DEGREE-SES'
  ],
  srikkd: [
    'ADITYA PUBLIC SCHOOL (SRI NAGAR)-AA',
    'ADITYA PUBLIC SCHOOL (SRI NAGAR)-SES'
  ],
  ajckkd: [
    'KKD INTER-AA',
    'KKD INTER-SES'
  ],
  adcpdp: [
    'PEDDAPURAM-AA',
    'PEDDAPURAM-SES'
  ],
  adcmkvs: [
    'MARIKAVALASA-AA',
    'MARIKAVALASA-SES'
  ],
  adckkdiit: [
    'KKD IIT-SES',
    'KKD IIT-AA'
  ],
  adcadmin: [
    'SURAMPALEM-ENGINEERING-AA',
    'SURAMPALEM-ENGINEERING-SES'
  ],
  adcasn: [
    'ADITYA PUBLIC SCHOOL(ASHOK NAGAR)-AA',
    'ADITYA PUBLIC SCHOOL(ASHOK NAGAR)-SES'
  ],

  // Additional username mappings
  adcho: ['KAKINADA HEAD OFFICE'],
  adcats: ['ADITYA THAKSH SCHOOL-AA'],
  adcakp: ['ANAKAPALI-SES'],
  adcgdv: ['GUDIVADA'],
  adcndl: ['NIDADHAVOLU'],
  adcongole: ['ONGOLE'],
  adcvzm: ['VIZIANAGARAM'],
  adcmtm: ['MATCHILI PATNAM'],
  adcsnr: ['VIJAYAWADA'],
  aus: ['UNIVERSITY'],
  adctnk: ['TANUKU'],
  adchbg: ['HABSIGUDA'],
  adcbvrmd: ['ADITYA DEGREE COLLEGE(BHIMAVARAM)']
};

module.exports = {
  allBranchUsers,
  userBranchMap
};

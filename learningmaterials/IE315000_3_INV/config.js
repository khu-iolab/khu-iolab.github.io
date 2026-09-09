// config.js - ChillMart Electronics: Safety Inventory & Bullwhip Effect (IE315000 Lab #3)
//
// Parameter values below match the figures printed in index.html
// (Scenario tab, Parameters table, Scoring formula and Hints boxes).
// Values marked [SET] are deployment settings you must fill in.

const CFG = {

  // -- Google Apps Script Web App URL ----------------------------------------
  // [SET] Deploy gas_leaderboard.js as a GAS Web App
  //       (Execute as: Me, Who has access: Anyone -- anonymous access is
  //        required, otherwise fetch() gets a 403 login page), then paste
  //        the /exec deployment URL here.
  gasUrl: 'PASTE_YOUR_GAS_URL_HERE',

  // -- Simulation horizon ----------------------------------------------------
  T: 52,               // weeks (1 year)
  seed: 20260315,      // fixed seed -> identical demand series for every student

  // -- Customer demand: Normal(mu, sigma) per week ---------------------------
  mu: 100,
  sigma: 25,

  // -- Retailer (student controls ROP and Q) ---------------------------------
  leadTime: 3,         // weeks
  I0: 400,             // initial on-hand inventory (units)
  h: 2,                // $/unit/week holding
  K: 300,              // $/order
  p: 15,               // $/unit/week backlog penalty

  // -- Distributor (fixed policy, drives the bullwhip measurement) -----------
  distLeadTime: 4,     // weeks
  distI0: 600,
  distROP: 500,
  distQ: 600,

  // -- Scoring ---------------------------------------------------------------
  bullwhipWeight: 5000,   // $ per unit of (bullwhip ratio - 1)

  // -- Decision variable ranges ---------------------------------------------
  ropMin: 50, ropMax: 600,
  qMin:   50, qMax:   600,

  // -- Default slider positions ---------------------------------------------
  defaultROP: 250,
  defaultQ:   200,

  // -- Submission limits -----------------------------------------------------
  maxSubmits: 3,
  instructorId: '0000000000',      // [SET] instructor student-ID for testing
  instructorMaxSubmits: 999,

  // -- Tab lock --------------------------------------------------------------
  // The Answering tab stays locked until unlockDate, or until the password is
  // entered. NOTE: this password is checked in the browser (app.js), so it is
  // visible in page source -- treat it as a soft lock only.
  lock: {
    tabs: ['answering'],
    unlockDate: '2099-01-01',      // [SET] homework deadline, YYYY-MM-DD
    password: 'CHANGE-ME',         // [SET] change every semester
  },

  // -- Roster: student ID -> name (IE315000, 2026-1) -------------------------
  roster: {
    '2024103924': '강동희',
    '2024103927': '고민서',
    '2022103949': '고현우',
    '2022103950': '구지회',
    '2021103963': '김가연',
    '2021103764': '김남욱',
    '2022103953': '김도영',
    '2024103931': '김민균',
    '2024103932': '김상연',
    '2019100853': '김선준',
    '2024103941': '김윤성',
    '2022103960': '김재현',
    '2022103964': '김현수',
    '2022103965': '남재현',
    '2024110278': '남현식',
    '2024103949': '도하윤',
    '2023103932': '문지혁',
    '2022103967': '박신재',
    '2021110096': '박인준',
    '2022103968': '박진홍',
    '2020103932': '배상범',
    '2023105330': '배지훈',
    '2022103969': '백지형',
    '2022103970': '서상원',
    '2022103973': '서준혁',
    '2022103976': '신윤수',
    '2022103977': '신정윤',
    '2023103947': '여동현',
    '2022103982': '오윤제',
    '2021103993': '오정택',
    '2022103985': '왕희락',
    '2022103987': '유민상',
    '2020103947': '유준혁',
    '2023110284': '유한진',
    '2022103989': '윤빈',
    '2022103990': '윤서준',
    '2022103993': '이민서',
    '2024103966': '이성준',
    '2019100892': '이신형',
    '2024103969': '이요셉',
    '2024103970': '이윤수',
    '2024103971': '이은경',
    '2022104001': '이준호',
    '2021104005': '이지수',
    '2021104008': '이현담',
    '2024103976': '이혜린',
    '2021104009': '이호준',
    '2024110280': '이희만',
    '2021104010': '임동휘',
    '2024110281': '장아영',
    '2024103325': '장은서',
    '2024103982': '정상윤',
    '2019100902': '정용준',
    '2023110286': '정일호',
    '2022104009': '정재원',
    '2021104020': '조동현',
    '2020104488': '조유근',
    '2024103988': '조은아',
    '2022104011': '조형준',
    '2022104016': '최승현',
    '2022104019': '최지웅',
    '2024103991': '한유민',
    '2024103992': '한지원',
    '2022104021': '황성연',
    '0022277700': '정호영',
  },
};

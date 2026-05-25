// ============================================================
// AUTO REPAIR SHOP - Google Apps Script Backend
// เชื่อมต่อกับ Google Sheets เป็น Backend Database
// ============================================================

// ⚠️ ตั้งค่า SPREADSHEET_ID ของคุณที่นี่
const SPREADSHEET_ID = '1M3Boe7tFOJ2IKgjU8VEaz3GZpnVzajaDK6gIrBCE5W8';

// ชื่อ Sheet ทั้งหมด
const SHEETS = {
  JOB:           'JOB',
  CUSTOMER:      'CUSTOMER',
  CAR:           'CAR',
  REPAIR_DETAIL: 'REPAIR_DETAIL',
  REPAIR_ITEMS:  'REPAIR_ITEMS',
  PART_ITEMS:    'PART_ITEMS',
  DD_SETTINGS:   'DD_SETTINGS',
  USERS:         'USERS',
  LEAVE:         'LEAVE',
  HOLIDAYS:      'HOLIDAYS',
  OT:            'OT',
  PAYROLL:       'PAYROLL',
  PAYROLL_EOM:   'PAYROLL_EOM',
  PART_TRACK:    'PART_TRACK',
};

// Column ที่ต้องเก็บเป็น Plain Text (format '@') เพื่อไม่ให้ Sheets แปลงเป็น Number
const TEXT_COLUMNS = {
  JOB:           ['JobID','CustomerID','LicensePlate','ClaimNumber','PolicyNumber','BillingNumber'],
  CUSTOMER:      ['CustomerID','PhoneNumber','PostalCode'],
  CAR:           ['LicensePlate','ChassisNumber','Year'],
  REPAIR_DETAIL: ['DetailID','JobID'],
  REPAIR_ITEMS:  [],
  USERS:         ['UserID','LineUserID'],
  PART_ITEMS:    [],
  LEAVE:         ['LeaveID'],
  OT:            ['OTID'],
  PAYROLL:       ['PayrollID','UserID','PayDate','PeriodFrom','PeriodTo'],
  PAYROLL_EOM:   ['EomID','UserID','PayDate','PeriodFrom','PeriodTo','Water'],
  PART_TRACK:    ['PartTrackID','JobID','DetailID','LicensePlate','PartName','PartType'],
};

// ============================================================
// HTTP Handler
// ============================================================
function doGet(e) {
  // ถ้ามี ?action= → เป็น API call (JSON) ไม่ใช่ serve HTML
  if (e && e.parameter && e.parameter.action) {
    return handleRequest(e);
  }
  // serve settings.html เมื่อ ?page=settings
  if (e && e.parameter && e.parameter.page === 'settings') {
    return HtmlService.createHtmlOutputFromFile('settings')
      .setTitle('ตั้งค่า — ระบบจัดการอู่ซ่อมรถ')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // serve hr.html เมื่อ ?page=hr
  if (e && e.parameter && e.parameter.page === 'hr') {
    return HtmlService.createHtmlOutputFromFile('hr')
      .setTitle('HR — ระบบจัดการอู่ซ่อมรถ')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // serve Part.html เมื่อ ?page=part
  if (e && e.parameter && e.parameter.page === 'part') {
    return HtmlService.createHtmlOutputFromFile('Part')
      .setTitle('ติดตามอะไหล่ — ระบบจัดการอู่ซ่อมรถ')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // serve liff_leave.html เมื่อ ?page=liff_leave
  if (e && e.parameter && e.parameter.page === 'liff_leave') {
    return HtmlService.createHtmlOutputFromFile('liff_leave')
      .setTitle('ยื่นใบลา')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // default — serve index.html
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบจัดการอู่ซ่อมรถ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) { return handleRequest(e); }

// OPTIONS preflight สำหรับ CORS
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    let data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(ex) { data = {}; }
    }
    if (!data.action && e.parameter && e.parameter.action) {
      data = e.parameter;
    }

    let result;
    switch (data.action) {
      // JOB
      case 'getJobs':           result = getJobs(data); break;
      case 'getJob':            result = getJob(data.jobId); break;
      case 'createJob':         result = createJob(data); break;
      case 'updateJob':         result = updateJob(data); break;
      case 'deleteJob':         result = deleteJob(data.JobID || data.jobId); break;
      // CUSTOMER
      case 'getCustomers':      result = getCustomers(); break;
      case 'getCustomer':       result = getCustomer(data.CustomerID || data.customerId); break;
      case 'createCustomer':    result = createCustomer(data); break;
      case 'updateCustomer':    result = updateCustomer(data); break;
      case 'deleteCustomer':    result = deleteCustomer(data.CustomerID || data.customerId); break;
      case 'searchCustomer':    result = searchCustomer(data.query); break;
      // CAR
      case 'getCars':           result = getCars(); break;
      case 'getCar':            result = getCar(data.LicensePlate || data.licensePlate); break;
      case 'createCar':         result = createCar(data); break;
      case 'updateCar':         result = updateCar(data); break;
      case 'deleteCar':         result = deleteCar(data); break;
      case 'searchCar':         result = searchCar(data.query); break;
      case 'getCarsByCustomer': result = getCarsByCustomer(data.CustomerID || data.customerId); break;
      // REPAIR DETAIL
      case 'getRepairDetails':  result = getRepairDetails(data.jobId); break;
      case 'saveRepairDetails':      result = saveRepairDetails(data); break;
      case 'updateJobRepairItems':   result = updateJobRepairItems(data); break;
      // REPAIR ITEMS
      case 'getRepairItems':    result = getRepairItems(); break;
      case 'addRepairItem':     result = addRepairItem(data); break;
      case 'deleteRepairItem':  result = deleteRepairItem(data.ItemName, data.Category); break;
      // DASHBOARD — ถูกลบออกแล้ว
      // DD SETTINGS
      case 'getDDSettings':      result = getDDSettings(); break;
      case 'saveDDSettings':     result = saveDDSettings(data); break;
      // PART ITEMS
      case 'getPartItems':       result = getPartItems(); break;
      case 'migratePartItems':   result = migratePartItemsNow(); break;
      case 'addPartItem':        result = addPartItem(data); break;
      case 'removePartItem':     result = removePartItem(data.PartName, data.Zone); break;
      // USERS
      case 'getUsers':           result = getUsers(); break;
      case 'addUser':            result = addUser(data); break;
      case 'updateUser':         result = updateUser(data); break;
      case 'deleteUser':         result = deleteUser(data.UserID); break;
      case 'reorderUsers':       result = reorderUsers(data.order); break;
      // HR — LEAVE
      case 'getLeaves':          result = getLeaves(data); break;
      case 'addLeave':           result = addLeave(data); break;
      case 'deleteLeave':        result = deleteLeave(data.LeaveID); break;
      // HR — OT
      case 'getOTs':             result = getOTs(data); break;
      case 'addOT':              result = addOT(data); break;
      case 'updateOTStatus':     result = updateOTStatus(data); break;
      case 'deleteOT':           result = deleteOT(data.OTID); break;
      // PAYROLL
      case 'getPayroll':         result = getPayroll(data.month); break;
      case 'savePayroll':        result = savePayroll(data); break;
      case 'savePayrollBatch':   result = savePayrollBatch(data); break;
      case 'deletePayroll':      result = deletePayroll(data.PayrollID); break;
      case 'getPayrollEom':      result = getPayrollEom(data.month); break;
      case 'savePayrollEom':     result = savePayrollEom(data); break;
      case 'savePayrollEomBatch':result = savePayrollEomBatch(data); break;
      case 'deletePayrollEom':   result = deletePayrollEom(data.EomID); break;
      case 'getPayslip':         result = getPayslip(data); break;
      // ARCHIVE
      case 'getArchiveJobs':     result = getArchiveJobs(data.yearPrefix); break;
      case 'listArchiveSheets':  result = listArchiveSheets(); break;
      // PART TRACK
      case 'importPartFromJob':  result = importPartFromJob(data); break;
      case 'importSinglePart':   result = importSinglePart(data); break;
      case 'getPartTracks':      result = getPartTracks(data); break;
      case 'updatePartTrack':    result = updatePartTrack(data); break;
      case 'deletePartTrack':    result = deletePartTrack(data.PartTrackID); break;
      default:
        result = { success: false, error: 'Unknown action: ' + data.action };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }

  return output;
}

// ============================================================
// CACHE HELPERS — CacheService (server-side, shared across users)
// ============================================================
const CACHE_TTL = 21600; // 6 ชั่วโมง (วินาที) — ค่าสูงสุดของ CacheService

function cacheGet(key) {
  try {
    const raw = CacheService.getScriptCache().get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) {
    return null;
  }
}

function cachePut(key, data) {
  try {
    const json = JSON.stringify(data);
    if (json.length > 100000) {
      // ข้อมูลใหญ่เกิน 100KB — ไม่ cache ป้องกัน error
      Logger.log('cachePut skip (too large): ' + key + ' = ' + json.length + ' bytes');
      return;
    }
    CacheService.getScriptCache().put(key, json, CACHE_TTL);
  } catch(e) {
    Logger.log('cachePut error: ' + e);
  }
}

function cacheRemove(key) {
  try {
    CacheService.getScriptCache().remove(key);
  } catch(e) {}
}

// ============================================================
// HELPERS
// ============================================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    JOB: ['JobID','CustomerID','LicensePlate','ContactDate','AppointmentDate',
          'RepairStartDate','ExpectedCompletionDate','ActualCompletionDate',
          'StartBillingDate','BillingSubmissionDate','PaymentAppointmentDate','ActualPaymentDate',
          'JobStatus','InsuranceCompany','InsuranceCase','ClaimNumber','PolicyNumber',
          'ReferredBy','Inspector','WorkLoad','StatusExtra','DescriptionWork',
          'InsuranceLaborCost','InsurancePartsCost','ExcessCost','FiftyCost',
          'AdditionalLaborCost','AdditionalPartsCost','AdditionalSpecialCost',
          'DepositCost','DepositDate','DepositMethod','DepositReceiver',
          'MidPaymentCost','MidPaymentDate','MidPaymentMethod','MidPaymentReceiver',
          'FinalPaymentCost','FinalPaymentDate','FinalPaymentMethod','FinalPaymentReceiver',
          'DepositBillingDate','BillingNumber',
          'InsurancePriceOfferer','InsurancePriceChecker','AdditionalPriceOfferer','AdditionalPriceChecker',
          'FinalInsLabor','FinalInsParts','FinalExcess','FinalFifty','FinalInsChecker',
          'FinalAddLabor','FinalAddParts','FinalAddSpecial','FinalAddChecker',
          'FinalRechecker','PaymentChannels','DepositPaymentChannels',
          'IsInsured','CreatedAt','UpdatedAt'],
    CUSTOMER: ['CustomerID','FullName','FirstName','LastName','PhoneNumber',
               'Sex','DateOfBirth','Address','SubDistrict','District','Province','PostalCode','CreatedAt'],
    CAR: ['LicensePlate','ProvinceID','Brand','Model','Year','Color','ChassisNumber','CreatedAt'],
    REPAIR_DETAIL: ['DetailID','JobID','RepairItemName','DamageDescription',
                    'RepairDescription','SparePartName','GenuineParts','StoredParts',
                    'OrderedParts','UsedParts','OrderedFinish','CreatedAt'],
    REPAIR_ITEMS: ['ItemName','Category','CreatedAt'],
    DD_SETTINGS:  ['Key','Value','UpdatedAt'],
    USERS:        ['UserID','Name','Role','Status','LineUserID','CreatedAt','PayType','DailyRate','FixWeek','SpecialRate','DeductPerDay','SSO','EmpCode','MonthBonus','SortOrder'],
    PART_ITEMS:   ['PartName','Zone','CreatedAt'],
    PART_TRACK:   ['PartTrackID','JobID','DetailID','LicensePlate','PartName','PartType','Status','OrderedDate','ReceivedDate','Supplier','Price','Note','UpdatedAt','CreatedAt'],
  };

  if (!headers[name]) return;

  const h = headers[name];
  sheet.appendRow(h);
  sheet.getRange(1, 1, 1, h.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // กำหนด TEXT format ให้ column ที่ต้องการ (ทำทั้ง column ยกเว้น row 1)
  const textCols = TEXT_COLUMNS[name] || [];
  textCols.forEach(colName => {
    const colIdx = h.indexOf(colName);
    if (colIdx >= 0) {
      // กำหนด format ตั้งแต่ row 2 ถึง row 1000
      sheet.getRange(2, colIdx + 1, 1000, 1).setNumberFormat('@');
    }
  });
}

// เขียนค่าลง cell พร้อม format Plain Text สำหรับ column ที่กำหนด
function setTextValue(sheet, row, col, value, sheetName) {
  const cell = sheet.getRange(row, col);
  const textCols = TEXT_COLUMNS[sheetName] || [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colName = headers[col - 1];
  if (textCols.includes(colName)) {
    cell.setNumberFormat('@');
  }
  cell.setValue(value);
}

// แปลง sheet rows เป็น objects พร้อม normalize TEXT fields
// Date columns ที่ต้องแปลงเป็น YYYY-MM-DD string
const DATE_COLUMNS = [
  'ContactDate','AppointmentDate','RepairStartDate','ExpectedCompletionDate',
  'ActualCompletionDate','StartBillingDate','BillingSubmissionDate',
  'PaymentAppointmentDate','ActualPaymentDate','DepositBillingDate',
  'DepositDate','MidPaymentDate','FinalPaymentDate',
  'DateOfBirth','CreatedAt','UpdatedAt'
];

function sheetToObjects(sheet, sheetName) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const textCols = TEXT_COLUMNS[sheetName] || [];

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      // แปลง Date object จาก Google Sheets → YYYY-MM-DD string
      if (val instanceof Date && !isNaN(val.getTime())) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      // strip apostrophe จากข้อมูลเก่า + force string สำหรับ TEXT columns
      if (textCols.includes(h)) {
        val = String(val === null || val === undefined ? '' : val).replace(/^'+/, '').trim();
      }
      obj[h] = val;
    });
    return obj;
  });
}

function generateId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
}

function now() {
  return new Date().toISOString();
}

// ============================================================
// JOB CRUD
// ============================================================
function getJobs(params) {
  const sheet = getSheet(SHEETS.JOB);
  let jobs = sheetToObjects(sheet, 'JOB');
  if (params && params.status) {
    jobs = jobs.filter(j => j.JobStatus === params.status);
  }
  if (params && params.dateFrom) {
    jobs = jobs.filter(j => j.ContactDate >= params.dateFrom);
  }
  if (params && params.dateTo) {
    jobs = jobs.filter(j => j.ContactDate <= params.dateTo);
  }

  // JOIN: ดึง FullName จาก CUSTOMER, Color+Brand+Model จาก CAR
  try {
    const customers = sheetToObjects(getSheet(SHEETS.CUSTOMER), 'CUSTOMER');
    const cars      = sheetToObjects(getSheet(SHEETS.CAR), 'CAR');

    // Build lookup maps
    const custMap = {};
    customers.forEach(c => { if (c.CustomerID) custMap[String(c.CustomerID).trim()] = c; });
    const carMap = {};
    cars.forEach(c => { if (c.LicensePlate) carMap[String(c.LicensePlate).trim()] = c; });

    jobs = jobs.map(j => {
      const cust = custMap[String(j.CustomerID || '').trim()];
      const car  = carMap[String(j.LicensePlate || '').trim()];
      return Object.assign({}, j, {
        FullName:  cust ? (cust.FullName  || '') : '',
        Color:     car  ? (car.Color      || '') : '',
        Brand:     car  ? (car.Brand      || '') : '',
        Model:     car  ? (car.Model      || '') : '',
      });
    });
  } catch(e) {
    // ถ้า JOIN ล้มเหลวก็ส่งข้อมูลเดิมไปก่อน
    Logger.log('getJobs JOIN error: ' + e);
  }

  return { success: true, data: jobs };
}

function getJob(jobId) {
  const sheet = getSheet(SHEETS.JOB);
  const jobs = sheetToObjects(sheet, 'JOB');
  const job = jobs.find(j => j.JobID === String(jobId || ''));
  if (!job) return { success: false, error: 'Job not found' };
  return { success: true, data: job };
}

function createJob(data) {
  const sheet = getSheet(SHEETS.JOB);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const timestamp = now();

  // JobID ต้องเป็นตัวเลข 6 หลัก
  const jobId = String(data.JobID || '').trim();
  if (!jobId) return { success: false, error: 'กรุณาระบุ Job ID' };
  if (!/^\d{6}$/.test(jobId)) return { success: false, error: 'Job ID ต้องเป็นตัวเลข 6 หลักเท่านั้น' };

  // ตรวจ duplicate
  const jobIdIdx = headers.indexOf('JobID');
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][jobIdIdx]).replace(/^'+/, '') === jobId) {
      return { success: false, error: 'Job ID "' + jobId + '" มีอยู่ในระบบแล้ว' };
    }
  }

  const newRowNum = allData.length + 1;
  const textCols = TEXT_COLUMNS['JOB'];

  // เขียน row ทีละ cell เพื่อกำหนด format ถูกต้อง
  headers.forEach((h, i) => {
    let val;
    if (h === 'JobID')      val = jobId;
    else if (h === 'CustomerID') val = String(data.CustomerID || '');
    else if (h === 'JobStatus')  val = data.JobStatus || 'เข้ามาติดต่อ';
    else if (h === 'CreatedAt')  val = timestamp;
    else if (h === 'UpdatedAt')  val = timestamp;
    else val = data[h] !== undefined ? data[h] : '';

    const cell = sheet.getRange(newRowNum, i + 1);
    if (textCols.includes(h)) cell.setNumberFormat('@');
    cell.setValue(val);
  });

  // บันทึก Repair Details
  let repairDetails = data.repairDetails || [];
  if (typeof repairDetails === 'string') { try { repairDetails = JSON.parse(repairDetails); } catch(e) { repairDetails = []; } }
  if (Array.isArray(repairDetails) && repairDetails.length > 0) {
    saveRepairDetails({ jobId: jobId, details: repairDetails });
  }

  return { success: true, data: { JobID: jobId, CustomerID: data.CustomerID } };
}

function updateJob(data) {
  const sheet = getSheet(SHEETS.JOB);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const jobIdIdx = headers.indexOf('JobID');
  const textCols = TEXT_COLUMNS['JOB'];

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][jobIdIdx]).replace(/^'+/, '') === String(data.JobID)) {
      headers.forEach((h, col) => {
        if (h === 'JobID' || h === 'CreatedAt') return;
        if (h === 'UpdatedAt') {
          sheet.getRange(i + 1, col + 1).setValue(now());
          return;
        }
        if (data[h] !== undefined) {
          const cell = sheet.getRange(i + 1, col + 1);
          if (textCols.includes(h)) cell.setNumberFormat('@');
          cell.setValue(data[h]);
        }
      });

      if (data.repairDetails !== undefined) {
        let rd = data.repairDetails;
        if (typeof rd === 'string') { try { rd = JSON.parse(rd); } catch(e) { rd = []; } }
        if (Array.isArray(rd)) {
          deleteRepairDetailsByJob(data.JobID);
          saveRepairDetails({ jobId: data.JobID, details: rd });
        }
      }

      // ตรวจว่า status ใหม่เป็น archive status ไหม → ย้ายไป archive sheet
      if (data.JobStatus && isArchiveStatus(data.JobStatus)) {
        const archiveResult = archiveJob(data.JobID);
        if (archiveResult.success) return { success: true, archived: true };
      }

      return { success: true };
    }
  }
  return { success: false, error: 'Job not found' };
}

// ============================================================
// ARCHIVE JOB — ย้าย job ไป JOB_ARCHIVE_xx ตาม prefix ปีของ JobID
// ============================================================
function isArchiveStatus(status) {
  // อ่าน statusArchive จาก DD_SETTINGS — รองรับ double-encoded JSON
  try {
    const sheet = getSheet(SHEETS.DD_SETTINGS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === 'statusArchive') {
        let raw = String(data[i][1] || '').trim();
        let val;
        try {
          val = JSON.parse(raw);
          // double-encoded: parse ซ้ำถ้าได้ string
          if (typeof val === 'string') val = JSON.parse(val);
        } catch(e2) { return false; }
        return !!(val && val[status]);
      }
    }
  } catch(e) {}
  return false;
}

function archiveJob(jobId) {
  try {
    const srcSheet = getSheet(SHEETS.JOB);
    const allData = srcSheet.getDataRange().getValues();
    const headers = allData[0];
    const jobIdIdx = headers.indexOf('JobID');

    // หา row ของ job นี้
    let rowIdx = -1;
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][jobIdIdx]).replace(/^'+/, '') === String(jobId)) {
        rowIdx = i; break;
      }
    }
    if (rowIdx < 0) return { success: false, error: 'Job not found' };

    // ดึง 2 ตัวแรกของ JobID เป็น year prefix เช่น "690001" → "69"
    const yearPrefix = String(jobId).replace(/^'+/, '').substring(0, 2);
    const archiveSheetName = 'JOB_ARCHIVE_' + yearPrefix;

    // สร้าง archive sheet ถ้ายังไม่มี
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let archiveSheet = ss.getSheetByName(archiveSheetName);
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet(archiveSheetName);
      // copy headers
      archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // copy row ไป archive sheet
    const rowData = allData[rowIdx];
    archiveSheet.appendRow(rowData);

    // ลบ row ออกจาก JOB sheet
    srcSheet.deleteRow(rowIdx + 1);

    // archive repair details ด้วย
    try {
      const rdSheet = getSheet(SHEETS.REPAIR_DETAIL);
      const rdData = rdSheet.getDataRange().getValues();
      const rdHeaders = rdData[0];
      const rdJobIdIdx = rdHeaders.indexOf('JobID');

      const archiveRdSheetName = 'REPAIR_ARCHIVE_' + yearPrefix;
      let archiveRdSheet = ss.getSheetByName(archiveRdSheetName);
      if (!archiveRdSheet) {
        archiveRdSheet = ss.insertSheet(archiveRdSheetName);
        archiveRdSheet.getRange(1, 1, 1, rdHeaders.length).setValues([rdHeaders]);
      }

      // หา rows ที่ match JobID แล้ว copy + ลบ (วนจากท้ายเพื่อ delete ไม่ผิด index)
      for (let i = rdData.length - 1; i >= 1; i--) {
        if (String(rdData[i][rdJobIdIdx]).replace(/^'+/, '') === String(jobId)) {
          archiveRdSheet.appendRow(rdData[i]);
          rdSheet.deleteRow(i + 1);
        }
      }
    } catch(e) {
      Logger.log('archiveJob repair detail error: ' + e);
    }

    return { success: true, archivedTo: archiveSheetName };
  } catch(e) {
    Logger.log('archiveJob error: ' + e);
    return { success: false, error: String(e) };
  }
}

function deleteJob(jobId) {
  const sheet = getSheet(SHEETS.JOB);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const jobIdIdx = headers.indexOf('JobID');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][jobIdIdx]).replace(/^'+/, '') === String(jobId)) {
      sheet.deleteRow(i + 1);
      deleteRepairDetailsByJob(jobId);
      return { success: true };
    }
  }
  return { success: false, error: 'Job not found' };
}

// ============================================================
// CUSTOMER CRUD
// ============================================================
function getCustomers() {
  const sheet = getSheet(SHEETS.CUSTOMER);
  return { success: true, data: sheetToObjects(sheet, 'CUSTOMER') };
}

function getCustomer(customerId) {
  const sheet = getSheet(SHEETS.CUSTOMER);
  const id = String(customerId || '').replace(/^'+/, '').trim();
  const customers = sheetToObjects(sheet, 'CUSTOMER');
  const c = customers.find(c => c.CustomerID === id);
  return c ? { success: true, data: c } : { success: false, error: 'Customer not found' };
}

function createCustomer(data) {
  const sheet = getSheet(SHEETS.CUSTOMER);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const timestamp = now();

  const customerId = String(data.CustomerID || generateId('CUST')).replace(/^'+/, '').trim();

  // ตรวจ duplicate
  const idIdx = headers.indexOf('CustomerID');
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]).replace(/^'+/, '').trim() === customerId) {
      return { success: false, error: 'มีเลขบัตร/Passport นี้ในระบบแล้ว' };
    }
  }

  const newRowNum = allData.length + 1;
  const textCols = TEXT_COLUMNS['CUSTOMER'];

  headers.forEach((h, i) => {
    let val;
    if (h === 'CustomerID') val = customerId;
    else if (h === 'CreatedAt') val = timestamp;
    else if (h === 'PhoneNumber') {
      // เก็บเป็น digits ล้วน ไม่มี dash ไม่มี apostrophe
      val = String(data[h] || '').replace(/\D/g, '');
    }
    else val = data[h] !== undefined ? data[h] : '';

    const cell = sheet.getRange(newRowNum, i + 1);
    if (textCols.includes(h)) cell.setNumberFormat('@');
    cell.setValue(val);
  });

  return { success: true, data: { CustomerID: customerId } };
}

function updateCustomer(data) {
  const sheet = getSheet(SHEETS.CUSTOMER);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('CustomerID');
  const textCols = TEXT_COLUMNS['CUSTOMER'];
  const searchId = String(data.OrigCustomerID || data.CustomerID || '').replace(/^'+/, '').trim();

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]).replace(/^'+/, '').trim() === searchId) {
      headers.forEach((h, col) => {
        if (h === 'CreatedAt') return;
        if (data[h] !== undefined) {
          let val = data[h];
          if (h === 'PhoneNumber') val = String(val).replace(/\D/g, '');
          const cell = sheet.getRange(i + 1, col + 1);
          if (textCols.includes(h)) cell.setNumberFormat('@');
          cell.setValue(val);
        }
      });
      return { success: true };
    }
  }
  return { success: false, error: 'Customer not found' };
}

function deleteCustomer(customerId) {
  const sheet = getSheet(SHEETS.CUSTOMER);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('CustomerID');
  const id = String(customerId || '').replace(/^'+/, '').trim();

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]).replace(/^'+/, '').trim() === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Customer not found' };
}

function searchCustomer(query) {
  const sheet = getSheet(SHEETS.CUSTOMER);
  const customers = sheetToObjects(sheet, 'CUSTOMER'); // already normalized
  const q = String(query || '').toLowerCase().trim();
  if (!q) return { success: true, data: [] };

  const results = customers.filter(c => {
    const id    = String(c.CustomerID  || '').toLowerCase();
    const name  = String(c.FullName    || '').toLowerCase();
    const phone = String(c.PhoneNumber || '').replace(/\D/g, '');
    const qDigits = q.replace(/\D/g, '');
    return id.includes(q) || name.includes(q) || (qDigits && phone.includes(qDigits));
  });

  return { success: true, data: results.slice(0, 20) };
}

// ============================================================
// CAR CRUD
// ============================================================
function getCars() {
  const sheet = getSheet(SHEETS.CAR);
  return { success: true, data: sheetToObjects(sheet, 'CAR') };
}

function getCar(licensePlate) {
  const sheet = getSheet(SHEETS.CAR);
  const plate = String(licensePlate || '').trim();
  const cars = sheetToObjects(sheet, 'CAR');
  const car = cars.find(c => c.LicensePlate === plate);
  return car ? { success: true, data: car } : { success: false, error: 'Car not found' };
}

function createCar(data) {
  const sheet = getSheet(SHEETS.CAR);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const timestamp = now();
  const newRowNum = allData.length + 1;
  const textCols = TEXT_COLUMNS['CAR'];

  headers.forEach((h, i) => {
    let val;
    if (h === 'CreatedAt') val = timestamp;
    else val = data[h] !== undefined ? data[h] : '';

    const cell = sheet.getRange(newRowNum, i + 1);
    if (textCols.includes(h)) cell.setNumberFormat('@');
    cell.setValue(val);
  });

  return { success: true, data: { LicensePlate: data.LicensePlate } };
}

function updateCar(data) {
  const sheet = getSheet(SHEETS.CAR);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('LicensePlate');
  const textCols = TEXT_COLUMNS['CAR'];
  const plate = String(data.LicensePlate || '').trim();

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]).trim() === plate) {
      headers.forEach((h, col) => {
        if (h === 'LicensePlate' || h === 'CreatedAt') return;
        if (data[h] !== undefined) {
          const cell = sheet.getRange(i + 1, col + 1);
          if (textCols.includes(h)) cell.setNumberFormat('@');
          cell.setValue(data[h]);
        }
      });
      return { success: true };
    }
  }
  return { success: false, error: 'Car not found' };
}

function deleteCar(data) {
  const sheet = getSheet(SHEETS.CAR);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('LicensePlate');
  const plate = String(data.LicensePlate || data.licensePlate || '').trim();

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]).trim() === plate) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Car not found' };
}

function searchCar(query) {
  const sheet = getSheet(SHEETS.CAR);
  const cars = sheetToObjects(sheet, 'CAR');
  const q = String(query || '').toLowerCase().trim();
  if (!q) return { success: true, data: [] };
  const results = cars.filter(c =>
    String(c.LicensePlate || '').toLowerCase().includes(q) ||
    String(c.Brand || '').toLowerCase().includes(q) ||
    String(c.Model || '').toLowerCase().includes(q)
  );
  return { success: true, data: results.slice(0, 20) };
}

// ดึงรถทั้งหมดที่ผูกกับ CustomerID (จาก JOB sheet)
// แก้ไข: ดึงรถจาก CAR sheet โดยตรงผ่าน CustomerID ที่ผูกกับ Job
// รองรับกรณีลูกค้าเพิ่งเพิ่มรถแต่ยังไม่มี Job
function getCarsByCustomer(customerId) {
  if (!customerId) return { success: false, error: 'No CustomerID' };
  const cleanId = String(customerId).replace(/^'+/, '').trim();

  const carSheet = getSheet(SHEETS.CAR);
  const allCars = sheetToObjects(carSheet, 'CAR');

  // รวม plates จาก CAR sheet ที่มี CustomerID ตรงกัน (ถ้ามี field นั้น)
  const platesFromCar = allCars
    .filter(c => c.CustomerID && String(c.CustomerID).replace(/^'+/, '').trim() === cleanId)
    .map(c => String(c.LicensePlate).trim());

  // รวม plates จาก JOB sheet (สำหรับรถเก่าที่เคยซ่อมแต่ไม่มี CustomerID ใน CAR)
  const jobSheet = getSheet(SHEETS.JOB);
  const jobs = sheetToObjects(jobSheet, 'JOB');
  const platesFromJob = jobs
    .filter(j => j.CustomerID === cleanId && j.LicensePlate)
    .map(j => String(j.LicensePlate).trim());

  // รวม unique plates จากทั้งสองแหล่ง
  const plates = [...new Set([...platesFromCar, ...platesFromJob])];

  if (plates.length === 0) {
    return { success: true, data: [] };
  }

  const result = plates.map(plate => {
    const car = allCars.find(c => c.LicensePlate === plate);
    return car || { LicensePlate: plate, Brand: '', Model: '', ProvinceID: '', Year: '', Color: '' };
  });

  return { success: true, data: result };
}

// ============================================================
// REPAIR DETAIL CRUD
// ============================================================
function getRepairDetails(jobId) {
  const sheet = getSheet(SHEETS.REPAIR_DETAIL);
  const details = sheetToObjects(sheet, 'REPAIR_DETAIL');
  return { success: true, data: details.filter(d => d.JobID === String(jobId || '')) };
}

function saveRepairDetails(data) {
  const sheet = getSheet(SHEETS.REPAIR_DETAIL);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const timestamp = now();
  const textCols = TEXT_COLUMNS['REPAIR_DETAIL'];

  let details = data.details || [];
  if (typeof details === 'string') { try { details = JSON.parse(details); } catch(e) { details = []; } }
  if (!Array.isArray(details)) details = [];

  details.forEach(detail => {
    const detailId = generateId('DTL');
    const newRowNum = sheet.getLastRow() + 1;
    headers.forEach((h, i) => {
      let val;
      if (h === 'DetailID')  val = detailId;
      else if (h === 'JobID')    val = String(data.jobId || '');
      else if (h === 'CreatedAt') val = timestamp;
      else val = detail[h] || '';

      const cell = sheet.getRange(newRowNum, i + 1);
      if (textCols.includes(h)) cell.setNumberFormat('@');
      cell.setValue(val);
    });
  });

  return { success: true };
}

function updateJobRepairItems(data) {
  // ลบ rows เดิมของ JobID แล้ว insert ใหม่
  // รับ: { JobID, RepairItems: JSON string ของ array rows }
  const jobId = String(data.JobID || data.jobId || '');
  if (!jobId) return { success: false, error: 'ไม่มี JobID' };

  let rows = data.RepairItems || [];
  if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch(e) { rows = []; } }
  if (!Array.isArray(rows)) rows = [];

  // ลบ rows เดิมของ job นี้
  deleteRepairDetailsByJob(jobId);

  // insert ใหม่ โดย map fields จาก jdRsRows → REPAIR_DETAIL columns
  const sheet = getSheet(SHEETS.REPAIR_DETAIL);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const timestamp = now();
  const textCols = TEXT_COLUMNS['REPAIR_DETAIL'] || [];

  rows.forEach(function(r) {
    const detailId = generateId('DTL');
    const newRowNum = sheet.getLastRow() + 1;
    headers.forEach(function(h, i) {
      let val = '';
      if      (h === 'DetailID')          val = detailId;
      else if (h === 'JobID')             val = jobId;
      else if (h === 'RepairItemName')    val = r.item   || '';
      else if (h === 'DamageDescription') val = r.damage || '';
      else if (h === 'RepairDescription') val = r.method || '';
      else if (h === 'SparePartName')     val = r.detail || '';
      else if (h === 'Zone')              val = r.zone   || '';
      else if (h === 'CreatedAt')         val = timestamp;
      else val = r[h] || '';

      const cell = sheet.getRange(newRowNum, i + 1);
      if (textCols.includes(h)) cell.setNumberFormat('@');
      cell.setValue(val);
    });
  });

  return { success: true, count: rows.length };
}

function deleteRepairDetailsByJob(jobId) {
  const sheet = getSheet(SHEETS.REPAIR_DETAIL);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const jobIdIdx = headers.indexOf('JobID');
  const id = String(jobId || '');

  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][jobIdIdx]).replace(/^'+/, '') === id) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ============================================================
// REPAIR ITEMS
// ============================================================
// ============================================================
// REPAIR ITEMS — รายการซ่อม (ผูก Zone เดียว ด้วย Category)
// ============================================================
function getRepairItems() {
  const cached = cacheGet('repairItems');
  if (cached) return { success: true, data: cached };

  const sheet = getSheet(SHEETS.REPAIR_ITEMS);
  const items = sheetToObjects(sheet, 'REPAIR_ITEMS');
  cachePut('repairItems', items);
  return { success: true, data: items };
}

function addRepairItem(data) {
  const sheet = getSheet(SHEETS.REPAIR_ITEMS);
  const itemName = String(data.ItemName || '').trim();
  const category = String(data.Category || '').trim();
  if (!itemName) return { success: false, error: 'ItemName required' };
  sheet.appendRow([itemName, category, now()]);
  cacheRemove('repairItems'); // clear cache หลัง write
  return { success: true };
}

function deleteRepairItem(itemName, category) {
  const sheet = getSheet(SHEETS.REPAIR_ITEMS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const nameIdx = headers.indexOf('ItemName');
  const catIdx  = headers.indexOf('Category');
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][nameIdx]) === String(itemName) &&
        String(allData[i][catIdx])  === String(category)) {
      sheet.deleteRow(i + 1);
      cacheRemove('repairItems'); // clear cache หลัง delete
      return { success: true };
    }
  }
  return { success: false, error: 'Item not found' };
}

// ============================================================
// PART ITEMS — อะไหล่ (ผูก Zone เดียว)
// ============================================================
function migratePartItemsNow() {
  const sheet = getSheet(SHEETS.PART_ITEMS);
  _migratePartItemsSheet(sheet);
  const items = sheetToObjects(sheet, 'PART_ITEMS');
  return { success: true, migrated: true, count: items.length, data: items };
}

function _migratePartItemsSheet(sheet) {
  // ถ้า sheet มี header เก่า (PartID, Zones, IsActive) → migrate ให้เป็น schema ใหม่
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hasOldSchema = headers.indexOf('PartID') >= 0 || headers.indexOf('Zones') >= 0 || headers.indexOf('IsActive') >= 0;
  if (!hasOldSchema) return; // schema ใหม่แล้ว ไม่ต้อง migrate

  // อ่านข้อมูลทั้งหมด
  const allData = sheet.getDataRange().getValues();
  const oldHeaders = allData[0];
  const nameIdx   = oldHeaders.indexOf('PartName');
  const zonesIdx  = oldHeaders.indexOf('Zones');
  const activeIdx = oldHeaders.indexOf('IsActive');
  const createdIdx = oldHeaders.indexOf('CreatedAt');

  // แปลงแถวเป็น { PartName, Zone, CreatedAt }
  const rows = [];
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (activeIdx >= 0 && String(row[activeIdx]).toLowerCase() === 'false') continue; // skip inactive
    const partName = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
    if (!partName) continue;
    const createdAt = createdIdx >= 0 ? row[createdIdx] : '';
    // Zones เก่าอาจเป็น JSON array string หรือ comma-separated
    let zonesRaw = zonesIdx >= 0 ? String(row[zonesIdx] || '') : '';
    let zoneList = [];
    try { zoneList = JSON.parse(zonesRaw); } catch(e) {
      zoneList = zonesRaw ? zonesRaw.split(',').map(z => z.trim()).filter(Boolean) : [];
    }
    if (!zoneList.length) {
      rows.push([partName, '', createdAt]);
    } else {
      zoneList.forEach(z => rows.push([partName, z, createdAt]));
    }
  }

  // ล้าง sheet และเขียนใหม่
  sheet.clearContents();
  sheet.appendRow(['PartName', 'Zone', 'CreatedAt']);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  if (rows.length) sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  Logger.log('Migrated PART_ITEMS: ' + rows.length + ' rows');
}

function getPartItems() {
  const cached = cacheGet('partItems');
  if (cached) return { success: true, data: cached };

  const sheet = getSheet(SHEETS.PART_ITEMS);
  _migratePartItemsSheet(sheet); // auto-migrate schema เก่า → ใหม่
  const items = sheetToObjects(sheet, 'PART_ITEMS');
  cachePut('partItems', items);
  return { success: true, data: items };
}

function addPartItem(data) {
  const sheet = getSheet(SHEETS.PART_ITEMS);
  const partName = String(data.PartName || '').trim();
  const zone     = String(data.Zone || '').trim();
  if (!partName) return { success: false, error: 'PartName required' };
  sheet.appendRow([partName, zone, now()]);
  cacheRemove('partItems'); // clear cache หลัง write
  return { success: true };
}

function removePartItem(partName, zone) {
  const sheet = getSheet(SHEETS.PART_ITEMS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const nameIdx = headers.indexOf('PartName');
  const zoneIdx = headers.indexOf('Zone');
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][nameIdx]) === String(partName) &&
        String(allData[i][zoneIdx])  === String(zone)) {
      sheet.deleteRow(i + 1);
      cacheRemove('partItems'); // clear cache หลัง delete
      return { success: true };
    }
  }
  return { success: false, error: 'Part not found' };
}

// ============================================================
// DD SETTINGS — เก็บ dropdown lists ทั้งหมดใน Google Sheet
// ============================================================
function getDDSettings() {
  const cached = cacheGet('ddSettings');
  if (cached) return { success: true, data: cached };

  const sheet = getSheet(SHEETS.DD_SETTINGS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: true, data: {} };
  const result = {};
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0] || '').trim();
    let val = String(data[i][1] || '').trim();
    if (!key) continue;
    try {
      let parsed = JSON.parse(val);
      // ถ้า parse แล้วยังได้ string (double-encoded) ให้ parse อีกรอบ
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch(e2) {}
      }
      result[key] = parsed;
    } catch(e) {
      result[key] = val ? val.split('|') : [];
    }
  }
  cachePut('ddSettings', result);
  return { success: true, data: result };
}

function saveDDSettings(data) {
  // data.key = string key, data.value = array (JSON)
  const key   = String(data.key   || '').trim();
  const value = data.value; // array or object
  if (!key) return { success: false, error: 'No key provided' };

  const sheet = getSheet(SHEETS.DD_SETTINGS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0]; // ['Key','Value','UpdatedAt']
  const keyIdx  = 0;
  const valIdx  = 1;
  const tsIdx   = 2;
  const timestamp = now();
  // value อาจถูก JSON.stringify มาแล้วจาก apiCall (GET params) — ถ้าเป็น string ที่ parse ได้ให้ใช้ตรงๆ
  // ถ้า parse ไม่ได้ (plain string เช่น 'a|b|c') ให้ stringify ปกติ
  let jsonVal;
  if (typeof value === 'string') {
    try { JSON.parse(value); jsonVal = value; } // เป็น valid JSON string อยู่แล้ว
    catch(e) { jsonVal = JSON.stringify(value); } // plain string → wrap ด้วย quotes
  } else {
    jsonVal = JSON.stringify(value);
  }

  // หาว่า key มีอยู่แล้วไหม
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][keyIdx]).trim() === key) {
      sheet.getRange(i + 1, valIdx + 1).setValue(jsonVal);
      sheet.getRange(i + 1, tsIdx  + 1).setValue(timestamp);
      cacheRemove('ddSettings'); // clear cache หลัง save
      return { success: true };
    }
  }
  // ไม่มี → append row ใหม่
  sheet.appendRow([key, jsonVal, timestamp]);
  cacheRemove('ddSettings'); // clear cache หลัง save
  return { success: true };
}

// ============================================================
// USERS CRUD
// ============================================================
function getUsers() {
  const cached = cacheGet('users');
  if (cached) return { success: true, data: cached };

  const sheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(sheet, 'USERS');
  // sort ตาม SortOrder ถ้ามี ไม่มีให้ไปท้ายสุด
  users.sort((a, b) => {
    const sa = (a.SortOrder !== '' && a.SortOrder !== undefined) ? Number(a.SortOrder) : 9999;
    const sb = (b.SortOrder !== '' && b.SortOrder !== undefined) ? Number(b.SortOrder) : 9999;
    return sa - sb;
  });
  cachePut('users', users);
  return { success: true, data: users };
}

function addUser(data) {
  const sheet = getSheet(SHEETS.USERS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const timestamp = now();
  const userId = generateId('USR');
  const textCols = TEXT_COLUMNS['USERS'];
  const newRowNum = allData.length + 1;

  headers.forEach((h, i) => {
    let val;
    if (h === 'UserID')       val = userId;
    else if (h === 'Name')       val = String(data.Name || '').trim();
    else if (h === 'Role')       val = data.Role || 'user';
    else if (h === 'Status')     val = data.Status || 'active';
    else if (h === 'LineUserID')    val = String(data.LineUserID || '').trim();
    else if (h === 'CreatedAt')     val = timestamp;
    else if (h === 'PayType')       val = data.PayType || 'none';
    else if (h === 'DailyRate')     val = Number(data.DailyRate) || 0;
    else if (h === 'FixWeek')       val = Number(data.FixWeek) || 0;
    else if (h === 'SpecialRate')   val = Number(data.SpecialRate) || 0;
    else if (h === 'DeductPerDay')  val = Number(data.DeductPerDay) || 0;
    else if (h === 'SSO')           val = Number(data.SSO) || 0;
    else if (h === 'EmpCode')       val = String(data.EmpCode || '').trim();
    else if (h === 'MonthBonus')    val = Number(data.MonthBonus) || 0;
    else val = '';

    const cell = sheet.getRange(newRowNum, i + 1);
    if (textCols.includes(h)) cell.setNumberFormat('@');
    cell.setValue(val);
  });

  cacheRemove('users'); // clear cache หลัง add
  return { success: true, data: { UserID: userId } };
}

function updateUser(data) {
  const sheet = getSheet(SHEETS.USERS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('UserID');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]).trim() === String(data.UserID || '').trim()) {
      headers.forEach((h, col) => {
        if (h === 'UserID' || h === 'CreatedAt') return;
        if (data[h] !== undefined) {
          sheet.getRange(i + 1, col + 1).setValue(data[h]);
        }
      });
      cacheRemove('users'); // clear cache หลัง update
      return { success: true };
    }
  }
  return { success: false, error: 'User not found' };
}

function deleteUser(userId) {
  const sheet = getSheet(SHEETS.USERS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('UserID');
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]).trim() === String(userId || '').trim()) {
      const statusIdx = headers.indexOf('Status');
      if (statusIdx >= 0) {
        sheet.getRange(i + 1, statusIdx + 1).setValue('inactive');
      }
      cacheRemove('users'); // clear cache หลัง delete
      return { success: true };
    }
  }
  return { success: false, error: 'User not found' };
}

// เรียงลำดับ users ตาม array of UserIDs ที่ส่งมา
function reorderUsers(order) {
  try {
    if (!order || !Array.isArray(order)) return { success: false, error: 'invalid order' };
    const sheet = getSheet(SHEETS.USERS);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIdx = headers.indexOf('UserID');
    const sortIdx = headers.indexOf('SortOrder');
    if (sortIdx < 0) return { success: false, error: 'SortOrder column not found' };

    // สร้าง map UserID → rowIndex (1-based)
    const rowMap = {};
    for (let i = 1; i < allData.length; i++) {
      rowMap[String(allData[i][idIdx]).trim()] = i + 1;
    }
    // เขียน SortOrder ทีละ row — ใช้ batch setValues ต่อแถว
    order.forEach((uid, idx) => {
      const rowNum = rowMap[String(uid)];
      if (rowNum) sheet.getRange(rowNum, sortIdx + 1).setValue(idx + 1);
    });
    cacheRemove('users');
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================================
// BLOCK 8 SUPPORT — Archive History API
// ============================================================

function listArchiveSheets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const archiveYears = [];
    sheets.forEach(function(s) {
      const name = s.getName();
      if (/^JOB_ARCHIVE_\d+$/.test(name)) {
        const yearPrefix = name.replace('JOB_ARCHIVE_', '');
        archiveYears.push(yearPrefix);
      }
    });
    archiveYears.sort();
    return { success: true, data: archiveYears };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function getArchiveJobs(yearPrefix) {
  try {
    if (!yearPrefix) return { success: false, error: 'yearPrefix required' };

    const archiveSheetName = 'JOB_ARCHIVE_' + yearPrefix;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const archiveSheet = ss.getSheetByName(archiveSheetName);
    if (!archiveSheet) {
      return { success: true, data: [], message: 'No archive for year ' + yearPrefix };
    }

    const jobData = archiveSheet.getDataRange().getValues();
    if (jobData.length < 2) return { success: true, data: [] };

    const jobHeaders = jobData[0].map(String);

    const custSheet = ss.getSheetByName('CUSTOMER');
    const carSheet  = ss.getSheetByName('CAR');
    const custMap = {};
    const carMap  = {};

    if (custSheet) {
      const cd = custSheet.getDataRange().getValues();
      const ch = cd[0].map(String);
      const cidx   = ch.indexOf('CustomerID');
      const cName  = ch.indexOf('FullName');
      const cPhone = ch.indexOf('PhoneNumber');
      for (let i = 1; i < cd.length; i++) {
        const id = String(cd[i][cidx] || '').trim();
        if (id) custMap[id] = { FullName: String(cd[i][cName] || ''), PhoneNumber: String(cd[i][cPhone] || '') };
      }
    }

    if (carSheet) {
      const rd = carSheet.getDataRange().getValues();
      const rh = rd[0].map(String);
      const lpIdx    = rh.indexOf('LicensePlate');
      const brandIdx = rh.indexOf('Brand');
      const modelIdx = rh.indexOf('Model');
      const typeIdx  = rh.indexOf('CarType');
      const colorIdx = rh.indexOf('Color');
      for (let i = 1; i < rd.length; i++) {
        const lp = String(rd[i][lpIdx] || '').trim();
        if (lp) carMap[lp] = {
          Brand:   String(rd[i][brandIdx] || ''),
          Model:   String(rd[i][modelIdx] || ''),
          CarType: String(rd[i][typeIdx]  || ''),
          Color:   String(rd[i][colorIdx] || '')
        };
      }
    }

    const jobs = [];
    for (let i = 1; i < jobData.length; i++) {
      const row = jobData[i];
      if (!row[0]) continue;
      const obj = {};
      jobHeaders.forEach(function(h, idx) { obj[h] = row[idx]; });

      const custId = String(obj.CustomerID || '').trim();
      if (custMap[custId]) {
        obj.FullName     = custMap[custId].FullName;
        obj.PhoneNumber  = custMap[custId].PhoneNumber;
      }
      const lp = String(obj.LicensePlate || '').trim();
      if (carMap[lp]) {
        obj.Brand   = carMap[lp].Brand;
        obj.Model   = carMap[lp].Model;
        obj.CarType = carMap[lp].CarType;
        obj.Color   = carMap[lp].Color;
      }

      DATE_COLUMNS.forEach(function(col) {
        if (obj[col] && obj[col] instanceof Date) {
          obj[col] = Utilities.formatDate(obj[col], Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
      });

      jobs.push(obj);
    }

    return { success: true, data: jobs, yearPrefix: yearPrefix, sheetName: archiveSheetName };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// HR — LEAVE (ใบลา)
// ============================================================
const LEAVE_HEADERS = ['LeaveID','UserID','Name','Date','Days','Session','Reason','CreatedAt'];
const OT_HEADERS    = ['OTID','UserID','Name','OTDate','Hours','Reason','Status','ApprovedBy','Note','CreatedAt'];


function ensureHRSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss.getSheetByName(SHEETS.LEAVE)) {
    const s = ss.insertSheet(SHEETS.LEAVE);
    s.appendRow(LEAVE_HEADERS);
    s.getRange(1,1,1,LEAVE_HEADERS.length).setFontWeight('bold');
    s.setFrozenRows(1);
    s.getRange(2,1,1000,1).setNumberFormat('@'); // LeaveID plain text
  }
  if (!ss.getSheetByName(SHEETS.OT)) {
    const s = ss.insertSheet(SHEETS.OT);
    s.appendRow(OT_HEADERS);
    s.getRange(1,1,1,OT_HEADERS.length).setFontWeight('bold');
    s.setFrozenRows(1);
    s.getRange(2,1,1000,1).setNumberFormat('@'); // OTID plain text
  }
}

function getLeaves(data) {
  try {
    ensureHRSheets();
    const sheet = getSheet(SHEETS.LEAVE);
    const rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, data: [] };
    const headers = rows[0].map(String);
    const tz = Session.getScriptTimeZone();
    const results = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        const v = rows[i][idx];
        obj[h] = (v instanceof Date) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v === null || v === undefined ? '' : v);
      });
      if (data && data.UserID && obj.UserID !== String(data.UserID)) continue;
      // Status field removed — no filter needed
      results.push(obj);
    }
    return { success: true, data: results };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addLeave(data) {
  try {
    ensureHRSheets();
    const sheet = getSheet(SHEETS.LEAVE);
    const now = new Date();
    const tz  = Session.getScriptTimeZone();
    const id  = 'LV' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmss');
    const row = LEAVE_HEADERS.map(h => {
      if (h === 'LeaveID')   return id;
      if (h === 'CreatedAt') return Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');
      return data[h] !== undefined ? String(data[h]) : '';
    });
    sheet.appendRow(row);
    return { success: true, LeaveID: id };
  } catch(e) { return { success: false, error: e.toString() }; }
}


function deleteLeave(leaveId) {
  try {
    const sheet = getSheet(SHEETS.LEAVE);
    const rows  = sheet.getDataRange().getValues();
    const idIdx = rows[0].map(String).indexOf('LeaveID');
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][idIdx]) === String(leaveId)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'LeaveID not found' };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================================
// HR — OT (โอที)
// ============================================================
function getOTs(data) {
  try {
    ensureHRSheets();
    const sheet = getSheet(SHEETS.OT);
    const rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, data: [] };
    const headers = rows[0].map(String);
    const tz = Session.getScriptTimeZone();
    const results = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        const v = rows[i][idx];
        obj[h] = (v instanceof Date) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v === null || v === undefined ? '' : v);
      });
      if (data && data.UserID && obj.UserID !== String(data.UserID)) continue;
      if (data && data.Status && obj.Status !== String(data.Status)) continue;
      results.push(obj);
    }
    return { success: true, data: results };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function addOT(data) {
  try {
    ensureHRSheets();
    const sheet = getSheet(SHEETS.OT);
    const now = new Date();
    const tz  = Session.getScriptTimeZone();
    const id  = 'OT' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmss');
    const row = OT_HEADERS.map(h => {
      if (h === 'OTID')      return id;
      if (h === 'Status')    return 'pending';
      if (h === 'CreatedAt') return Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');
      return data[h] !== undefined ? String(data[h]) : '';
    });
    sheet.appendRow(row);
    return { success: true, OTID: id };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function updateOTStatus(data) {
  try {
    const sheet = getSheet(SHEETS.OT);
    const rows  = sheet.getDataRange().getValues();
    const headers = rows[0].map(String);
    const idIdx = headers.indexOf('OTID');
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][idIdx]) === String(data.OTID)) {
        if (data.Status)     sheet.getRange(i+1, headers.indexOf('Status')+1).setValue(data.Status);
        if (data.ApprovedBy) sheet.getRange(i+1, headers.indexOf('ApprovedBy')+1).setValue(data.ApprovedBy);
        if (data.Note)       sheet.getRange(i+1, headers.indexOf('Note')+1).setValue(data.Note);
        return { success: true };
      }
    }
    return { success: false, error: 'OTID not found' };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function deleteOT(otId) {
  try {
    const sheet = getSheet(SHEETS.OT);
    const rows  = sheet.getDataRange().getValues();
    const idIdx = rows[0].map(String).indexOf('OTID');
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][idIdx]) === String(otId)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'OTID not found' };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================================
// PAYROLL — Weekly Input
// ============================================================

// headers: PayrollID | UserID | Month | Week | PayDate | PeriodFrom | PeriodTo
//          | Days | OTHours | BonusExtra | Water | SSO | DeductNow | Penalty

function getPayroll(month) {
  try {
    const sheet = getSheet(SHEETS.PAYROLL);
    const rows = sheetToObjects(sheet, 'PAYROLL');
    const filtered = month ? rows.filter(r => r.Month === month) : rows;
    return { success: true, data: filtered };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function savePayroll(data) {
  try {
    const sheet = getSheet(SHEETS.PAYROLL);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIdx = headers.indexOf('PayrollID');
    const textCols = TEXT_COLUMNS['PAYROLL'] || [];

    // derive Month จาก PayDate อัตโนมัติ (ไม่ขึ้นกับ month picker ฝั่ง UI)
    const derivedMonth = data.PayDate ? String(data.PayDate).substring(0, 7) : String(data.Month || '');

    function buildRow(payrollId) {
      return headers.map(h => {
        if      (h === 'PayrollID')  return payrollId;
        else if (h === 'UserID')     return String(data.UserID || '');
        else if (h === 'Month')      return derivedMonth;
        else if (h === 'Week')       return Number(data.Week) || 0;
        else if (h === 'PayDate')    return String(data.PayDate || '');
        else if (h === 'PeriodFrom') return String(data.PeriodFrom || '');
        else if (h === 'PeriodTo')   return String(data.PeriodTo || '');
        else if (h === 'Days')       return Number(data.Days) || 0;
        else if (h === 'OTHours')    return Number(data.OTHours) || 0;
        else if (h === 'BonusExtra') return Number(data.BonusExtra) || 0;
        else if (h === 'Water')      return Number(data.Water) || 0;
        else if (h === 'SSO')        return Number(data.SSO) || 0;
        else if (h === 'DeductNow')  return Number(data.DeductNow) || 0;
        else if (h === 'Penalty')    return Number(data.Penalty) || 0;
        else if (h === 'DayRate')    return Number(data.DayRate) || 0;
        else if (h === 'SpRate')     return Number(data.SpRate) || 0;
        else return '';
      });
    }

    // update row ด้วย setValues batch (1 API call)
    if (data.PayrollID) {
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][idIdx]) === String(data.PayrollID)) {
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([buildRow(data.PayrollID)]);
          cacheRemove('payroll_' + data.Month);
          return { success: true, data: { PayrollID: data.PayrollID } };
        }
      }
    }

    // insert ใหม่ด้วย setValues batch (1 API call)
    const payrollId = generateId('PAY');
    const newRowNum = allData.length + 1;
    // set text format เฉพาะ text columns
    textCols.forEach(col => {
      const ci = headers.indexOf(col);
      if (ci >= 0) sheet.getRange(newRowNum, ci + 1).setNumberFormat('@');
    });
    sheet.getRange(newRowNum, 1, 1, headers.length).setValues([buildRow(payrollId)]);
    cacheRemove('payroll_' + data.Month);
    return { success: true, data: { PayrollID: payrollId } };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function deletePayroll(payrollId) {
  try {
    const sheet = getSheet(SHEETS.PAYROLL);
    const rows = sheet.getDataRange().getValues();
    const idIdx = rows[0].indexOf('PayrollID');
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][idIdx]) === String(payrollId)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'PayrollID not found' };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================================
// PAYROLL BATCH — บันทึกหลายคนใน 1 request (กันปัญหา GAS lock)
// ============================================================

// รับ: { week: N, rows: [ { PayrollID?, UserID, PayDate, PeriodFrom, PeriodTo,
//   Days, OTHours, BonusExtra, Water, SSO, DeductNow, Penalty, DayRate, SpRate } ] }
// คืน: { success, saved: [ { UserID, PayrollID } ] }
function savePayrollBatch(data) {
  try {
    const sheet = getSheet(SHEETS.PAYROLL);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIdx = headers.indexOf('PayrollID');
    const textCols = TEXT_COLUMNS['PAYROLL'] || [];
    const week = Number(data.week) || 0;

    let rows = data.rows || [];
    if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch(e) { rows = []; } }
    if (!Array.isArray(rows) || rows.length === 0) return { success: false, error: 'no rows' };

    const saved = [];

    // แยก rows เป็น updates (มี PayrollID) กับ inserts (ไม่มี)
    const toUpdate = [];
    const toInsert = [];
    rows.forEach(function(r) {
      // ถ้า row มี _week ให้ใช้ค่านั้น (กรณี saveMonthlyWeek ส่ง week 0 กับ week 1 รวมกัน)
      const rowWeek = (r._week !== undefined && r._week !== null) ? Number(r._week) : week;
      // derive Month: ถ้า PayDate ว่าง (week 0) ให้ใช้ _refPayDate แทน
      const refDate = r.PayDate || r._refPayDate || '';
      const derivedMonth = refDate ? String(refDate).substring(0, 7) : '';
      const buildRowArr = function(pid) {
        return headers.map(function(h) {
          if      (h === 'PayrollID')  return pid;
          else if (h === 'UserID')     return String(r.UserID || '');
          else if (h === 'Month')      return derivedMonth;
          else if (h === 'Week')       return rowWeek;
          else if (h === 'PayDate')    return String(r.PayDate || '');
          else if (h === 'PeriodFrom') return String(r.PeriodFrom || '');
          else if (h === 'PeriodTo')   return String(r.PeriodTo || '');
          else if (h === 'Days')       return Number(r.Days) || 0;
          else if (h === 'OTHours')    return Number(r.OTHours) || 0;
          else if (h === 'BonusExtra') return Number(r.BonusExtra) || 0;
          else if (h === 'Water')      return Number(r.Water) || 0;
          else if (h === 'SSO')        return Number(r.SSO) || 0;
          else if (h === 'DeductNow')  return Number(r.DeductNow) || 0;
          else if (h === 'Penalty')    return Number(r.Penalty) || 0;
          else if (h === 'DayRate')    return Number(r.DayRate) || 0;
          else if (h === 'SpRate')     return Number(r.SpRate) || 0;
          else return '';
        });
      };
      if (r.PayrollID) {
        toUpdate.push({ pid: r.PayrollID, uid: r.UserID, buildRowArr: buildRowArr });
      } else {
        toInsert.push({ uid: r.UserID, buildRowArr: buildRowArr });
      }
    });

    // UPDATE — วน allData หา row ที่ตรง PayrollID แล้ว setValues ทีละ row
    // (update ไม่สามารถ batch เป็น setValues เดียวได้เพราะ row ไม่ติดกัน)
    toUpdate.forEach(function(u) {
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][idIdx]) === String(u.pid)) {
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([u.buildRowArr(u.pid)]);
          saved.push({ UserID: u.uid, PayrollID: u.pid });
          break;
        }
      }
    });

    // INSERT — สร้าง array of arrays แล้ว setValues ครั้งเดียว
    if (toInsert.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      // set text format ก่อน insert
      textCols.forEach(function(col) {
        const ci = headers.indexOf(col);
        if (ci >= 0) sheet.getRange(startRow, ci + 1, toInsert.length, 1).setNumberFormat('@');
      });
      const insertRows = toInsert.map(function(ins) {
        const pid = generateId('PAY');
        saved.push({ UserID: ins.uid, PayrollID: pid });
        return ins.buildRowArr(pid);
      });
      sheet.getRange(startRow, 1, insertRows.length, headers.length).setValues(insertRows);
    }

    return { success: true, saved: saved };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// รับ: { rows: [ { EomID?, UserID, Month, PayDate, PeriodFrom, PeriodTo,
//   Bonus, Water, DeductLump, SSO } ] }
function savePayrollEomBatch(data) {
  try {
    const sheet = getSheet(SHEETS.PAYROLL_EOM);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIdx = headers.indexOf('EomID');
    const textCols = TEXT_COLUMNS['PAYROLL_EOM'] || [];

    let rows = data.rows || [];
    if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch(e) { rows = []; } }
    if (!Array.isArray(rows) || rows.length === 0) return { success: false, error: 'no rows' };

    const saved = [];
    const toUpdate = [];
    const toInsert = [];

    rows.forEach(function(r) {
      const derivedMonth = r.PayDate ? String(r.PayDate).substring(0, 7) : String(r.Month || '');
      const buildRowArr = function(eid) {
        return headers.map(function(h) {
          if      (h === 'EomID')      return eid;
          else if (h === 'UserID')     return String(r.UserID || '');
          else if (h === 'Month')      return derivedMonth;
          else if (h === 'PayDate')    return String(r.PayDate || '');
          else if (h === 'PeriodFrom') return String(r.PeriodFrom || '');
          else if (h === 'PeriodTo')   return String(r.PeriodTo || '');
          else if (h === 'Bonus')      return Number(r.Bonus) || 0;
          else if (h === 'Water')      return Number(r.Water) || 0;
          else if (h === 'DeductLump') return Number(r.DeductLump) || 0;
          else if (h === 'SSO')        return Number(r.SSO) || 0;
          else return '';
        });
      };
      if (r.EomID) {
        toUpdate.push({ eid: r.EomID, uid: r.UserID, buildRowArr: buildRowArr });
      } else {
        toInsert.push({ uid: r.UserID, buildRowArr: buildRowArr });
      }
    });

    toUpdate.forEach(function(u) {
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][idIdx]) === String(u.eid)) {
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([u.buildRowArr(u.eid)]);
          saved.push({ UserID: u.uid, EomID: u.eid });
          break;
        }
      }
    });

    if (toInsert.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      textCols.forEach(function(col) {
        const ci = headers.indexOf(col);
        if (ci >= 0) sheet.getRange(startRow, ci + 1, toInsert.length, 1).setNumberFormat('@');
      });
      const insertRows = toInsert.map(function(ins) {
        const eid = generateId('EOM');
        saved.push({ UserID: ins.uid, EomID: eid });
        return ins.buildRowArr(eid);
      });
      sheet.getRange(startRow, 1, insertRows.length, headers.length).setValues(insertRows);
    }

    return { success: true, saved: saved };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// PAYROLL_EOM — Month-end Settlement
// ============================================================

// headers: EomID | UserID | Month | PayDate | PeriodFrom | PeriodTo
//          | Bonus | DeductLump | SSO

function getPayrollEom(month) {
  try {
    const sheet = getSheet(SHEETS.PAYROLL_EOM);
    const rows = sheetToObjects(sheet, 'PAYROLL_EOM');
    const filtered = month ? rows.filter(r => r.Month === month) : rows;
    return { success: true, data: filtered };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function savePayrollEom(data) {
  try {
    const sheet = getSheet(SHEETS.PAYROLL_EOM);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIdx = headers.indexOf('EomID');
    const textCols = TEXT_COLUMNS['PAYROLL_EOM'] || [];

    function buildRow(eomId) {
      return headers.map(h => {
        if      (h === 'EomID')      return eomId;
        else if (h === 'UserID')     return String(data.UserID || '');
        else if (h === 'Month')      return String(data.Month || '');
        else if (h === 'PayDate')    return String(data.PayDate || '');
        else if (h === 'PeriodFrom') return String(data.PeriodFrom || '');
        else if (h === 'PeriodTo')   return String(data.PeriodTo || '');
        else if (h === 'Bonus')      return Number(data.Bonus) || 0;
        else if (h === 'Water')      return Number(data.Water) || 0;
        else if (h === 'DeductLump') return Number(data.DeductLump) || 0;
        else if (h === 'SSO')        return Number(data.SSO) || 0;
        else return '';
      });
    }

    // update ด้วย setValues batch (1 API call)
    if (data.EomID) {
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][idIdx]) === String(data.EomID)) {
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([buildRow(data.EomID)]);
          return { success: true, data: { EomID: data.EomID } };
        }
      }
    }

    // insert ใหม่ด้วย setValues batch (1 API call)
    const eomId = generateId('EOM');
    const newRowNum = allData.length + 1;
    textCols.forEach(col => {
      const ci = headers.indexOf(col);
      if (ci >= 0) sheet.getRange(newRowNum, ci + 1).setNumberFormat('@');
    });
    sheet.getRange(newRowNum, 1, 1, headers.length).setValues([buildRow(eomId)]);
    return { success: true, data: { EomID: eomId } };
  } catch(e) { return { success: false, error: e.toString() }; }
}

function deletePayrollEom(eomId) {
  try {
    const sheet = getSheet(SHEETS.PAYROLL_EOM);
    const rows = sheet.getDataRange().getValues();
    const idIdx = rows[0].indexOf('EomID');
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][idIdx]) === String(eomId)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'EomID not found' };
  } catch(e) { return { success: false, error: e.toString() }; }
}

// ============================================================
// PAYSLIP — ดึงข้อมูลสลีปเงินเดือน
// ============================================================
// ============================================================
// PART TRACK — ระบบติดตามอะไหล่
// ============================================================
// columns: PartTrackID | JobID | DetailID | LicensePlate | PartName | PartType
//          | Status | OrderedDate | ReceivedDate | Supplier | Price | Note
//          | UpdatedAt | CreatedAt
// Status values: รอสั่ง | สั่งแล้ว | รับแล้ว | ใช้แล้ว

// นำเข้าอะไหล่จาก REPAIR_DETAIL ของ JobID ที่ระบุ
// รับ: { jobId } หรือ { jobIds: [...] }
// คืน: { success, imported: N, skipped: N }
function importPartFromJob(data) {
  try {
    let jobIds = [];
    if (data.jobIds && Array.isArray(data.jobIds)) {
      jobIds = data.jobIds.map(String);
    } else if (data.jobId) {
      jobIds = [String(data.jobId)];
    }
    if (jobIds.length === 0) return { success: false, error: 'ต้องระบุ jobId หรือ jobIds' };

    // โหลด REPAIR_DETAIL
    const rdSheet = getSheet(SHEETS.REPAIR_DETAIL);
    const rdRows = sheetToObjects(rdSheet, 'REPAIR_DETAIL');

    // โหลด JOB เพื่อดึง LicensePlate
    const jobSheet = getSheet(SHEETS.JOB);
    const jobRows = sheetToObjects(jobSheet, 'JOB');
    const jobMap = {};
    jobRows.forEach(j => { if (j.JobID) jobMap[String(j.JobID).trim()] = j; });

    // โหลด PART_TRACK เพื่อตรวจ duplicate (ตาม DetailID)
    const ptSheet = getSheet(SHEETS.PART_TRACK);
    const ptRows = sheetToObjects(ptSheet, 'PART_TRACK');
    const existingDetailIds = new Set(ptRows.map(r => String(r.DetailID || '').trim()).filter(Boolean));

    const ptHeaders = ptSheet.getRange(1, 1, 1, ptSheet.getLastColumn()).getValues()[0];
    const textCols = TEXT_COLUMNS['PART_TRACK'] || [];
    const timestamp = now();

    let imported = 0, skipped = 0;
    const rowsToInsert = [];

    jobIds.forEach(jobId => {
      const job = jobMap[jobId] || {};
      const plate = String(job.LicensePlate || '');
      const details = rdRows.filter(r => String(r.JobID || '').trim() === jobId);

      details.forEach(detail => {
        const detailId = String(detail.DetailID || '').trim();
        // ตรวจ duplicate
        if (detailId && existingDetailIds.has(detailId)) { skipped++; return; }

        // แยก SparePartName ออกเป็น parts (อาจมีหลายรายการคั่นด้วย comma หรือ newline)
        const rawParts = String(detail.SparePartName || '').trim();
        if (!rawParts) { skipped++; return; }

        // รองรับทั้ง comma, newline, semicolon
        const partNames = rawParts.split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean);

        partNames.forEach((partName, idx) => {
          const trackId = generateId('PT');
          const partType = rawParts.includes(partName) && (
            String(detail.GenuineParts||'').toLowerCase().includes(partName.toLowerCase()) ? 'แท้' :
            String(detail.StoredParts||'').toLowerCase().includes(partName.toLowerCase()) ? 'ในคลัง' :
            String(detail.OrderedParts||'').toLowerCase().includes(partName.toLowerCase()) ? 'สั่ง' : 'ทั่วไป'
          ) || 'ทั่วไป';

          const rowArr = ptHeaders.map(h => {
            if      (h === 'PartTrackID')   return trackId;
            else if (h === 'JobID')         return jobId;
            else if (h === 'DetailID')      return idx === 0 ? detailId : ''; // ผูก DetailID แค่ตัวแรก
            else if (h === 'LicensePlate')  return plate;
            else if (h === 'PartName')      return partName;
            else if (h === 'PartType')      return partType;
            else if (h === 'Status')        return 'รอสั่ง';
            else if (h === 'OrderedDate')   return '';
            else if (h === 'ReceivedDate')  return '';
            else if (h === 'Supplier')      return '';
            else if (h === 'Price')         return 0;
            else if (h === 'Note')          return String(detail.RepairDescription || '');
            else if (h === 'UpdatedAt')     return timestamp;
            else if (h === 'CreatedAt')     return timestamp;
            else return '';
          });
          rowsToInsert.push(rowArr);
          if (idx === 0) existingDetailIds.add(detailId); // mark ว่า import แล้ว
          imported++;
        });
      });
    });

    if (rowsToInsert.length > 0) {
      const startRow = ptSheet.getLastRow() + 1;
      // set text format
      textCols.forEach(col => {
        const ci = ptHeaders.indexOf(col);
        if (ci >= 0) ptSheet.getRange(startRow, ci + 1, rowsToInsert.length, 1).setNumberFormat('@');
      });
      ptSheet.getRange(startRow, 1, rowsToInsert.length, ptHeaders.length).setValues(rowsToInsert);
    }

    return { success: true, imported, skipped };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// นำเข้าอะไหล่ทีละชิ้นจากหน้า Job โดยตรง
// รับ: { jobId, partName, partType?, licensePlate? }
function importSinglePart(data) {
  try {
    const jobId = String(data.jobId || '').trim();
    const partName = String(data.partName || '').trim();
    if (!jobId || !partName) return { success: false, error: 'jobId และ partName จำเป็น' };

    const sheet = getSheet(SHEETS.PART_TRACK);
    const ptRows = sheetToObjects(sheet, 'PART_TRACK');

    // ตรวจ duplicate ตาม jobId + partName
    const dup = ptRows.find(r =>
      String(r.JobID || '').trim() === jobId &&
      String(r.PartName || '').trim() === partName
    );
    if (dup) return { success: true, skipped: true };

    // หา LicensePlate จาก JOB ถ้าไม่ได้ส่งมา
    let plate = String(data.licensePlate || '').trim();
    if (!plate) {
      const jobSheet = getSheet(SHEETS.JOB);
      const jobs = sheetToObjects(jobSheet, 'JOB');
      const job = jobs.find(j => String(j.JobID || '').trim() === jobId);
      if (job) plate = String(job.LicensePlate || '');
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const textCols = TEXT_COLUMNS['PART_TRACK'] || [];
    const timestamp = now();
    const trackId = generateId('PT');

    const rowArr = headers.map(h => {
      if      (h === 'PartTrackID')  return trackId;
      else if (h === 'JobID')        return jobId;
      else if (h === 'DetailID')     return '';
      else if (h === 'LicensePlate') return plate;
      else if (h === 'PartName')     return partName;
      else if (h === 'PartType')     return String(data.partType || 'ทั่วไป');
      else if (h === 'Status')       return 'รอสั่ง';
      else if (h === 'Price')        return 0;
      else if (h === 'UpdatedAt')    return timestamp;
      else if (h === 'CreatedAt')    return timestamp;
      else return '';
    });

    const startRow = sheet.getLastRow() + 1;
    textCols.forEach(col => {
      const ci = headers.indexOf(col);
      if (ci >= 0) sheet.getRange(startRow, ci + 1).setNumberFormat('@');
    });
    sheet.getRange(startRow, 1, 1, headers.length).setValues([rowArr]);

    return { success: true, skipped: false, PartTrackID: trackId };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ดึงรายการ PART_TRACK ทั้งหมด หรือ filter ตาม jobId / status
function getPartTracks(data) {
  try {
    const sheet = getSheet(SHEETS.PART_TRACK);
    let rows = sheetToObjects(sheet, 'PART_TRACK');
    if (data && data.jobId) {
      rows = rows.filter(r => String(r.JobID || '').trim() === String(data.jobId));
    }
    if (data && data.status) {
      rows = rows.filter(r => String(r.Status || '') === String(data.status));
    }
    if (data && data.licensePlate) {
      rows = rows.filter(r => String(r.LicensePlate || '').trim() === String(data.licensePlate).trim());
    }
    // sort ล่าสุดก่อน
    rows.sort((a, b) => String(b.CreatedAt || '').localeCompare(String(a.CreatedAt || '')));
    return { success: true, data: rows };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// อัพเดทข้อมูล PART_TRACK (Status, OrderedDate, ReceivedDate, Supplier, Price, Note)
// รับ: { PartTrackID, Status?, OrderedDate?, ReceivedDate?, Supplier?, Price?, Note? }
function updatePartTrack(data) {
  try {
    const sheet = getSheet(SHEETS.PART_TRACK);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIdx = headers.indexOf('PartTrackID');
    const pid = String(data.PartTrackID || '').trim();
    if (!pid) return { success: false, error: 'PartTrackID required' };

    const updatable = ['Status','OrderedDate','ReceivedDate','Supplier','Price','Note','UpdatedAt'];

    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][idIdx]).trim() === pid) {
        headers.forEach((h, col) => {
          if (h === 'UpdatedAt') {
            sheet.getRange(i + 1, col + 1).setValue(now());
          } else if (updatable.includes(h) && data[h] !== undefined) {
            sheet.getRange(i + 1, col + 1).setValue(data[h]);
          }
        });
        return { success: true };
      }
    }
    return { success: false, error: 'PartTrackID not found' };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

// ลบ PART_TRACK row
function deletePartTrack(partTrackId) {
  try {
    const sheet = getSheet(SHEETS.PART_TRACK);
    const allData = sheet.getDataRange().getValues();
    const idIdx = allData[0].indexOf('PartTrackID');
    const pid = String(partTrackId || '').trim();
    for (let i = allData.length - 1; i >= 1; i--) {
      if (String(allData[i][idIdx]).trim() === pid) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'PartTrackID not found' };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function getPayslip(data) {
  try {
    const userId = String(data.UserID || '');
    const month  = String(data.month  || '');
    if (!userId || !month) return { success: false, error: 'UserID and month required' };

    // ดึง USERS เพื่อเอา info พนักงาน
    const users = getUsers();
    const emp = (users.data || []).find(u => String(u.UserID) === userId);
    if (!emp) return { success: false, error: 'User not found' };

    // ดึง PAYROLL rows ของ UserID + Month
    const prSheet = getSheet(SHEETS.PAYROLL);
    const prRows  = sheetToObjects(prSheet, 'PAYROLL').filter(r => String(r.UserID) === userId && String(r.Month) === month);

    // ดึง PAYROLL_EOM ของ UserID + Month
    const eomSheet = getSheet(SHEETS.PAYROLL_EOM);
    const eomRows  = sheetToObjects(eomSheet, 'PAYROLL_EOM').filter(r => String(r.UserID) === userId && String(r.Month) === month);
    const eom = eomRows[0] || null;

    return { success: true, data: { emp, weeks: prRows, eom } };
  } catch(e) { return { success: false, error: e.toString() }; }
}

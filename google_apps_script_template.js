/**
 * =========================================================================
 * 🌾 रामकुमार भंडार - Google Sheets AI Calling Apps Script
 * =========================================================================
 * 
 * निर्देश (Instructions):
 * 1. अपनी Google Sheet खोलें। पहली पंक्ति (Row 1) में ये 4 हेडर रखें:
 *    - Column A: मोबाइल (Phone)
 *    - Column B: तारीख (Date)
 *    - Column C: समय (Timestamp)
 *    - Column D: बातचीत अवधि (Duration)
 * 
 * 2. ऊपर मेनू में 'Extensions' > 'Apps Script' पर क्लिक करें।
 * 3. वहां मौजूद पुराना कोड हटाकर यह पूरा कोड पेस्ट करें।
 * 4. ऊपर दाईं ओर 'Deploy' (तैनात करें) > 'New Deployment' (नई तैनाती) पर क्लिक करें:
 *    - Select type: 'Web app' (गियर आइकन दबाकर)
 *    - Description: 'Ramkumar AI Dialer'
 *    - Execute as: 'Me' (मेरी पहचान से)
 *    - Who has access: 'Anyone' (कोई भी व्यक्ति)  <-- यह अत्यंत आवश्यक है!
 * 5. 'Deploy' दबाएं और 'Web app URL' (https://script.google.com/macros/s/.../exec) को कॉपी कर लें।
 * 6. इस URL को रामकुमार भंडार ऐप में 'Google Sheet कॉलिंग' टैब में पेस्ट करके 'सहेजें' दबाएं।
 * =========================================================================
 */

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        total: 0,
        pendingCount: 0,
        completedCount: 0,
        rows: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Read columns A to D (Phone, Date, Time, Duration) starting from row 2
    var range = sheet.getRange(2, 1, lastRow - 1, 4);
    var values = range.getValues();
    var rows = [];
    var pendingCount = 0;
    var completedCount = 0;
    
    for (var i = 0; i < values.length; i++) {
      var rowNum = i + 2;
      var rawPhone = values[i][0] !== null && values[i][0] !== undefined ? String(values[i][0]).trim() : '';
      var dateVal = values[i][1] !== null && values[i][1] !== undefined ? String(values[i][1]).trim() : '';
      var timeVal = values[i][2] !== null && values[i][2] !== undefined ? String(values[i][2]).trim() : '';
      var durVal = values[i][3] !== null && values[i][3] !== undefined ? String(values[i][3]).trim() : '';
      
      // Clean 10-digit phone
      var clean = rawPhone.replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        // A row is considered already called if Date, Timestamp or Duration is present
        var isCalled = Boolean(dateVal || timeVal || durVal);
        if (isCalled) {
          completedCount++;
        } else {
          pendingCount++;
        }
        
        rows.push({
          rowNumber: rowNum,
          phone: rawPhone,
          cleanPhone: clean,
          date: dateVal,
          timestamp: timeVal,
          duration: durVal,
          isCalled: isCalled
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      total: rows.length,
      pendingCount: pendingCount,
      completedCount: completedCount,
      rows: rows
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var raw = e.postData && e.postData.contents ? e.postData.contents : '{}';
    var data = JSON.parse(raw);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rowNumber = parseInt(data.rowNumber, 10);
    
    // Direct write by rowNumber
    if (rowNumber && rowNumber >= 2) {
      if (data.date !== undefined && data.date !== null) sheet.getRange(rowNumber, 2).setValue(String(data.date));
      if (data.timestamp !== undefined && data.timestamp !== null) sheet.getRange(rowNumber, 3).setValue(String(data.timestamp));
      if (data.duration !== undefined && data.duration !== null) sheet.getRange(rowNumber, 4).setValue(String(data.duration));
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        updatedRow: rowNumber,
        message: 'Row ' + rowNumber + ' updated successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Fallback: match by clean phone in column A
    var cleanPhone = (data.phone || '').replace(/\D/g, '').slice(-10);
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2 && cleanPhone.length === 10) {
      var phones = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < phones.length; i++) {
        var p = String(phones[i][0]).replace(/\D/g, '').slice(-10);
        if (p === cleanPhone) {
          var targetRow = i + 2;
          if (data.date !== undefined && data.date !== null) sheet.getRange(targetRow, 2).setValue(String(data.date));
          if (data.timestamp !== undefined && data.timestamp !== null) sheet.getRange(targetRow, 3).setValue(String(data.timestamp));
          if (data.duration !== undefined && data.duration !== null) sheet.getRange(targetRow, 4).setValue(String(data.duration));
          SpreadsheetApp.flush();
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            updatedRow: targetRow,
            message: 'Phone ' + cleanPhone + ' matched at row ' + targetRow + ' and updated'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'पंक्ति (Row) या फोन नंबर नहीं मिला'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

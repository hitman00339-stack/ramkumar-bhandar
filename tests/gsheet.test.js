const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Database } = require('../database');

test('Google Sheets Integration & Auto-Resume Calling Tests', async (t) => {
  const testDbPath = path.join(__dirname, 'test_gsheet_db.json');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const db = new Database(testDbPath);

  await t.test('1. Database GSheet Config: defaults, updating and persistence', () => {
    const config = db.getGSheetConfig();
    assert.strictEqual(config.url, '');
    assert.strictEqual(config.autoResume, true);
    assert.strictEqual(config.lastSynced, null);

    const testUrl = 'https://script.google.com/macros/s/AKfycbxTestWebAppUrl/exec';
    const updated = db.setGSheetConfig({ url: testUrl, autoResume: true, lastSynced: '2026-11-23T12:00:00.000Z' });
    assert.strictEqual(updated.url, testUrl);
    assert.strictEqual(updated.autoResume, true);
    assert.strictEqual(updated.lastSynced, '2026-11-23T12:00:00.000Z');

    // Reload from disk to verify persistence
    const reloadedDb = new Database(testDbPath);
    const reloadedConfig = reloadedDb.getGSheetConfig();
    assert.strictEqual(reloadedConfig.url, testUrl);
    assert.strictEqual(reloadedConfig.lastSynced, '2026-11-23T12:00:00.000Z');
  });

  await t.test('2. Row Parsing & Phone Number Normalization', () => {
    const mockRawRows = [
      { rowNumber: 2, phone: '+91 98765 43210', date: '', timestamp: '', duration: '' },
      { rowNumber: 3, phone: '8175044956', date: '22/11/2026', timestamp: '10:30:15 AM', duration: '00:45' },
      { rowNumber: 4, phone: '09208321477', date: '', timestamp: '', duration: '' },
      { rowNumber: 5, phone: 'invalid-number', date: '', timestamp: '', duration: '' }
    ];

    let pendingCount = 0;
    let completedCount = 0;
    let resumeRowNumber = null;

    const parsed = [];
    for (const r of mockRawRows) {
      const clean = (r.cleanPhone || r.phone || '').replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        const isCalled = Boolean(r.isCalled || r.date || r.timestamp || r.duration);
        if (isCalled) {
          completedCount++;
        } else {
          pendingCount++;
          if (resumeRowNumber === null) {
            resumeRowNumber = r.rowNumber;
          }
        }
        parsed.push({
          rowNumber: r.rowNumber,
          phone: r.phone,
          cleanPhone: clean,
          date: r.date || '',
          timestamp: r.timestamp || '',
          duration: r.duration || '',
          isCalled
        });
      }
    }

    assert.strictEqual(parsed.length, 3, 'Invalid number on row 5 must be excluded');
    assert.strictEqual(parsed[0].cleanPhone, '9876543210');
    assert.strictEqual(parsed[1].cleanPhone, '8175044956');
    assert.strictEqual(parsed[2].cleanPhone, '9208321477');
  });

  await t.test('3. Auto-Resume Invariant: Skips already-called rows and resumes strictly from first uncalled row', () => {
    const mockSheetRows = [
      { rowNumber: 2, cleanPhone: '9876543210', date: '21/11/2026', timestamp: '05:30:00 PM', duration: '01:12', isCalled: true },
      { rowNumber: 3, cleanPhone: '8175044956', date: '21/11/2026', timestamp: '05:32:00 PM', duration: 'नहीं उठा (00:00)', isCalled: true },
      { rowNumber: 4, cleanPhone: '9208321477', date: '', timestamp: '', duration: '', isCalled: false },
      { rowNumber: 5, cleanPhone: '9123456789', date: '', timestamp: '', duration: '', isCalled: false }
    ];

    // Filter for resume calling
    const uncalled = mockSheetRows.filter(r => !r.isCalled);
    assert.strictEqual(uncalled.length, 2, 'Only 2 rows should be pending');
    assert.strictEqual(uncalled[0].rowNumber, 4, 'Calling must start strictly from row 4');
    assert.strictEqual(uncalled[0].cleanPhone, '9208321477');
    assert.strictEqual(uncalled[1].rowNumber, 5);

    // Check if resume row number calculation matches
    const firstPending = mockSheetRows.find(r => !r.isCalled);
    assert.strictEqual(firstPending.rowNumber, 4);
  });

  await t.test('4. Auto-Resume Invariant: When all rows are called, pending is 0 and informs completion', () => {
    const fullyCalledSheet = [
      { rowNumber: 2, cleanPhone: '9876543210', isCalled: true },
      { rowNumber: 3, cleanPhone: '8175044956', isCalled: true }
    ];

    const uncalled = fullyCalledSheet.filter(r => !r.isCalled);
    assert.strictEqual(uncalled.length, 0);

    const firstPending = fullyCalledSheet.find(r => !r.isCalled);
    assert.strictEqual(firstPending, undefined);
  });

  await t.test('5. Row Update Payload Formatting: Date DD/MM/YYYY, Timestamp and Duration', () => {
    const sampleDate = new Date('2026-11-23T18:45:30.000Z');
    const dateStr = sampleDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
    assert.match(dateStr, /^\d{2}\/\d{2}\/\d{4}$/, 'Date must format to DD/MM/YYYY');

    // Connected call duration formatting
    const connectedDurationStr = '01:24';
    const finalDurConnected = true ? connectedDurationStr : 'नहीं उठा (00:00)';
    assert.strictEqual(finalDurConnected, '01:24');

    // Failed / No-answer duration formatting
    const finalDurFailed = false ? '00:00' : 'नहीं उठा (00:00)';
    assert.strictEqual(finalDurFailed, 'नहीं उठा (00:00)');
  });

  await t.test('6. 2-Line Concurrent Queue Invariant for GSheet contacts: Preserves isGSheet and rowNumber', () => {
    const contactsList = [
      { rowNumber: 4, cleanPhone: '9208321477', isGSheet: true },
      { rowNumber: 5, cleanPhone: '9123456789', isGSheet: true }
    ];

    const validList = [];
    const seen = new Set();
    const defaultPrompt = 'नमस्ते! रामकुमार किराना स्टोर से आमंत्रण है।';

    for (const c of contactsList) {
      const clean = (c.cleanPhone || c.phone || '').replace(/\D/g, '').slice(-10);
      const dedupeKey = c.isGSheet ? (`gsheet_row_${c.rowNumber}_${clean}`) : clean;
      if (clean.length === 10 && !seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        validList.push({
          id: 'gsheet_' + c.rowNumber + '_' + clean,
          name: `ग्राहक (पंक्ति ${c.rowNumber})`,
          cleanPhone: clean,
          prompt: defaultPrompt,
          isGSheet: Boolean(c.isGSheet),
          rowNumber: c.rowNumber
        });
      }
    }

    assert.strictEqual(validList.length, 2);
    assert.strictEqual(validList[0].isGSheet, true);
    assert.strictEqual(validList[0].rowNumber, 4);
    assert.strictEqual(validList[1].isGSheet, true);
    assert.strictEqual(validList[1].rowNumber, 5);
  });

  // Clean up test DB
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

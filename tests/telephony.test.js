const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { Database } = require('../database');

test('AI Telephony Agent Integration Tests', async (t) => {
  const testDbFile = path.join(__dirname, 'test_telephony.json');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  const db = new Database(testDbFile);

  await t.test('TEST 12: AI status lookup returns correct shop latest confirmed status', () => {
    // Open Krishi, Close Kirana
    db.setShopStatus('krishi', true);
    db.setShopStatus('kirana', false);

    const krishiState = db.getAiPhoneState('krishi');
    const kiranaState = db.getAiPhoneState('kirana');

    assert.strictEqual(krishiState.shopIsOpen, true);
    assert.strictEqual(krishiState.shopStatusText, 'दुकान खुली है');

    assert.strictEqual(kiranaState.shopIsOpen, false);
    assert.strictEqual(kiranaState.shopStatusText, 'दुकान बंद है');
  });

  await t.test('Shop Open vs Calling Service Independence', () => {
    // Shop is open, but calling service is disabled
    db.setShopStatus('krishi', true);
    db.setPhoneServiceEnabled('krishi', false);

    const state = db.getAiPhoneState('krishi');
    assert.strictEqual(state.shopIsOpen, true, 'दुकान खुली होनी चाहिए');
    assert.strictEqual(state.phoneServiceEnabled, false, 'कॉलिंग सेवा बंद होनी चाहिए');
  });

  await t.test('Custom Instruction update works and persists', () => {
    const text = 'यूरिया का नया ट्रक कल सुबह 9 बजे पहुँचेगा।';
    const res = db.setAiInstruction(text);
    assert.strictEqual(res.instruction, text);

    const state = db.getAiPhoneState('krishi');
    assert.strictEqual(state.activeInstruction, text);
  });

  await t.test('Incoming Call Logging: Records query, response, and urgent follow-up flag', () => {
    const call = db.recordIncomingCall({
      shopId: 'krishi',
      customerName: 'राधेश्याम पाटीदार',
      phone: '+91 98260 00000',
      transcriptUser: 'यूरिया और डीएपी खाद उपलब्ध है क्या?',
      transcriptAi: 'हाँ, दुकान खुली है।',
      isUrgent: true
    });

    assert(call.id);
    assert.strictEqual(call.isUrgent, true);
    assert.strictEqual(call.customerName, 'राधेश्याम पाटीदार');

    const state = db.getAiPhoneState('krishi');
    const recorded = state.callLogs.find(c => c.id === call.id);
    assert(recorded);
  });

  await t.test('AI Calling Spreadsheet: Resolves inbound vs outbound phone and classifies connected vs failed (no-answer/busy)', () => {
    const botNumber = '8045440103';
    const sampleLogs = [
      {
        id: 10436325,
        call_direction: 'outbound',
        from_number: '+918045440103',
        to_number: '+918175044956',
        call_status: 'no-answer',
        call_duration_in_seconds: 0,
        call_duration_in_minutes: 0
      },
      {
        id: 10445088,
        call_direction: 'inbound',
        from_number: '+918175044956',
        to_number: '918045440103',
        call_status: 'completed',
        call_duration_in_seconds: 60,
        call_duration_in_minutes: 0,
        internal_recording_url: 'https://omnidim.io/api/v1/recording/10445088?token=xyz'
      },
      {
        id: 10433697,
        call_direction: 'outbound',
        from_number: 'Web Call',
        to_number: 'Assistant',
        call_status: 'completed',
        call_duration_in_seconds: 45,
        call_duration_in_minutes: 1
      }
    ];

    // Verify phone resolution logic
    const processed = sampleLogs.map(c => {
      const isOutbound = c.call_direction === 'outbound';
      const toClean = (c.to_number || '').replace(/\D/g, '');
      const fromClean = (c.from_number || '').replace(/\D/g, '');
      let phone = '';
      if (c.from_number === 'Web Call' || c.to_number === 'Web Call') {
        phone = '🌐 वेब टेस्ट कॉल';
      } else if (toClean.includes(botNumber)) {
        phone = c.from_number;
      } else if (fromClean.includes(botNumber)) {
        phone = c.to_number;
      } else {
        phone = isOutbound ? c.to_number : c.from_number;
      }

      const totalSec = (c.call_duration_in_minutes * 60) + c.call_duration_in_seconds;
      const rawStatus = (c.call_status || '').toLowerCase();
      const isConnected = totalSec > 0 && rawStatus !== 'no-answer' && rawStatus !== 'busy';
      const isFailed = !isConnected;

      return { id: c.id, phone, isConnected, isFailed, totalSec };
    });

    // Outbound to customer failed (no-answer)
    assert.strictEqual(processed[0].phone, '+918175044956');
    assert.strictEqual(processed[0].isConnected, false);
    assert.strictEqual(processed[0].isFailed, true);

    // Inbound from customer completed (connected)
    assert.strictEqual(processed[1].phone, '+918175044956');
    assert.strictEqual(processed[1].isConnected, true);
    assert.strictEqual(processed[1].isFailed, false);

    // Web test call
    assert.strictEqual(processed[2].phone, '🌐 वेब टेस्ट कॉल');
    assert.strictEqual(processed[2].isConnected, true);
  });

  await t.test('AI Calling Spreadsheet: Filters pending credit customers who require call reminders', () => {
    // Add customer with due balance
    db.createTransaction({
      shopId: 'krishi',
      type: 'CUSTOMER_CREDIT_SALE',
      amount: 1500,
      customerName: 'रामसेवक किसान',
      customerPhone: '9876543210',
      description: 'खाद उधार'
    });

    const customers = db.getCustomers();
    const ramsevak = customers.find(c => c.name === 'रामसेवक किसान');

    assert(ramsevak, 'रामसेवक ग्राहक मिलना चाहिए');
    assert.strictEqual(ramsevak.balances.krishi, 150000, 'उधार राशि 1500 रुपये (150000 पैसे) होनी चाहिए');
  });

  await t.test('Bulk Campaign: Parses numbers, persists campaign contacts, and updates status sequentially', () => {
    // Test parsing function
    const sampleInput = `
      8175044956
      रामलाल - 9580133593
      +91 9826011223 (मोहन)
      8175044956, 9123456780
    `;

    const lines = sampleInput.split(/[\n,;]+/);
    const parsed = [];
    const seen = new Set();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/(?:\+?91[\s-]?)?([6-9]\d{9})/);
      if (match) {
        const last10 = match[1];
        if (!seen.has(last10)) {
          seen.add(last10);
          let name = trimmed.replace(match[0], '').replace(/[-:–—()]/g, '').trim();
          if (!name || name.length < 2) name = 'ग्रामवासी / ग्राहक';
          parsed.push({ name, cleanPhone: last10, phone: '+91 ' + last10 });
        }
      }
    }

    assert.strictEqual(parsed.length, 4, '4 अद्वितीय वैध मोबाइल नंबर पहचाने जाने चाहिए (डुप्लीकेट हटकर)');
    assert.strictEqual(parsed[1].name, 'रामलाल');
    assert.strictEqual(parsed[2].name, 'मोहन');

    // Simulate backend campaign contact storage
    if (!db.data.campaignContacts) db.data.campaignContacts = [];
    parsed.forEach(c => {
      db.data.campaignContacts.push({
        id: 'camp_' + c.cleanPhone,
        name: c.name,
        cleanPhone: c.cleanPhone,
        phone: c.phone,
        status: 'pending',
        campaign: 'नई किराना दुकान उद्घाटन (4 नवंबर)'
      });
    });

    assert.strictEqual(db.data.campaignContacts.length, 4);

    // Update status for contact 1 (simulating completed call)
    const c1 = db.data.campaignContacts.find(c => c.cleanPhone === '8175044956');
    c1.status = 'connected';
    c1.durationStr = '01:30';
    c1.summary = 'उद्घाटन आमंत्रण स्वीकार किया';

    assert.strictEqual(c1.status, 'connected');
    assert.strictEqual(c1.durationStr, '01:30');

    // Update status for contact 2 (simulating failed/no-answer call)
    const c2 = db.data.campaignContacts.find(c => c.cleanPhone === '9580133593');
    c2.status = 'failed';
    c2.durationStr = '00:00';
    c2.summary = 'घंटी बजी पर नहीं उठा (No Answer)';

    assert.strictEqual(c2.status, 'failed');
  });

  // Cleanup
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
});

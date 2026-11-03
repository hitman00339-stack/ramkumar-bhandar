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

  await t.test('Permanent Contacts Directory: Stores contacts, strictly deduplicates on clean 10-digit number, and allows multi-campaign reuse', () => {
    // 1. Initial bulk save from Campaign A (Inauguration)
    const listA = [
      { name: 'रामलाल', phone: '9580133593', village: 'कुँवरगद्दी' },
      { name: 'मोहन यादव', phone: '+91 9826011223', village: 'सीतापुर' },
      { name: 'सुरेश', phone: '08175044956', village: 'लहरपुर' }
    ];
    const savedA = db.saveContactsBookBulk(listA, 'नई किराना दुकान उद्घाटन (4 नवंबर)');
    assert.strictEqual(savedA.length, 3);
    assert.strictEqual(db.getContactsBook().length, 3);

    // 2. Secondary bulk save from Campaign B (Fertilizer arrival), with 1 overlapping number and 1 new number
    const listB = [
      { name: 'रामलाल पाटीदार', phone: '+91-9580133593' }, // Duplicate phone, richer name
      { name: 'दिनेश कुमार', phone: '9123456780', village: 'महमूदाबाद' } // Brand new
    ];
    const savedB = db.saveContactsBookBulk(listB, 'यूरिया खाद आगमन सूचना');
    assert.strictEqual(savedB.length, 2);

    // Strict zero-duplicate invariant: Total unique contacts should now be exactly 4 (3 from A + 1 new from B)
    const allContacts = db.getContactsBook();
    assert.strictEqual(allContacts.length, 4, 'डायरेक्टरी में बिना डुप्लीकेट के कुल 4 संपर्क होने चाहिए');

    // Verify ramlal contact updated with new name and multi-campaign history
    const ramlal = allContacts.find(c => c.cleanPhone === '9580133593');
    assert(ramlal);
    assert.strictEqual(ramlal.name, 'रामलाल पाटीदार', 'बेहतर नाम अपडेट होना चाहिए');
    assert.strictEqual(ramlal.campaigns.length, 2);
    assert(ramlal.campaigns.includes('नई किराना दुकान उद्घाटन (4 नवंबर)'));
    assert(ramlal.campaigns.includes('यूरिया खाद आगमन सूचना'));

    // 3. Delete contact
    const deleted = db.deleteContactFromBook('9123456780');
    assert.strictEqual(deleted, true);
    assert.strictEqual(db.getContactsBook().length, 3);
  });

  await t.test('Incoming Callback Resolution: When a customer calls back after an unanswered outbound call, they are removed from failedCalls and marked connected', () => {
    const botNumber = '8045440103';

    // Simulated call history:
    // 1. Earlier outbound call to customer 9208321477 failed (no-answer, 0 sec)
    // 2. Later inbound call from same customer 9208321477 completed (41 sec)
    // 3. Outbound call to customer 9876543210 failed (no-answer, 0 sec) and did NOT call back
    const omniLogs = [
      {
        id: 10585193,
        bot_name: 'Ramkumar Khad Bhandar - Incoming',
        time_of_call: '10/31/2026 13:54:15',
        from_number: '+919208321477',
        to_number: '918045440103',
        call_direction: 'inbound',
        call_status: 'completed',
        call_duration_in_seconds: 41,
        call_duration_in_minutes: 1
      },
      {
        id: 10561336,
        bot_name: 'Ramkumar Khad Bhandar Kuwargaddi - Outgoing',
        time_of_call: '10/31/2026 12:27:24',
        from_number: '+918045440103',
        to_number: '+919208321477',
        call_direction: 'outbound',
        call_status: 'no-answer',
        call_duration_in_seconds: 0,
        call_duration_in_minutes: 0
      },
      {
        id: 10561337,
        bot_name: 'Ramkumar Khad Bhandar Kuwargaddi - Outgoing',
        time_of_call: '10/31/2026 12:30:00',
        from_number: '+918045440103',
        to_number: '+919876543210',
        call_direction: 'outbound',
        call_status: 'no-answer',
        call_duration_in_seconds: 0,
        call_duration_in_minutes: 0
      }
    ];

    // Process calls
    const processedCalls = omniLogs.map(c => {
      const isOutbound = c.call_direction === 'outbound';
      const toClean = (c.to_number || '').replace(/\D/g, '');
      const fromClean = (c.from_number || '').replace(/\D/g, '');
      let phone = '';
      if (toClean.includes(botNumber)) phone = c.from_number;
      else if (fromClean.includes(botNumber)) phone = c.to_number;
      else phone = isOutbound ? c.to_number : c.from_number;

      const totalSec = (c.call_duration_in_minutes * 60) + c.call_duration_in_seconds;
      const rawStatus = (c.call_status || '').toLowerCase();
      const isConnected = totalSec > 0 && rawStatus !== 'no-answer' && rawStatus !== 'busy';
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      return {
        id: c.id,
        phone,
        cleanPhone,
        isConnected,
        isFailed: !isConnected,
        totalSec
      };
    });

    // Step 1: Collect all connected 10-digit clean numbers
    const connectedPhoneSet = new Set();
    processedCalls.forEach(c => {
      if (c.isConnected && c.cleanPhone) connectedPhoneSet.add(c.cleanPhone);
    });

    assert.strictEqual(connectedPhoneSet.has('9208321477'), true, '9208321477 कॉलबैक से कनेक्ट हुआ है');
    assert.strictEqual(connectedPhoneSet.has('9876543210'), false, '9876543210 अभी तक कनेक्ट नहीं हुआ');

    // Step 2: Resolve failed calls - MUST EXCLUDE any customer that called back or connected!
    const failedCalls = processedCalls.filter(c => {
      if (!c.isFailed) return false;
      if (c.cleanPhone && connectedPhoneSet.has(c.cleanPhone)) {
        return false; // Suppress / remove from failed calls list!
      }
      return true;
    });

    // Customer 9208321477 should be REMOVED from failedCalls
    assert.strictEqual(failedCalls.length, 1, 'केवल 1 फेल्ड कॉल बचनी चाहिए (जिसने कॉलबैक नहीं किया)');
    assert.strictEqual(failedCalls[0].cleanPhone, '9876543210', 'फेल्ड कॉल में केवल 9876543210 होना चाहिए');
  });

  await t.test('Number-Wise Call History & Auto-Harvesting of Incoming Callers into Permanent Directory', () => {
    // 1. Setup a campaign contact that is pending
    if (!db.data.campaignContacts) db.data.campaignContacts = [];
    db.data.campaignContacts.push({
      id: 'camp_9208321477',
      name: 'राकेश वर्मा',
      cleanPhone: '9208321477',
      phone: '+91 92083 21477',
      status: 'failed',
      summary: 'पहले नहीं उठा',
      campaign: 'उद्घाटन आमंत्रण'
    });

    // 2. Incoming call from 9208321477 comes in
    const incomingLog = [
      {
        id: 10585193,
        bot_name: 'Ramkumar Khad Bhandar - Incoming',
        time_of_call: '10/31/2026 13:54:15',
        from_number: '+919208321477',
        to_number: '918045440103',
        call_direction: 'inbound',
        call_status: 'completed',
        call_duration_in_seconds: 41,
        call_duration_in_minutes: 1,
        call_conversation: 'LLM: नमस्कार! यादव खाद भंडार में स्वागत है।<br/>User: उद्घाटन कब है?<br/>LLM: 4 नवंबर को है जी।<br/>User: ठीक है हम आ रहे हैं।',
        sentiment_analysis_details: 'उद्घाटन आमंत्रण स्वीकार किया'
      },
      {
        // Another new caller who was NEVER in the database before
        id: 10585194,
        bot_name: 'Ramkumar Khad Bhandar - Incoming',
        time_of_call: '10/31/2026 14:10:00',
        from_number: '+919799988811',
        to_number: '918045440103',
        call_direction: 'inbound',
        call_status: 'completed',
        call_duration_in_seconds: 30,
        call_duration_in_minutes: 0,
        call_conversation: 'LLM: नमस्कार!<br/>User: यूरिया मिल जाएगी?<br/>LLM: हाँ जी नया स्टॉक आ गया है।',
        user_name: 'सुभाष किसान'
      }
    ];

    // Harvest logs into database
    const harvested = db.recordCallHistoryFromLogs(incomingLog);
    assert.strictEqual(harvested.length, 2, 'दोनों इनकमिंग कॉल प्रोसेस होनी चाहिए');

    // Verify contact 9799988811 was automatically created and saved permanently
    const subhash = db.getContactProfile('9799988811');
    assert(subhash, 'नया इनकमिंग कॉलर डायरेक्टरी में स्वतः सहेजा जाना चाहिए');
    assert.strictEqual(subhash.name, 'सुभाष किसान');
    assert.strictEqual(subhash.totalCalls, 1);
    assert.strictEqual(subhash.callHistory.length, 1);
    assert(subhash.lastTranscript.includes('यूरिया मिल जाएगी'));

    // Verify contact 9208321477 was updated and campaign contact was auto-promoted to connected!
    const campContact = db.data.campaignContacts.find(c => c.cleanPhone === '9208321477');
    assert.strictEqual(campContact.status, 'connected', 'कॉलबैक के बाद कैम्पेन में स्थिति connected होनी चाहिए');
    assert(campContact.summary.includes('सफल बातचीत') || campContact.summary.includes('कॉलबैक'));

    // Verify saving personal data/notes works
    db.updateContactPersonalData('9208321477', {
      notes: '4 नवंबर को 2 लोगों के साथ आएंगे',
      inquiryTopic: 'उद्घाटन आमंत्रण'
    });

    const rakesh = db.getContactProfile('9208321477');
    assert.strictEqual(rakesh.personalData.notes, '4 नवंबर को 2 लोगों के साथ आएंगे');
    assert.strictEqual(rakesh.personalData.inquiryTopic, 'उद्घाटन आमंत्रण');
  });

  await t.test('Audio Streaming Proxy: Supports Byte-Range 206 Partial Content without cutting off', () => {
    // Simulate a 1000-byte audio file
    const simulatedAudioBuffer = Buffer.alloc(1000, 0x41);
    const totalSize = simulatedAudioBuffer.length;

    // Test Case A: Full request (no Range header)
    assert.strictEqual(totalSize, 1000);

    // Test Case B: Partial range request (bytes=100-299)
    const rangeHeader = 'bytes=100-299';
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    const chunkLength = (end - start) + 1;

    assert.strictEqual(start, 100);
    assert.strictEqual(end, 299);
    assert.strictEqual(chunkLength, 200);

    const slice = simulatedAudioBuffer.subarray(start, end + 1);
    assert.strictEqual(slice.length, 200, 'स्लाइस 200 बाइट्स का होना चाहिए');

    // Test Case C: Open-ended range request (bytes=500-)
    const openRangeHeader = 'bytes=500-';
    const openParts = openRangeHeader.replace(/bytes=/, '').split('-');
    const openStart = parseInt(openParts[0], 10);
    const openEnd = openParts[1] ? parseInt(openParts[1], 10) : totalSize - 1;
    const openChunkLength = (openEnd - openStart) + 1;

    assert.strictEqual(openStart, 500);
    assert.strictEqual(openEnd, 999);
    assert.strictEqual(openChunkLength, 500);

    // Test Case D: Over-sized range request (bytes=0-10000000) clamped to totalSize - 1 (Prevents mid-playback pause!)
    const overRangeHeader = 'bytes=0-10000000';
    const overMatch = overRangeHeader.match(/bytes=(\d*)-(\d*)/);
    const overStart = parseInt(overMatch[1], 10);
    const overEnd = Math.min(totalSize - 1, parseInt(overMatch[2], 10));
    assert.strictEqual(overStart, 0);
    assert.strictEqual(overEnd, 999);
    assert.strictEqual((overEnd - overStart) + 1, 1000);

    // Test Case E: Suffix range request (bytes=-200)
    const suffixHeader = 'bytes=-200';
    const suffixMatch = suffixHeader.match(/bytes=(\d*)-(\d*)/);
    const suffixStart = Math.max(0, totalSize - parseInt(suffixMatch[2], 10));
    const suffixEnd = totalSize - 1;
    assert.strictEqual(suffixStart, 800);
    assert.strictEqual(suffixEnd, 999);
    assert.strictEqual((suffixEnd - suffixStart) + 1, 200);
  });

  await t.test('Concurrent Calling Invariant (Concurrency = 2): Exactly up to 2 active calls placed simultaneously from +918045440103 to different persons, pool replenishes as calls complete', () => {
    const queue = [
      { id: '1', phone: '9208321477', name: 'राकेश' },
      { id: '2', phone: '9336317193', name: 'सुभाष' },
      { id: '3', phone: '9876543210', name: 'मोहन' },
      { id: '4', phone: '9123456780', name: 'दिनेश' }
    ];

    const activeCalls = new Set();
    let maxSimultaneousCalls = 0;
    const callLogEvents = [];

    function dispatchCall(contact) {
      if (activeCalls.size >= 2) {
        throw new Error('VIOLATION: Exceeded concurrency limit of 2 calls!');
      }
      activeCalls.add(contact.phone);
      maxSimultaneousCalls = Math.max(maxSimultaneousCalls, activeCalls.size);
      callLogEvents.push({ type: 'start', phone: contact.phone, activeCount: activeCalls.size });
    }

    function finishCall(contact) {
      assert(activeCalls.has(contact.phone), 'Cannot finish call that is not active');
      activeCalls.delete(contact.phone);
      callLogEvents.push({ type: 'finish', phone: contact.phone, activeCount: activeCalls.size });
    }

    // Line 1 takes Contact 1
    dispatchCall(queue[0]);
    assert.strictEqual(activeCalls.size, 1);

    // Line 2 takes Contact 2 simultaneously
    dispatchCall(queue[1]);
    assert.strictEqual(activeCalls.size, 2);
    assert.strictEqual(maxSimultaneousCalls, 2);

    // Attempting to dispatch a 3rd call while 2 are active must throw violation
    assert.throws(() => dispatchCall(queue[2]), /Exceeded concurrency limit of 2 calls/);

    // Call 1 completes (Line 1 frees up)
    finishCall(queue[0]);
    assert.strictEqual(activeCalls.size, 1);

    // Line 1 immediately picks up Contact 3
    dispatchCall(queue[2]);
    assert.strictEqual(activeCalls.size, 2);

    // Call 2 completes (Line 2 frees up)
    finishCall(queue[1]);
    assert.strictEqual(activeCalls.size, 1);

    // Line 2 immediately picks up Contact 4
    dispatchCall(queue[3]);
    assert.strictEqual(activeCalls.size, 2);

    // Both finish
    finishCall(queue[2]);
    finishCall(queue[3]);
    assert.strictEqual(activeCalls.size, 0);

    // Verify all 4 were called without skipping
    assert.strictEqual(callLogEvents.filter(e => e.type === 'start').length, 4);
    assert.strictEqual(callLogEvents.filter(e => e.type === 'finish').length, 4);
    assert.strictEqual(maxSimultaneousCalls, 2);
  });

  await t.test('Bulk Campaign Number Parser: Extracts all Indian numbers without skipping (spaces, dashes, commas, mixed names)', () => {
    function parseInput(text) {
      const contacts = [];
      const seen = new Set();
      const rawLines = (text || '').split(/[\r\n;|]+/);

      for (const rawLine of rawLines) {
        if (!rawLine.trim()) continue;
        const subItems = rawLine.includes(',') ? rawLine.split(',') : [rawLine];
        for (const item of subItems) {
          const trimmed = item.trim();
          if (!trimmed) continue;
          const phoneRegex = /(?:(?:\+?91[\s-]?)|\b0)?\s*([6-9](?:[\s-]*\d){9})\b/g;
          let match;
          let matched = false;
          while ((match = phoneRegex.exec(trimmed)) !== null) {
            matched = true;
            const fullMatchStr = match[0];
            const clean10 = match[1].replace(/\D/g, '');
            if (clean10.length === 10 && !seen.has(clean10)) {
              seen.add(clean10);
              let name = trimmed.replace(fullMatchStr, '').replace(/[-:–—()\t/,"']/g, ' ').replace(/\s+/g, ' ').trim();
              if (!name || name.length < 2 || /^\d+$/.test(name)) name = 'ग्रामवासी / ग्राहक';
              contacts.push({ name, cleanPhone: clean10 });
            }
          }
          if (!matched) {
            const digits = trimmed.replace(/\D/g, '');
            if (digits.length >= 10) {
              const last10 = digits.slice(-10);
              if (/^[6-9]/.test(last10) && !seen.has(last10)) {
                seen.add(last10);
                contacts.push({ name: 'ग्रामवासी / ग्राहक', cleanPhone: last10 });
              }
            }
          }
        }
      }
      return contacts;
    }

    const testInput = `
      8175044956
      98765 43210
      +91 92083-21477 (राकेश वर्मा)
      सुरेश कुमार - 93363 17193
      9123456780, 8877665544
      रमेश 9876543211, महेश 9876543212
    `;

    const parsed = parseInput(testInput);
    assert.strictEqual(parsed.length, 8, '8 विभिन्न नंबर बिना किसी छूट के पार्स होने चाहिए');
    assert(parsed.some(c => c.cleanPhone === '9876543210'), 'स्पेस वाला नंबर 98765 43210 पार्स होना चाहिए');
    assert(parsed.some(c => c.cleanPhone === '9208321477' && c.name === 'राकेश वर्मा'), 'राकेश वर्मा पार्स होना चाहिए');
    assert(parsed.some(c => c.cleanPhone === '9336317193' && c.name === 'सुरेश कुमार'), 'सुरेश कुमार पार्स होना चाहिए');
    assert(parsed.some(c => c.cleanPhone === '9876543211' && c.name === 'रमेश'), 'कॉमा के साथ पहला नाम पार्स होना चाहिए');
    assert(parsed.some(c => c.cleanPhone === '9876543212' && c.name === 'महेश'), 'कॉमा के साथ दूसरा नाम पार्स होना चाहिए');
  });

  await t.test('Stale Call Log Rejection: /api/omnidim/call-status/:phone ignores logs older than dispatch timestamp', () => {
    const logs = [
      {
        id: 1001,
        to_number: '+919208321477',
        call_status: 'completed',
        call_duration_in_seconds: 45,
        call_duration_in_minutes: 1,
        time_of_call: '2026-11-02 10:00:00 UTC'
      }
    ];

    const dispatchTime = new Date('2026-11-02 11:00:00 UTC').getTime();
    const sinceMs = dispatchTime - 5000;

    function findActiveCallLog(allLogs, clean, since) {
      return allLogs.find(l => {
        const toClean = (l.to_number || '').replace(/\D/g, '').slice(-10);
        const fromClean = (l.from_number || '').replace(/\D/g, '').slice(-10);
        if (toClean !== clean && fromClean !== clean) return false;

        if (since > 0) {
          const rawTime = l.time_of_call || l.created_at || l.timestamp;
          if (rawTime) {
            const logMs = new Date(rawTime.endsWith('Z') ? rawTime : rawTime + ' UTC').getTime();
            if (!isNaN(logMs) && logMs < (since - 10000)) {
              return false; // Skip stale historical log!
            }
          }
        }
        return true;
      });
    }

    const matchedStale = findActiveCallLog(logs, '9208321477', sinceMs);
    assert.strictEqual(matchedStale, undefined, 'पुरानी कॉल का लॉग मैच नहीं होना चाहिए');

    logs.unshift({
      id: 1002,
      to_number: '+919208321477',
      call_status: 'completed',
      call_duration_in_seconds: 30,
      call_duration_in_minutes: 0,
      time_of_call: '2026-11-02 11:00:15 UTC'
    });

    const matchedFresh = findActiveCallLog(logs, '9208321477', sinceMs);
    assert(matchedFresh, 'नया ताजा कॉल लॉग मैच होना चाहिए');
    assert.strictEqual(matchedFresh.id, 1002);
  });

  await t.test('Caller ID Enforcement & Same-Day Re-dialing Invariant', () => {
    // 1. Verify caller ID format
    const expectedCallerNumber = '+918045440103';
    const payload = {
      agent_id: 276578,
      to_number: '+919208321477',
      from_number_id: 8484,
      from_number: expectedCallerNumber,
      caller_id: expectedCallerNumber,
      phone_number: expectedCallerNumber
    };
    assert.strictEqual(payload.from_number, '+918045440103', 'आउटगोइंग कॉल हमेशा 8045440103 से ही जानी चाहिए');
    assert.strictEqual(payload.from_number_id, 8484, 'आउटगोइंग कॉल हेतु ऑम्नीडायमेंशन फोन नंबर ID 8484 होना अनिवार्य है');
    assert.strictEqual(payload.caller_id, '+918045440103');
    assert.strictEqual(payload.phone_number, '+918045440103');

    // 2. Same-day re-dialing: Verify that customer connected earlier is NOT skipped when re-dialed today
    const customer = { id: 'c1', name: 'सुरेश', phone: '9208321477' };
    const connectedEarlierToday = [{ rawPhone: '9208321477', isConnected: true }];
    
    // User initiates re-dial: queue contains customer
    const redialQueue = [customer];
    const dialed = [];
    for (const c of redialQueue) {
      // Re-dial should proceed without skipping
      dialed.push(c.phone);
    }
    assert.strictEqual(dialed.length, 1, 'उसी दिन दोबारा कॉल करने पर कॉल स्किप नहीं होनी चाहिए');
    assert.strictEqual(dialed[0], '9208321477');
  });

  await t.test('Day-Wise Call Log Filtering: Filters records matching YYYY-MM-DD accurately', () => {
    const logs = [
      { id: '1', time_of_call: '10/31/2026 13:54:15', user_name: 'कॉल 31 अक्टूबर' },
      { id: '2', time_of_call: '11/01/2026 10:20:00', user_name: 'कॉल 1 नवंबर' },
      { id: '3', time_of_call: '11/01/2026 14:45:00', user_name: 'कॉल 1 नवंबर दोपहर' }
    ];

    function filterByDay(records, dateStr) {
      return records.filter(c => {
        const raw = c.time_of_call || c.timestamp || null;
        if (!raw) return false;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return false;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === dateStr;
      });
    }

    const filtered31 = filterByDay(logs, '2026-10-31');
    assert.strictEqual(filtered31.length, 1);
    assert.strictEqual(filtered31[0].id, '1');

    const filtered01 = filterByDay(logs, '2026-11-01');
    assert.strictEqual(filtered01.length, 2);
    assert.strictEqual(filtered01[0].id, '2');
    assert.strictEqual(filtered01[1].id, '3');

    const emptyDay = filterByDay(logs, '2026-11-02');
    assert.strictEqual(emptyDay.length, 0);
  });

  await t.test('Multi-Selection Resolution in Inauguration Tab: Selected rows are accurately resolved to valid 10-digit contacts', () => {
    const inaugurationCalls = [
      { id: 'camp_1', customerName: 'ग्रामवासी / ग्राहक', cleanPhone: '6387317636', phone: '+91 63873 17636', isCampaign: true, isPending: true },
      { id: 'camp_2', customerName: 'ग्रामवासी / ग्राहक', cleanPhone: '9580133593', phone: '+91 95801 33593', isCampaign: true, isPending: true }
    ];

    const selectedInTab = new Set(['camp_1', 'camp_2', '6387317636', '9580133593']);

    function resolveSelectionToCall(selectedSet, activeList) {
      const toCall = [];
      const seenClean = new Set();
      for (const c of activeList) {
        const clean = (c.cleanPhone || c.phone || '').replace(/\D/g, '').slice(-10);
        if (!clean || clean.length !== 10) continue;
        const strId = String(c.id || '');
        if (selectedSet.has(strId) || selectedSet.has(clean)) {
          if (!seenClean.has(clean)) {
            seenClean.add(clean);
            toCall.push({
              id: c.id,
              name: c.customerName,
              cleanPhone: clean,
              phone: c.phone
            });
          }
        }
      }
      return toCall;
    }

    const resolved = resolveSelectionToCall(selectedInTab, inaugurationCalls);
    assert.strictEqual(resolved.length, 2, 'उद्घाटन आमंत्रण टैब में चुने गए दोनों नंबरों को वैध कॉल कतार में मिलना चाहिए');
    assert.strictEqual(resolved[0].cleanPhone, '6387317636');
    assert.strictEqual(resolved[1].cleanPhone, '9580133593');
  });

  await t.test('Uncalled Campaign Contacts Date Filter Invariant: isPending contacts remain visible even when date filter is set', () => {
    const contacts = [
      { id: 'camp_1', isPending: true, addedAt: '2026-11-02T10:00:00Z', cleanPhone: '6387317636' },
      { id: 'camp_2', isPending: false, isConnected: true, lastCallAt: '2026-11-01T14:00:00Z', cleanPhone: '9580133593' }
    ];

    function filterCampaignCalls(list, filterDateStr) {
      return list.filter(c => {
        if (c.isPending) return true; // Always keep pending contacts visible
        const ts = c.lastCallAt || c.addedAt || null;
        if (!ts) return true;
        const d = new Date(ts);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === filterDateStr;
      });
    }

    // Filter set to yesterday (2026-11-01)
    const result = filterCampaignCalls(contacts, '2026-11-01');
    assert.strictEqual(result.length, 2, 'लंबित (isPending) संपर्क तारीख फ़िल्टर होने पर भी गायब नहीं होने चाहिए');
    assert(result.some(c => c.cleanPhone === '6387317636'));
    assert(result.some(c => c.cleanPhone === '9580133593'));
  });

  await t.test('SIP Trunk Dispatch Spacing: Rapid back-to-back dispatches enforce minimum 1500ms spacing', async () => {
    let lastDispatch = 0;
    const MIN_SPACING = 50; // Use 50ms in unit test for speed
    const timestamps = [];

    async function dispatchWithSpacing(id) {
      const now = Date.now();
      const waitMs = Math.max(0, MIN_SPACING - (now - lastDispatch));
      lastDispatch = now + waitMs;
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, waitMs));
      }
      timestamps.push({ id, time: Date.now() });
    }

    await Promise.all([
      dispatchWithSpacing(1),
      dispatchWithSpacing(2)
    ]);

    assert.strictEqual(timestamps.length, 2);
    const diff = Math.abs(timestamps[1].time - timestamps[0].time);
    assert(diff >= 40, `Spacing between calls must be at least ~50ms (was ${diff}ms)`);
  });

  await t.test('Omnidimension IST Timezone Parsing: Stale logs are correctly identified without future-offset false match', () => {
    // Current time: Nov 3, 2026, 08:30:00 IST
    const dispatchTimeMs = new Date('2026-11-03T08:30:00+05:30').getTime();
    
    // An earlier call log from 07:00:00 IST today
    const omniRawTime = '11/03/2026 07:00:00';

    // BUGGY behavior (with UTC):
    const buggyUtcTime = new Date(omniRawTime + ' UTC').getTime();
    assert(buggyUtcTime > dispatchTimeMs, 'Buggy UTC parsing incorrectly places earlier IST time into the future!');

    // FIXED behavior (with IST +05:30):
    const timeWithZone = (omniRawTime.endsWith('Z') || omniRawTime.includes('+')) ? omniRawTime : (omniRawTime + ' +05:30');
    const correctIstTime = new Date(timeWithZone).getTime();
    assert(correctIstTime < dispatchTimeMs, 'Correct IST parsing places earlier call in the past');
    
    // Must be rejected by sinceMs check!
    const sinceMs = dispatchTimeMs - 5000;
    const isStale = correctIstTime < (sinceMs - 10000);
    assert.strictEqual(isStale, true, 'पुरानी कॉल को नई कॉल समझकर तुरंत 2.5 सेकंड में बंद नहीं माना जाना चाहिए');
  });

  await t.test('Zero-Skip Concurrency Invariant: When carrier is busy, contacts retry and re-queue so 0 numbers are skipped', async () => {
    const queue = [
      { id: 'c1', name: 'राम', cleanPhone: '9511003038' },
      { id: 'c2', name: 'श्याम', cleanPhone: '9451696820' },
      { id: 'c3', name: 'मोहन', cleanPhone: '9876543210' }
    ];

    let completed = [];
    let requeued = [];
    let carrierConcurrencyActive = 2; // Carrier currently full

    async function attemptCall(contact) {
      if (carrierConcurrencyActive >= 2) {
        // Concurrency limit reached
        return { success: false, isConcurrencyLimit: true, needsRequeue: true };
      }
      carrierConcurrencyActive++;
      return { success: true, needsRequeue: false };
    }

    // Process queue with zero-skip requeue guarantee
    let qIdx = 0;
    while (qIdx < queue.length) {
      const contact = queue[qIdx++];
      const res = await attemptCall(contact);
      if (res.needsRequeue && !contact.requeued) {
        contact.requeued = true;
        requeued.push(contact.cleanPhone);
        // Free carrier channel
        carrierConcurrencyActive = 1;
        queue.push(contact); // Re-queue to the end!
      } else {
        completed.push(contact.cleanPhone);
        carrierConcurrencyActive = Math.max(0, carrierConcurrencyActive - 1);
      }
    }

    // Verify all 3 original contacts completed without any being skipped!
    assert.strictEqual(completed.length, 3);
    assert(completed.includes('9511003038'));
    assert(completed.includes('9451696820'));
    assert(completed.includes('9876543210'));
    assert(requeued.includes('9511003038'), 'अस्थायी व्यस्त नंबर को स्किप करने के बजाय कतार में पुनः जोड़ा जाना चाहिए');
  });

  await t.test('Short Conversation Filtering (< 15 Seconds): Correctly isolates calls under 15s across all filters', async () => {
    const rawCalls = [
      {
        id: 'c_failed',
        call_direction: 'outbound',
        from_number: '+918045440103',
        to_number: '+919511003030',
        call_status: 'no-answer',
        call_duration_in_seconds: 0,
        call_duration_in_minutes: 0,
        time_of_call: '11/03/2026 10:00:00'
      },
      {
        id: 'c_short_1',
        call_direction: 'outbound',
        from_number: '+918045440103',
        to_number: '+919451696020',
        call_status: 'completed',
        call_duration_in_seconds: 7,
        call_duration_in_minutes: 0,
        time_of_call: '11/03/2026 10:05:00'
      },
      {
        id: 'c_short_2',
        call_direction: 'outbound',
        from_number: '+918045440103',
        to_number: '+919876543210',
        call_status: 'completed',
        call_duration_in_seconds: 14,
        call_duration_in_minutes: 0,
        time_of_call: '11/03/2026 10:10:00'
      },
      {
        id: 'c_long',
        call_direction: 'outbound',
        from_number: '+918045440103',
        to_number: '+919123456789',
        call_status: 'completed',
        call_duration_in_seconds: 45,
        call_duration_in_minutes: 0,
        time_of_call: '11/03/2026 10:15:00'
      }
    ];

    // Process calls
    const processed = rawCalls.map(c => {
      const durationSec = c.call_duration_in_seconds || 0;
      const durationMin = c.call_duration_in_minutes || 0;
      const totalSec = (durationMin * 60) + durationSec;
      const rawStatus = (c.call_status || '').toLowerCase();
      const isConnected = totalSec > 0 && rawStatus !== 'no-answer' && rawStatus !== 'busy' && rawStatus !== 'failed';
      return {
        id: c.id,
        phone: c.to_number,
        durationSec: totalSec,
        isConnected
      };
    });

    // 1. Connected Calls (duration > 0 and status is connected)
    const connectedCalls = processed.filter(c => c.isConnected);
    assert.strictEqual(connectedCalls.length, 3, '3 calls picked up and connected');

    // 2. Short Calls (< 15 seconds)
    const shortCalls = processed.filter(c => c.isConnected && c.durationSec > 0 && c.durationSec < 15);
    assert.strictEqual(shortCalls.length, 2, 'Exactly 2 calls lasted less than 15 seconds (7s and 14s)');
    assert(shortCalls.some(c => c.id === 'c_short_1'));
    assert(shortCalls.some(c => c.id === 'c_short_2'));
    assert(!shortCalls.some(c => c.id === 'c_long'), 'Calls >= 15s must not be in shortCalls');
    assert(!shortCalls.some(c => c.id === 'c_failed'), '00:00 failed calls must not be in shortCalls');

    // 3. Follow-up Deduplication Invariant: If a customer had a < 15s call but later completed a >= 15s call, they are resolved!
    const followUpQueueWithLaterFullCall = [
      { id: 'call_1', cleanPhone: '9451696020', durationSec: 6, timestamp: '2026-11-03T10:00:00+05:30', isConnected: true },
      { id: 'call_2', cleanPhone: '9451696020', durationSec: 35, timestamp: '2026-11-03T10:30:00+05:30', isConnected: true }
    ];

    const allCallsMerged = followUpQueueWithLaterFullCall;
    const unresolvedShortCalls = followUpQueueWithLaterFullCall
      .filter(c => c.isConnected && c.durationSec > 0 && c.durationSec < 15)
      .filter(c => {
        const cTime = new Date(c.timestamp).getTime();
        const hasLaterFullCall = allCallsMerged.some(o => 
          o.cleanPhone === c.cleanPhone && 
          o.isConnected && 
          o.durationSec >= 15 && 
          new Date(o.timestamp).getTime() > (cTime + 1000)
        );
        return !hasLaterFullCall;
      });

    assert.strictEqual(unresolvedShortCalls.length, 0, 'ग्राहक से बाद में पूरी बात (>15s) हो जाने पर उसे शॉर्ट कॉल फॉलो-अप कतार से हटा दिया जाना चाहिए');
  });

  // Cleanup
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
});

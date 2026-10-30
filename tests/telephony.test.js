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

  // Cleanup
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
});

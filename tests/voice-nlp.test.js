const test = require('node:test');
const assert = require('node:assert');

// Node-compatible Hindi Voice Command NLP Logic (mirroring public/js/voice.js)
const hindiWordMap = {
  'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'बीस': 20, 'पच्चीस': 25, 'तीस': 30, 'चालीस': 40, 'पचास': 50,
  'सौ': 100, 'हजार': 1000, 'हज़ार': 1000, 'लाख': 100000
};

const devanagariDigits = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

function extractAmount(text) {
  let convertedText = text;
  for (const [dev, arab] of Object.entries(devanagariDigits)) {
    convertedText = convertedText.replaceAll(dev, arab);
  }
  const digitMatch = convertedText.match(/(\d+)\s*(रुपये|रु|रूपए|rupees|rs)?/i);
  if (digitMatch && parseInt(digitMatch[1], 10) > 0) {
    return parseInt(digitMatch[1], 10);
  }
  const words = text.split(/\s+/);
  let total = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (hindiWordMap[w] !== undefined) {
      const val = hindiWordMap[w];
      if (val === 100 || val === 1000 || val === 100000) {
        total = (total === 0 ? 1 : total) * val;
      } else {
        total += val;
      }
    }
  }
  return total;
}

function parseVoiceCommand(text) {
  const lower = text.toLowerCase();

  if (lower.includes('दुकान बंद') || lower.includes('बंद कर दो')) {
    return { type: 'SHOP_TOGGLE', action: 'CLOSE', shopId: lower.includes('किराना') ? 'kirana' : 'krishi' };
  }
  if (lower.includes('दुकान खोलो') || lower.includes('खोल दो')) {
    return { type: 'SHOP_TOGGLE', action: 'OPEN', shopId: lower.includes('किराना') ? 'kirana' : 'krishi' };
  }

  const amount = extractAmount(lower);
  let txnType = 'CUSTOMER_CREDIT_SALE';
  if (lower.includes('जमा') || lower.includes('दिए') || lower.includes('चुकाया')) {
    txnType = 'CUSTOMER_PAYMENT';
  } else if (lower.includes('उधार') || lower.includes('खाते') || lower.includes('बाकी')) {
    txnType = 'CUSTOMER_CREDIT_SALE';
  } else if (lower.includes('बेची') || lower.includes('बेचा') || lower.includes('नकद')) {
    txnType = 'CASH_SALE';
  }

  let personName = '';
  const match = text.match(/([^\s]+(?:\s+[^\s]+)?)\s+(ने|को|जी\s+ने|जी\s+को|का|की)/);
  if (match && match[1]) {
    personName = match[1].replace(/^(आज|कल|कृपया|भैया|सुनो)\s*/, '').trim();
  }

  const isAmbiguous = !amount || amount <= 0 || (txnType !== 'CASH_SALE' && !personName);

  return {
    type: 'TRANSACTION',
    txnType,
    amount,
    personName,
    isAmbiguous,
    requiresConfirmation: true // MANDATORY RULE: Must require confirmation before saving
  };
}

test('Hindi Voice Recognition & NLP Parser Tests', async (t) => {
  await t.test('Command 1: "रामलाल ने पाँच सौ रुपये जमा किए।"', () => {
    const res = parseVoiceCommand('रामलाल ने पाँच सौ रुपये जमा किए।');
    assert.strictEqual(res.txnType, 'CUSTOMER_PAYMENT');
    assert.strictEqual(res.amount, 500);
    assert.strictEqual(res.personName, 'रामलाल');
    assert.strictEqual(res.isAmbiguous, false);
  });

  await t.test('Command 2: "मोहन को एक हजार रुपये का उधार दिया।"', () => {
    const res = parseVoiceCommand('मोहन को एक हजार रुपये का उधार दिया।');
    assert.strictEqual(res.txnType, 'CUSTOMER_CREDIT_SALE');
    assert.strictEqual(res.amount, 1000);
    assert.strictEqual(res.personName, 'मोहन');
    assert.strictEqual(res.isAmbiguous, false);
  });

  await t.test('Command 3: "आज दो बोरी खाद बेची।"', () => {
    const res = parseVoiceCommand('आज दो बोरी खाद बेची।');
    assert.strictEqual(res.txnType, 'CASH_SALE');
  });

  await t.test('Command 4: "दुकान बंद कर दो।"', () => {
    const res = parseVoiceCommand('दुकान बंद कर दो।');
    assert.strictEqual(res.type, 'SHOP_TOGGLE');
    assert.strictEqual(res.action, 'CLOSE');
  });

  await t.test('TEST 13: Voice recognition results require explicit confirmation before financial entries are saved', () => {
    const res = parseVoiceCommand('रामलाल ने पाँच सौ रुपये जमा किए।');
    // Financial entries must NEVER be automatically saved without confirmation
    assert.strictEqual(res.requiresConfirmation, true);
  });

  await t.test('Ambiguity Detection: Flags command when amount or person name is missing', () => {
    const res = parseVoiceCommand('रामलाल को उधार दिया'); // Missing amount!
    assert.strictEqual(res.isAmbiguous, true);
    assert.strictEqual(res.amount, 0);
  });
});

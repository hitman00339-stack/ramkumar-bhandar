require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Database, toRupees, formatHindiCurrency } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Optional API Key middleware for AI Telephony and Remote Sync
function verifyTelephonyAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
  const expectedKey = process.env.AI_TELEPHONY_API_KEY;

  if (expectedKey && authHeader !== expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return res.status(401).json({
      success: false,
      error: 'अनधिकृत: मान्य API Key आवश्यक है (Unauthorized AI Telephony Request)'
    });
  }
  next();
}

// ----------------------------------------------------
// 1. SHOP STATUS & OVERVIEW APIS
// ----------------------------------------------------
app.get('/api/shops/status', (req, res) => {
  try {
    const shops = db.getShops();
    const combinedSummary = db.getCombinedMarketSummary();
    res.json({
      success: true,
      shops,
      combinedSummary
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/shops/status', (req, res) => {
  try {
    const { shopId, isOpen, clientTimestamp } = req.body;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'दुकान ID आवश्यक है' });
    }
    const updated = db.setShopStatus(shopId, isOpen, clientTimestamp);
    res.json({
      success: true,
      message: `${updated.name} की स्थिति सफलतापूर्वक अपडेट की गई`,
      shop: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/shops/service', (req, res) => {
  try {
    const { shopId, enabled } = req.body;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'दुकान ID आवश्यक है' });
    }
    const updated = db.setPhoneServiceEnabled(shopId, enabled);
    res.json({
      success: true,
      message: `फोन सेवा स्थिति बदली गई`,
      shop: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/shops/sync-retry', (req, res) => {
  try {
    const { shopId } = req.body;
    const shop = db.getShop(shopId);
    shop.aiPhoneSyncStatus = 'synced';
    shop.syncError = null;
    shop.lastUpdated = new Date().toISOString();
    db.save();
    res.json({
      success: true,
      message: 'सिंक्रनाइज़ेशन पुनः प्रयास सफल रहा',
      shop
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/summary', (req, res) => {
  try {
    const shopId = req.query.shopId;
    if (shopId) {
      const summary = db.getShopFinancialSummary(shopId);
      res.json({ success: true, shopId, summary });
    } else {
      const combined = db.getCombinedMarketSummary();
      res.json({ success: true, combined });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 2. KHATABOOK & TRANSACTIONS APIS
// ----------------------------------------------------
app.get('/api/transactions', (req, res) => {
  try {
    const { shopId, filter, search } = req.query;
    let list = db.data.transactions;

    if (shopId) {
      list = list.filter(t => t.shopId === shopId);
    }

    if (filter === 'due') {
      list = list.filter(t => t.type === 'CUSTOMER_CREDIT_SALE');
    } else if (filter === 'give') {
      list = list.filter(t => t.type === 'SUPPLIER_CREDIT_PURCHASE' || t.type === 'SUPPLIER_PAYMENT');
    } else if (filter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      list = list.filter(t => t.date && t.date.slice(0, 10) === today);
    } else if (filter === 'month') {
      const thisMonth = new Date().toISOString().slice(0, 7);
      list = list.filter(t => t.date && t.date.slice(0, 7) === thisMonth);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.supplierName && t.supplierName.toLowerCase().includes(q)) ||
        (t.phone && t.phone.includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.productName && t.productName.toLowerCase().includes(q))
      );
    }

    // Format transaction amounts to Rupees for client display
    const formatted = list.map(t => ({
      ...t,
      amountRupees: toRupees(t.amount),
      balanceAfterRupees: t.balanceAfter !== null ? toRupees(t.balanceAfter) : null,
      payableAfterRupees: t.payableAfter !== null ? toRupees(t.payableAfter) : null
    }));

    res.json({ success: true, transactions: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const result = db.createTransaction(req.body);
    const txn = result.transaction;
    const formatted = {
      ...txn,
      amountRupees: toRupees(txn.amount),
      balanceAfterRupees: txn.balanceAfter !== null ? toRupees(txn.balanceAfter) : null,
      payableAfterRupees: txn.payableAfter !== null ? toRupees(txn.payableAfter) : null
    };

    res.json({
      success: true,
      duplicate: result.duplicate,
      message: result.message,
      transaction: formatted
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 3. INVENTORY MANAGEMENT APIS
// ----------------------------------------------------
app.get('/api/inventory', (req, res) => {
  try {
    const { shopId, category } = req.query;
    let products = db.getProducts(shopId);

    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    const formatted = products.map(p => ({
      ...p,
      purchasePriceRupees: toRupees(p.purchasePrice),
      sellingPriceRupees: toRupees(p.sellingPrice),
      isLowStock: p.quantity <= p.minQuantityAlert,
      isExpiringSoon: p.expiryDate ? (new Date(p.expiryDate).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000 && new Date(p.expiryDate).getTime() >= Date.now()) : false
    }));

    res.json({ success: true, products: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/inventory', (req, res) => {
  try {
    const newProduct = db.addProduct(req.body);
    res.json({
      success: true,
      message: 'नया सामान स्टॉक में सफलतापूर्वक जोड़ा गया',
      product: {
        ...newProduct,
        purchasePriceRupees: toRupees(newProduct.purchasePrice),
        sellingPriceRupees: toRupees(newProduct.sellingPrice)
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/inventory/adjust', (req, res) => {
  try {
    const { productId, deltaQuantity, reason, allowNegative } = req.body;
    const updated = db.adjustProductStock(productId, deltaQuantity, reason, allowNegative);
    res.json({
      success: true,
      message: 'स्टॉक सफलतापूर्वक अपडेट किया गया',
      product: {
        ...updated,
        purchasePriceRupees: toRupees(updated.purchasePrice),
        sellingPriceRupees: toRupees(updated.sellingPrice)
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 4. CUSTOMERS & SUPPLIERS DIRECTORY APIS
// ----------------------------------------------------
app.get('/api/customers', (req, res) => {
  try {
    const { shopId, search } = req.query;
    let list = db.getCustomers(shopId);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.village && c.village.toLowerCase().includes(q))
      );
    }

    const formatted = list.map(c => ({
      ...c,
      balancesRupees: {
        krishi: toRupees(c.balances.krishi || 0),
        kirana: toRupees(c.balances.kirana || 0),
        total: toRupees((c.balances.krishi || 0) + (c.balances.kirana || 0))
      }
    }));

    res.json({ success: true, customers: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, phone, village, role, shopId, callReminderDate } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'ग्राहक का नाम अनिवार्य है' });
    }
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'AI कॉल और व्हाट्सऐप के लिए 10 अंकों का मोबाइल नंबर अनिवार्य है' });
    }
    const customer = db.addCustomer({
      name,
      phone: cleanPhone,
      village,
      role: role || 'ग्राहक',
      shopId: shopId || 'krishi'
    });
    if (callReminderDate) {
      customer.callReminderDate = callReminderDate;
      db.save();
    }
    res.json({
      success: true,
      message: 'ग्राहक खाता सफलतापूर्वक बनाया गया',
      customer
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const customer = db.updateCustomer(req.params.id, req.body);
    res.json({
      success: true,
      message: 'ग्राहक विवरण सफलतापूर्वक अपडेट किया गया',
      customer
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/customers/:id/reminder', (req, res) => {
  try {
    const { callReminderDate, notes } = req.body;
    const customer = db.setCustomerCallReminder(req.params.id, callReminderDate, notes);
    res.json({
      success: true,
      message: 'तकादा / कॉल की तारीख सफलतापूर्वक सेट की गई',
      customer
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// AI AGENT REMINDER CALL TO UDHAR CUSTOMER
app.post('/api/ai-phone/call-customer', (req, res) => {
  try {
    const { customerId, customerName, phone, amount, shopId } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'ग्राहक का मोबाइल नंबर आवश्यक है' });
    }

    const shop = db.getShop(shopId || 'krishi');
    const shopName = shop ? shop.name : 'रामकुमार भंडार';

    const callRecord = {
      id: 'call_out_' + Date.now(),
      direction: 'outbound',
      callerNumber: phone,
      customerName: customerName || 'ग्राहक',
      shopTarget: shopId || 'krishi',
      timestamp: new Date().toISOString(),
      queryText: `उधार तकादा कॉल: ₹${amount || 0} बकाया राशि`,
      responseText: `नमस्ते ${customerName || ''} जी, रामकुमार भंडार (${shopName}) से कॉल है। आपका कुल ₹${amount || 0} का बकाया हिसाब है। कृपया इसे जल्द से जल्द चुकता करने की कृपा करें।`,
      needsFollowUp: false,
      status: 'initiated'
    };

    if (!db.data.callLogs) db.data.callLogs = [];
    db.data.callLogs.unshift(callRecord);
    db.save();

    res.json({
      success: true,
      message: `AI एजेंट द्वारा ${customerName} (+91 ${phone}) को तकादा कॉल का निर्देश दे दिया गया है`,
      callRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/suppliers', (req, res) => {
  try {
    const { shopId, search } = req.query;
    let list = db.getSuppliers(shopId);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
      );
    }

    const formatted = list.map(s => ({
      ...s,
      balancesRupees: {
        krishi: toRupees(s.balances.krishi || 0),
        kirana: toRupees(s.balances.kirana || 0),
        total: toRupees((s.balances.krishi || 0) + (s.balances.kirana || 0))
      }
    }));

    res.json({ success: true, suppliers: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/suppliers', (req, res) => {
  try {
    const supplier = db.addSupplier(req.body);
    res.json({
      success: true,
      message: 'सप्लायर सफलतापूर्वक जोड़ा गया',
      supplier
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 5. AI TELEPHONE AGENT INTEGRATION APIS
// ----------------------------------------------------
app.get('/api/ai-phone/status', (req, res) => {
  try {
    const shopId = req.query.shopId || 'krishi';
    const state = db.getAiPhoneState(shopId);
    res.json({
      success: true,
      ...state
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ai-phone/call-logs', (req, res) => {
  try {
    const shopId = req.query.shopId;
    const logs = db.data.aiPhone.callLogs.filter(c => !shopId || c.shopId === shopId);
    res.json({ success: true, callLogs: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ai-phone/instruction', (req, res) => {
  try {
    const { instruction } = req.body;
    const result = db.setAiInstruction(instruction);
    res.json({
      success: true,
      message: 'एआई फोन एजेंट को नया निर्देश याद करा दिया गया',
      result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Webhook for Telephony Providers (Twilio, Exotel, Sarv, Custom AI Voice Agent)
app.post('/api/ai-phone/webhook', verifyTelephonyAuth, (req, res) => {
  try {
    const {
      CallerNumber,
      QueryText,
      ShopTarget, // 'krishi' | 'kirana' | null
      CustomerName
    } = req.body;

    const caller = CallerNumber || 'अज्ञात ग्राहक';
    const query = QueryText ? QueryText.trim() : 'दुकान खुली है क्या?';
    
    // Determine target shop
    let shopId = ShopTarget;
    if (!shopId) {
      if (query.includes('खाद') || query.includes('बीज') || query.includes('दवा') || query.includes('यूरिया') || query.includes('डीएपी')) {
        shopId = 'krishi';
      } else if (query.includes('तेल') || query.includes('किराना') || query.includes('आटा') || query.includes('नमक') || query.includes('राशन')) {
        shopId = 'kirana';
      } else {
        shopId = 'krishi'; // Default to primary shop
      }
    }

    const shop = db.getShop(shopId);
    let responseSpeech = '';
    let isUrgent = false;

    // Check if phone service is enabled
    if (!shop.phoneServiceEnabled) {
      responseSpeech = `नमस्ते, रामकुमार भंडार में आपका स्वागत है। अभी हमारी फोन सेवा अनुपलब्ध है। कृपया बाद में प्रयास करें।`;
    } else if (query.includes('खुली') || query.includes('बंद') || query.includes('समय')) {
      if (shop.isOpen) {
        responseSpeech = `नमस्ते! रामकुमार भंडार की ${shop.name} अभी खुली है और शाम 8 बजे तक खुली रहेगी। आप पधार सकते हैं।`;
      } else {
        responseSpeech = `नमस्ते! रामकुमार भंडार की ${shop.name} अभी बंद है। दुकान कल सुबह 8 बजे खुलेगी। क्या कोई जरूरी संदेश छोड़ना चाहते हैं?`;
      }
    } else if (query.includes('उपलब्ध') || query.includes('स्टॉक') || query.includes('रेट') || query.includes('दाम')) {
      // Stock inquiry
      const activeInstruction = db.data.aiPhone.activeInstruction;
      responseSpeech = `नमस्ते! दुकान खुली है। ${activeInstruction ? activeInstruction + '। ' : ''}अधिक जानकारी के लिए रामकुमार जी से संपर्क करा रहे हैं।`;
      isUrgent = true;
    } else {
      responseSpeech = `नमस्ते, रामकुमार भंडार! आपकी दुकान अभी ${shop.isOpen ? 'खुली है' : 'बंद है'}। हम आपका संदेश नोट कर रहे हैं।`;
      isUrgent = true;
    }

    // Save call log
    const recordedCall = db.recordIncomingCall({
      shopId,
      customerName: CustomerName || 'कॉल करने वाले ग्राहक',
      phone: caller,
      role: shopId === 'krishi' ? 'किसान' : 'ग्राहक',
      transcriptUser: query,
      transcriptAi: responseSpeech,
      isUrgent,
      statusLabel: isUrgent ? 'वापस फोन करें (जरूरी)' : 'सफल बात'
    });

    res.json({
      success: true,
      shopId,
      shopIsOpen: shop.isOpen,
      responseSpeech,
      callId: recordedCall.id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// ----------------------------------------------------
// 5.1 OMNIDIMENSION LIVE AI AGENTS & CALL LOGS APIS
// ----------------------------------------------------
const OMNIDIM_API_KEY = process.env.OMNIDIM_API_KEY || 'DBLJu9zg5E2Mahmpp7-vrjrIX8xTAvLeBlIjKDpMMtI';
const OMNIDIM_BASE_URL = 'https://backend.omnidim.io/api/v1';

app.get('/api/omnidim/agents', async (req, res) => {
  try {
    const response = await fetch(`${OMNIDIM_BASE_URL}/agents`, {
      headers: { 'Authorization': `Bearer ${OMNIDIM_API_KEY}` }
    });
    const data = await response.json();
    const bots = data.bots || [];
    
    const incomingBot = bots.find(b => b.name && b.name.toLowerCase().includes('incoming')) || bots[0] || null;
    const outgoingBot = bots.find(b => b.name && b.name.toLowerCase().includes('outgoing')) || bots[1] || null;

    res.json({
      success: true,
      incomingBot,
      outgoingBot,
      bots
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/omnidim/call-logs', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const pageSize = req.query.pagesize || 15;
    const response = await fetch(`${OMNIDIM_BASE_URL}/calls/logs?pageno=${page}&pagesize=${pageSize}`, {
      headers: { 'Authorization': `Bearer ${OMNIDIM_API_KEY}` }
    });
    const data = await response.json();
    res.json({
      success: true,
      logs: data.call_log_data || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/omnidim/dispatch', async (req, res) => {
  try {
    const { agentId, toNumber, prompt, context } = req.body;
    if (!toNumber) {
      return res.status(400).json({ success: false, error: 'कॉल करने के लिए मोबाइल नंबर आवश्यक है' });
    }

    const cleanNumber = toNumber.replace(/\D/g, '');
    const formattedNumber = cleanNumber.startsWith('91') ? `+${cleanNumber}` : `+91${cleanNumber}`;
    const targetAgentId = agentId || 276578; // Default to Outgoing agent

    // Record outbound call in local logs
    const localCall = {
      id: 'call_omni_' + Date.now(),
      direction: 'outbound',
      callerNumber: formattedNumber,
      customerName: context?.customerName || 'किसान भाई',
      shopTarget: 'krishi',
      timestamp: new Date().toISOString(),
      queryText: prompt || 'AI आउटगोइंग कॉल',
      responseText: 'Omnidimension AI एजेंट द्वारा कॉल प्रारंभ की गई',
      needsFollowUp: false,
      status: 'dispatched'
    };
    if (!db.data.callLogs) db.data.callLogs = [];
    db.data.callLogs.unshift(localCall);
    db.save();

    res.json({
      success: true,
      message: `${formattedNumber} पर AI एजेंट कॉल का निर्देश भेज दिया गया है`,
      call: localCall
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 5.2 SPRAYER MACHINE RENTAL & QR APIS (कृषि स्प्रेयर मशीन)
// ----------------------------------------------------
app.get('/api/sprayers', (req, res) => {
  try {
    const sprayers = db.getSprayerMachines();
    res.json({ success: true, sprayers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sprayers/issue', (req, res) => {
  try {
    const { machineId, customerPhone, customerName, dueHours, batteryLevel, notes } = req.body;
    const machine = db.issueSprayerMachine({
      machineId,
      customerPhone,
      customerName,
      dueHours,
      batteryLevel,
      notes
    });
    res.json({
      success: true,
      message: `${machine.name} सफलतापूर्वक ${customerName || customerPhone} को ${dueHours} घंटे के लिए दी गई`,
      machine
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/sprayers/return', (req, res) => {
  try {
    const { machineId, returnBatteryLevel, notes } = req.body;
    const { machine, returnRecord } = db.returnSprayerMachine({
      machineId,
      returnBatteryLevel,
      notes
    });
    res.json({
      success: true,
      message: `✓ ${machine.name} सफलतापूर्वक वापस जमा कर ली गई और अब उपलब्ध (OK) है`,
      machine,
      returnRecord
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/sprayers/history', (req, res) => {
  try {
    const history = db.getSprayerHistory();
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Automated 1-minute interval for checking overdue sprayer machines & triggering 2-hour reminder calls
setInterval(() => {
  try {
    db.checkSprayerOverdueAndTriggerCalls((callInfo) => {
      console.log(`[AI AUTO CALL] Triggering overdue reminder call to ${callInfo.phone} for ${callInfo.machineName}`);
      // Record into callLogs
      const callRecord = {
        id: 'call_spray_overdue_' + Date.now(),
        direction: 'outbound',
        callerNumber: callInfo.phone,
        customerName: callInfo.customerName,
        shopTarget: 'krishi',
        timestamp: new Date().toISOString(),
        queryText: `स्प्रे मशीन वापसी तकादा: ${callInfo.machineName}`,
        responseText: callInfo.prompt,
        needsFollowUp: true,
        status: 'initiated'
      };
      if (!db.data.callLogs) db.data.callLogs = [];
      db.data.callLogs.unshift(callRecord);
      db.save();
    });
  } catch (e) {
    console.warn('Sprayer overdue interval check failed:', e.message);
  }
}, 60000);

// 6. BACKUP, RESTORE & DATA EXPORT APIS
// ----------------------------------------------------
app.get('/api/backup', (req, res) => {
  try {
    const backup = db.exportBackup();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ramkumar_bhandar_backup_${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/restore', (req, res) => {
  try {
    const result = db.restoreBackup(req.body);
    res.json({
      success: true,
      message: 'बैकअप सफलतापूर्वक रीस्टोर कर दिया गया',
      result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/export/csv', (req, res) => {
  try {
    const type = req.query.type || 'transactions';
    let csv = '';

    if (type === 'transactions') {
      csv = 'दिनांक,दुकान,प्रकार,ग्राहक/सप्लायर,फोन,राशि(₹),विवरण\n';
      db.data.transactions.forEach(t => {
        const d = t.date ? t.date.slice(0, 10) : '';
        const s = t.shopId === 'krishi' ? 'कृषि (खाद-बीज)' : 'किराना स्टोर';
        const person = (t.customerName || t.supplierName || '').replace(/,/g, ' ');
        const desc = (t.description || '').replace(/,/g, ' ');
        csv += `${d},${s},${t.type},${person},${t.phone || ''},${toRupees(t.amount)},${desc}\n`;
      });
      res.setHeader('Content-Disposition', 'attachment; filename="khatabook_report.csv"');
    } else if (type === 'inventory') {
      csv = 'दुकान,उत्पाद_नाम,ब्रांड,श्रेणी,इकाई,मात्रा,कम_स्टॉक_सीमा,खरीद_मूल्य(₹),बिक्री_मूल्य(₹),बैच_नंबर,समाप्ति_दिनांक\n';
      db.data.products.forEach(p => {
        const s = p.shopId === 'krishi' ? 'कृषि' : 'किराना';
        csv += `${s},${p.name.replace(/,/g, ' ')},${p.brand || ''},${p.category},${p.unit},${p.quantity},${p.minQuantityAlert},${toRupees(p.purchasePrice)},${toRupees(p.sellingPrice)},${p.batchNumber || ''},${p.expiryDate || ''}\n`;
      });
      res.setHeader('Content-Disposition', 'attachment; filename="stock_inventory_report.csv"');
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + csv); // Include BOM for proper Excel UTF-8 Hindi rendering
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Offline Sync Batch Endpoint
app.post('/api/sync', (req, res) => {
  try {
    const { queue } = req.body;
    if (!Array.isArray(queue) || queue.length === 0) {
      return res.json({ success: true, processedCount: 0 });
    }

    const results = [];
    queue.forEach(item => {
      try {
        if (item.action === 'CREATE_TRANSACTION') {
          const res = db.createTransaction(item.payload);
          results.push({ id: item.id, status: 'success', duplicate: res.duplicate });
        } else if (item.action === 'SET_SHOP_STATUS') {
          db.setShopStatus(item.payload.shopId, item.payload.isOpen, item.payload.clientTimestamp);
          results.push({ id: item.id, status: 'success' });
        }
      } catch (err) {
        results.push({ id: item.id, status: 'error', error: err.message });
      }
    });

    res.json({
      success: true,
      processedCount: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback to SPA index.html for navigation routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server if not loaded as a module in tests
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  🌾 रामकुमार भंडार - कृषि एवं किराना दुकान प्रबंधन  `);
    console.log(`  सर्वर सफलतापूर्वक चालू है: http://localhost:${PORT} `);
    console.log(`======================================================\n`);
  });
}

module.exports = app;

const fs = require('fs');
const path = require('path');

// Decimal safety: All monetary amounts stored as integer paise (1 Rupee = 100 Paise)
function toPaise(rupees) {
  if (rupees === null || rupees === undefined) return 0;
  const num = typeof rupees === 'string' ? parseFloat(rupees.replace(/[^\d.-]/g, '')) : Number(rupees);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function toRupees(paise) {
  if (paise === null || paise === undefined) return 0;
  return Math.round(Number(paise)) / 100;
}

// Convert numbers to Hindi Devanagari numerals
function toHindiDigits(number) {
  if (number === null || number === undefined) return '०';
  const hindiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(number).replace(/[0-9]/g, (digit) => hindiDigits[digit]);
}

// Format currency as Hindi Devanagari ₹ format (e.g. ₹४८,५००)
function formatHindiCurrency(rupees, useDevanagari = false) {
  const amount = Number(rupees) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(amount);
  
  if (useDevanagari) {
    return '₹' + toHindiDigits(formatted);
  }
  return '₹' + formatted;
}

class Database {
  constructor(filePath) {
    this.filePath = filePath || process.env.DATABASE_FILE || path.join(__dirname, 'data', 'ramkumar_bhandar.json');
    this.data = null;
    this.ensureInitialized();
  }

  ensureInitialized() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
        let needsSave = false;
        if (!this.data.sprayerMachines) {
          this.data.sprayerMachines = this.getDefaultSprayers();
          needsSave = true;
        }
        if (!this.data.sprayerHistory) {
          this.data.sprayerHistory = [];
          needsSave = true;
        }
        if (!this.data.contactsBook) {
          this.data.contactsBook = [];
          needsSave = true;
        }
        if (!this.data.campaignContacts) {
          this.data.campaignContacts = [];
          needsSave = true;
        }
        if (!this.data.omnidimLogsCache) {
          this.data.omnidimLogsCache = [];
          needsSave = true;
        }
        if (needsSave) this.save();
        return;
      } catch (err) {
        console.error('Error reading database file, re-initializing with seed data:', err.message);
      }
    }

    this.data = this.getSeedData();
    this.save();
  }

  getSeedData() {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      lastBackupTime: now,
      shops: {
        krishi: {
          id: 'krishi',
          name: 'बीज, खाद एवं दवाइयाँ',
          shortName: 'कृषि शाखा',
          tagline: 'खेती का सामान और किसानों का हिसाब',
          isOpen: true,
          lastUpdated: now,
          phoneServiceEnabled: true,
          aiPhoneSyncStatus: 'synced', // 'synced' | 'pending' | 'failed'
          syncError: null
        },
        kirana: {
          id: 'kirana',
          name: 'किराना एवं जनरल स्टोर',
          shortName: 'किराना विंग',
          tagline: 'घर के सामान और ग्राहकों का हिसाब',
          isOpen: true,
          lastUpdated: now,
          phoneServiceEnabled: true,
          aiPhoneSyncStatus: 'synced',
          syncError: null
        }
      },
      customers: [],
      suppliers: [],
      products: [
        // Agricultural shop items
        {
          id: 'prod_k_1',
          shopId: 'krishi',
          name: 'डीएपी खाद',
          brand: 'इफ्को (IFFCO)',
          category: 'खाद',
          unit: 'बोरी (50 कि.ग्रा.)',
          purchasePrice: toPaise(1250),
          sellingPrice: toPaise(1350),
          quantity: 4, // low stock!
          minQuantityAlert: 10,
          batchNumber: 'IFF-2026-DAP41',
          expiryDate: '2027-12-31',
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 4, reason: 'आरंभिक स्टॉक' }
          ]
        },
        {
          id: 'prod_k_2',
          shopId: 'krishi',
          name: 'यूरिया',
          brand: 'इफ्को (IFFCO)',
          category: 'खाद',
          unit: 'बोरी (45 कि.ग्रा.)',
          purchasePrice: toPaise(242),
          sellingPrice: toPaise(266.50),
          quantity: 12, // low stock!
          minQuantityAlert: 20,
          batchNumber: 'IFF-2026-UR89',
          expiryDate: '2028-06-30',
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 12, reason: 'आरंभिक स्टॉक' }
          ]
        },
        {
          id: 'prod_k_3',
          shopId: 'krishi',
          name: 'सरसों बीज 240',
          brand: 'पायनियर / श्रीराम',
          category: 'बीज',
          unit: 'पैकेट (1 कि.ग्रा.)',
          purchasePrice: toPaise(550),
          sellingPrice: toPaise(650),
          quantity: 6, // low stock!
          minQuantityAlert: 15,
          batchNumber: 'SAR-2026-B1',
          expiryDate: '2027-04-15',
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 6, reason: 'आरंभिक स्टॉक' }
          ]
        },
        {
          id: 'prod_k_4',
          shopId: 'krishi',
          name: 'कोराजन 60ml',
          brand: 'एफएमसी (FMC)',
          category: 'कीटनाशक',
          unit: 'शीशी (60 मिली)',
          purchasePrice: toPaise(1650),
          sellingPrice: toPaise(1850),
          quantity: 8,
          minQuantityAlert: 5,
          batchNumber: 'COR-098-FMC',
          expiryDate: '2026-11-20', // Expiring in < 30 days!
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 8, reason: 'आरंभिक स्टॉक' }
          ]
        },
        {
          id: 'prod_k_5',
          shopId: 'krishi',
          name: 'प्रोपेक्स कीटनाशक',
          brand: 'धानुका',
          category: 'कीटनाशक',
          unit: 'डिब्बा (500 ग्राम)',
          purchasePrice: toPaise(420),
          sellingPrice: toPaise(490),
          quantity: 14,
          minQuantityAlert: 10,
          batchNumber: 'PRX-2026-90',
          expiryDate: '2026-11-28', // Expiring in < 30 days!
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 14, reason: 'आरंभिक स्टॉक' }
          ]
        },
        {
          id: 'prod_k_6',
          shopId: 'krishi',
          name: 'जिंक सल्फेट 33%',
          brand: 'उत्तम जिंक',
          category: 'खाद व पोषक तत्व',
          unit: 'थैली (5 कि.ग्रा.)',
          purchasePrice: toPaise(380),
          sellingPrice: toPaise(450),
          quantity: 3, // low stock!
          minQuantityAlert: 10,
          batchNumber: 'ZNC-33-2026',
          expiryDate: '2028-01-01',
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 3, reason: 'आरंभिक स्टॉक' }
          ]
        },
        // Kirana shop items
        {
          id: 'prod_g_1',
          shopId: 'kirana',
          name: 'फॉर्च्यून सरसों तेल (1L)',
          brand: 'फॉर्च्यून',
          category: 'तेल व घी',
          unit: 'बोतल',
          purchasePrice: toPaise(135),
          sellingPrice: toPaise(150),
          quantity: 24,
          minQuantityAlert: 10,
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 24, reason: 'आरंभिक स्टॉक' }
          ]
        },
        {
          id: 'prod_g_2',
          shopId: 'kirana',
          name: 'आशीर्वाद शुद्ध चक्की आटा (10kg)',
          brand: 'आशीर्वाद',
          category: 'राशन व अनाज',
          unit: 'थैला',
          purchasePrice: toPaise(360),
          sellingPrice: toPaise(395),
          quantity: 5, // low stock!
          minQuantityAlert: 12,
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 5, reason: 'आरंभिक स्टॉक' }
          ]
        },
        {
          id: 'prod_g_3',
          shopId: 'kirana',
          name: 'टाटा नमक 1kg',
          brand: 'टाटा',
          category: 'मसाले व किराना',
          unit: 'पैकेट',
          purchasePrice: toPaise(24),
          sellingPrice: toPaise(28),
          quantity: 48,
          minQuantityAlert: 20,
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 48, reason: 'आरंभिक स्टॉक' }
          ]
        },
        {
          id: 'prod_g_4',
          shopId: 'kirana',
          name: 'फॉर्च्यून 5 लीटर तेल टीन',
          brand: 'फॉर्च्यून',
          category: 'तेल व घी',
          unit: 'टीन',
          purchasePrice: toPaise(710),
          sellingPrice: toPaise(780),
          quantity: 8,
          minQuantityAlert: 5,
          createdAt: now,
          history: [
            { date: now, type: 'OPENING_STOCK', qty: 8, reason: 'आरंभिक स्टॉक' }
          ]
        }
      ],
      transactions: [],
      contactsBook: [],
      campaignContacts: [],
      aiPhone: {
        assistanceNumber: '+91 98260 78210',
        activeInstruction: '',
        lastUpdatedInstruction: now,
        inquiryTopics: [],
        callLogs: []
      },
      idempotencyKeys: {}
    };
  }

  save() {
    if (this.data) {
      this.data.lastMutationTime = new Date().toISOString();
    }
    const content = JSON.stringify(this.data, null, 2);
    try {
      const tempPath = this.filePath + '.tmp';
      fs.writeFileSync(tempPath, content, 'utf8');
      try {
        fs.renameSync(tempPath, this.filePath);
      } catch (renameErr) {
        // Windows EPERM fallback: copy and remove temp
        fs.copyFileSync(tempPath, this.filePath);
        try { fs.unlinkSync(tempPath); } catch (e) {}
      }
    } catch (err) {
      fs.writeFileSync(this.filePath, content, 'utf8');
    }

    if (typeof this.onSave === 'function') {
      try { this.onSave(this.data); } catch (e) {}
    }
  }

  // Atomic transaction runner: rolls back on exception
  transaction(fn) {
    const snapshot = JSON.parse(JSON.stringify(this.data));
    try {
      const result = fn(this);
      this.save();
      return result;
    } catch (err) {
      this.data = snapshot;
      throw err;
    }
  }

  // SHOP STATUS & SYNC
  getShops() {
    return this.data.shops;
  }

  getShop(shopId) {
    const shop = this.data.shops[shopId];
    if (!shop) throw new Error(`दुकान नहीं मिली: ${shopId}`);
    return shop;
  }

  setShopStatus(shopId, isOpen, clientTimestamp = null) {
    return this.transaction(() => {
      const shop = this.getShop(shopId);

      // Prevent stale requests from overwriting newer changes
      if (clientTimestamp && new Date(clientTimestamp) < new Date(shop.lastUpdated)) {
        throw new Error('पुरानी स्थिति अनुरोध - दुकान पहले ही अपडेट हो चुकी है');
      }

      shop.isOpen = Boolean(isOpen);
      shop.lastUpdated = new Date().toISOString();
      shop.aiPhoneSyncStatus = 'synced';
      shop.syncError = null;

      return { ...shop };
    });
  }

  setPhoneServiceEnabled(shopId, enabled) {
    return this.transaction(() => {
      const shop = this.getShop(shopId);
      shop.phoneServiceEnabled = Boolean(enabled);
      shop.lastUpdated = new Date().toISOString();
      return { ...shop };
    });
  }

  // Simulates or records a sync failure for offline/retry testing
  setShopSyncFailure(shopId, errorMessage) {
    return this.transaction(() => {
      const shop = this.getShop(shopId);
      shop.aiPhoneSyncStatus = 'failed';
      shop.syncError = errorMessage || 'सिंक्रनाइज़ेशन विफल रहा';
      return { ...shop };
    });
  }

  // CUSTOMERS & BALANCES
  getCustomers(shopId = null) {
    if (!shopId) return this.data.customers;
    return this.data.customers.filter(c => c.associatedShops.includes(shopId));
  }

  getCustomer(customerId) {
    return this.data.customers.find(c => c.id === customerId);
  }

  addCustomer({ name, phone, village = '', role = 'ग्राहक', shopId = 'krishi' }) {
    return this.transaction(() => {
      if (!name || !name.trim()) throw new Error('ग्राहक का नाम आवश्यक है');
      const id = 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const newCust = {
        id,
        name: name.trim(),
        role,
        phone: phone ? phone.trim() : '',
        village: village ? village.trim() : '',
        associatedShops: [shopId],
        balances: {
          krishi: 0,
          kirana: 0
        },
        lastPaymentDate: null,
        createdAt: new Date().toISOString()
      };
      this.data.customers.push(newCust);
      return newCust;
    });
  }

  updateCustomer(customerId, { name, phone, village, callReminderDate, notes }) {
    return this.transaction(() => {
      const customer = this.getCustomer(customerId);
      if (!customer) throw new Error('ग्राहक नहीं मिला');
      if (name && name.trim()) customer.name = name.trim();
      if (phone !== undefined) customer.phone = phone.trim();
      if (village !== undefined) customer.village = village.trim();
      if (callReminderDate !== undefined) customer.callReminderDate = callReminderDate;
      if (notes !== undefined) customer.notes = notes;
      customer.updatedAt = new Date().toISOString();
      return customer;
    });
  }

  setCustomerCallReminder(customerId, callReminderDate, notes = '') {
    return this.transaction(() => {
      const customer = this.getCustomer(customerId);
      if (!customer) throw new Error('ग्राहक नहीं मिला');
      customer.callReminderDate = callReminderDate;
      if (notes) customer.callNotes = notes;
      customer.updatedAt = new Date().toISOString();
      return customer;
    });
  }

  // SUPPLIERS & BALANCES
  getSuppliers(shopId = null) {
    if (!shopId) return this.data.suppliers;
    return this.data.suppliers.filter(s => s.associatedShops.includes(shopId));
  }

  getSupplier(supplierId) {
    return this.data.suppliers.find(s => s.id === supplierId);
  }

  addSupplier({ name, phone, shopId = 'krishi' }) {
    return this.transaction(() => {
      if (!name || !name.trim()) throw new Error('सप्लायर का नाम आवश्यक है');
      const id = 'sup_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const newSup = {
        id,
        name: name.trim(),
        phone: phone ? phone.trim() : '',
        associatedShops: [shopId],
        balances: {
          krishi: 0,
          kirana: 0
        },
        createdAt: new Date().toISOString()
      };
      this.data.suppliers.push(newSup);
      return newSup;
    });
  }

  // INVENTORY
  getProducts(shopId = null) {
    if (!shopId) return this.data.products;
    return this.data.products.filter(p => p.shopId === shopId);
  }

  getProduct(productId) {
    return this.data.products.find(p => p.id === productId);
  }

  addProduct({
    shopId,
    name,
    brand = '',
    category,
    unit,
    purchasePrice,
    sellingPrice,
    quantity = 0,
    minQuantityAlert = 5,
    batchNumber = '',
    expiryDate = null
  }) {
    return this.transaction(() => {
      if (!shopId) throw new Error('दुकान का चयन अनिवार्य है');
      if (!name || !name.trim()) throw new Error('उत्पाद का नाम अनिवार्य है');

      const id = 'prod_' + (shopId === 'krishi' ? 'k_' : 'g_') + Date.now();
      const now = new Date().toISOString();

      const newProduct = {
        id,
        shopId,
        name: name.trim(),
        brand: brand ? brand.trim() : '',
        category: category || (shopId === 'krishi' ? 'अन्य' : 'किराना'),
        unit: unit || 'पीस',
        purchasePrice: toPaise(purchasePrice),
        sellingPrice: toPaise(sellingPrice),
        quantity: Number(quantity) || 0,
        minQuantityAlert: Number(minQuantityAlert) || 5,
        batchNumber: batchNumber ? batchNumber.trim() : '',
        expiryDate: expiryDate || null,
        createdAt: now,
        history: [
          { date: now, type: 'OPENING_STOCK', qty: Number(quantity) || 0, reason: 'नया सामान जोड़ा गया' }
        ]
      };

      this.data.products.push(newProduct);
      return newProduct;
    });
  }

  adjustProductStock(productId, deltaQuantity, reason = 'मैनुअल सुधार', allowNegative = false) {
    return this.transaction(() => {
      const product = this.getProduct(productId);
      if (!product) throw new Error(`उत्पाद नहीं मिला: ${productId}`);

      const newQty = product.quantity + Number(deltaQuantity);
      if (newQty < 0 && !allowNegative) {
        throw new Error(`स्टॉक अपर्याप्त है। मौजूदा स्टॉक: ${product.quantity}, मांग: ${Math.abs(deltaQuantity)}`);
      }

      product.quantity = newQty;
      product.history = product.history || [];
      product.history.push({
        date: new Date().toISOString(),
        type: Number(deltaQuantity) >= 0 ? 'STOCK_IN' : 'STOCK_OUT',
        qty: Math.abs(Number(deltaQuantity)),
        balanceAfter: newQty,
        reason
      });

      return product;
    });
  }

  // TRANSACTIONS & KHATABOOK ENGINE
  createTransaction({
    idempotencyKey,
    shopId,
    type,
    amount,
    customerId,
    customerName,
    role = 'ग्राहक',
    phone = '',
    supplierId,
    supplierName,
    productId,
    quantity = 0,
    paymentMethod = 'CASH',
    description = '',
    date = null,
    source = 'manual'
  }) {
    // 1. Idempotency Check
    if (idempotencyKey && this.data.idempotencyKeys[idempotencyKey]) {
      const existingTxnId = this.data.idempotencyKeys[idempotencyKey];
      const existingTxn = this.data.transactions.find(t => t.id === existingTxnId);
      if (existingTxn) {
        return {
          duplicate: true,
          message: 'यह लेन-देन पहले ही सफलतापूर्वक दर्ज हो चुका है (डुप्लिकेट रोकथाम)',
          transaction: existingTxn
        };
      }
    }

    return this.transaction(() => {
      const amountPaise = toPaise(amount);
      if (amountPaise <= 0) {
        throw new Error('मान्य राशि दर्ज करें (शून्य से अधिक)');
      }

      const txnId = 'txn_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const now = date ? new Date(date).toISOString() : new Date().toISOString();

      let balanceAfter = null;
      let payableAfter = null;

      // Ensure customer exists or create if needed
      let targetCustomer = null;
      if (customerId) {
        targetCustomer = this.getCustomer(customerId);
      } else if (customerName && customerName.trim()) {
        targetCustomer = this.data.customers.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
        if (!targetCustomer) {
          targetCustomer = {
            id: 'cust_' + Date.now(),
            name: customerName.trim(),
            role,
            phone,
            associatedShops: [shopId],
            balances: { krishi: 0, kirana: 0 },
            lastPaymentDate: null,
            createdAt: now
          };
          this.data.customers.push(targetCustomer);
        }
      }

      // Ensure supplier exists or create if needed
      let targetSupplier = null;
      if (supplierId) {
        targetSupplier = this.getSupplier(supplierId);
      } else if (supplierName && supplierName.trim()) {
        targetSupplier = this.data.suppliers.find(s => s.name.toLowerCase() === supplierName.trim().toLowerCase());
        if (!targetSupplier) {
          targetSupplier = {
            id: 'sup_' + Date.now(),
            name: supplierName.trim(),
            phone,
            associatedShops: [shopId],
            balances: { krishi: 0, kirana: 0 },
            createdAt: now
          };
          this.data.suppliers.push(targetSupplier);
        }
      }

      // Handle Linked Inventory Item decrement/increment
      let linkedProduct = null;
      if (productId) {
        linkedProduct = this.getProduct(productId);
        if (!linkedProduct) throw new Error(`उत्पाद नहीं मिला: ${productId}`);
      }

      // EXECUTE CRITICAL ACCOUNTING RULES
      switch (type) {
        case 'CUSTOMER_CREDIT_SALE': // ग्राहक को उधार दिया
          if (!targetCustomer) throw new Error('उधार बिक्री के लिए ग्राहक का चयन आवश्यक है');
          targetCustomer.balances[shopId] = (targetCustomer.balances[shopId] || 0) + amountPaise;
          balanceAfter = targetCustomer.balances[shopId];

          if (linkedProduct && quantity > 0) {
            if (linkedProduct.quantity < quantity) {
              throw new Error(`स्टॉक अपर्याप्त है। ${linkedProduct.name} का मौजूदा स्टॉक: ${linkedProduct.quantity}`);
            }
            linkedProduct.quantity -= quantity;
            linkedProduct.history.push({
              date: now,
              type: 'SALE_CREDIT',
              qty: quantity,
              balanceAfter: linkedProduct.quantity,
              reason: `ग्राहक ${targetCustomer.name} को उधार बिक्री (पर्ची #${txnId})`
            });
          }
          break;

        case 'CUSTOMER_PAYMENT': // ग्राहक से पैसा मिला (जमा)
          if (!targetCustomer) throw new Error('भुगतान जमा करने के लिए ग्राहक आवश्यक है');
          targetCustomer.balances[shopId] = (targetCustomer.balances[shopId] || 0) - amountPaise;
          targetCustomer.lastPaymentDate = now;
          balanceAfter = targetCustomer.balances[shopId];
          // Rule: Must not create another sale or touch stock
          break;

        case 'CASH_SALE': // नकद बिक्री
          if (linkedProduct && quantity > 0) {
            if (linkedProduct.quantity < quantity) {
              throw new Error(`स्टॉक अपर्याप्त है। ${linkedProduct.name} का मौजूदा स्टॉक: ${linkedProduct.quantity}`);
            }
            linkedProduct.quantity -= quantity;
            linkedProduct.history.push({
              date: now,
              type: 'SALE_CASH',
              qty: quantity,
              balanceAfter: linkedProduct.quantity,
              reason: `नकद बिक्री (पर्ची #${txnId})`
            });
          }
          break;

        case 'SUPPLIER_CREDIT_PURCHASE': // सप्लायर से उधार माल खरीदा
          if (!targetSupplier) throw new Error('उधार खरीद के लिए सप्लायर आवश्यक है');
          targetSupplier.balances[shopId] = (targetSupplier.balances[shopId] || 0) + amountPaise;
          payableAfter = targetSupplier.balances[shopId];

          if (linkedProduct && quantity > 0) {
            linkedProduct.quantity += quantity;
            linkedProduct.history.push({
              date: now,
              type: 'PURCHASE_CREDIT',
              qty: quantity,
              balanceAfter: linkedProduct.quantity,
              reason: `सप्लायर ${targetSupplier.name} से खरीद (बिल #${txnId})`
            });
          }
          break;

        case 'SUPPLIER_PAYMENT': // सप्लायर को भुगतान किया
          if (!targetSupplier) throw new Error('सप्लायर भुगतान के लिए सप्लायर आवश्यक है');
          targetSupplier.balances[shopId] = (targetSupplier.balances[shopId] || 0) - amountPaise;
          payableAfter = targetSupplier.balances[shopId];
          // Rule: Must not create another purchase or touch stock
          break;

        case 'CASH_EXPENSE': // नकद खर्च
          // Outflow recorded
          break;

        case 'CREDIT_EXPENSE': // उधार खर्च
          // Payable recorded without reducing cash
          break;

        default:
          throw new Error(`अमान्य लेन-देन प्रकार: ${type}`);
      }

      const newTxn = {
        id: txnId,
        shopId,
        idempotencyKey: idempotencyKey || null,
        type,
        amount: amountPaise,
        customerId: targetCustomer ? targetCustomer.id : null,
        customerName: targetCustomer ? targetCustomer.name : (customerName || null),
        role: targetCustomer ? targetCustomer.role : role,
        phone: targetCustomer ? targetCustomer.phone : phone,
        supplierId: targetSupplier ? targetSupplier.id : null,
        supplierName: targetSupplier ? targetSupplier.name : (supplierName || null),
        productId: linkedProduct ? linkedProduct.id : null,
        productName: linkedProduct ? linkedProduct.name : null,
        quantity: quantity || 0,
        paymentMethod,
        description: description || '',
        date: now,
        source,
        balanceAfter,
        payableAfter,
        createdAt: now
      };

      this.data.transactions.unshift(newTxn);

      if (idempotencyKey) {
        this.data.idempotencyKeys[idempotencyKey] = txnId;
      }

      return {
        duplicate: false,
        message: 'लेन-देन सफलतापूर्वक सहेजा गया',
        transaction: newTxn
      };
    });
  }

  // SUMMARY CALCULATOR FOR DASHBOARDS
  getShopFinancialSummary(shopId) {
    const txns = this.data.transactions.filter(t => !shopId || t.shopId === shopId);
    const customers = this.getCustomers(shopId);
    const suppliers = this.getSuppliers(shopId);

    // Sum total customer due (लेना बाकी)
    let totalCustomerDuePaise = 0;
    let customerWithDueCount = 0;
    customers.forEach(c => {
      const b = shopId ? (c.balances[shopId] || 0) : ((c.balances.krishi || 0) + (c.balances.kirana || 0));
      if (b > 0) {
        totalCustomerDuePaise += b;
        customerWithDueCount++;
      }
    });

    // Sum total supplier payable (देना बाकी)
    let totalSupplierPayablePaise = 0;
    let supplierWithPayableCount = 0;
    suppliers.forEach(s => {
      const b = shopId ? (s.balances[shopId] || 0) : ((s.balances.krishi || 0) + (s.balances.kirana || 0));
      if (b > 0) {
        totalSupplierPayablePaise += b;
        supplierWithPayableCount++;
      }
    });

    // Today's boundaries
    const today = new Date().toISOString().slice(0, 10);
    let todaySalesPaise = 0;
    let todayCashSalesPaise = 0;
    let todayCreditSalesPaise = 0;
    let todayCustomerPaymentPaise = 0;
    let todayCustomerPaymentCount = 0;
    let todayCashSpentPaise = 0;

    txns.forEach(t => {
      const txnDate = t.date ? t.date.slice(0, 10) : '';
      if (txnDate === today) {
        if (t.type === 'CUSTOMER_CREDIT_SALE') {
          todaySalesPaise += t.amount;
          todayCreditSalesPaise += t.amount;
        } else if (t.type === 'CASH_SALE') {
          todaySalesPaise += t.amount;
          todayCashSalesPaise += t.amount;
        } else if (t.type === 'CUSTOMER_PAYMENT') {
          todayCustomerPaymentPaise += t.amount;
          todayCustomerPaymentCount++;
        } else if (t.type === 'SUPPLIER_PAYMENT' || t.type === 'CASH_EXPENSE') {
          todayCashSpentPaise += t.amount;
        }
      }
    });

    // Stock alerts
    const products = this.getProducts(shopId);
    let lowStockCount = 0;
    let expiringCount = 0;
    const nowMs = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    products.forEach(p => {
      if (p.quantity <= p.minQuantityAlert) lowStockCount++;
      if (p.expiryDate) {
        const expMs = new Date(p.expiryDate).getTime();
        if (expMs - nowMs <= thirtyDaysMs && expMs >= nowMs) {
          expiringCount++;
        }
      }
    });

    return {
      totalCustomerDue: toRupees(totalCustomerDuePaise),
      customerWithDueCount,
      totalSupplierPayable: toRupees(totalSupplierPayablePaise),
      supplierWithPayableCount,
      todaySales: toRupees(todaySalesPaise),
      todayCashSales: toRupees(todayCashSalesPaise),
      todayCreditSales: toRupees(todayCreditSalesPaise),
      todayCustomerPayment: toRupees(todayCustomerPaymentPaise),
      todayCustomerPaymentCount,
      todayCashSpent: toRupees(todayCashSpentPaise),
      lowStockCount,
      expiringCount
    };
  }

  // Combined overview across both shops
  getCombinedMarketSummary() {
    const krishiSummary = this.getShopFinancialSummary('krishi');
    const kiranaSummary = this.getShopFinancialSummary('kirana');

    return {
      totalMarketDue: krishiSummary.totalCustomerDue + kiranaSummary.totalCustomerDue,
      krishi: krishiSummary,
      kirana: kiranaSummary
    };
  }

  // AI TELEPHONE AGENT
  getAiPhoneState(shopId = 'krishi') {
    const shop = this.getShop(shopId);
    return {
      shopId,
      shopName: shop.name,
      shopIsOpen: shop.isOpen,
      shopStatusText: shop.isOpen ? 'दुकान खुली है' : 'दुकान बंद है',
      phoneServiceEnabled: shop.phoneServiceEnabled,
      syncStatus: shop.aiPhoneSyncStatus,
      syncError: shop.syncError,
      lastUpdated: shop.lastUpdated,
      assistanceNumber: this.data.aiPhone.assistanceNumber,
      activeInstruction: this.data.aiPhone.activeInstruction,
      inquiryTopics: this.data.aiPhone.inquiryTopics,
      callLogs: this.data.aiPhone.callLogs.filter(c => !shopId || c.shopId === shopId)
    };
  }

  setAiInstruction(text) {
    return this.transaction(() => {
      if (!text || !text.trim()) throw new Error('निर्देश खाली नहीं हो सकता');
      this.data.aiPhone.activeInstruction = text.trim();
      this.data.aiPhone.lastUpdatedInstruction = new Date().toISOString();
      return {
        instruction: this.data.aiPhone.activeInstruction,
        updatedAt: this.data.aiPhone.lastUpdatedInstruction
      };
    });
  }

  recordIncomingCall({
    shopId = 'krishi',
    customerName = 'अनजान ग्राहक',
    phone = '',
    role = 'ग्राहक',
    transcriptUser = '',
    transcriptAi = '',
    isUrgent = false,
    statusLabel = 'सफल बात',
    audioDuration = '0:30 मिनट'
  }) {
    return this.transaction(() => {
      const id = 'call_' + Date.now();
      const call = {
        id,
        shopId,
        customerName,
        role,
        phone,
        date: 'आज, अभी',
        timestamp: new Date().toISOString(),
        isUrgent,
        statusLabel,
        transcriptUser,
        transcriptAi,
        audioDuration,
        hasAudio: true
      };

      this.data.aiPhone.callLogs.unshift(call);
      return call;
    });
  }

  // BACKUP & RESTORE
  exportBackup() {
    return {
      exportTimestamp: new Date().toISOString(),
      appName: 'रामकुमार भंडार',
      data: JSON.parse(JSON.stringify(this.data))
    };
  }

  restoreBackup(backupPayload) {
    if (!backupPayload || !backupPayload.data || !backupPayload.data.shops) {
      throw new Error('अमान्य बैकअप डेटा फ़ाइल - आवश्यक संरचना अनुपलब्ध है');
    }
    return this.transaction(() => {
      this.data = JSON.parse(JSON.stringify(backupPayload.data));
      this.data.lastBackupTime = new Date().toISOString();
      return {
        restoredAt: this.data.lastBackupTime,
        shopsCount: Object.keys(this.data.shops).length,
        transactionsCount: this.data.transactions.length,
        customersCount: this.data.customers.length,
        productsCount: this.data.products.length
      };
    });
  }

  // ----------------------------------------------------
  // SPRAYER MACHINES & RENTAL TRACKING (कृषि स्प्रे मशीन)
  // ----------------------------------------------------
  getDefaultSprayers() {
    return [
      { id: 'SP-01', qrCode: 'SP-01', name: 'बैटरी स्प्रेयर मशीन #1 (16L डबल मोटर)', batteryLevel: 100, status: 'AVAILABLE', currentRental: null },
      { id: 'SP-02', qrCode: 'SP-02', name: 'बैटरी स्प्रेयर मशीन #2 (16L हैवी ड्यूटी)', batteryLevel: 100, status: 'AVAILABLE', currentRental: null },
      { id: 'SP-03', qrCode: 'SP-03', name: 'बैटरी स्प्रेयर मशीन #3 (12L लाइटवेट)', batteryLevel: 95, status: 'AVAILABLE', currentRental: null },
      { id: 'SP-04', qrCode: 'SP-04', name: 'हाथ वाला नेपसैक स्प्रेयर #4', batteryLevel: 100, status: 'AVAILABLE', currentRental: null }
    ];
  }

  getSprayerMachines() {
    const now = new Date();
    if (!this.data.sprayerMachines) {
      this.data.sprayerMachines = this.getDefaultSprayers();
    }
    // Auto-evaluate overdue status
    this.data.sprayerMachines.forEach(m => {
      if (m.currentRental && m.currentRental.dueTime) {
        if (now >= new Date(m.currentRental.dueTime)) {
          m.status = 'OVERDUE';
        }
      }
    });
    return this.data.sprayerMachines;
  }

  getSprayerMachine(idOrQr) {
    if (!this.data.sprayerMachines) this.data.sprayerMachines = this.getDefaultSprayers();
    return this.data.sprayerMachines.find(m => m.id === idOrQr || m.qrCode === idOrQr);
  }

  issueSprayerMachine({ machineId, customerPhone, customerName = '', dueHours = 4, batteryLevel = 100, notes = '' }) {
    return this.transaction(() => {
      const machine = this.getSprayerMachine(machineId);
      if (!machine) throw new Error('स्प्रे मशीन नहीं मिली (अमान्य QR या ID)');
      if (machine.status === 'RENTED' || machine.status === 'OVERDUE') {
        throw new Error(`${machine.name} पहले से खेत पर दी हुई है (वापस आने तक दूसरी मशीन चुनें)`);
      }

      const cleanPhone = (customerPhone || '').replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('AI वापसी कॉल के लिए किसान का 10 अंकों का मोबाइल नंबर अनिवार्य है');
      }

      const now = new Date();
      const hours = parseFloat(dueHours) || 4;
      const dueTime = new Date(now.getTime() + hours * 3600 * 1000).toISOString();

      machine.status = 'RENTED';
      machine.batteryLevel = parseInt(batteryLevel, 10) || machine.batteryLevel || 100;
      machine.currentRental = {
        rentalId: 'rent_' + Date.now(),
        customerPhone: cleanPhone,
        customerName: (customerName || '').trim() || 'किसान भाई',
        dispatchTime: now.toISOString(),
        dueHours: hours,
        dueTime,
        nextCallDueTime: dueTime,
        lastCallTime: null,
        callCount: 0,
        dispatchBatteryLevel: machine.batteryLevel,
        notes: notes ? notes.trim() : ''
      };

      return machine;
    });
  }

  returnSprayerMachine({ machineId, returnBatteryLevel = null, notes = '' }) {
    return this.transaction(() => {
      const machine = this.getSprayerMachine(machineId);
      if (!machine) throw new Error('स्प्रे मशीन नहीं मिली');

      const completedRental = machine.currentRental || {};
      const returnRecord = {
        ...completedRental,
        machineId: machine.id,
        machineName: machine.name,
        returnTime: new Date().toISOString(),
        returnBatteryLevel: returnBatteryLevel !== null ? parseInt(returnBatteryLevel, 10) : machine.batteryLevel,
        returnNotes: notes ? notes.trim() : ''
      };

      if (!this.data.sprayerHistory) this.data.sprayerHistory = [];
      this.data.sprayerHistory.unshift(returnRecord);

      machine.status = 'AVAILABLE';
      if (returnBatteryLevel !== null) {
        machine.batteryLevel = parseInt(returnBatteryLevel, 10);
      }
      machine.currentRental = null;

      return { machine, returnRecord };
    });
  }

  getSprayerHistory() {
    return this.data.sprayerHistory || [];
  }

  checkSprayerOverdueAndTriggerCalls(callDispatchCallback) {
    const now = new Date();
    const callsMade = [];

    if (!this.data.sprayerMachines) return callsMade;

    this.data.sprayerMachines.forEach(m => {
      if (m.currentRental && m.currentRental.dueTime) {
        const dueTime = new Date(m.currentRental.dueTime);
        if (now >= dueTime) {
          m.status = 'OVERDUE';
          const nextCallTime = m.currentRental.nextCallDueTime ? new Date(m.currentRental.nextCallDueTime) : dueTime;
          
          if (now >= nextCallTime) {
            const prompt = `नमस्ते ${m.currentRental.customerName} जी, रामकुमार खाद भंडार (कुँवरगद्दी) से कॉल है। आपके द्वारा ले जाई गई स्प्रे मशीन (${m.name}) का निर्धारित समय समाप्त हो चुका है। कृपया मशीन दुकान पर जल्द से जल्द वापस जमा करवाएं।`;
            
            if (typeof callDispatchCallback === 'function') {
              try {
                callDispatchCallback({
                  phone: m.currentRental.customerPhone,
                  customerName: m.currentRental.customerName,
                  machineName: m.name,
                  prompt
                });
              } catch (err) {
                console.warn('Call dispatch error for sprayer:', err.message);
              }
            }

            m.currentRental.lastCallTime = now.toISOString();
            m.currentRental.callCount = (m.currentRental.callCount || 0) + 1;
            // Schedule next call for 2 hours later!
            m.currentRental.nextCallDueTime = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
            callsMade.push({
              machineId: m.id,
              customerPhone: m.currentRental.customerPhone,
              customerName: m.currentRental.customerName,
              callCount: m.currentRental.callCount
            });
          }
        }
      }
    });

    if (callsMade.length > 0) {
      this.save();
    }
    return callsMade;
  }

  // ----------------------------------------------------
  // PERMANENT CONTACTS DIRECTORY (स्थायी संपर्क डायरेक्टरी)
  // Strictly deduplicated by clean 10-digit Indian phone number
  // ----------------------------------------------------
  getContactsBook() {
    if (!this.data.contactsBook) this.data.contactsBook = [];
    return this.data.contactsBook;
  }

  saveContactToBook({ name, phone, cleanPhone, village, category, campaign }) {
    if (!this.data.contactsBook) this.data.contactsBook = [];
    const clean = (cleanPhone || phone || '').replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) return null;

    const formatted = `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    let contact = this.data.contactsBook.find(c => c.cleanPhone === clean);

    const now = new Date().toISOString();
    if (contact) {
      // Update name if new name is more informative or longer
      if (name && name !== 'ग्रामवासी / ग्राहक') {
        if (!contact.name || contact.name === 'ग्रामवासी / ग्राहक' || name.trim().length > contact.name.length) {
          contact.name = name.trim();
        }
      }
      if (village && !contact.village) contact.village = village.trim();
      if (!contact.campaigns) contact.campaigns = [];
      if (campaign && !contact.campaigns.includes(campaign)) {
        contact.campaigns.push(campaign);
      }
      contact.updatedAt = now;
    } else {
      contact = {
        id: 'cont_' + clean,
        name: (name || 'ग्रामवासी / ग्राहक').trim(),
        cleanPhone: clean,
        phone: formatted,
        village: (village || '').trim(),
        category: category || 'customer',
        campaigns: campaign ? [campaign] : [],
        createdAt: now,
        updatedAt: now
      };
      this.data.contactsBook.push(contact);
    }
    this.data.lastMutationTime = now;
    this.save();
    return contact;
  }

  saveContactsBookBulk(contactsArray, campaignName = null) {
    if (!Array.isArray(contactsArray)) return [];
    const saved = [];
    for (const c of contactsArray) {
      const res = this.saveContactToBook({
        name: c.name,
        phone: c.phone,
        cleanPhone: c.cleanPhone,
        village: c.village,
        category: c.category,
        campaign: campaignName || c.campaign
      });
      if (res) saved.push(res);
    }
    return saved;
  }

  deleteContactFromBook(cleanPhone) {
    if (!this.data.contactsBook) return false;
    const clean = cleanPhone.replace(/\D/g, '').slice(-10);
    const initialLen = this.data.contactsBook.length;
    this.data.contactsBook = this.data.contactsBook.filter(c => c.cleanPhone !== clean);
    if (this.data.contactsBook.length !== initialLen) {
      this.data.lastMutationTime = new Date().toISOString();
      this.save();
      return true;
    }
    return false;
  }

  // ----------------------------------------------------
  // NUMBER-WISE CALL INTERACTION & PERSONAL PROFILE ENGINE
  // Stores turn-by-turn history, personal context, and auto-resolves callbacks
  // ----------------------------------------------------
  recordCallInteraction({
    cleanPhone,
    phone,
    name,
    direction = 'outbound',
    durationSec = 0,
    status = 'completed',
    summary = '',
    transcript = '',
    audioUrl = null,
    campaign = null,
    notes = null,
    onlyIfExisting = false
  }) {
    if (!this.data.contactsBook) this.data.contactsBook = [];
    const clean = (cleanPhone || phone || '').replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) return null;

    let contact = this.data.contactsBook.find(c => c.cleanPhone === clean);
    if (!contact) {
      if (onlyIfExisting) {
        // Do not add to contactsBook, but still resolve campaign status if connected
        const isConnectedCall = status === 'completed' && (durationSec > 0 || (transcript && transcript.length > 15));
        if (isConnectedCall && this.data.campaignContacts) {
          const campEntry = this.data.campaignContacts.find(c => c.cleanPhone === clean);
          if (campEntry) {
            campEntry.status = 'connected';
            campEntry.durationSec = durationSec;
            campEntry.durationStr = durationSec > 0 ? `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}` : '01:00';
            campEntry.summary = direction === 'inbound' 
              ? ('✅ कॉलबैक (सफल बातचीत): ' + (summary || 'ग्राहक ने वापस कॉल किया, संदेश प्राप्त'))
              : (summary || 'सफल बातचीत पूरी हुई');
            campEntry.lastCallAt = new Date().toISOString();
            if (audioUrl) campEntry.audioUrl = audioUrl;
            this.save();
          }
        }
        return null;
      }
      contact = this.saveContactToBook({
        name,
        phone,
        cleanPhone: clean,
        campaign
      });
    }

    if (!contact) return null;

    const now = new Date().toISOString();
    contact.totalCalls = (contact.totalCalls || 0) + 1;
    contact.lastCallDate = now;
    contact.lastCallDirection = direction;
    contact.lastCallStatus = status;
    contact.lastDurationSec = durationSec;
    if (summary) contact.lastSummary = summary;
    if (transcript) contact.lastTranscript = transcript;
    if (audioUrl) contact.audioUrl = audioUrl;

    if (!contact.personalData) contact.personalData = {};
    if (notes) contact.personalData.notes = notes;

    if (!contact.callHistory) contact.callHistory = [];
    // Avoid duplicate history entries by timestamp/summary
    const isDuplicate = contact.callHistory.some(h => 
      h.direction === direction && 
      Math.abs(new Date(h.date || 0) - new Date(now)) < 5000
    );

    if (!isDuplicate) {
      contact.callHistory.unshift({
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: now,
        direction,
        status,
        durationSec,
        durationStr: durationSec > 0 ? `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}` : '00:00',
        summary: summary || (status === 'completed' ? 'सफल बातचीत' : 'कॉल नहीं लगी'),
        transcript: transcript || '',
        audioUrl: audioUrl || null
      });
      // Keep up to 25 latest calls per number
      if (contact.callHistory.length > 25) {
        contact.callHistory = contact.callHistory.slice(0, 25);
      }
    }

    // AUTO-CALLBACK & CAMPAIGN RESOLUTION:
    // If call was connected (status completed or duration > 0),
    // immediately mark any campaign entry for this customer as 'connected'!
    // This ensures they are NEVER dialed again and REMOVED from not-received queue!
    const isConnectedCall = status === 'completed' && (durationSec > 0 || (transcript && transcript.length > 15));
    if (isConnectedCall && this.data.campaignContacts) {
      const campEntry = this.data.campaignContacts.find(c => c.cleanPhone === clean);
      if (campEntry) {
        campEntry.status = 'connected';
        campEntry.durationSec = durationSec;
        campEntry.durationStr = durationSec > 0 ? `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}` : '01:00';
        campEntry.summary = direction === 'inbound' 
          ? ('✅ कॉलबैक (सफल बातचीत): ' + (summary || 'ग्राहक ने वापस कॉल किया, संदेश प्राप्त'))
          : (summary || 'सफल बातचीत पूरी हुई');
        campEntry.lastCallAt = now;
        if (audioUrl) campEntry.audioUrl = audioUrl;
      }
    }

    this.data.lastMutationTime = now;
    this.save();
    return contact;
  }

  recordCallHistoryFromLogs(logsArray, { autoHarvestInbound = true } = {}) {
    if (!Array.isArray(logsArray)) return [];
    const botNumber = '8045440103';
    const processed = [];

    // Cache logs inside database (deduplicated by ID)
    if (!this.data.omnidimLogsCache) this.data.omnidimLogsCache = [];
    const existingLogMap = new Map();
    this.data.omnidimLogsCache.forEach(l => {
      if (l.id) existingLogMap.set(l.id, l);
    });

    for (const log of logsArray) {
      if (log.id) {
        existingLogMap.set(log.id, log);
      }
    }

    // Sort logs descending by time/id
    this.data.omnidimLogsCache = Array.from(existingLogMap.values()).sort((a, b) => {
      const ta = new Date(a.time_of_call || a.created_at || 0).getTime();
      const tb = new Date(b.time_of_call || b.created_at || 0).getTime();
      return tb - ta;
    });

    for (const log of logsArray) {
      const toClean = (log.to_number || '').replace(/\D/g, '');
      const fromClean = (log.from_number || '').replace(/\D/g, '');
      let rawPhone = '';
      const isOutbound = log.call_direction === 'outbound';

      if (log.from_number === 'Web Call' || log.to_number === 'Web Call' || log.call_type === 'web_call') {
        continue; // Skip web tests from master phone book
      } else if (toClean.includes(botNumber)) {
        rawPhone = log.from_number;
      } else if (fromClean.includes(botNumber)) {
        rawPhone = log.to_number;
      } else {
        rawPhone = isOutbound ? log.to_number : log.from_number;
      }

      const clean = (rawPhone || '').replace(/\D/g, '').slice(-10);
      if (clean.length !== 10) continue;

      const durationSec = (log.call_duration_in_minutes || 0) * 60 + (log.call_duration_in_seconds || 0);
      const rawStatus = (log.call_status || '').toLowerCase();
      const status = rawStatus === 'completed' ? 'completed' : 'failed';

      let recUrl = log.internal_recording_url || log.recording_url;
      if (recUrl && recUrl.startsWith('/')) recUrl = 'https://omnidim.io' + recUrl;

      let summary = log.sentiment_analysis_details || log.call_summary || '';
      if (!summary && log.call_conversation) {
        const lines = log.call_conversation.split(/<br\s*\/?>|\n/).map(l => l.trim()).filter(Boolean);
        const userLine = lines.find(l => l.toLowerCase().startsWith('user:'));
        if (userLine) summary = `पूछताछ: "${userLine.replace(/^user:/i, '').trim().substring(0, 80)}"`;
      }

      const isInbound = log.call_direction === 'inbound';
      const onlyIfExisting = isInbound ? !autoHarvestInbound : true;

      const contact = this.recordCallInteraction({
        cleanPhone: clean,
        phone: rawPhone,
        name: log.user_name || 'ग्रामवासी / ग्राहक',
        direction: log.call_direction || 'inbound',
        durationSec,
        status,
        summary,
        transcript: log.call_conversation || '',
        audioUrl: recUrl || null,
        campaign: isInbound ? 'इनकमिंग कॉल' : 'आउटगोइंग कॉल',
        onlyIfExisting
      });

      if (contact) processed.push(contact);
    }

    return processed;
  }

  updateContactPersonalData(cleanPhone, personalData = {}) {
    if (!this.data.contactsBook) return null;
    const clean = cleanPhone.replace(/\D/g, '').slice(-10);
    const contact = this.data.contactsBook.find(c => c.cleanPhone === clean);
    if (!contact) return null;

    if (!contact.personalData) contact.personalData = {};
    Object.assign(contact.personalData, personalData);
    contact.updatedAt = new Date().toISOString();
    this.data.lastMutationTime = contact.updatedAt;
    this.save();
    return contact;
  }

  getContactProfile(cleanPhone) {
    if (!this.data.contactsBook) return null;
    const clean = cleanPhone.replace(/\D/g, '').slice(-10);
    return this.data.contactsBook.find(c => c.cleanPhone === clean) || null;
  }
}

module.exports = {
  Database,
  toPaise,
  toRupees,
  toHindiDigits,
  formatHindiCurrency
};

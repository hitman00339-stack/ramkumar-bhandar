// State Management & Offline Synchronization Engine
const AppState = {
  isOnline: navigator.onLine,
  currentView: 'dookaanen',
  currentShopId: 'krishi', // 'krishi' | 'kirana'
  detailShopId: 'krishi',
  
  // In-memory cached state with local storage fallback
  shops: {
    krishi: {
      id: 'krishi',
      name: 'बीज, खाद एवं दवाइयाँ',
      shortName: 'कृषि शाखा',
      tagline: 'खेती का सामान और किसानों का हिसाब',
      isOpen: true,
      lastUpdated: new Date().toISOString(),
      phoneServiceEnabled: true,
      aiPhoneSyncStatus: 'synced',
      syncError: null
    },
    kirana: {
      id: 'kirana',
      name: 'किराना एवं जनरल स्टोर',
      shortName: 'किराना विंग',
      tagline: 'घर के सामान और ग्राहकों का हिसाब',
      isOpen: true,
      lastUpdated: new Date().toISOString(),
      phoneServiceEnabled: true,
      aiPhoneSyncStatus: 'synced',
      syncError: null
    }
  },
  
  combinedSummary: {
    totalMarketDue: 0,
    krishi: { totalCustomerDue: 0, supplierPayable: 0, todaySales: 0, todayCredit: 0, lowStockCount: 0 },
    kirana: { totalCustomerDue: 0, supplierPayable: 0, todaySales: 0, todayCredit: 0, lowStockCount: 0 }
  },

  transactions: [],
  products: [],
  customers: [],
  suppliers: [],
  callLogs: [],
  activeAiInstruction: '',
  lastMutationTime: null,
  
  // Offline sync queue
  syncQueue: [],
  listeners: [],

  init() {
    this.loadFromStorage();
    this.setupNetworkListeners();
    this.startAutoSyncPoller();
    this.fetchInitialData();
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notify() {
    this.saveToStorage();
    this.listeners.forEach(fn => fn(this));
  },

  saveToStorage() {
    try {
      localStorage.setItem('rb_shops', JSON.stringify(this.shops));
      localStorage.setItem('rb_transactions', JSON.stringify(this.transactions));
      localStorage.setItem('rb_products', JSON.stringify(this.products));
      localStorage.setItem('rb_customers', JSON.stringify(this.customers));
      localStorage.setItem('rb_sync_queue', JSON.stringify(this.syncQueue));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  },

  loadFromStorage() {
    try {
      const s = localStorage.getItem('rb_shops');
      if (s) this.shops = JSON.parse(s);

      const t = localStorage.getItem('rb_transactions');
      if (t) this.transactions = JSON.parse(t);

      const p = localStorage.getItem('rb_products');
      if (p) this.products = JSON.parse(p);

      const c = localStorage.getItem('rb_customers');
      if (c) this.customers = JSON.parse(c);

      const q = localStorage.getItem('rb_sync_queue');
      if (q) this.syncQueue = JSON.parse(q);
    } catch (e) {
      console.warn('Storage load failed:', e);
    }
  },

  async fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  },

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showToast('🟢 इंटरनेट जुड़ गया - डेटा सिंक हो रहा है...');
      this.updateNetworkBadge();
      this.processSyncQueue();
      this.fetchInitialData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showToast('🔴 ऑफ़लाइन मोड - डेटा आपके फोन में सुरक्षित रहेगा');
      this.updateNetworkBadge();
      this.notify();
    });

    // Auto-drain queue periodically when network recovers
    setInterval(() => {
      if (navigator.onLine && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
      this.updateNetworkBadge();
    }, 15000);
  },

  startAutoSyncPoller() {
    const checkSync = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await this.fetchWithTimeout('/api/sync/version', {}, 3500);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.lastMutationTime) {
            if (this.lastMutationTime && this.lastMutationTime !== data.lastMutationTime) {
              console.log('[Multi-Device Sync] Data mutation detected on remote phone/server. Synchronizing...');
              await this.fetchInitialData();
              this.showToast('🔄 अन्य डिवाइस से नया डेटा स्वतः सिंक हुआ!');
            }
            this.lastMutationTime = data.lastMutationTime;
          }
        }
      } catch (e) {
        // Silent fail on weak connectivity
      }
    };

    // Auto check every 6 seconds for multi-device synchronization
    setInterval(checkSync, 6000);

    // Sync instantly when user focuses or returns to tab/app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkSync();
      }
    });
    window.addEventListener('focus', checkSync);
  },

  updateNetworkBadge() {
    const icon = document.getElementById('header-net-icon');
    const text = document.getElementById('header-net-text');
    if (!icon || !text) return;

    if (!navigator.onLine) {
      icon.innerText = 'cloud_off';
      icon.className = 'material-symbols-outlined text-[14px] text-rose-500';
      text.innerText = '🔴 ऑफ़लाइन (सुरक्षित)';
    } else if (this.syncQueue.length > 0) {
      icon.innerText = 'sync';
      icon.className = 'material-symbols-outlined text-[14px] text-amber-500 animate-spin';
      text.innerText = `🔄 ${this.syncQueue.length} सिंक कतार`;
    } else {
      icon.innerText = 'cloud_done';
      icon.className = 'material-symbols-outlined text-[14px] text-emerald-600';
      text.innerText = 'सुरक्षित डेटा';
    }
  },

  async fetchInitialData() {
    try {
      const res = await fetch('/api/shops/status');
      if (res.ok) {
        const data = await res.json();
        if (data.shops) this.shops = data.shops;
        if (data.combinedSummary) this.combinedSummary = data.combinedSummary;
      }

      await Promise.all([
        this.fetchTransactions(),
        this.fetchProducts(),
        this.fetchCustomers(),
        this.fetchCallLogs()
      ]);

      this.notify();
    } catch (err) {
      console.warn('Initial data fetch failed, using local offline cache:', err);
      this.notify();
    }
  },

  async fetchTransactions(shopId = null, filter = 'all', search = '') {
    try {
      const sid = shopId || this.currentShopId;
      const url = `/api/transactions?shopId=${sid}&filter=${filter}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.transactions) {
          this.transactions = data.transactions;
          this.notify();
        }
      }
    } catch (err) {
      console.warn('Error fetching transactions:', err);
    }
  },

  async fetchProducts(shopId = null) {
    try {
      const sid = shopId || this.currentShopId;
      const res = await fetch(`/api/inventory?shopId=${sid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.products) {
          this.products = data.products;
          this.notify();
        }
      }
    } catch (err) {
      console.warn('Error fetching products:', err);
    }
  },

  async fetchCustomers(shopId = null) {
    try {
      const sid = shopId || this.currentShopId;
      const res = await fetch(`/api/customers?shopId=${sid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.customers) {
          this.customers = data.customers;
          this.notify();
        }
      }
    } catch (err) {
      console.warn('Error fetching customers:', err);
    }
  },

  async fetchCallLogs(shopId = null) {
    try {
      const sid = shopId || this.currentShopId;
      const res = await fetch(`/api/ai-phone/status?shopId=${sid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.callLogs) this.callLogs = data.callLogs;
        if (data.activeInstruction) this.activeAiInstruction = data.activeInstruction;
        this.notify();
      }
    } catch (err) {
      console.warn('Error fetching call logs:', err);
    }
  },

  // SHOP STATUS TOGGLE WITH OPTIMISTIC UPDATE & CONFIRMATION
  async toggleShopStatus(shopId) {
    const shop = this.shops[shopId];
    if (!shop) return;

    const previousState = shop.isOpen;
    const newState = !previousState;
    const clientTimestamp = new Date().toISOString();

    // 1. Immediate optimistic UI update
    shop.isOpen = newState;
    shop.lastUpdated = clientTimestamp;
    shop.aiPhoneSyncStatus = 'pending'; // Clearly distinguish locally saved vs confirmed!
    this.notify();

    // 2. Synchronize to server
    try {
      const res = await fetch('/api/shops/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, isOpen: newState, clientTimestamp })
      });

      if (res.ok) {
        const result = await res.json();
        shop.aiPhoneSyncStatus = 'synced';
        shop.syncError = null;
        shop.lastUpdated = result.shop.lastUpdated;
        this.showToast(`✓ ${shop.name} ${newState ? 'खोली गई' : 'बंद की गई'} (सिंक सफल)`);
      } else {
        const err = await res.json();
        shop.aiPhoneSyncStatus = 'failed';
        shop.syncError = err.error || 'सर्वर सिंक विफल';
        this.showToast(`⚠️ स्थानीय सहेजा गया, सर्वर सिंक विफल: ${shop.syncError}`);
      }
    } catch (networkErr) {
      // Offline queueing
      shop.aiPhoneSyncStatus = 'failed';
      shop.syncError = 'नेटवर्क अनुपलब्ध';
      this.syncQueue.push({
        id: 'sync_' + Date.now(),
        action: 'SET_SHOP_STATUS',
        payload: { shopId, isOpen: newState, clientTimestamp }
      });
      this.showToast('⚠️ ऑफ़लाइन: बदलाव फोन में सुरक्षित है, बाद में सिंक होगा');
    }

    this.notify();
  },

  // RETRY SYNC
  async retryShopSync(shopId) {
    const shop = this.shops[shopId];
    if (!shop) return;
    this.showToast('🔄 सिंक पुनः प्रयास हो रहा है...');
    try {
      const res = await fetch('/api/shops/sync-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId })
      });
      if (res.ok) {
        shop.aiPhoneSyncStatus = 'synced';
        shop.syncError = null;
        this.showToast('✓ एआई फोन सर्वर के साथ सिंक सफल!');
      } else {
        shop.aiPhoneSyncStatus = 'failed';
        this.showToast('❌ पुनः प्रयास विफल रहा');
      }
    } catch (e) {
      shop.aiPhoneSyncStatus = 'failed';
      this.showToast('❌ नेटवर्क त्रुटि - पुनः प्रयास विफल');
    }
    this.notify();
  },

  // TOGGLE PHONE SERVICE
  async togglePhoneService(shopId) {
    const shop = this.shops[shopId];
    if (!shop) return;
    const newState = !shop.phoneServiceEnabled;
    shop.phoneServiceEnabled = newState;
    this.notify();

    try {
      await fetch('/api/shops/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, enabled: newState })
      });
      this.showToast(`फोन सेवा ${newState ? 'चालू' : 'बंद'} कर दी गई`);
    } catch (e) {
      console.warn('Failed to update phone service on server:', e);
    }
  },

  // RECORD TRANSACTION WITH ATOMIC PERSISTENCE & IDEMPOTENCY
  async submitTransaction(payload) {
    if (!payload.idempotencyKey) {
      payload.idempotencyKey = 'cli_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    // Immediate local optimistic update
    const amt = parseFloat(payload.amount) || 0;
    const localTx = {
      id: 'txn_' + Date.now(),
      shopId: payload.shopId || this.currentShopId,
      type: payload.type,
      personName: payload.personName,
      phone: payload.phone,
      amount: amt,
      description: payload.description || '',
      timestamp: new Date().toISOString(),
      paymentMode: payload.paymentMode || 'cash'
    };
    this.transactions.unshift(localTx);

    // Update customer local balance optimistically
    if (payload.personName) {
      const cust = this.customers.find(c => c.name === payload.personName || (payload.phone && c.phone === payload.phone));
      if (cust) {
        if (payload.type === 'customer_credit') cust.currentBalance = (cust.currentBalance || 0) + amt;
        if (payload.type === 'customer_payment') cust.currentBalance = Math.max(0, (cust.currentBalance || 0) - amt);
      }
    }
    this.saveToStorage();
    this.notify();

    try {
      const res = await this.fetchWithTimeout('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 4000);

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'लेन-देन सहेजने में विफल');
      }

      this.showToast(result.message || '✓ हिसाब सफलतापूर्वक जुड़ गया');
      this.fetchInitialData();
      return result;
    } catch (err) {
      // Offline fallback: Queue for background sync
      this.syncQueue.push({
        id: 'sync_' + Date.now(),
        action: 'CREATE_TRANSACTION',
        payload
      });
      this.saveToStorage();
      this.showToast('⚠️ ऑफ़लाइन/धीमा इंटरनेट: हिसाब फोन में सुरक्षित दर्ज हुआ');
      this.updateNetworkBadge();
      return { success: true, offline: true, transaction: localTx };
    }
  },

  // PROCESS OFFLINE SYNC QUEUE
  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;
    try {
      const res = await this.fetchWithTimeout('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: this.syncQueue })
      }, 8000);
      if (res.ok) {
        this.syncQueue = [];
        this.saveToStorage();
        this.showToast('✓ सभी ऑफ़लाइन लेन-देन सफलतापूर्वक सिंक हो गए!');
        this.fetchInitialData();
        this.updateNetworkBadge();
      }
    } catch (e) {
      console.warn('Sync queue flush failed:', e);
    }
  },

  // CUSTOMER CREATION & CALL MANAGEMENT
  async createCustomer({ name, phone, village, role = 'ग्राहक', shopId = 'krishi', callReminderDate = '' }) {
    if (!name || !name.trim()) throw new Error('ग्राहक का नाम आवश्यक है');
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('AI कॉल और व्हाट्सऐप के लिए 10 अंकों का मोबाइल नंबर अनिवार्य है');
    }

    const localCust = {
      id: 'cust_' + Date.now(),
      name: name.trim(),
      phone: cleanPhone,
      village: village || '',
      role,
      associatedShops: [shopId || this.currentShopId],
      currentBalance: 0,
      callReminderDate: callReminderDate || '',
      createdAt: new Date().toISOString()
    };

    // Immediate local optimistic add
    this.customers.unshift(localCust);
    this.saveToStorage();
    this.notify();

    try {
      const res = await this.fetchWithTimeout('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: cleanPhone, village, role, shopId, callReminderDate })
      }, 4000);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ग्राहक जोड़ने में विफल');

      this.showToast(data.message || '✓ ग्राहक खाता बनाया गया');
      if (data.customer) {
        const idx = this.customers.findIndex(c => c.id === localCust.id);
        if (idx !== -1) this.customers[idx] = data.customer;
        this.saveToStorage();
      }
      return data.customer || localCust;
    } catch (err) {
      // Offline fallback
      this.syncQueue.push({
        id: 'sync_' + Date.now(),
        action: 'CREATE_CUSTOMER',
        payload: { name, phone: cleanPhone, village, role, shopId, callReminderDate }
      });
      this.saveToStorage();
      this.showToast('⚠️ ऑफ़लाइन: ग्राहक खाता फोन में सुरक्षित बना');
      this.updateNetworkBadge();
      return localCust;
    }
  },

  async setCustomerCallReminder(customerId, callReminderDate, notes = '') {
    const res = await fetch(`/api/customers/${customerId}/reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callReminderDate, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'तारीख अपडेट करने में विफल');
    this.showToast('✓ तकादा कॉल की तारीख सुरक्षित हो गई');
    await this.fetchCustomers();
    return data.customer;
  },

  async triggerAiCall(payload) {
    const res = await fetch('/api/ai-phone/call-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI कॉल शुरू करने में विफल');
    this.showToast(data.message || '🤖 AI एजेंट को तकादा कॉल का निर्देश दे दिया गया है');
    await this.fetchCallLogs();
    return data;
  },

  showToast(message) {
    const el = document.getElementById('app-toast');
    if (!el) return;
    el.innerText = message;
    el.classList.remove('hidden');
    el.classList.add('flex');
    setTimeout(() => {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }, 4000);
  }
};

window.AppState = AppState;

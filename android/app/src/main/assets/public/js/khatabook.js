// Khatabook & Accounting View Logic - Complete Dual Shop & Individual Customer Ledger
const KhatabookUI = {
  activeTab: 'customers', // 'customers' | 'transactions'
  currentFilter: 'all',   // 'all' | 'due' | 'give' | 'today' | 'month' | 'call_today'
  searchQuery: '',
  activeCustomer: null,
  ledgerDateFilter: '',

  init() {
    this.setupListeners();
  },

  setupListeners() {
    // Search input
    const searchInput = document.getElementById('ledger-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    // Filter tabs for transactions
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => {
          t.classList.remove('bg-primary', 'text-white');
          t.classList.add('bg-white', 'text-on-surface-variant');
        });
        tab.classList.remove('bg-white', 'text-on-surface-variant');
        tab.classList.add('bg-primary', 'text-white');
        this.currentFilter = tab.dataset.filter || 'all';
        this.renderTransactions();
      });
    });

    // New Entry Button
    const newEntryBtn = document.getElementById('btn-new-entry');
    if (newEntryBtn) {
      newEntryBtn.addEventListener('click', () => {
        this.openNewEntryModal();
      });
    }

    // Shop Switcher dropdown
    const shopDropdownBtn = document.getElementById('shop-dropdown-btn');
    const switchKiranaBtn = document.getElementById('switch-kirana-btn');
    if (shopDropdownBtn) {
      shopDropdownBtn.addEventListener('click', () => this.toggleDropdown());
    }
    if (switchKiranaBtn) {
      switchKiranaBtn.addEventListener('click', () => this.toggleShop());
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    const btnCust = document.getElementById('btn-tab-customers');
    const btnTxns = document.getElementById('btn-tab-txns');
    const custList = document.getElementById('customer-accounts-list');
    const txnsList = document.getElementById('transaction-list');
    const txnsFilter = document.getElementById('txns-filter-strip');

    if (tab === 'customers') {
      if (btnCust) {
        btnCust.className = 'h-11 rounded-xl bg-white text-[#003629] font-bold text-xs md:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all';
      }
      if (btnTxns) {
        btnTxns.className = 'h-11 rounded-xl text-slate-600 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all';
      }
      if (custList) custList.classList.remove('hidden');
      if (txnsList) txnsList.classList.add('hidden');
      if (txnsFilter) txnsFilter.classList.add('hidden');
    } else {
      if (btnCust) {
        btnCust.className = 'h-11 rounded-xl text-slate-600 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all';
      }
      if (btnTxns) {
        btnTxns.className = 'h-11 rounded-xl bg-white text-[#003629] font-bold text-xs md:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all';
      }
      if (custList) custList.classList.add('hidden');
      if (txnsList) txnsList.classList.remove('hidden');
      if (txnsFilter) txnsFilter.classList.remove('hidden');
    }
    this.render();
  },

  toggleCallTodayFilter() {
    if (this.currentFilter === 'call_today') {
      this.currentFilter = 'all';
      const btn = document.getElementById('btn-call-today');
      if (btn) {
        btn.className = 'h-11 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 flex items-center justify-center gap-1 shadow-xs border border-amber-300 active:scale-95 transition-all cursor-pointer';
        document.getElementById('btn-call-today-text').innerText = '📞 आज कॉल';
      }
    } else {
      this.currentFilter = 'call_today';
      this.switchTab('customers');
      const btn = document.getElementById('btn-call-today');
      if (btn) {
        btn.className = 'h-11 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer ring-2 ring-amber-400';
        document.getElementById('btn-call-today-text').innerText = '✓ आज कॉल (सक्रिय)';
      }
    }
    this.render();
  },

  toggleDropdown() {
    const menu = document.getElementById('shop-dropdown-menu');
    const arrow = document.getElementById('shop-arrow');
    if (menu) {
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
    }
    if (arrow) arrow.classList.toggle('rotate-180');
  },

  toggleShop() {
    const nextShop = AppState.currentShopId === 'krishi' ? 'kirana' : 'krishi';
    this.selectShop(nextShop);
  },

  selectShop(shopId) {
    AppState.currentShopId = shopId;
    const menu = document.getElementById('shop-dropdown-menu');
    if (menu) {
      menu.classList.add('hidden');
      menu.classList.remove('flex');
    }
    this.updateShopSelectorUI();
    AppState.fetchTransactions();
    AppState.fetchProducts();
    AppState.fetchCustomers();
    AppState.fetchCallLogs();
    this.render();
  },

  updateShopSelectorUI() {
    const isKrishi = AppState.currentShopId === 'krishi';
    const title = document.getElementById('current-shop-title');
    const switchBtn = document.getElementById('switch-kirana-btn');

    if (title) {
      title.innerText = isKrishi ? 'बीज एवं खाद दुकान का हिसाब' : 'किराना एवं जनरल स्टोर का हिसाब';
    }
    if (switchBtn) {
      switchBtn.innerHTML = `
        <span class="material-symbols-outlined text-[16px]">${isKrishi ? 'store' : 'agriculture'}</span>
        <span>${isKrishi ? 'किराना बदलें' : 'कृषि बदलें'}</span>
      `;
    }
  },

  render() {
    this.updateShopSelectorUI();
    this.renderSummaryCards();
    if (this.activeTab === 'customers') {
      this.renderCustomerAccounts();
    } else {
      this.renderTransactions();
    }
  },

  renderSummaryCards() {
    const shopId = AppState.currentShopId;
    const summary = AppState.combinedSummary[shopId] || {
      totalCustomerDue: 0,
      customerWithDueCount: 0,
      totalSupplierPayable: 0,
      supplierWithPayableCount: 0,
      todayCustomerPayment: 0,
      todayCustomerPaymentCount: 0,
      todayCashSpent: 0
    };

    const elDue = document.getElementById('khatabook-total-due');
    const elDueSub = document.getElementById('khatabook-due-sub');
    const elPayable = document.getElementById('khatabook-total-payable');
    const elPayableSub = document.getElementById('khatabook-payable-sub');
    const elRecv = document.getElementById('khatabook-today-received');
    const elRecvSub = document.getElementById('khatabook-received-sub');
    const elSpent = document.getElementById('khatabook-today-spent');
    const elSpentSub = document.getElementById('khatabook-spent-sub');

    if (elDue) elDue.innerText = `₹${(summary.totalCustomerDue || 0).toLocaleString('en-IN')}`;
    if (elDueSub) elDueSub.innerText = `उधार बाकीदार: ${summary.customerWithDueCount || 0} लोग`;

    if (elPayable) elPayable.innerText = `₹${(summary.totalSupplierPayable || 0).toLocaleString('en-IN')}`;
    if (elPayableSub) elPayableSub.innerText = `आपूर्तिकर्ता: ${summary.supplierWithPayableCount || 0} पार्टियाँ`;

    if (elRecv) elRecv.innerText = `₹${(summary.todayCustomerPayment || 0).toLocaleString('en-IN')}`;
    if (elRecvSub) elRecvSub.innerText = `कुल ${summary.todayCustomerPaymentCount || 0} जमा पर्चियां`;

    if (elSpent) elSpent.innerText = `₹${(summary.todayCashSpent || 0).toLocaleString('en-IN')}`;
    if (elSpentSub) elSpentSub.innerText = `दुकान खर्च व माल भाड़ा`;
  },

  // ----------------------------------------------------
  // 1. CUSTOMER UDHAR ACCOUNTS VIEW
  // ----------------------------------------------------
  renderCustomerAccounts() {
    const container = document.getElementById('customer-accounts-list');
    if (!container) return;

    const shopId = AppState.currentShopId;
    let customers = AppState.customers.filter(c => !c.associatedShops || c.associatedShops.includes(shopId));

    // Filter by search
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      customers = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.village && c.village.toLowerCase().includes(q))
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Filter by "Call Today"
    if (this.currentFilter === 'call_today') {
      customers = customers.filter(c => {
        const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
        return c.callReminderDate && c.callReminderDate <= todayStr && due > 0;
      });
    }

    if (customers.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-3 shadow-sm border border-slate-200">
          <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <span class="material-symbols-outlined text-[36px]">group_add</span>
          </div>
          <div>
            <h4 class="font-headline-md text-base md:text-lg font-bold text-slate-900">
              ${this.currentFilter === 'call_today' ? 'आज किसी को तकादा कॉल नहीं करना है' : 'अभी कोई ग्राहक खाता नहीं है'}
            </h4>
            <p class="font-body-sm text-xs md:text-sm text-slate-500 mt-1 max-w-sm">
              ${this.currentFilter === 'call_today' ? 'सभी तकादा कॉल पूरे हो चुके हैं या किसी की कॉल तारीख आज नहीं है।' : 'नया खाता बनाने के लिए ऊपर "+ नया ग्राहक" बटन दबाएं।'}
            </p>
          </div>
          ${this.currentFilter !== 'call_today' ? `
            <button onclick="KhatabookUI.openAddCustomerModal()" class="h-12 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer mt-1">
              <span class="material-symbols-outlined text-[20px]">person_add</span>
              <span>+ पहला ग्राहक खाता जोड़ें</span>
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = customers.map(c => this.renderCustomerCard(c, shopId, todayStr)).join('');
  },

  renderCustomerCard(c, shopId, todayStr) {
    const rawDue = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
    const isDue = rawDue > 0;
    const isPaid = rawDue <= 0;

    const initial = (c.name || 'ग').charAt(0);
    const formattedDue = `₹${Math.abs(rawDue).toLocaleString('en-IN')}`;

    // Call Reminder Status Badge
    let callBadge = '';
    if (c.callReminderDate) {
      if (c.callReminderDate <= todayStr && isDue) {
        callBadge = `
          <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300 animate-pulse">
            <span class="material-symbols-outlined text-[13px]">phone_in_talk</span>
            <span>⚠️ आज तकादा कॉल करना है!</span>
          </div>
        `;
      } else {
        const d = new Date(c.callReminderDate);
        const dateHindi = d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
        callBadge = `
          <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[11px] font-medium border border-amber-200">
            <span class="material-symbols-outlined text-[13px] text-amber-700">event</span>
            <span>कॉल तारीख: ${dateHindi}</span>
          </div>
        `;
      }
    }

    return `
      <div onclick="KhatabookUI.openCustomerLedger('${c.id}')" class="bg-white rounded-3xl p-4 shadow-sm hover:shadow-md transition-all border border-slate-200 flex flex-col gap-3 cursor-pointer active:scale-[0.99] spring-card">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003629] to-[#1b4d3e] text-emerald-300 flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
              ${initial}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-headline-md text-base font-extrabold text-slate-900 truncate">${c.name}</h4>
                <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">${c.role || 'किसान'}</span>
              </div>
              <p class="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                <span class="material-symbols-outlined text-[14px] text-emerald-700">call</span>
                <span class="font-bold text-slate-800">${c.phone || 'नंबर नहीं'}</span>
                ${c.village ? `<span class="text-slate-300">•</span><span>${c.village}</span>` : ''}
              </p>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="text-xs font-bold ${isDue ? 'text-rose-700' : 'text-emerald-700'} uppercase block">
              ${isDue ? 'कुल बाकी' : 'खाता चुकता'}
            </span>
            <div class="font-numeric-display text-xl font-extrabold ${isDue ? 'text-rose-700' : 'text-emerald-800'} mt-0.5">
              ${formattedDue}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
          <div>${callBadge}</div>
          <div class="flex items-center gap-2" onclick="event.stopPropagation()">
            <button onclick="KhatabookUI.sendCustomerWhatsApp('${c.id}')" class="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all border border-emerald-200">
              <span class="material-symbols-outlined text-[16px] text-emerald-700">chat</span>
              <span>व्हाट्सऐप</span>
            </button>
            <button onclick="KhatabookUI.triggerCustomerAiCall('${c.id}')" class="h-9 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all border border-indigo-200">
              <span class="material-symbols-outlined text-[16px] text-indigo-700">smart_toy</span>
              <span>AI कॉल</span>
            </button>
            <button onclick="KhatabookUI.openCustomerLedger('${c.id}')" class="h-9 px-3.5 rounded-xl bg-[#003629] text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-xs">
              <span>बहीखाता खोलें</span>
              <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------
  // 2. INDIVIDUAL CUSTOMER LEDGER MODAL
  // ----------------------------------------------------
  openCustomerLedger(customerId) {
    const customer = AppState.customers.find(c => c.id === customerId);
    if (!customer) return;

    this.activeCustomer = customer;
    this.ledgerDateFilter = '';

    // Update Header Elements
    const avatar = document.getElementById('ledger-avatar');
    const nameEl = document.getElementById('ledger-cust-name');
    const roleEl = document.getElementById('ledger-cust-role');
    const phoneEl = document.getElementById('ledger-cust-phone');
    const villageEl = document.getElementById('ledger-cust-village');
    const dueEl = document.getElementById('ledger-cust-due');
    const reminderInput = document.getElementById('ledger-cust-reminder-input');
    const callAlert = document.getElementById('ledger-cust-call-alert');
    const datePicker = document.getElementById('cust-ledger-date-picker');

    const shopId = AppState.currentShopId;
    const rawDue = (customer.balancesRupees ? customer.balancesRupees[shopId] : (customer.balances?.[shopId] ? customer.balances[shopId] / 100 : 0)) || 0;

    if (avatar) avatar.innerText = (customer.name || 'ग').charAt(0);
    if (nameEl) nameEl.innerText = customer.name;
    if (roleEl) roleEl.innerText = customer.role || 'किसान';
    if (phoneEl) {
      phoneEl.innerText = customer.phone || 'नंबर नहीं';
      phoneEl.href = customer.phone ? `tel:${customer.phone}` : '#';
    }
    if (villageEl) villageEl.innerText = customer.village || 'पता दर्ज नहीं';
    if (dueEl) {
      dueEl.innerText = `₹${Math.abs(rawDue).toLocaleString('en-IN')}`;
      dueEl.className = rawDue > 0 ? 'text-2xl md:text-3xl font-extrabold text-rose-700 mt-0.5' : 'text-2xl md:text-3xl font-extrabold text-emerald-800 mt-0.5';
    }

    if (reminderInput) {
      reminderInput.value = customer.callReminderDate || '';
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (callAlert) {
      if (customer.callReminderDate && customer.callReminderDate <= todayStr && rawDue > 0) {
        callAlert.classList.remove('hidden');
      } else {
        callAlert.classList.add('hidden');
      }
    }

    if (datePicker) datePicker.value = '';

    this.renderCustomerLedgerTransactions();

    const modal = document.getElementById('customer-ledger-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeCustomerLedger() {
    const modal = document.getElementById('customer-ledger-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.activeCustomer = null;
  },

  filterCustomerLedgerByDate(dateStr) {
    if (dateStr === 'today') {
      this.ledgerDateFilter = new Date().toISOString().slice(0, 10);
      const dp = document.getElementById('cust-ledger-date-picker');
      if (dp) dp.value = this.ledgerDateFilter;
    } else {
      this.ledgerDateFilter = dateStr || '';
      const dp = document.getElementById('cust-ledger-date-picker');
      if (dp) dp.value = this.ledgerDateFilter;
    }
    this.renderCustomerLedgerTransactions();
  },

  renderCustomerLedgerTransactions() {
    const container = document.getElementById('cust-ledger-entries');
    if (!container || !this.activeCustomer) return;

    const shopId = AppState.currentShopId;
    let txns = AppState.transactions.filter(t => 
      t.shopId === shopId && 
      (t.customerId === this.activeCustomer.id || (t.customerName && t.customerName.trim().toLowerCase() === this.activeCustomer.name.trim().toLowerCase()))
    );

    // Apply calendar date filter if chosen
    if (this.ledgerDateFilter) {
      txns = txns.filter(t => {
        const d = (t.date || t.createdAt || '').slice(0, 10);
        return d === this.ledgerDateFilter;
      });
    }

    if (txns.length === 0) {
      container.innerHTML = `
        <div class="p-6 bg-slate-50 rounded-2xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[32px] text-slate-400">receipt_long</span>
          <p class="font-bold text-slate-700 text-sm">इस तारीख में कोई लेन-देन नहीं है</p>
          <p class="text-xs text-slate-500">नीचे दिए गए बटन से नया उधार या जमा दर्ज करें।</p>
        </div>
      `;
      return;
    }

    container.innerHTML = txns.map(t => {
      const isCredit = t.type === 'CUSTOMER_CREDIT_SALE';
      const isPayment = t.type === 'CUSTOMER_PAYMENT';
      const dateObj = new Date(t.date || t.createdAt);
      
      const dateHindi = dateObj.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const dayHindi = dateObj.toLocaleDateString('hi-IN', { weekday: 'long' });
      const timeHindi = dateObj.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      const amountFormatted = (t.amountRupees || (t.amount / 100) || 0).toLocaleString('en-IN');

      return `
        <div class="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2 shadow-xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <span class="material-symbols-outlined text-[15px] text-slate-400">calendar_today</span>
              <span>${dateHindi} • <strong class="text-slate-800">${dayHindi}</strong></span>
              <span class="text-slate-300">•</span>
              <span class="text-slate-600">${timeHindi}</span>
            </div>
            <span class="font-numeric-display font-extrabold text-base md:text-lg ${isCredit ? 'text-rose-700' : 'text-emerald-700'}">
              ${isCredit ? '+₹' : '-₹'}${amountFormatted}
            </span>
          </div>
          
          <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span class="font-bold ${isCredit ? 'text-rose-800' : 'text-emerald-800'} flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">${isCredit ? 'arrow_upward' : 'arrow_downward'}</span>
              <span>${isCredit ? 'उधार दिया गया (बाकी)' : 'पैसा मिला (जमा)'}</span>
              ${t.description ? `<span class="text-slate-600 font-medium">(${t.description})</span>` : ''}
            </span>
            ${t.balanceAfterRupees !== null && t.balanceAfterRupees !== undefined ? `
              <span class="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                बाकी रहा: ₹${t.balanceAfterRupees.toLocaleString('en-IN')}
              </span>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  async saveReminderDateFromLedger() {
    if (!this.activeCustomer) return;
    const input = document.getElementById('ledger-cust-reminder-input');
    const val = input ? input.value : '';
    try {
      await AppState.setCustomerCallReminder(this.activeCustomer.id, val);
      this.activeCustomer.callReminderDate = val;
      this.render();
    } catch (e) {
      alert('त्रुटि: ' + e.message);
    }
  },

  quickAddEntryForActiveCustomer(type) {
    if (!this.activeCustomer) return;
    const cust = this.activeCustomer;
    this.closeCustomerLedger();
    this.openNewEntryModal();

    // Pre-select customer and type
    setTimeout(() => {
      const typeSel = document.getElementById('modal-type-select');
      const personSel = document.getElementById('modal-person-select');
      if (typeSel) typeSel.value = type;
      if (personSel) personSel.value = 'cust_' + cust.id;
    }, 100);
  },

  // ----------------------------------------------------
  // 3. WHATSAPP & AI CALL GENERATION
  // ----------------------------------------------------
  sendCustomerWhatsApp(customerId) {
    const cust = AppState.customers.find(c => c.id === customerId);
    if (!cust) return;
    const shopId = AppState.currentShopId;
    const shopName = shopId === 'krishi' ? 'कृषि दुकान (बीज, खाद एवं दवाइयाँ)' : 'किराना एवं जनरल स्टोर';
    const due = (cust.balancesRupees ? cust.balancesRupees[shopId] : (cust.balances?.[shopId] ? cust.balances[shopId] / 100 : 0)) || 0;
    const dateToday = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const msg = 
      `नमस्ते ${cust.name} जी!\n` +
      `रामकुमार भंडार (${shopName})\n` +
      `दिनांक: ${dateToday}\n\n` +
      `आपके बहीखाता विवरण के अनुसार:\n` +
      `👉 कुल बाकी राशि: ₹${due.toLocaleString('en-IN')}\n\n` +
      `कृपया सुविधानुसार भुगतान करने की कृपा करें।\n` +
      `धन्यवाद! - रामकुमार भंडार`;

    const cleanPhone = (cust.phone || '').replace(/\D/g, '');
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  sendActiveCustomerWhatsApp() {
    if (!this.activeCustomer) return;
    const cust = this.activeCustomer;
    const shopId = AppState.currentShopId;
    const shopName = shopId === 'krishi' ? 'कृषि दुकान' : 'किराना स्टोर';
    const due = (cust.balancesRupees ? cust.balancesRupees[shopId] : (cust.balances?.[shopId] ? cust.balances[shopId] / 100 : 0)) || 0;

    // Get recent transactions for itemized record
    const txns = AppState.transactions.filter(t => 
      t.shopId === shopId && 
      (t.customerId === cust.id || (t.customerName && t.customerName.trim().toLowerCase() === cust.name.trim().toLowerCase()))
    ).slice(0, 5);

    let itemsText = '';
    if (txns.length > 0) {
      itemsText = '\nहाल के लेन-देन विवरण:\n' + txns.map(t => {
        const d = new Date(t.date || t.createdAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
        const isCredit = t.type === 'CUSTOMER_CREDIT_SALE';
        return `• ${d}: ${isCredit ? 'उधार' : 'जमा'} ₹${t.amountRupees || (t.amount/100)} (${t.description || 'हिसाब'})`;
      }).join('\n') + '\n';
    }

    const dateToday = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const msg = 
      `नमस्ते ${cust.name} जी!\n` +
      `रामकुमार भंडार (${shopName})\n` +
      `तारीख: ${dateToday}\n` +
      itemsText +
      `\n👉 वर्तमान कुल बकाया: ₹${due.toLocaleString('en-IN')}\n\n` +
      `कृपया समय पर भुगतान करने की कृपा करें।\n` +
      `धन्यवाद! - रामकुमार भंडार`;

    const cleanPhone = (cust.phone || '').replace(/\D/g, '');
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  async triggerCustomerAiCall(customerId) {
    const cust = AppState.customers.find(c => c.id === customerId);
    if (!cust) return;
    const shopId = AppState.currentShopId;
    const due = (cust.balancesRupees ? cust.balancesRupees[shopId] : (cust.balances?.[shopId] ? cust.balances[shopId] / 100 : 0)) || 0;

    if (!confirm(`क्या आप AI एजेंट से ${cust.name} (+91 ${cust.phone}) को ₹${due} के लिए तकादा कॉल करवाना चाहते हैं?`)) {
      return;
    }

    try {
      await AppState.triggerAiCall({
        customerId: cust.id,
        customerName: cust.name,
        phone: cust.phone,
        amount: due,
        shopId
      });
    } catch (e) {
      alert('कॉल शुरू करने में त्रुटि: ' + e.message);
    }
  },

  async triggerActiveCustomerAiCall() {
    if (!this.activeCustomer) return;
    await this.triggerCustomerAiCall(this.activeCustomer.id);
  },

  // ----------------------------------------------------
  // 4. ADD NEW CUSTOMER MODAL
  // ----------------------------------------------------
  openAddCustomerModal() {
    const modal = document.getElementById('add-customer-modal');
    if (!modal) return;
    const shopSel = document.getElementById('new-cust-shop');
    if (shopSel) shopSel.value = AppState.currentShopId;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeAddCustomerModal() {
    const modal = document.getElementById('add-customer-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    const form = document.getElementById('add-customer-form');
    if (form) form.reset();
  },

  async handleAddCustomerSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-cust-name').value;
    const phone = document.getElementById('new-cust-phone').value;
    const village = document.getElementById('new-cust-village').value;
    const shopId = document.getElementById('new-cust-shop').value;
    const callReminderDate = document.getElementById('new-cust-calldate').value;

    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('AI कॉल और व्हाट्सऐप के लिए 10 अंकों का मोबाइल नंबर अनिवार्य है');
      return;
    }

    try {
      await AppState.createCustomer({
        name,
        phone: cleanPhone,
        village,
        shopId,
        callReminderDate
      });
      this.closeAddCustomerModal();
      this.render();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  // ----------------------------------------------------
  // 5. ALL TRANSACTIONS VIEW
  // ----------------------------------------------------
  renderTransactions() {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    let list = AppState.transactions.filter(t => t.shopId === AppState.currentShopId);

    // Apply Filter
    if (this.currentFilter === 'due') {
      list = list.filter(t => t.type === 'CUSTOMER_CREDIT_SALE');
    } else if (this.currentFilter === 'give') {
      list = list.filter(t => t.type === 'SUPPLIER_CREDIT_PURCHASE' || t.type === 'SUPPLIER_PAYMENT');
    } else if (this.currentFilter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      list = list.filter(t => t.date && t.date.slice(0, 10) === today);
    } else if (this.currentFilter === 'month') {
      const thisMonth = new Date().toISOString().slice(0, 7);
      list = list.filter(t => t.date && t.date.slice(0, 7) === thisMonth);
    }

    // Apply Search
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(t =>
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.supplierName && t.supplierName.toLowerCase().includes(q)) ||
        (t.phone && t.phone.includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.productName && t.productName.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[36px] text-slate-400">receipt_long</span>
          <p class="font-bold text-slate-800 text-sm">कोई हिसाब नहीं मिला</p>
          <p class="text-xs text-slate-500">नया लेन-देन जोड़ने के लिए ऊपर दिए '+ नया हिसाब' बटन पर टैप करें</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(t => this.renderTransactionCard(t)).join('');
  },

  renderTransactionCard(t) {
    const isCredit = t.type === 'CUSTOMER_CREDIT_SALE';
    const isPayment = t.type === 'CUSTOMER_PAYMENT';
    const isSupplierPurchase = t.type === 'SUPPLIER_CREDIT_PURCHASE';
    const isSupplierPayment = t.type === 'SUPPLIER_PAYMENT';

    let stripeColor = 'bg-primary';
    let typeLabel = 'लेन-देन';
    let amountPrefix = '';
    let amountColor = 'text-primary';
    let avatarInitial = (t.customerName || t.supplierName || 'रा').charAt(0);
    let personName = t.customerName || t.supplierName || 'अज्ञात';
    let roleBadge = t.role || (isSupplierPurchase || isSupplierPayment ? 'आपूर्तिकर्ता' : 'ग्राहक');

    if (isCredit) {
      stripeColor = 'bg-rose-500';
      typeLabel = 'उधार जोड़ा गया';
      amountPrefix = '+₹';
      amountColor = 'text-rose-700';
    } else if (isPayment) {
      stripeColor = 'bg-emerald-500';
      typeLabel = 'पैसा मिला (जमा)';
      amountPrefix = '-₹';
      amountColor = 'text-emerald-700';
    } else if (isSupplierPurchase) {
      stripeColor = 'bg-amber-500';
      typeLabel = 'देना जोड़ा गया';
      amountPrefix = '+₹';
      amountColor = 'text-amber-800';
    } else if (isSupplierPayment) {
      stripeColor = 'bg-indigo-500';
      typeLabel = 'सप्लायर भुगतान';
      amountPrefix = '-₹';
      amountColor = 'text-indigo-800';
    }

    const formattedAmount = `${amountPrefix}${(t.amountRupees || (t.amount / 100) || 0).toLocaleString('en-IN')}`;

    let balancePill = '';
    if (t.balanceAfterRupees !== null && t.balanceAfterRupees !== undefined) {
      if (t.balanceAfterRupees === 0) {
        balancePill = `<span class="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold text-xs">लेना बाकी: ₹0 चुकता ✔</span>`;
      } else {
        balancePill = `<span class="shrink-0 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">कुल बाकी: ₹${t.balanceAfterRupees.toLocaleString('en-IN')}</span>`;
      }
    } else if (t.payableAfterRupees !== null && t.payableAfterRupees !== undefined) {
      balancePill = `<span class="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs">कुल देना: ₹${t.payableAfterRupees.toLocaleString('en-IN')}</span>`;
    }

    // WhatsApp Message URL
    const waText = encodeURIComponent(
      `नमस्ते ${personName} जी, रामकुमार भंडार (${AppState.currentShopId === 'krishi' ? 'कृषि दुकान' : 'किराना स्टोर'}) से आपका हिसाब विवरण:\n` +
      `विवरण: ${t.description || typeLabel}\n` +
      `राशि: ${formattedAmount}\n` +
      `${t.balanceAfterRupees !== null && t.balanceAfterRupees !== undefined ? `कुल बाकी: ₹${t.balanceAfterRupees}\n` : ''}` +
      `धन्यवाद! - रामकुमार भंडार`
    );
    const waLink = `https://wa.me/${t.phone ? '91' + t.phone.replace(/[^\d]/g, '') : ''}?text=${waText}`;
    const phoneLink = t.phone ? `tel:${t.phone}` : '#';

    return `
      <div class="bg-white rounded-2xl p-4 shadow-sm relative overflow-hidden border border-slate-200 flex flex-col gap-2">
        <div class="absolute top-0 left-0 w-1.5 h-full ${stripeColor}"></div>
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-800 shrink-0">
              ${avatarInitial}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-900 text-sm truncate">${personName}</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">${roleBadge}</span>
              </div>
              <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <span class="material-symbols-outlined text-[13px]">schedule</span> 
                ${new Date(t.date || t.createdAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="font-numeric-display text-base md:text-lg ${amountColor} font-bold leading-none">${formattedAmount}</span>
            <p class="text-[10px] ${amountColor} font-semibold mt-0.5">${typeLabel}</p>
          </div>
        </div>
        <div class="flex items-center justify-between pt-1 text-xs text-slate-600">
          <div class="flex items-center gap-1 truncate">
            <span class="material-symbols-outlined text-[15px] text-emerald-700">info</span>
            <span class="truncate">${t.description || t.productName || 'दैनिक हिसाब प्रविष्टि'}</span>
          </div>
          ${balancePill}
        </div>
        <div class="pt-2 flex items-center gap-2 border-t border-slate-100">
          <a class="flex-1 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all border border-slate-200" href="${waLink}" target="_blank">
            <span class="material-symbols-outlined text-emerald-700 text-[16px]">chat</span>
            <span>व्हाट्सऐप 🟢</span>
          </a>
          <a class="flex-1 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all border border-slate-200" href="${phoneLink}">
            <span class="material-symbols-outlined text-indigo-700 text-[16px]">call</span>
            <span>कॉल करें 📞</span>
          </a>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------
  // 6. NEW ENTRY MODAL & FORM SUBMIT
  // ----------------------------------------------------
  openNewEntryModal() {
    const modal = document.getElementById('new-entry-modal');
    if (!modal) return;
    
    const shopSelect = document.getElementById('modal-shop-select');
    if (shopSelect) shopSelect.value = AppState.currentShopId;

    this.populateCustomerSupplierDropdown();
    this.populateProductDropdown();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeNewEntryModal() {
    const modal = document.getElementById('new-entry-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  populateCustomerSupplierDropdown() {
    const custSelect = document.getElementById('modal-person-select');
    if (!custSelect) return;

    custSelect.innerHTML = `<option value="">-- ग्राहक या सप्लायर चुनें --</option>`;
    AppState.customers.forEach(c => {
      custSelect.innerHTML += `<option value="cust_${c.id}">${c.name} (${c.role || 'किसान'}) - ${c.phone || ''}</option>`;
    });
    AppState.suppliers.forEach(s => {
      custSelect.innerHTML += `<option value="sup_${s.id}">${s.name} (आपूर्तिकर्ता) - ${s.phone || ''}</option>`;
    });
  },

  populateProductDropdown() {
    const prodSelect = document.getElementById('modal-product-select');
    if (!prodSelect) return;

    prodSelect.innerHTML = `<option value="">-- सामान जोड़ें (वैकल्पिक स्टॉक अपडेट) --</option>`;
    const products = AppState.products.filter(p => p.shopId === AppState.currentShopId);
    products.forEach(p => {
      prodSelect.innerHTML += `<option value="${p.id}">${p.name} (स्टॉक: ${p.quantity} ${p.unit})</option>`;
    });
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('modal-type-select').value;
    const shopId = document.getElementById('modal-shop-select').value;
    const personRaw = document.getElementById('modal-person-select').value;
    const customName = document.getElementById('modal-custom-name').value;
    const amount = parseFloat(document.getElementById('modal-amount').value);
    const productId = document.getElementById('modal-product-select').value;
    const quantity = parseInt(document.getElementById('modal-quantity').value, 10) || 0;
    const description = document.getElementById('modal-description').value;

    if (!amount || amount <= 0) {
      alert('कृपया मान्य राशि दर्ज करें');
      return;
    }

    let customerId = null;
    let supplierId = null;
    let customerName = null;
    let supplierName = null;

    if (personRaw.startsWith('cust_')) {
      customerId = personRaw.replace('cust_', '');
      const c = AppState.customers.find(x => x.id === customerId);
      if (c) customerName = c.name;
    } else if (personRaw.startsWith('sup_')) {
      supplierId = personRaw.replace('sup_', '');
      const s = AppState.suppliers.find(x => x.id === supplierId);
      if (s) supplierName = s.name;
    } else if (customName && customName.trim()) {
      customerName = customName.trim();
    }

    try {
      await AppState.submitTransaction({
        shopId,
        type,
        amount,
        customerId,
        customerName,
        supplierId,
        supplierName,
        productId: productId || null,
        quantity,
        description
      });
      this.closeNewEntryModal();
      document.getElementById('new-entry-form').reset();
      this.render();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  }
};

window.KhatabookUI = KhatabookUI;

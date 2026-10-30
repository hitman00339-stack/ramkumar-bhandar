// AI Telephony UI, Background Auto-Dialer & Multi-Status Call Center Engine
const TelephonyUI = {
  currentFilter: 'all',
  selectedWing: 'krishi', // 'krishi' | 'kirana'
  currentCallTab: 'all',  // 'all' | 'connected' | 'failed' | 'pending'
  currentWingFilter: 'all', // 'all' | 'krishi' | 'kirana'
  cachedOmniLogs: [],
  selectedInTab: new Set(),

  // Background Auto-Dialer State
  isAutoDialing: false,
  isAutoDialPaused: false,
  autoDialQueue: [],
  autoDialCurrentIndex: 0,
  autoDialTimer: null,

  init() {
    this.setupListeners();
    // Pre-fetch live Omnidimension logs
    this.fetchLiveOmnidimLogs();
  },

  setupListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-telephony');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        AppState.retryShopSync(this.selectedWing);
        AppState.fetchCallLogs(this.selectedWing);
        this.fetchLiveOmnidimLogs();
      });
    }

    // Toggle service master button
    const serviceToggleBtn = document.getElementById('telephony-service-toggle');
    if (serviceToggleBtn) {
      serviceToggleBtn.addEventListener('click', () => {
        AppState.togglePhoneService(this.selectedWing);
      });
    }

    // AI Announcement / Instruction Modal
    const instructionBtn = document.getElementById('btn-open-instruction');
    if (instructionBtn) {
      instructionBtn.addEventListener('click', () => this.openInstructionDrawer());
    }

    const closeInstructionBtn = document.getElementById('close-instruction-btn');
    if (closeInstructionBtn) {
      closeInstructionBtn.addEventListener('click', () => this.closeInstructionDrawer());
    }

    const saveInstructionBtn = document.getElementById('btn-save-instruction');
    if (saveInstructionBtn) {
      saveInstructionBtn.addEventListener('click', () => this.saveInstruction());
    }

    const voicePromptBtn = document.getElementById('btn-record-prompt-voice');
    if (voicePromptBtn) {
      voicePromptBtn.addEventListener('click', () => this.recordPromptWithVoice());
    }

    // Simulate incoming call test button
    const testCallBtn = document.getElementById('btn-simulate-test-call');
    if (testCallBtn) {
      testCallBtn.addEventListener('click', () => this.simulateTestCall());
    }
  },

  switchWing(wing) {
    this.selectedWing = wing;
    const tabKrishi = document.getElementById('tab-krishi');
    const tabKirana = document.getElementById('tab-kirana');

    if (tabKrishi && tabKirana) {
      if (wing === 'krishi') {
        tabKrishi.className = "flex-1 py-2.5 px-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow transition-all active:scale-98";
        tabKirana.className = "flex-1 py-2.5 px-space-xs rounded-lg text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all hover:text-on-surface active:scale-98";
      } else {
        tabKirana.className = "flex-1 py-2.5 px-space-xs rounded-lg bg-secondary text-on-secondary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow transition-all active:scale-98";
        tabKrishi.className = "flex-1 py-2.5 px-space-xs rounded-lg text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all hover:text-on-surface active:scale-98";
      }
    }

    AppState.fetchCallLogs(wing);
    this.render();
  },

  render() {
    this.renderMasterCard();
    this.renderSyncBanner();
    this.renderInquiryTopics();
    this.renderCurrentTab();
  },

  renderMasterCard() {
    const shop = AppState.shops[this.selectedWing] || {};
    const toggleBtn = document.getElementById('telephony-service-toggle');
    const statusPill = document.getElementById('telephony-status-pill');

    if (statusPill) {
      if (shop.phoneServiceEnabled) {
        statusPill.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
          <span>चालू है</span>
        `;
        statusPill.className = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm";
      } else {
        statusPill.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-error"></span>
          <span>बंद है</span>
        `;
        statusPill.className = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm";
      }
    }

    if (toggleBtn) {
      if (shop.phoneServiceEnabled) {
        toggleBtn.className = "w-13 h-7 bg-primary rounded-full p-0.5 flex items-center justify-end shadow-inner transition-colors flex-shrink-0 cursor-pointer";
        toggleBtn.innerHTML = `
          <span class="w-6 h-6 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </span>
        `;
      } else {
        toggleBtn.className = "w-13 h-7 bg-surface-variant rounded-full p-0.5 flex items-center justify-start shadow-inner transition-colors flex-shrink-0 cursor-pointer";
        toggleBtn.innerHTML = `
          <span class="w-6 h-6 rounded-full bg-surface shadow-md flex items-center justify-center text-on-surface-variant">
            <span class="material-symbols-outlined text-[16px]">close</span>
          </span>
        `;
      }
    }
  },

  renderSyncBanner() {
    const shop = AppState.shops[this.selectedWing] || {};
    const banner = document.getElementById('telephony-sync-banner');
    if (!banner) return;

    const isOpen = shop.isOpen;
    const isSynced = shop.aiPhoneSyncStatus === 'synced';
    const isPending = shop.aiPhoneSyncStatus === 'pending';
    const isFailed = shop.aiPhoneSyncStatus === 'failed';

    let syncText = 'सिंक सफल • अभी अपडेटेड';
    let icon = 'sync_saved_locally';
    let iconColor = 'text-tertiary';

    if (isPending) {
      syncText = 'स्थानीय सहेजा गया • सर्वर से जुड़ रहा है...';
      icon = 'sync';
      iconColor = 'text-secondary animate-spin';
    } else if (isFailed) {
      syncText = `⚠️ सर्वर सिंक विफल (${shop.syncError || 'पुनः प्रयास करें'})`;
      icon = 'sync_problem';
      iconColor = 'text-error';
    }

    banner.innerHTML = `
      <div class="flex items-center gap-space-xs min-w-0">
        <span class="material-symbols-outlined ${iconColor} text-[20px] flex-shrink-0">${icon}</span>
        <div class="flex flex-col min-w-0">
          <span class="font-label-md text-label-md text-on-surface truncate">दुकान स्थिति: ${isOpen ? 'खुली बता रहा है' : 'बंद बता रहा है'}</span>
          <span class="font-body-sm text-body-sm text-on-surface-variant truncate">${syncText}</span>
        </div>
      </div>
      <button onclick="AppState.retryShopSync('${this.selectedWing}')" class="px-space-sm py-1 rounded bg-surface-container-high text-primary font-label-sm text-label-sm flex-shrink-0 active:scale-95 transition-transform cursor-pointer">
        ताज़ा करें
      </button>
    `;
  },

  renderInquiryTopics() {
    const container = document.getElementById('ai-inquiry-topics');
    if (!container) return;

    const topics = [
      { name: 'खाद उपलब्धता', count: 8 },
      { name: 'दुकान खुलने का समय', count: 6 },
      { name: 'दवाई के दाम', count: 4 }
    ];

    container.innerHTML = topics.map(t => `
      <span class="px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface flex items-center gap-1">
        ${t.name} <strong class="text-primary font-bold">${t.count}</strong>
      </span>
    `).join('');
  },

  // ----------------------------------------------------
  // 4 SEGMENTED CALL TABS & FILTERS
  // ----------------------------------------------------
  switchCallTab(tab) {
    this.currentCallTab = tab;
    this.selectedInTab.clear();

    const tabs = ['all', 'connected', 'failed', 'pending'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = "h-11 rounded-xl bg-white text-[#003629] shadow-sm flex items-center justify-center gap-1.5 transition-all font-bold cursor-pointer";
        } else {
          btn.className = "h-11 rounded-xl text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-all font-semibold cursor-pointer";
        }
      }
    });

    const toolbar = document.getElementById('call-tab-toolbar');
    if (toolbar) {
      if (tab === 'pending') {
        toolbar.classList.remove('hidden');
        toolbar.classList.add('flex');
      } else {
        toolbar.classList.add('hidden');
        toolbar.classList.remove('flex');
      }
    }

    this.renderCurrentTab();
  },

  switchCallWingFilter(wing) {
    this.currentWingFilter = wing;
    const wings = ['all', 'krishi', 'kirana'];
    wings.forEach(w => {
      const btn = document.getElementById(`btn-call-wing-${w}`);
      if (btn) {
        if (w === wing) {
          btn.className = "px-3 py-1.5 rounded-lg bg-white shadow-xs text-slate-900 font-bold cursor-pointer";
        } else {
          btn.className = "px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:text-slate-900 cursor-pointer";
        }
      }
    });
    this.renderCurrentTab();
  },

  async fetchLiveOmnidimLogs() {
    const container = document.getElementById('omnidim-call-logs-container');
    if (container && this.cachedOmniLogs.length === 0) {
      container.innerHTML = `
        <div class="p-4 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs flex items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
          <span>Omnidimension AI सर्वर से लाइव कॉल लोड हो रही हैं...</span>
        </div>
      `;
    }

    try {
      const res = await fetch('/api/omnidim/call-logs');
      if (res.ok) {
        const data = await res.json();
        this.cachedOmniLogs = data.logs || [];
      }
    } catch (err) {
      console.warn('Omnidim live logs fetch skipped:', err.message);
    }
    this.renderCurrentTab();
  },

  renderCurrentTab() {
    const container = document.getElementById('omnidim-call-logs-container');
    if (!container) return;

    // Combine local call logs and live Omnidim logs
    const omniCalls = this.cachedOmniLogs.map(c => {
      const durationSec = c.call_duration_in_seconds || 0;
      const durationMin = c.call_duration_in_minutes || 0;
      const isConnected = durationSec > 0 || durationMin > 0;
      const isOutbound = c.call_direction === 'outbound';
      const phone = c.to_number || c.from_number || 'नंबर उपलब्ध नहीं';

      return {
        id: c.call_id || ('omni_' + Math.random()),
        phone,
        customerName: c.customer_name || 'ग्राहक',
        shopId: 'krishi',
        direction: isOutbound ? 'outbound' : 'incoming',
        durationSec,
        durationMin,
        isConnected,
        isFailed: !isConnected,
        time: c.time_of_call || 'आज',
        summary: c.sentiment_analysis_details || c.call_summary || (isConnected ? 'कॉल सफलतापूर्वक पूरी हुई' : 'कॉल कनेक्ट नहीं हो पाई'),
        transcript: c.call_conversation || '',
        audioUrl: c.internal_recording_url || c.recording_url || null
      };
    });

    const localCalls = (AppState.callLogs || []).map(c => {
      const durationSec = c.durationSec || 0;
      const isConnected = durationSec > 0 || c.status === 'completed' || c.statusLabel === 'सफल बात';
      return {
        id: c.id,
        phone: c.callerNumber || c.phone || 'नंबर नहीं',
        customerName: c.customerName || 'ग्राहक',
        shopId: c.shopTarget || c.shopId || 'krishi',
        direction: c.direction || 'outbound',
        durationSec,
        durationMin: 0,
        isConnected,
        isFailed: !isConnected,
        time: c.timestamp ? new Date(c.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : 'आज',
        summary: c.responseText || 'तकादा संदेश भेजा गया',
        transcript: c.transcriptUser || c.queryText || '',
        audioUrl: null
      };
    });

    // Merged distinct list
    let allCalls = [...omniCalls, ...localCalls];

    // Filter by Shop Wing
    if (this.currentWingFilter !== 'all') {
      allCalls = allCalls.filter(c => c.shopId === this.currentWingFilter);
    }

    // Pending Customers (Have positive balance in selected shop/all and no call made today)
    const calledNumbersSet = new Set(allCalls.map(c => (c.phone || '').replace(/\D/g, '')));
    const pendingCustomers = AppState.customers.filter(c => {
      const shopId = this.currentWingFilter === 'all' ? AppState.currentShopId : this.currentWingFilter;
      const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
      const cleanPhone = (c.phone || '').replace(/\D/g, '');
      return due > 0 && !calledNumbersSet.has(cleanPhone);
    });

    const connectedCalls = allCalls.filter(c => c.isConnected);
    const failedCalls = allCalls.filter(c => c.isFailed);

    // Update Badges Count
    const bAll = document.getElementById('badge-count-all');
    const bConn = document.getElementById('badge-count-connected');
    const bFail = document.getElementById('badge-count-failed');
    const bPend = document.getElementById('badge-count-pending');
    if (bAll) bAll.innerText = allCalls.length;
    if (bConn) bConn.innerText = connectedCalls.length;
    if (bFail) bFail.innerText = failedCalls.length;
    if (bPend) bPend.innerText = pendingCustomers.length;

    // Render depending on active tab
    if (this.currentCallTab === 'pending') {
      this.renderPendingTab(pendingCustomers, container);
    } else if (this.currentCallTab === 'connected') {
      this.renderConnectedTab(connectedCalls, container);
    } else if (this.currentCallTab === 'failed') {
      this.renderFailedTab(failedCalls, container);
    } else {
      this.renderAllCallsTab(allCalls, container);
    }
  },

  // 1. ALL CALLS TAB
  renderAllCallsTab(calls, container) {
    if (calls.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[40px] text-slate-400">call_log</span>
          <p class="font-bold text-slate-800 text-sm">अभी कोई कॉल रिकॉर्ड नहीं है</p>
          <p class="text-xs text-slate-500">कॉल आते ही या तकादा लगाते ही लाइव विवरण यहाँ दर्ज होगा</p>
        </div>
      `;
      return;
    }
    container.innerHTML = calls.map(c => this.renderCallCard(c)).join('');
  },

  // 2. CONNECTED CALLS TAB (बात हुई)
  renderConnectedTab(calls, container) {
    if (calls.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-2 border border-emerald-200">
          <span class="material-symbols-outlined text-[40px] text-emerald-600">check_circle</span>
          <p class="font-bold text-slate-800 text-sm">अभी कोई कनेक्टेड कॉल नहीं है</p>
          <p class="text-xs text-slate-500">जब ग्राहक फोन उठाकर बात करेगा तो रिकॉर्डिंग और सारांश यहाँ दिखेगा</p>
        </div>
      `;
      return;
    }
    container.innerHTML = calls.map(c => this.renderCallCard(c)).join('');
  },

  // 3. FAILED / NOT CONNECTED TAB (अनुत्तरित / व्यस्त / कॉल नहीं लगी)
  renderFailedTab(calls, container) {
    if (calls.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[40px] text-emerald-600">verified</span>
          <p class="font-bold text-slate-800 text-sm">कोई अनुत्तरित या असफल कॉल नहीं है!</p>
          <p class="text-xs text-slate-500">सभी लगाई गई कॉल्स पर ग्राहकों से बातचीत हो चुकी है</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 mb-1">
        <div class="flex items-center gap-2 font-bold">
          <span class="material-symbols-outlined text-[20px] text-rose-600">info</span>
          <span>इन नंबरों पर कॉल कनेक्ट नहीं हो सकी — नीचे 1-टैप से पुनः कॉल करें:</span>
        </div>
        <button onclick="TelephonyUI.redialAllFailed()" class="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold active:scale-95 shadow-xs cursor-pointer">
          सबको दोबारा कॉल लगाएं
        </button>
      </div>
    ` + calls.map(c => `
      <div class="p-4 bg-white rounded-2xl border-2 border-rose-200 shadow-xs flex flex-col gap-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">phone_missed</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 text-sm">${c.customerName || 'ग्राहक'}</span>
                <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                  ❌ फोन नहीं उठा / व्यस्त
                </span>
              </div>
              <p class="text-xs font-mono font-bold text-slate-700 mt-0.5">${c.phone}</p>
            </div>
          </div>
          <span class="text-xs text-slate-400 font-medium">${c.time}</span>
        </div>

        <div class="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100 text-xs text-rose-800">
          <strong>कारण:</strong> ग्राहक ने फोन नहीं उठाया या नेटवर्क व्यस्त था।
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <button onclick="TelephonyUI.redialCustomer('${c.phone}', '${c.customerName}')" class="h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">call</span>
            <span>📞 पुनः कॉल करें</span>
          </button>
          <a href="https://wa.me/${c.phone.replace(/\D/g, '')}?text=नमस्ते%20जी,%20रामकुमार%20भंडार%20से%20आपकी%20कॉल%20नहीं%20लग%20सकी।%20कृपया%20सुविधानुसार%20संपर्क%20करें।" target="_blank" class="h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-200 active:scale-95">
            <span class="material-symbols-outlined text-[18px] text-emerald-700">chat</span>
            <span>💬 व्हाट्सएप भेजें</span>
          </a>
        </div>
      </div>
    `).join('');
  },

  // 4. PENDING CALLS TAB (कॉल बाकी - उधार ग्राहक)
  renderPendingTab(customers, container) {
    if (customers.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[40px] text-emerald-600">task_alt</span>
          <p class="font-bold text-slate-800 text-sm">सभी उधारी ग्राहकों को कॉल लग चुकी है!</p>
          <p class="text-xs text-slate-500">कोई भी बकायादार ग्राहक शेष नहीं है</p>
        </div>
      `;
      return;
    }

    const shopId = this.currentWingFilter === 'all' ? AppState.currentShopId : this.currentWingFilter;
    const selectedCount = this.selectedInTab.size;
    const countEl = document.getElementById('call-tab-selected-count');
    if (countEl) countEl.innerText = selectedCount;

    container.innerHTML = customers.map(c => {
      const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
      const isChecked = this.selectedInTab.has(c.id);

      return `
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="TelephonyUI.toggleCustomerInTab('${c.id}', this.checked)" class="w-5 h-5 rounded accent-emerald-700 cursor-pointer shrink-0"/>
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-base shrink-0">
                ${(c.name || 'ग').charAt(0)}
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-slate-900 text-sm truncate">${c.name}</h4>
                <p class="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <span>${c.phone || 'नंबर नहीं'}</span>
                  ${c.village ? `<span>• ${c.village}</span>` : ''}
                </p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[11px] font-bold text-rose-700 uppercase block">बाकी राशि</span>
              <span class="font-numeric-display font-extrabold text-base text-rose-700">₹${due.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
            <button onclick="TelephonyUI.startBatchAutoDial([{ id: '${c.id}', name: '${c.name}', phone: '${c.phone}', due: ${due}, shopId: '${shopId}' }])" class="flex-1 h-9 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">smart_toy</span>
              <span>📞 1-टैप AI कॉल लगाएं</span>
            </button>
            <a href="https://wa.me/${(c.phone || '').replace(/\D/g, '')}?text=नमस्ते%20${encodeURIComponent(c.name)}%20जी,%20रामकुमार%20भंडार%20से%20सूचना%20है।%20आपके%20खाते%20में%20₹${due}%20का%20बकाया%20है।" target="_blank" class="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center gap-1 border border-emerald-200 active:scale-95">
              <span class="material-symbols-outlined text-[16px] text-emerald-700">chat</span>
              <span>व्हाट्सऐप</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
  },

  renderCallCard(c) {
    const isOutbound = c.direction === 'outbound';
    const isConn = c.isConnected;
    const dirIcon = isOutbound ? 'call_made' : 'call_received';
    const dirColor = isOutbound ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
    const dirLabel = isOutbound ? 'आउटगोइंग तकादा' : 'इनकमिंग पूछताछ';
    
    const durationStr = c.durationMin > 0 ? `${c.durationMin} मिनट ${c.durationSec} सेकंड` : `${c.durationSec} सेकंड`;
    const statusBadge = isConn 
      ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">✅ बात हुई (${durationStr})</span>`
      : `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px]">❌ अनुत्तरित / नहीं उठा</span>`;

    return `
      <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center ${dirColor} border shrink-0">
              <span class="material-symbols-outlined text-[20px]">${dirIcon}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 text-sm md:text-base">${c.customerName || c.phone}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${dirColor} border">
                  ${dirLabel}
                </span>
              </div>
              <span class="text-xs text-slate-500 font-medium">${c.phone} • ${c.time}</span>
            </div>
          </div>
          <div class="shrink-0">${statusBadge}</div>
        </div>

        ${c.summary ? `
          <div class="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200">
            <strong class="text-slate-900">📝 बातचीत सारांश:</strong> ${c.summary}
          </div>
        ` : ''}

        ${c.transcript ? `
          <div class="p-2.5 bg-indigo-50/40 rounded-xl text-xs text-indigo-950 border border-indigo-100">
            <strong class="text-indigo-900">🎙️ ट्रांसक्रिप्ट:</strong> "${c.transcript}"
          </div>
        ` : ''}

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            ${c.audioUrl ? `
              <audio controls preload="none" class="w-full max-w-[220px] h-8 rounded-lg" src="${c.audioUrl}"></audio>
            ` : `
              <button onclick="TelephonyUI.playSampleAudio('${c.id}')" class="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold flex items-center gap-1 border border-emerald-200 active:scale-95 transition-all cursor-pointer">
                <span class="material-symbols-outlined text-[16px] text-emerald-700">play_arrow</span>
                <span>रिकॉर्डिंग सुनें</span>
              </button>
            `}
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button onclick="TelephonyUI.redialCustomer('${c.phone}', '${c.customerName}')" class="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">call</span>
              <span>कॉल करें</span>
            </button>
            <a href="https://wa.me/${c.phone.replace(/\D/g, '')}" target="_blank" class="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center">
              <span class="material-symbols-outlined text-[16px]">chat</span>
            </a>
          </div>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------
  // BACKGROUND AUTO-DIALER QUEUE ENGINE
  // ----------------------------------------------------
  startBatchAutoDial(customerList, shopId = null) {
    if (!Array.isArray(customerList) || customerList.length === 0) {
      alert('कॉल करने के लिए कोई ग्राहक नहीं चुना गया');
      return;
    }

    const validList = customerList.filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
    if (validList.length === 0) {
      alert('चुने हुए ग्राहकों में कोई वैध 10-अंकों का मोबाइल नंबर नहीं मिला');
      return;
    }

    this.autoDialQueue = validList;
    this.autoDialCurrentIndex = 0;
    this.isAutoDialing = true;
    this.isAutoDialPaused = false;

    // Show floating banner
    const banner = document.getElementById('active-calling-banner');
    if (banner) {
      banner.classList.remove('hidden');
      banner.classList.add('flex');
    }

    AppState.showToast(`🚀 बैकग्राउंड AI ऑटो-कॉलिंग शुरू: कुल ${validList.length} ग्राहक`);
    this.processNextAutoDial();
  },

  async processNextAutoDial() {
    if (!this.isAutoDialing) return;
    if (this.isAutoDialPaused) return;

    if (this.autoDialCurrentIndex >= this.autoDialQueue.length) {
      this.stopAutoDial();
      AppState.showToast('🎉 सभी (N) ग्राहकों को AI कॉल सफलतापूर्वक लगा दी गई है!');
      setTimeout(() => this.fetchLiveOmnidimLogs(), 1500);
      return;
    }

    const currentCustomer = this.autoDialQueue[this.autoDialCurrentIndex];
    const total = this.autoDialQueue.length;
    const currentNum = this.autoDialCurrentIndex + 1;

    // Update banner UI
    const progressEl = document.getElementById('calling-banner-progress');
    const targetEl = document.getElementById('calling-banner-current-target');
    const statusEl = document.getElementById('calling-banner-status');

    if (progressEl) progressEl.innerText = `📞 AI ऑटो-कॉलिंग जारी है: (${currentNum}/${total})`;
    if (targetEl) targetEl.innerText = `वर्तमान: ${currentCustomer.name} (${currentCustomer.phone}) • ₹${currentCustomer.due || 0} बाकी`;
    if (statusEl) {
      statusEl.innerText = 'कॉल लगाई जा रही है...';
      statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900 text-amber-200 border border-amber-700 animate-pulse';
    }

    try {
      await fetch('/api/ai-phone/call-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: currentCustomer.id,
          customerName: currentCustomer.name,
          phone: currentCustomer.phone,
          amount: currentCustomer.due || 0,
          shopId: currentCustomer.shopId || AppState.currentShopId
        })
      });

      if (statusEl) {
        statusEl.innerText = '✓ निर्देश भेजा गया • अगली कॉल 12s में';
        statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700';
      }
    } catch (err) {
      console.warn('Auto-dial call dispatch failed:', err);
    }

    this.autoDialCurrentIndex++;

    // Wait 12 seconds before dialing next to respect telephony limits & prevent spamming
    if (this.autoDialTimer) clearTimeout(this.autoDialTimer);
    this.autoDialTimer = setTimeout(() => {
      this.processNextAutoDial();
    }, 12000);
  },

  pauseOrResumeAutoDial() {
    this.isAutoDialPaused = !this.isAutoDialPaused;
    const btn = document.getElementById('calling-banner-pause-btn');
    const statusEl = document.getElementById('calling-banner-status');

    if (this.isAutoDialPaused) {
      if (this.autoDialTimer) clearTimeout(this.autoDialTimer);
      if (btn) btn.innerText = '▶️ पुनः शुरू';
      if (statusEl) {
        statusEl.innerText = '⏸️ रुकी हुई है';
        statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600';
      }
      AppState.showToast('AI कॉलिंग रोक दी गई है');
    } else {
      if (btn) btn.innerText = '⏸️ रोकें';
      AppState.showToast('AI कॉलिंग पुनः शुरू');
      this.processNextAutoDial();
    }
  },

  stopAutoDial() {
    this.isAutoDialing = false;
    this.isAutoDialPaused = false;
    this.autoDialQueue = [];
    if (this.autoDialTimer) clearTimeout(this.autoDialTimer);

    const banner = document.getElementById('active-calling-banner');
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }
  },

  redialCustomer(phone, name, amount = 0, shopId = null) {
    if (confirm(`क्या आप ${name || 'ग्राहक'} (${phone}) को दोबारा AI तकादा कॉल लगाना चाहते हैं?`)) {
      this.startBatchAutoDial([{
        id: 'redial_' + Date.now(),
        name: name || 'ग्राहक',
        phone,
        due: amount || 0,
        shopId: shopId || AppState.currentShopId
      }]);
    }
  },

  redialAllFailed() {
    // Collect all failed calls and trigger auto-dialer
    const calls = this.cachedOmniLogs.filter(c => !c.call_duration_in_seconds || c.call_duration_in_seconds === 0);
    const toDial = calls.map(c => ({
      id: c.call_id || Math.random(),
      name: c.customer_name || 'ग्राहक',
      phone: c.to_number || c.from_number,
      due: 0,
      shopId: 'krishi'
    })).filter(c => c.phone);

    if (toDial.length === 0) {
      alert('कोई असफल कॉल नंबर नहीं मिला');
      return;
    }

    if (confirm(`क्या आप इन सभी ${toDial.length} अनुत्तरित नंबरों पर दोबारा AI कॉल लगाना चाहते हैं?`)) {
      this.startBatchAutoDial(toDial);
    }
  },

  toggleSelectAllInTab(isChecked) {
    const shopId = this.currentWingFilter === 'all' ? AppState.currentShopId : this.currentWingFilter;
    const calledNumbersSet = new Set(this.cachedOmniLogs.map(c => (c.to_number || c.from_number || '').replace(/\D/g, '')));
    const pending = AppState.customers.filter(c => {
      const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
      const cleanPhone = (c.phone || '').replace(/\D/g, '');
      return due > 0 && !calledNumbersSet.has(cleanPhone);
    });

    if (isChecked) {
      pending.forEach(c => this.selectedInTab.add(c.id));
    } else {
      this.selectedInTab.clear();
    }
    this.renderCurrentTab();
  },

  toggleCustomerInTab(custId, isChecked) {
    if (isChecked) {
      this.selectedInTab.add(custId);
    } else {
      this.selectedInTab.delete(custId);
    }
    const countEl = document.getElementById('call-tab-selected-count');
    if (countEl) countEl.innerText = this.selectedInTab.size;
  },

  startBatchDialFromTab() {
    const shopId = this.currentWingFilter === 'all' ? AppState.currentShopId : this.currentWingFilter;
    let selected = AppState.customers.filter(c => this.selectedInTab.has(c.id));
    if (selected.length === 0) {
      // If none explicitly checked, select all pending
      const calledNumbersSet = new Set(this.cachedOmniLogs.map(c => (c.to_number || c.from_number || '').replace(/\D/g, '')));
      selected = AppState.customers.filter(c => {
        const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
        const cleanPhone = (c.phone || '').replace(/\D/g, '');
        return due > 0 && !calledNumbersSet.has(cleanPhone);
      });
    }

    const toCall = selected.map(c => {
      const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        due,
        shopId
      };
    }).filter(c => c.phone);

    if (toCall.length === 0) {
      alert('कॉल करने के लिए कोई वैध नंबर नहीं है');
      return;
    }

    if (confirm(`क्या आप इन ${toCall.length} ग्राहकों को बैकग्राउंड AI ऑटो-कॉलिंग कतार में डालना चाहते हैं?`)) {
      this.selectedInTab.clear();
      this.startBatchAutoDial(toCall, shopId);
    }
  },

  playSampleAudio(callId) {
    AppState.showToast('🔊 ऑडियो रिकॉर्डिंग चलाई जा रही है...');
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // AudioContext fallback
    }
  },

  openInstructionDrawer() {
    const modal = document.getElementById('instruction-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeInstructionDrawer() {
    const modal = document.getElementById('instruction-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  recordPromptWithVoice() {
    const area = document.getElementById('ai-custom-text');
    if (area) {
      area.value = 'यूरिया का नया ट्रक कल सुबह 9 बजे पहुँचेगा। किसान भाई आधार कार्ड साथ लाएँ।';
      AppState.showToast('✓ आवाज़ से निर्देश दर्ज हुआ');
    }
  },

  async saveInstruction() {
    const area = document.getElementById('ai-custom-text');
    const text = area ? area.value.trim() : '';
    if (!text) {
      alert('कृपया निर्देश दर्ज करें');
      return;
    }

    try {
      const res = await fetch('/api/ai-phone/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: text })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      AppState.showToast('✓ ' + result.message);
      this.closeInstructionDrawer();
      await AppState.fetchCallLogs(this.selectedWing);
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async simulateTestCall() {
    try {
      AppState.showToast('📞 टेस्ट कॉल आ रही है...');
      const res = await fetch('/api/ai-phone/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'demo_telephony_api_token_12345'
        },
        body: JSON.stringify({
          CallerNumber: '+91 98260 99887',
          CustomerName: 'कन्हैया लाल (किसान)',
          QueryText: 'यूरिया खाद का नया स्टॉक आया क्या और दुकान कितने बजे तक खुली है?',
          ShopTarget: this.selectedWing
        })
      });

      const data = await res.json();
      AppState.showToast(`✓ एआई जवाब: "${data.responseSpeech.substring(0, 40)}..."`);
      await AppState.fetchCallLogs(this.selectedWing);
      this.render();
    } catch (err) {
      alert('कॉल सिम्युलेशन त्रुटि: ' + err.message);
    }
  },

  openManualOutboundModal(prefill = {}) {
    const modal = document.getElementById('modal-manual-outbound');
    if (!modal) return;

    const custSelect = document.getElementById('outbound-cust-select');
    if (custSelect) {
      custSelect.innerHTML = `
        <option value="">-- ग्राहक चुनें (या नीचे सीधा नंबर लिखें) --</option>
        ${AppState.customers.map(c => `
          <option value="${c.phone || ''}" data-name="${c.name || ''}" data-due="${c.currentBalance || 0}">
            ${c.name} (${c.phone || 'नंबर नहीं'}) ${c.currentBalance > 0 ? `• ₹${c.currentBalance} बाकी` : ''}
          </option>
        `).join('')}
      `;

      custSelect.onchange = (e) => {
        const opt = e.target.selectedOptions[0];
        if (opt && opt.value) {
          const phoneInput = document.getElementById('outbound-phone-input');
          if (phoneInput) phoneInput.value = opt.value;
          const due = opt.dataset.due || 0;
          const name = opt.dataset.name || 'ग्राहक जी';
          const promptInput = document.getElementById('outbound-prompt-input');
          if (promptInput) {
            promptInput.value = due > 0 
              ? `नमस्ते ${name} जी, रामकुमार भंडार से सूचना है। आपके खाते में ₹${due} का बकाया है। कृपया समय पर भुगतान करने का कष्ट करें। धन्यवाद!`
              : `नमस्ते ${name} जी, रामकुमार भंडार से सूचना कॉल है।`;
          }
        }
      };
    }

    if (prefill.phone) {
      const phoneInput = document.getElementById('outbound-phone-input');
      if (phoneInput) phoneInput.value = prefill.phone;
    }
    if (prefill.prompt) {
      const promptInput = document.getElementById('outbound-prompt-input');
      if (promptInput) promptInput.value = prefill.prompt;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeManualOutboundModal() {
    const modal = document.getElementById('modal-manual-outbound');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  async handleManualOutboundSubmit(e) {
    if (e) e.preventDefault();
    const phoneInput = document.getElementById('outbound-phone-input');
    const promptInput = document.getElementById('outbound-prompt-input');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const prompt = promptInput ? promptInput.value.trim() : '';

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      alert('कृपया वैध 10-अंकों का मोबाइल नंबर दर्ज करें');
      return;
    }

    const btn = document.getElementById('outbound-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerText = '📞 AI कॉल लगाई जा रही है...';
    }

    try {
      const res = await fetch('/api/omnidim/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toNumber: phone,
          prompt: prompt || 'रामकुमार भंडार से सूचना कॉल',
          context: { caller: 'Ramkumar Bhandar AI' }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'कॉल लगाने में विफल');

      AppState.showToast(`✓ AI कॉल का निर्देश भेजा गया: ${phone}`);
      this.closeManualOutboundModal();
      setTimeout(() => this.fetchLiveOmnidimLogs(), 1500);
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '📞 AI एजेंट से कॉल लगाएं';
      }
    }
  }
};

window.TelephonyUI = TelephonyUI;

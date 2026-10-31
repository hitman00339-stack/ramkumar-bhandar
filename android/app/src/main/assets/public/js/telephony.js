// AI Telephony UI, Background Auto-Dialer & Spreadsheet Management System
const TelephonyUI = {
  currentFilter: 'all',
  selectedWing: 'krishi', // 'krishi' | 'kirana'
  currentCallTab: 'total_all',  // 'total_all' (कुल सुरक्षित नंबर) | 'inauguration' | 'connected' | 'failed' | 'pending' | 'all'
  currentWingFilter: 'all', // 'all' | 'krishi' | 'kirana'
  viewMode: 'spreadsheet', // 'spreadsheet' | 'split' | 'cards'
  searchQuery: '',
  cachedOmniLogs: [],
  selectedInTab: new Set(),
  activeTranscriptCall: null,

  // Background Auto-Dialer State
  isAutoDialing: false,
  isAutoDialPaused: false,
  autoDialQueue: [],
  autoDialCurrentIndex: 0,
  autoDialTimer: null,

  // Inauguration Campaign State
  campaignContacts: [],
  campaignQueue: [],
  campaignCurrentIndex: 0,
  isCampaignCalling: false,

  // Permanent Contacts Book (Cross-campaign directory, zero duplicates)
  contactsBook: [],

  // Reliable Audio Streaming Proxy with Byte-Range & Buffer Support
  getAudioStreamUrl(url) {
    if (!url) return '';
    if (url.startsWith('/api/omnidim/audio-proxy')) return url;
    let target = url;
    if (target.startsWith('/')) target = 'https://omnidim.io' + target;
    return `/api/omnidim/audio-proxy?url=${encodeURIComponent(target)}`;
  },

  init() {
    this.setupListeners();
    this.fetchLiveOmnidimLogs();
    this.fetchCampaignContacts();
    this.fetchContactsBook();

    // Auto-refresh Omnidimension logs every 20 seconds when visible
    setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isAutoDialing && !this.isCampaignCalling) {
        this.fetchLiveOmnidimLogs(true);
      }
    }, 20000);
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
  // SPREADSHEET VIEW MODES & FILTERS
  // ----------------------------------------------------
  switchViewMode(mode) {
    this.viewMode = mode;
    const modes = ['spreadsheet', 'split', 'cards'];
    modes.forEach(m => {
      const btn = document.getElementById(`btn-view-${m}`);
      if (btn) {
        if (m === mode) {
          btn.className = "px-3 py-1.5 rounded-lg bg-white shadow-xs text-slate-900 font-bold flex items-center gap-1 cursor-pointer";
        } else {
          btn.className = "px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer";
        }
      }
    });
    this.renderCurrentTab();
  },

  switchCallTab(tab) {
    this.currentCallTab = tab;
    this.selectedInTab.clear();

    const tabs = ['all', 'connected', 'failed', 'pending', 'total_all', 'inauguration'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = "shrink-0 h-10 px-3 rounded-xl bg-white text-[#003629] shadow-sm flex items-center justify-center gap-1.5 transition-all font-bold cursor-pointer";
        } else {
          btn.className = "shrink-0 h-10 px-3 rounded-xl text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-all font-semibold cursor-pointer";
        }
      }
    });

    this.renderCurrentTab();
  },

  switchCallWingFilter(wing) {
    this.currentWingFilter = wing;
    const wings = ['all', 'krishi', 'kirana'];
    wings.forEach(w => {
      const btn = document.getElementById(`btn-call-wing-${w}`);
      if (btn) {
        if (w === wing) {
          btn.className = "px-2.5 py-1.5 rounded-lg bg-white shadow-xs text-slate-900 font-bold cursor-pointer";
        } else {
          btn.className = "px-2.5 py-1.5 rounded-lg text-slate-600 font-medium hover:text-slate-900 cursor-pointer";
        }
      }
    });
    this.renderCurrentTab();
  },

  handleSearch(val) {
    this.searchQuery = (val || '').trim().toLowerCase();
    this.renderCurrentTab();
  },

  setMobileSection(sec) {
    const tableSec = document.getElementById('section-spreadsheet-table');
    const unconnSec = document.getElementById('section-unconnected-column');
    const btnTable = document.getElementById('btn-mobile-sec-table');
    const btnUnconn = document.getElementById('btn-mobile-sec-unconn');

    if (!tableSec || !unconnSec) return;

    if (sec === 'unconnected') {
      tableSec.classList.add('hidden');
      tableSec.classList.remove('flex');
      unconnSec.classList.remove('hidden');
      unconnSec.classList.add('flex');
      if (btnTable) btnTable.className = "flex-1 py-2 rounded-lg text-slate-600 flex items-center justify-center gap-1";
      if (btnUnconn) btnUnconn.className = "flex-1 py-2 rounded-lg bg-rose-700 text-white shadow-xs font-bold flex items-center justify-center gap-1";
    } else {
      unconnSec.classList.add('hidden');
      unconnSec.classList.remove('flex');
      tableSec.classList.remove('hidden');
      tableSec.classList.add('flex');
      if (btnTable) btnTable.className = "flex-1 py-2 rounded-lg bg-white shadow-xs text-slate-900 font-bold flex items-center justify-center gap-1";
      if (btnUnconn) btnUnconn.className = "flex-1 py-2 rounded-lg text-rose-700 flex items-center justify-center gap-1 font-semibold";
    }
  },

  async fetchLiveOmnidimLogs(silent = false) {
    const container = document.getElementById('omnidim-call-logs-container');
    if (!silent && container && this.cachedOmniLogs.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs flex items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[20px] animate-spin text-emerald-700">sync</span>
          <span>Omnidimension AI सर्वर से लाइव कॉल स्प्रेडशीट लोड हो रही है...</span>
        </div>
      `;
    }

    try {
      const res = await fetch('/api/omnidim/call-logs?pagesize=50');
      if (res.ok) {
        const data = await res.json();
        this.cachedOmniLogs = data.logs || [];
      }
    } catch (err) {
      console.warn('Omnidim live logs fetch skipped:', err.message);
    }
    this.renderCurrentTab();
  },

  // Process & Merge All Omnidim Calls + Local Calls + Pending Customers
  getProcessedData() {
    const botNumber = '8045440103';

    const omniCalls = this.cachedOmniLogs.map(c => {
      const durationSec = c.call_duration_in_seconds || 0;
      const durationMin = c.call_duration_in_minutes || 0;
      const rawStatus = (c.call_status || '').toLowerCase();
      const isOutbound = c.call_direction === 'outbound';

      // Accurate Phone Resolution
      const toClean = (c.to_number || '').replace(/\D/g, '');
      const fromClean = (c.from_number || '').replace(/\D/g, '');
      let phone = '';
      let isWebCall = false;

      if (c.from_number === 'Web Call' || c.to_number === 'Web Call' || c.call_type === 'web_call') {
        isWebCall = true;
        phone = '🌐 वेब टेस्ट कॉल';
      } else if (toClean.includes(botNumber)) {
        // Customer called our bot
        phone = c.from_number || 'अज्ञात नंबर';
      } else if (fromClean.includes(botNumber)) {
        // Bot called customer
        phone = c.to_number || 'अज्ञात नंबर';
      } else if (c.call_direction === 'inbound') {
        phone = c.from_number || c.to_number || 'इनकमिंग नंबर';
      } else {
        phone = c.to_number || c.from_number || 'आउटगोइंग नंबर';
      }

      // Format Indian mobile number nicely
      let formattedPhone = phone;
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.length === 10) {
        formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
      } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
        formattedPhone = `+91 ${cleanDigits.slice(2, 7)} ${cleanDigits.slice(7)}`;
      }

      // Customer Lookup from Shop Database
      let matchedCust = null;
      if (cleanDigits.length >= 10) {
        const last10 = cleanDigits.slice(-10);
        matchedCust = (AppState.customers || []).find(cust => {
          const cd = (cust.phone || '').replace(/\D/g, '');
          return cd && cd.endsWith(last10);
        });
      }

      let customerName = matchedCust ? matchedCust.name : (c.user_name || c.customer_name);
      if (!customerName || customerName === 'Assistant' || customerName === 'Unknown' || customerName === 'User') {
        if (isWebCall) customerName = 'वेब ब्राउज़र टेस्ट';
        else if (c.call_direction === 'inbound') customerName = 'इनकमिंग किसान / ग्राहक';
        else customerName = 'उधार खाता ग्राहक';
      }

      const village = matchedCust?.village || '';
      const dueAmount = matchedCust ? (matchedCust.balancesRupees?.[AppState.currentShopId] || (matchedCust.balances?.[AppState.currentShopId] ? matchedCust.balances[AppState.currentShopId] / 100 : 0) || 0) : 0;

      // Duration & Connected Status
      const totalSec = (durationMin * 60) + durationSec;
      const isConnected = totalSec > 0 && rawStatus !== 'no-answer' && rawStatus !== 'busy' && rawStatus !== 'failed';
      const isFailed = !isConnected;

      let durationStr = '00:00';
      if (totalSec > 0) {
        const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const ss = String(totalSec % 60).padStart(2, '0');
        durationStr = `${mm}:${ss}`;
      }

      // Failure Reason
      let failReason = '';
      if (isFailed) {
        if (rawStatus === 'no-answer') failReason = 'घंटी बजी पर नहीं उठा (No Answer)';
        else if (rawStatus === 'busy') failReason = 'फोन व्यस्त था / काटा (Busy)';
        else if (rawStatus === 'failed') failReason = 'नेटवर्क या फोन बंद था (Failed)';
        else failReason = 'कॉल कनेक्ट नहीं हुई (00:00)';
      }

      // Audio Recording URL
      let recUrl = c.internal_recording_url || c.recording_url;
      if (recUrl && recUrl.startsWith('/')) {
        recUrl = 'https://omnidim.io' + recUrl;
      }

      // Meaningful Summary
      let summaryText = '';
      if (typeof c.sentiment_analysis_details === 'string' && c.sentiment_analysis_details.trim()) {
        summaryText = c.sentiment_analysis_details.trim();
      } else if (typeof c.call_summary === 'string' && c.call_summary.trim()) {
        summaryText = c.call_summary.trim();
      } else if (c.call_conversation && c.call_conversation.trim()) {
        const lines = c.call_conversation.split(/<br\s*\/?>|\n/).map(l => l.trim()).filter(Boolean);
        const userLine = lines.find(l => l.toLowerCase().startsWith('user:') || l.toLowerCase().startsWith('caller:'));
        if (userLine) {
          summaryText = `ग्राहक पूछताछ: "${userLine.replace(/^(user:|caller:)/i, '').trim().substring(0, 80)}"`;
        } else {
          summaryText = isConnected ? `सफल बातचीत पूरी हुई (${durationStr})` : failReason;
        }
      } else {
        summaryText = isConnected ? `कॉल पूरी हुई • अवधि ${durationStr}` : (failReason || 'कॉल कनेक्ट नहीं हुई');
      }

      return {
        id: String(c.id || ('omni_' + Math.random())),
        phone: formattedPhone,
        rawPhone: isWebCall ? '' : phone,
        customerName,
        village,
        dueAmount,
        shopId: 'krishi',
        direction: isOutbound ? 'outbound' : 'inbound',
        durationSec: totalSec,
        durationMin,
        durationStr,
        isConnected,
        isFailed,
        failReason,
        statusText: isConnected ? '✅ बात हुई' : (rawStatus === 'no-answer' ? '❌ नहीं उठा (00:00)' : (rawStatus === 'busy' ? '❌ व्यस्त (busy)' : '❌ नहीं लगा')),
        statusClass: isConnected ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300',
        time: c.time_of_call || 'आज',
        summary: summaryText,
        transcript: c.call_conversation || '',
        audioUrl: recUrl || null
      };
    });

    const localCalls = (AppState.callLogs || []).map(c => {
      const durationSec = c.durationSec || 0;
      const isConnected = durationSec > 0 || c.status === 'completed' || c.statusLabel === 'सफल बात';
      return {
        id: String(c.id),
        phone: c.callerNumber || c.phone || 'नंबर नहीं',
        rawPhone: c.callerNumber || c.phone || '',
        customerName: c.customerName || 'ग्राहक',
        village: '',
        dueAmount: 0,
        shopId: c.shopTarget || c.shopId || 'krishi',
        direction: c.direction || 'outbound',
        durationSec,
        durationMin: 0,
        durationStr: durationSec > 0 ? `00:${String(durationSec).padStart(2, '0')}` : '00:00',
        isConnected,
        isFailed: !isConnected,
        failReason: isConnected ? '' : 'कॉल कनेक्ट नहीं हुई',
        statusText: isConnected ? '✅ बात हुई' : '❌ कॉल नहीं लगी',
        statusClass: isConnected ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300',
        time: c.timestamp ? new Date(c.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : 'आज',
        summary: c.responseText || 'तकादा संदेश भेजा गया',
        transcript: c.transcriptUser || c.queryText || '',
        audioUrl: null
      };
    });

    let allCalls = [...omniCalls, ...localCalls];

    // 3. Extract all connected 10-digit clean phone numbers across ALL calls (outbound & inbound)
    const connectedPhoneSet = new Set();
    allCalls.forEach(c => {
      if (c.isConnected) {
        const clean = (c.rawPhone || c.phone || '').replace(/\D/g, '').slice(-10);
        if (clean.length === 10) connectedPhoneSet.add(clean);
      }
    });

    // 4. Inauguration Campaign Contacts (With Automatic Incoming Callback Resolution)
    const inaugurationCalls = (this.campaignContacts || []).map(c => {
      const cleanPhone = (c.cleanPhone || c.phone || '').replace(/\D/g, '').slice(-10);
      const customerCalledBack = cleanPhone && connectedPhoneSet.has(cleanPhone);

      let isConnected = c.status === 'connected' || customerCalledBack;
      let isFailed = c.status === 'failed' && !customerCalledBack; // Suppressed if customer called back!
      let isCalling = c.status === 'calling';
      let isPending = !isConnected && !isFailed && !isCalling;

      // Auto-sync status back to database if customer connected or called back
      if (customerCalledBack && c.status !== 'connected' && cleanPhone) {
        c.status = 'connected';
        fetch('/api/campaign/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cleanPhone,
            status: 'connected',
            summary: 'सफल बातचीत • ग्राहक ने वापस कॉल किया'
          })
        }).catch(() => {});
      }

      let statusText = '⏳ कॉल बाकी';
      let statusClass = 'bg-amber-100 text-amber-900 border-amber-300';
      if (isConnected) {
        statusText = customerCalledBack && c.status !== 'connected' ? '✅ बात हुई (कॉलबैक)' : '✅ बात हुई';
        statusClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
      } else if (isFailed) {
        statusText = '❌ नहीं उठा / नहीं लगा';
        statusClass = 'bg-rose-100 text-rose-900 border-rose-300';
      } else if (isCalling) {
        statusText = '📞 कॉल जारी...';
        statusClass = 'bg-sky-100 text-sky-900 border-sky-300 animate-pulse';
      }

      const formatted = cleanPhone.length === 10 ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : (c.phone || cleanPhone);

      return {
        id: String(c.id),
        phone: formatted,
        rawPhone: cleanPhone,
        customerName: c.name || 'ग्रामवासी / ग्राहक',
        village: c.campaign || 'उद्घाटन आमंत्रण',
        dueAmount: 0,
        shopId: 'kirana',
        direction: 'outbound',
        durationSec: c.durationSec || 0,
        durationMin: 0,
        durationStr: c.durationStr || (isConnected ? '01:00' : '00:00'),
        isConnected,
        isFailed,
        isPending,
        isCalling,
        failReason: isFailed ? 'फोन नहीं उठा या व्यस्त था' : '',
        statusText,
        statusClass,
        time: c.lastCallAt ? new Date(c.lastCallAt).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : (c.addedAt ? 'आज' : 'नया'),
        summary: c.summary || (isConnected ? 'उद्घाटन आमंत्रण सफल बातचीत' : (isCalling ? '📞 कॉल जारी है...' : 'किराना स्टोर उद्घाटन (4 नवंबर) आमंत्रण')),
        transcript: c.transcript || '',
        audioUrl: c.audioUrl || null,
        isCampaign: true
      };
    }).filter(c => {
      if (!this.searchQuery) return true;
      return (c.phone && c.phone.includes(this.searchQuery)) ||
             (c.customerName && c.customerName.toLowerCase().includes(this.searchQuery)) ||
             (c.summary && c.summary.toLowerCase().includes(this.searchQuery));
    });

    // Merge attempted campaign calls into allCalls
    const attemptedCampaignCalls = inaugurationCalls.filter(c => c.isConnected || c.isFailed || c.isCalling);
    allCalls = [...allCalls, ...attemptedCampaignCalls];

    // Filter by Shop Wing
    if (this.currentWingFilter !== 'all') {
      allCalls = allCalls.filter(c => c.shopId === this.currentWingFilter);
    }

    // Filter by Search Query
    if (this.searchQuery) {
      allCalls = allCalls.filter(c => 
        (c.phone && c.phone.toLowerCase().includes(this.searchQuery)) ||
        (c.customerName && c.customerName.toLowerCase().includes(this.searchQuery)) ||
        (c.summary && c.summary.toLowerCase().includes(this.searchQuery)) ||
        (c.transcript && c.transcript.toLowerCase().includes(this.searchQuery))
      );
    }

    // Pending Customers (Have positive balance & haven't been called)
    const calledPhones = new Set(allCalls.map(c => (c.rawPhone || c.phone || '').replace(/\D/g, '').slice(-10)).filter(Boolean));
    const shopId = this.currentWingFilter === 'all' ? AppState.currentShopId : this.currentWingFilter;
    const pendingCustomers = (AppState.customers || []).filter(c => {
      const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
      const cleanPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
      const matchSearch = !this.searchQuery || 
        (c.name && c.name.toLowerCase().includes(this.searchQuery)) || 
        (c.phone && c.phone.includes(this.searchQuery)) ||
        (c.village && c.village.toLowerCase().includes(this.searchQuery));
      return due > 0 && cleanPhone && !calledPhones.has(cleanPhone) && matchSearch;
    });

    const connectedCalls = allCalls.filter(c => c.isConnected);

    // CRITICAL: Failed Calls (Unconnected) Resolution & Deduplication
    // 1. If any person who failed earlier subsequently connected or called back, REMOVE THEM COMPLETELY!
    // 2. Strictly deduplicate by 10-digit number so the redial queue has only 1 entry per customer.
    const seenFailedPhones = new Set();
    const failedCalls = [];

    for (const c of allCalls) {
      if (!c.isFailed) continue;
      const clean = (c.rawPhone || c.phone || '').replace(/\D/g, '').slice(-10);

      // CRITICAL: If customer has connected or called back, REMOVE FROM FAILED CALLS!
      if (clean && connectedPhoneSet.has(clean)) {
        continue;
      }

      // Deduplicate so same phone does not appear multiple times in the redial list
      if (clean && clean.length === 10) {
        if (seenFailedPhones.has(clean)) continue;
        seenFailedPhones.add(clean);
      }
      failedCalls.push(c);
    }

    // Combined Total List: DEDUPLICATED MASTER DIRECTORY ("कुल सुरक्षित नंबर")
    // Merges:
    // 1. Permanent contactsBook (user-added bulk numbers + auto-harvested incoming callers)
    // 2. Real-time call logs (Omnidim + local)
    // 3. Khatabook pending credit customers
    // Strictly deduplicated on clean 10-digit mobile number!
    const masterMap = new Map();

    // 1. Permanent contactsBook
    (this.contactsBook || []).forEach(cb => {
      const clean = (cb.cleanPhone || cb.phone || '').replace(/\D/g, '').slice(-10);
      if (clean.length !== 10) return;

      const isConnected = connectedPhoneSet.has(clean) || cb.lastCallStatus === 'completed';
      const isFailed = !isConnected && cb.lastCallStatus === 'failed';
      const isPending = !isConnected && !isFailed;

      let statusText = isConnected ? '✅ बात हुई' : (isFailed ? '❌ कनेक्ट नहीं हुआ' : '⏳ कॉल बाकी');
      let statusClass = isConnected ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : (isFailed ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-amber-100 text-amber-900 border-amber-300');

      const isIncoming = cb.source === 'इनकमिंग कॉलर' || (cb.callHistory && cb.callHistory.some(h => h.direction === 'inbound'));
      const formatted = cb.phone && cb.phone.includes('+91') ? cb.phone : `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;

      masterMap.set(clean, {
        id: 'cb_' + clean,
        cleanPhone: clean,
        phone: formatted,
        rawPhone: clean,
        customerName: cb.name || 'ग्रामवासी / ग्राहक',
        village: cb.village || (isIncoming ? 'इनकमिंग पूछताछ' : (cb.campaign || 'स्थायी सुरक्षित नंबर')),
        source: isIncoming ? '🟢 इनकमिंग कॉलर' : (cb.campaign ? `📢 ${cb.campaign}` : 'सुरक्षित नंबर'),
        dueAmount: 0,
        shopId: 'krishi',
        direction: isIncoming ? 'inbound' : 'outbound',
        durationSec: cb.lastDurationSec || 0,
        durationMin: 0,
        durationStr: cb.lastDurationSec > 0 ? `${String(Math.floor(cb.lastDurationSec / 60)).padStart(2, '0')}:${String(cb.lastDurationSec % 60).padStart(2, '0')}` : '--',
        isConnected,
        isFailed,
        isPending,
        totalCalls: cb.totalCalls || (cb.callHistory ? cb.callHistory.length : 0) || (isConnected ? 1 : 0),
        failReason: isFailed ? 'फोन नहीं उठा या व्यस्त था' : '',
        statusText,
        statusClass,
        time: cb.lastCallAt ? new Date(cb.lastCallAt).toLocaleDateString('hi-IN') : 'स्थायी',
        summary: cb.personalData?.notes ? `📝 ${cb.personalData.notes}` : (cb.lastSummary || 'स्थायी डायरेक्टरी में सुरक्षित'),
        transcript: cb.lastTranscript || '',
        audioUrl: cb.audioUrl || null,
        personalData: cb.personalData || {},
        callHistory: cb.callHistory || []
      });
    });

    // 2. Overlay live calls from allCalls
    allCalls.forEach(c => {
      const clean = (c.rawPhone || c.phone || '').replace(/\D/g, '').slice(-10);
      if (clean.length !== 10) return;

      const existing = masterMap.get(clean);
      if (existing) {
        if (c.isConnected) {
          existing.isConnected = true;
          existing.isFailed = false;
          existing.isPending = false;
          existing.statusText = '✅ बात हुई';
          existing.statusClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
        }
        if (c.audioUrl && !existing.audioUrl) existing.audioUrl = c.audioUrl;
        if (c.transcript && !existing.transcript) existing.transcript = c.transcript;
        if (c.durationSec > 0 && existing.durationSec === 0) {
          existing.durationSec = c.durationSec;
          existing.durationStr = c.durationStr;
        }
        if (c.time) existing.time = c.time;
      } else {
        masterMap.set(clean, {
          ...c,
          id: 'omni_' + clean,
          cleanPhone: clean,
          source: c.direction === 'inbound' ? '🟢 इनकमिंग कॉलर' : 'आउटगोइंग कॉल',
          totalCalls: 1
        });
      }
    });

    // 3. Pending customers with outstanding Khatabook dues
    pendingCustomers.forEach(p => {
      const clean = (p.phone || '').replace(/\D/g, '').slice(-10);
      if (clean.length !== 10 || masterMap.has(clean)) return;
      const due = (p.balancesRupees ? p.balancesRupees[shopId] : (p.balances?.[shopId] ? p.balances[shopId] / 100 : 0)) || 0;
      masterMap.set(clean, {
        id: 'pend_' + p.id,
        cleanPhone: clean,
        phone: p.phone,
        rawPhone: clean,
        customerName: p.name,
        village: p.village || 'खाता बही',
        source: '📖 खाता ग्राहक',
        dueAmount: due,
        shopId: p.shopId || shopId,
        direction: 'pending_outbound',
        durationSec: 0,
        durationMin: 0,
        durationStr: '--',
        isConnected: false,
        isFailed: false,
        isPending: true,
        totalCalls: 0,
        failReason: 'अभी कॉल नहीं की गई',
        statusText: '⏳ कॉल बाकी',
        statusClass: 'bg-amber-100 text-amber-900 border-amber-300',
        time: 'लंबित',
        summary: `उधार बकाया ₹${due.toLocaleString('en-IN')} • तकादा कॉल शेष है`,
        transcript: '',
        audioUrl: null
      });
    });

    let totalAllList = Array.from(masterMap.values());
    if (this.searchQuery) {
      totalAllList = totalAllList.filter(c =>
        (c.cleanPhone && c.cleanPhone.includes(this.searchQuery)) ||
        (c.customerName && c.customerName.toLowerCase().includes(this.searchQuery)) ||
        (c.village && c.village.toLowerCase().includes(this.searchQuery)) ||
        (c.summary && c.summary.toLowerCase().includes(this.searchQuery))
      );
    }

    return {
      allCalls,
      connectedCalls,
      failedCalls,
      pendingCustomers,
      totalAllList,
      inaugurationCalls
    };
  },

  renderCurrentTab() {
    const container = document.getElementById('omnidim-call-logs-container');
    if (!container) return;

    const data = this.getProcessedData();
    const { allCalls, connectedCalls, failedCalls, pendingCustomers, totalAllList, inaugurationCalls } = data;

    // Update KPI Card Displays
    const kpiTotal = document.getElementById('kpi-total-calls');
    const kpiConn = document.getElementById('kpi-connected-calls');
    const kpiFail = document.getElementById('kpi-failed-calls');
    const kpiPend = document.getElementById('kpi-pending-calls');
    if (kpiTotal) kpiTotal.innerText = allCalls.length;
    if (kpiConn) kpiConn.innerText = connectedCalls.length;
    if (kpiFail) kpiFail.innerText = failedCalls.length;
    if (kpiPend) kpiPend.innerText = pendingCustomers.length;

    // Update Tab Badge Counts
    const bAll = document.getElementById('badge-count-all');
    const bConn = document.getElementById('badge-count-connected');
    const bFail = document.getElementById('badge-count-failed');
    const bPend = document.getElementById('badge-count-pending');
    const bTotAll = document.getElementById('badge-count-total_all');
    const bInaug = document.getElementById('badge-count-inauguration');
    if (bAll) bAll.innerText = allCalls.length;
    if (bConn) bConn.innerText = connectedCalls.length;
    if (bFail) bFail.innerText = failedCalls.length;
    if (bPend) bPend.innerText = pendingCustomers.length;
    if (bTotAll) bTotAll.innerText = totalAllList.length;
    if (bInaug) bInaug.innerText = inaugurationCalls.length;

    // Show/Hide Batch Toolbar
    const toolbar = document.getElementById('call-tab-toolbar');
    const selectedCount = this.selectedInTab.size;
    const selectedCountEl = document.getElementById('call-tab-selected-count');
    if (selectedCountEl) selectedCountEl.innerText = selectedCount;

    if (toolbar) {
      if (selectedCount > 0 || this.currentCallTab === 'pending' || this.currentCallTab === 'failed' || this.currentCallTab === 'inauguration') {
        toolbar.classList.remove('hidden');
        toolbar.classList.add('flex');
      } else {
        toolbar.classList.add('hidden');
        toolbar.classList.remove('flex');
      }
    }

    // Determine Active List Based on Tab
    let activeList = allCalls;
    let isPendingTab = false;
    if (this.currentCallTab === 'connected') {
      activeList = connectedCalls;
    } else if (this.currentCallTab === 'failed') {
      activeList = failedCalls;
    } else if (this.currentCallTab === 'pending') {
      isPendingTab = true;
    } else if (this.currentCallTab === 'total_all') {
      activeList = totalAllList;
    } else if (this.currentCallTab === 'inauguration') {
      activeList = inaugurationCalls;
    }

    // Render by Selected View Mode
    if (this.viewMode === 'split') {
      container.innerHTML = this.renderSplitView(connectedCalls, failedCalls, pendingCustomers);
    } else if (this.viewMode === 'cards') {
      if (isPendingTab) {
        container.innerHTML = this.renderPendingCards(pendingCustomers);
      } else {
        container.innerHTML = this.renderCardsView(activeList);
      }
    } else {
      // Default: Interactive Spreadsheet + Dedicated Not Connected Column
      if (isPendingTab) {
        container.innerHTML = this.renderPendingSpreadsheet(pendingCustomers, failedCalls);
      } else {
        container.innerHTML = this.renderSpreadsheetTable(activeList, failedCalls);
      }
    }
  },

  // ----------------------------------------------------
  // 1. SPREADSHEET TABLE VIEW (स्प्रेडशीट लेजर दृश्य)
  // Left: Full Interactive Spreadsheet | Right: Dedicated Separate Column for Not Connected Numbers
  // ----------------------------------------------------
  renderSpreadsheetTable(calls, failedCalls = []) {
    if (!calls || calls.length === 0) {
      return `
        <div class="p-10 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200 shadow-xs">
          <span class="material-symbols-outlined text-[42px] text-slate-400">table_rows</span>
          <p class="font-bold text-slate-800 text-sm">इस फ़िल्टर में कोई कॉल रिकॉर्ड नहीं है</p>
          <p class="text-xs text-slate-500">ऊपर दिए गए टैब्स से अन्य श्रेणियाँ देखें या नया तकादा कॉल लगाएं</p>
        </div>
      `;
    }

    const allChecked = calls.length > 0 && calls.every(c => this.selectedInTab.has(c.id));
    const allFailedChecked = failedCalls.length > 0 && failedCalls.every(c => this.selectedInTab.has(c.id));

    return `
      <!-- MOBILE SEGMENTED SWITCHER (VISIBLE ON MOBILE/TABLET SCREENS) -->
      <div class="flex lg:hidden items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold w-full mb-3 shadow-2xs">
        <button onclick="TelephonyUI.setMobileSection('spreadsheet')" id="btn-mobile-sec-table" class="flex-1 py-2 rounded-xl bg-white shadow-xs text-slate-900 font-bold flex items-center justify-center gap-1.5 cursor-pointer">
          <span class="material-symbols-outlined text-[16px]">table_chart</span>
          <span>📊 स्प्रेडशीट टेबल (${calls.length})</span>
        </button>
        <button onclick="TelephonyUI.setMobileSection('unconnected')" id="btn-mobile-sec-unconn" class="flex-1 py-2 rounded-xl text-rose-700 flex items-center justify-center gap-1.5 font-bold cursor-pointer">
          <span class="material-symbols-outlined text-[16px]">phone_missed</span>
          <span>❌ नहीं जुड़े (${failedCalls.length})</span>
        </button>
      </div>

      <!-- MAIN RESPONSIVE GRID: SPREADSHEET (8 COLS) + DEDICATED NOT CONNECTED COLUMN (4 COLS) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <!-- SPREADSHEET TABLE SECTION -->
        <div class="lg:col-span-8 flex flex-col gap-2.5 min-w-0" id="section-spreadsheet-table">
          ${this.currentCallTab === 'total_all' ? `
            <div class="p-3 bg-gradient-to-r from-indigo-50/90 to-emerald-50/90 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span class="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900 block">कुल सुरक्षित नंबर (मास्टर रजिस्टर)</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 font-numeric-display">
                      ${calls.length} नंबर • डुप्लीकेट-मुक्त
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-600">आपके जोड़े गए नंबर + इनकमिंग कॉलर्स स्वतः सुरक्षित हैं। किसी भी समय अभियान में उपयोग करें।</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button onclick="TelephonyUI.openBulkNumbersModal()" class="h-8 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer">
                  <span class="material-symbols-outlined text-[15px]">add</span>
                  <span>नंबर जोड़ें</span>
                </button>
              </div>
            </div>
          ` : ''}

          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs text-slate-800">${this.currentCallTab === 'total_all' ? '📑 सभी सुरक्षित नंबर सूची' : '📋 कॉल रजिस्टर विवरण'}</span>
              <span class="text-[11px] text-slate-500 font-medium font-numeric-display">(${calls.length} रिकॉर्ड्स)</span>
            </div>
            <span class="text-[11px] text-slate-400 hidden sm:inline">← दाईं ओर खिसकाकर पूरा रजिस्टर देखें →</span>
          </div>

          <div class="overflow-x-auto rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-900 text-white font-bold tracking-wider text-[11px] uppercase border-b border-slate-800 sticky top-0 z-10">
                  <th class="p-3.5 w-10 text-center">
                    <input type="checkbox" ${allChecked ? 'checked' : ''} onchange="TelephonyUI.toggleSelectAllInTab(this.checked)" class="w-4 h-4 rounded accent-emerald-500 cursor-pointer"/>
                  </th>
                  <th class="p-3.5 w-12 text-center whitespace-nowrap">क्र.सं.</th>
                  <th class="p-3.5 whitespace-nowrap">स्थिति (Status)</th>
                  <th class="p-3.5 whitespace-nowrap min-w-[150px]">नंबर एवं ग्राहक (Customer)</th>
                  <th class="p-3.5 whitespace-nowrap">दिशा (Type)</th>
                  <th class="p-3.5 whitespace-nowrap">अवधि</th>
                  <th class="p-3.5 min-w-[200px]">बातचीत सारांश व ट्रांसक्रिप्ट (Summary)</th>
                  <th class="p-3.5 whitespace-nowrap min-w-[170px]">ऑडियो रिकॉर्डिंग (Recording)</th>
                  <th class="p-3.5 whitespace-nowrap">तारीख व समय</th>
                  <th class="p-3.5 whitespace-nowrap text-center">त्वरित एक्शन</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${calls.map((c, idx) => {
                  const isChecked = this.selectedInTab.has(c.id);
                  const isOut = c.direction === 'outbound' || c.direction === 'pending_outbound';
                  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';

                  return `
                    <tr class="${rowBg} hover:bg-slate-100/70 transition-colors">
                      <!-- Checkbox -->
                      <td class="p-3 text-center">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="TelephonyUI.toggleCustomerInTab('${c.id}', this.checked)" class="w-4 h-4 rounded accent-emerald-600 cursor-pointer"/>
                      </td>

                      <!-- Serial Number -->
                      <td class="p-3 text-center font-mono font-bold text-slate-500 text-[11px]">
                        ${idx + 1}
                      </td>

                      <!-- Status Badge -->
                      <td class="p-3 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${c.statusClass}">
                          ${c.statusText}
                        </span>
                      </td>

                      <!-- Customer Name & Phone -->
                      <td class="p-3 whitespace-nowrap">
                        <div class="flex flex-col">
                          <div class="flex items-center gap-1.5">
                            <span onclick="TelephonyUI.openCustomerProfileModal('${c.cleanPhone || (c.rawPhone || c.phone || '').replace(/\D/g, '').slice(-10)}')" class="font-bold text-slate-900 text-xs hover:text-indigo-700 cursor-pointer underline-offset-2 hover:underline" title="ग्राहक प्रोफाइल व इतिहास खोलें">
                              ${c.customerName}
                            </span>
                            ${c.source ? `
                              <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full ${c.source.includes('इनकमिंग') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
                                ${c.source}
                              </span>
                            ` : ''}
                          </div>
                          <div class="flex items-center gap-1 font-mono font-bold text-slate-600 text-[11px] mt-0.5">
                            <span>${c.phone}</span>
                            ${c.rawPhone ? `
                              <button onclick="navigator.clipboard.writeText('${c.rawPhone}'); AppState.showToast('नंबर कॉपी हुआ');" class="text-slate-400 hover:text-slate-700" title="कॉपी करें">
                                <span class="material-symbols-outlined text-[13px]">content_copy</span>
                              </button>
                            ` : ''}
                          </div>
                          ${c.village ? `<span class="text-[10px] text-slate-400">${c.village}</span>` : ''}
                        </div>
                      </td>

                      <!-- Call Direction -->
                      <td class="p-3 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${isOut ? 'bg-indigo-50 text-indigo-900 border border-indigo-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}">
                          <span class="material-symbols-outlined text-[13px]">${isOut ? 'call_made' : 'call_received'}</span>
                          <span>${c.isPending ? '⏳ शेष कॉल' : (isOut ? 'आउटगोइंग' : 'इनकमिंग')}</span>
                        </span>
                      </td>

                      <!-- Duration -->
                      <td class="p-3 whitespace-nowrap">
                        <span class="font-mono font-extrabold text-[12px] ${c.isConnected ? 'text-emerald-800' : 'text-slate-400'}">
                          ⏱️ ${c.durationStr}
                        </span>
                      </td>

                      <!-- Summary & Transcript Link -->
                      <td class="p-3">
                        <div class="flex flex-col gap-1 max-w-xs">
                          <p class="text-[11px] text-slate-700 font-medium line-clamp-2">${c.summary || 'कॉल का विवरण उपलब्ध है'}</p>
                          ${c.transcript ? `
                            <button onclick="TelephonyUI.openConversationModal('${c.id}')" class="text-indigo-700 hover:text-indigo-900 font-bold text-[10px] flex items-center gap-0.5 text-left cursor-pointer">
                              <span class="material-symbols-outlined text-[13px]">forum</span>
                              <span>पूरी बातचीत पढ़ें (चैट ट्रांसक्रिप्ट)</span>
                            </button>
                          ` : ''}
                        </div>
                      </td>

                      <!-- Audio Recording Player -->
                      <td class="p-3 whitespace-nowrap">
                        ${c.audioUrl ? `
                          <div class="flex items-center gap-1.5">
                            <audio controls preload="metadata" class="h-8 max-w-[175px] rounded-lg border border-slate-200 bg-slate-50" src="${TelephonyUI.getAudioStreamUrl(c.audioUrl)}"></audio>
                          </div>
                        ` : (c.isConnected ? `
                          <button onclick="TelephonyUI.playSampleAudio('${c.id}')" class="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-[11px] flex items-center gap-1 border border-emerald-200 active:scale-95 cursor-pointer">
                            <span class="material-symbols-outlined text-[14px] text-emerald-700">play_arrow</span>
                            <span>ऑडियो सुनें</span>
                          </button>
                        ` : `
                          <span class="text-slate-400 text-[10px]">ऑडियो नहीं (00:00)</span>
                        `)}
                      </td>

                      <!-- Date & Time -->
                      <td class="p-3 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                        ${c.time}
                      </td>

                      <!-- Action Buttons -->
                      <td class="p-3 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center gap-1.5">
                          <button onclick="TelephonyUI.openCustomerProfileModal('${c.cleanPhone || (c.rawPhone || c.phone || '').replace(/\D/g, '').slice(-10)}')" class="h-8 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-[11px] flex items-center gap-1 border border-indigo-200 shadow-2xs active:scale-95 transition-all cursor-pointer" title="व्यक्तिगत नोट्स व कॉल इतिहास देखें">
                            <span class="material-symbols-outlined text-[15px] text-indigo-700">account_circle</span>
                            <span>प्रोफाइल</span>
                          </button>
                          <button onclick="TelephonyUI.redialCustomer('${c.rawPhone || c.phone}', '${c.customerName}')" class="h-8 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer" title="AI से दोबारा कॉल लगाएं">
                            <span class="material-symbols-outlined text-[15px]">call</span>
                            <span>कॉल करें</span>
                          </button>
                          ${c.rawPhone ? `
                            <a href="https://wa.me/${c.rawPhone.replace(/\D/g, '')}?text=नमस्ते%20${encodeURIComponent(c.customerName)}%20जी,%20रामकुमार%20भंडार%20से%20कॉल%20के%20संदर्भ%20में।" target="_blank" class="h-8 w-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-200 active:scale-95" title="व्हाट्सऐप भेजें">
                              <span class="material-symbols-outlined text-[16px] text-emerald-700">chat</span>
                            </a>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- DEDICATED SEPARATE COLUMN: NOT CONNECTED (अनुत्तरित / व्यस्त / फेल्ड) REDIAL QUEUE -->
        <div class="lg:col-span-4 flex flex-col gap-3 bg-rose-50/70 p-4 rounded-3xl border-2 border-rose-300 shadow-sm" id="section-unconnected-column">
          <div class="flex items-start justify-between pb-2.5 border-b border-rose-200 gap-2">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-rose-700 text-[22px]">phone_missed</span>
                <h4 class="font-bold text-sm text-rose-950">❌ कनेक्ट नहीं हुए नंबर</h4>
              </div>
              <p class="text-[11px] text-rose-800 font-medium mt-0.5">अनुत्तरित, व्यस्त व नेटवर्क विफलता सूची</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 text-xs font-bold font-numeric-display shrink-0">
              ${failedCalls.length} नंबर
            </span>
          </div>

          <!-- Quick Action Bar inside Dedicated Column -->
          <div class="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-rose-200 shadow-xs">
            <label class="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
              <input type="checkbox" ${allFailedChecked ? 'checked' : ''} onchange="TelephonyUI.toggleSelectAllFailed(this.checked)" class="w-4 h-4 rounded accent-rose-600 cursor-pointer"/>
              <span>सबको चुनें</span>
            </label>
            <button onclick="TelephonyUI.redialAllFailed()" class="h-8 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer">
              <span class="material-symbols-outlined text-[15px]">call</span>
              <span>सबको दोबारा कॉल लगाएं</span>
            </button>
          </div>

          <!-- Failed Calls List -->
          <div class="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
            ${failedCalls.length === 0 ? `
              <div class="p-6 bg-white rounded-2xl text-center border border-rose-200 text-xs text-slate-500">
                🎉 बधाई! कोई भी नंबर बिना कनेक्ट हुआ नहीं बचा है। सभी नंबरों पर बातचीत हो चुकी है।
              </div>
            ` : failedCalls.map(c => `
              <div class="p-3 bg-white rounded-2xl border border-rose-200 shadow-xs flex flex-col gap-2 hover:border-rose-300 transition-colors">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <input type="checkbox" ${this.selectedInTab.has(c.id) ? 'checked' : ''} onchange="TelephonyUI.toggleCustomerInTab('${c.id}', this.checked)" class="w-4 h-4 rounded accent-rose-600 cursor-pointer shrink-0"/>
                    <div class="min-w-0">
                      <span class="font-bold text-slate-900 text-xs truncate block">${c.customerName}</span>
                      <span class="font-mono font-bold text-rose-800 text-xs">${c.phone}</span>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                    ${c.failReason || 'नहीं उठा (00:00)'}
                  </span>
                </div>

                <div class="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                  <span class="text-[10px] text-slate-400 font-medium">${c.time}</span>
                  <div class="flex items-center gap-1.5">
                    <button onclick="TelephonyUI.redialCustomer('${c.rawPhone || c.phone}', '${c.customerName}')" class="h-7 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer">
                      <span class="material-symbols-outlined text-[13px]">call</span>
                      <span>कॉल करें</span>
                    </button>
                    ${c.rawPhone ? `
                      <a href="https://wa.me/${c.rawPhone.replace(/\D/g, '')}?text=नमस्ते%20${encodeURIComponent(c.customerName)}%20जी,%20रामकुमार%20भंडार%20से%20कॉल%20नहीं%20लग%20सकी।" target="_blank" class="h-7 w-7 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center border border-emerald-200" title="व्हाट्सऐप भेजें">
                        <span class="material-symbols-outlined text-[14px] text-emerald-700">chat</span>
                      </a>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  },

  // ----------------------------------------------------
  // 2. DEDICATED TWO-COLUMN SPLIT VIEW (दोहरा कॉलम दृश्य)
  // Left: Connected & All Calls | Right: Dedicated Failed/Unconnected Redial Column
  // ----------------------------------------------------
  renderSplitView(connectedCalls, failedCalls, pendingCustomers) {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <!-- LEFT COLUMN (7 COLS): CONNECTED & RECENT ANSWERED CALLS -->
        <div class="lg:col-span-7 flex flex-col gap-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-200">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-700 text-[20px]">check_circle</span>
              <h4 class="font-bold text-sm text-slate-900">सफल कॉल्स (बातचीत, सारांश व ऑडियो रिकॉर्डिंग)</h4>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
              ${connectedCalls.length} कनेक्टेड
            </span>
          </div>

          <div class="flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto pr-1">
            ${connectedCalls.length === 0 ? `
              <div class="p-8 bg-white rounded-2xl text-center border border-slate-200 text-xs text-slate-500">
                अभी कोई कनेक्टेड बातचीत रिकॉर्ड नहीं है
              </div>
            ` : connectedCalls.map(c => `
              <div class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-slate-900 text-sm">${c.customerName}</span>
                      <span class="font-mono text-xs text-slate-600">(${c.phone})</span>
                    </div>
                    <span class="text-[11px] text-slate-500 font-medium">${c.time} • ⏱️ ${c.durationStr}</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                    ✅ बात हुई
                  </span>
                </div>

                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <strong class="text-slate-900 block mb-0.5">📝 सारांश:</strong>
                  ${c.summary}
                </div>

                <div class="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                  <div class="flex items-center gap-2">
                    ${c.audioUrl ? `
                      <audio controls preload="metadata" class="h-7 max-w-[180px] rounded" src="${TelephonyUI.getAudioStreamUrl(c.audioUrl)}"></audio>
                    ` : `
                      <button onclick="TelephonyUI.playSampleAudio('${c.id}')" class="h-7 px-2 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                        <span class="material-symbols-outlined text-[14px]">play_arrow</span>
                        <span>ऑडियो</span>
                      </button>
                    `}
                    ${c.transcript ? `
                      <button onclick="TelephonyUI.openConversationModal('${c.id}')" class="text-xs text-indigo-700 font-bold hover:underline">
                        ट्रांसक्रिप्ट देखें
                      </button>
                    ` : ''}
                  </div>
                  <a href="https://wa.me/${c.phone.replace(/\D/g, '')}" target="_blank" class="h-7 px-2 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                    <span class="material-symbols-outlined text-[14px]">chat</span>
                    <span>व्हाट्सऐप</span>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT DEDICATED COLUMN (5 COLS): NOT CONNECTED (अनुत्तरित / व्यस्त) REDIAL QUEUE -->
        <div class="lg:col-span-5 flex flex-col gap-3 bg-rose-50/60 p-4 rounded-3xl border-2 border-rose-300 shadow-sm">
          <div class="flex items-center justify-between pb-2 border-b border-rose-200">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-rose-700 text-[22px]">phone_missed</span>
              <div>
                <h4 class="font-bold text-sm text-rose-950">❌ कनेक्ट नहीं हुआ / अनुत्तरित नंबर</h4>
                <p class="text-[11px] text-rose-700">यहाँ से चुनें और तुरंत दोबारा कॉल लगाएं</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-xs font-bold font-numeric-display">
              ${failedCalls.length} नंबर
            </span>
          </div>

          <!-- Quick Action Bar for Failed Numbers -->
          <div class="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-rose-200 shadow-xs">
            <label class="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
              <input type="checkbox" onchange="TelephonyUI.toggleSelectAllInTab(this.checked)" class="w-4 h-4 rounded accent-rose-600 cursor-pointer"/>
              <span>सबको चुनें</span>
            </label>
            <button onclick="TelephonyUI.redialAllFailed()" class="h-8 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer">
              <span class="material-symbols-outlined text-[15px]">call</span>
              <span>सबको दोबारा कॉल लगाएं</span>
            </button>
          </div>

          <div class="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
            ${failedCalls.length === 0 ? `
              <div class="p-8 bg-white rounded-2xl text-center border border-rose-200 text-xs text-slate-500">
                🎉 कोई अनुत्तरित नंबर नहीं है! सभी नंबरों पर बातचीत हो चुकी है।
              </div>
            ` : failedCalls.map(c => `
              <div class="p-3 bg-white rounded-2xl border border-rose-200 shadow-xs flex flex-col gap-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <input type="checkbox" ${this.selectedInTab.has(c.id) ? 'checked' : ''} onchange="TelephonyUI.toggleCustomerInTab('${c.id}', this.checked)" class="w-4 h-4 rounded accent-rose-600 cursor-pointer shrink-0"/>
                    <div class="min-w-0">
                      <span class="font-bold text-slate-900 text-xs truncate block">${c.customerName}</span>
                      <span class="font-mono font-bold text-rose-800 text-xs">${c.phone}</span>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                    नहीं उठा (00:00)
                  </span>
                </div>

                <div class="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                  <span class="text-[10px] text-slate-400 font-medium">${c.time}</span>
                  <div class="flex items-center gap-1.5">
                    <button onclick="TelephonyUI.redialCustomer('${c.phone}', '${c.customerName}')" class="h-7 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer">
                      <span class="material-symbols-outlined text-[13px]">call</span>
                      <span>पुनः कॉल करें</span>
                    </button>
                    <a href="https://wa.me/${c.phone.replace(/\D/g, '')}?text=नमस्ते%20${encodeURIComponent(c.customerName)}%20जी,%20रामकुमार%20भंडार%20से%20कॉल%20नहीं%20लग%20सकी।" target="_blank" class="h-7 w-7 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center border border-emerald-200">
                      <span class="material-symbols-outlined text-[14px] text-emerald-700">chat</span>
                    </a>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  },

  // ----------------------------------------------------
  // 3. PENDING SPREADSHEET (बकायादार ग्राहक स्प्रेडशीट)
  // ----------------------------------------------------
  renderPendingSpreadsheet(customers) {
    if (!customers || customers.length === 0) {
      return `
        <div class="p-10 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200 shadow-xs">
          <span class="material-symbols-outlined text-[42px] text-emerald-600">verified</span>
          <p class="font-bold text-slate-800 text-sm">सभी उधारी ग्राहकों को कॉल लग चुकी है!</p>
          <p class="text-xs text-slate-500">कोई भी शेष बकायादार ग्राहक नहीं बचा है</p>
        </div>
      `;
    }

    const shopId = this.currentWingFilter === 'all' ? AppState.currentShopId : this.currentWingFilter;
    const allChecked = customers.length > 0 && customers.every(c => this.selectedInTab.has(c.id));

    return `
      <div class="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-amber-900 text-white font-bold tracking-wider text-[11px] uppercase border-b border-amber-800">
              <th class="p-3.5 w-10 text-center">
                <input type="checkbox" ${allChecked ? 'checked' : ''} onchange="TelephonyUI.toggleSelectAllInTab(this.checked)" class="w-4 h-4 rounded accent-emerald-500 cursor-pointer"/>
              </th>
              <th class="p-3.5 whitespace-nowrap">स्थिति</th>
              <th class="p-3.5 whitespace-nowrap">ग्राहक का नाम एवं पता</th>
              <th class="p-3.5 whitespace-nowrap">मोबाइल नंबर</th>
              <th class="p-3.5 whitespace-nowrap">बकाया राशि (उधार)</th>
              <th class="p-3.5 whitespace-nowrap text-center">त्वरित AI कॉल एक्शन</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${customers.map((c, idx) => {
              const isChecked = this.selectedInTab.has(c.id);
              const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20';

              return `
                <tr class="${rowBg} hover:bg-amber-50/50 transition-colors">
                  <td class="p-3 text-center">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="TelephonyUI.toggleCustomerInTab('${c.id}', this.checked)" class="w-4 h-4 rounded accent-emerald-600 cursor-pointer"/>
                  </td>
                  <td class="p-3 whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                      ⏳ कॉल बाकी
                    </span>
                  </td>
                  <td class="p-3 whitespace-nowrap">
                    <div class="flex flex-col">
                      <span class="font-bold text-slate-900 text-xs">${c.name}</span>
                      <span class="text-[11px] text-slate-500">${c.village || 'पता नहीं'} • ${c.role || 'किसान'}</span>
                    </div>
                  </td>
                  <td class="p-3 whitespace-nowrap font-mono font-bold text-slate-700">
                    ${c.phone || 'नंबर नहीं'}
                  </td>
                  <td class="p-3 whitespace-nowrap font-numeric-display font-extrabold text-rose-700 text-sm">
                    ₹${due.toLocaleString('en-IN')}
                  </td>
                  <td class="p-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="TelephonyUI.startBatchAutoDial([{ id: '${c.id}', name: '${c.name}', phone: '${c.phone}', due: ${due}, shopId: '${shopId}' }])" class="h-8 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer">
                        <span class="material-symbols-outlined text-[15px]">smart_toy</span>
                        <span>AI कॉल लगाएं</span>
                      </button>
                      <a href="https://wa.me/${(c.phone || '').replace(/\D/g, '')}?text=नमस्ते%20${encodeURIComponent(c.name)}%20जी,%20रामकुमार%20भंडार%20से%20सूचना%20है।%20आपके%20खाते%20में%20₹${due}%20का%20बकाया%20है।" target="_blank" class="h-8 w-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-200">
                        <span class="material-symbols-outlined text-[15px] text-emerald-700">chat</span>
                      </a>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ----------------------------------------------------
  // 4. CARDS VIEW (मोबाइल टच कार्ड्स — कॉम्पैक्ट व स्वच्छ)
  // ----------------------------------------------------
  renderCardsView(calls) {
    if (!calls || calls.length === 0) {
      return `
        <div class="p-8 bg-white rounded-3xl text-center border border-slate-200 text-xs text-slate-500">
          कोई कॉल रिकॉर्ड नहीं है
        </div>
      `;
    }
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${calls.map(c => `
          <div class="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-2.5 transition-all">
            <!-- Header: Checkbox, Name, Phone, Status & Duration -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <input type="checkbox" ${this.selectedInTab.has(c.id) ? 'checked' : ''} onchange="TelephonyUI.toggleCustomerInTab('${c.id}', this.checked)" class="w-4 h-4 rounded accent-emerald-600 cursor-pointer shrink-0"/>
                <div class="min-w-0">
                  <h4 class="font-bold text-slate-900 text-sm truncate">${c.customerName}</h4>
                  <div class="flex items-center gap-1.5 text-xs text-slate-500">
                    <span class="font-mono font-bold text-slate-700">${c.phone}</span>
                    <span>•</span>
                    <span class="text-[11px]">${c.time}</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${c.statusClass}">
                  ${c.statusText}
                </span>
                <span class="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  ⏱️ ${c.durationStr}
                </span>
              </div>
            </div>

            <!-- Controls Row: Inline Audio (No Redirect) + View Details + Call & WhatsApp -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
              <div class="flex items-center gap-1.5">
                ${c.audioUrl ? `
                  <audio controls preload="metadata" class="h-8 max-w-[155px] sm:max-w-[175px] rounded-lg border border-slate-200 bg-slate-50" src="${TelephonyUI.getAudioStreamUrl(c.audioUrl)}"></audio>
                ` : (c.isConnected ? `
                  <button type="button" onclick="TelephonyUI.playSampleAudio('${c.id}')" class="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center gap-1 border border-emerald-200 cursor-pointer transition-all">
                    <span class="material-symbols-outlined text-[15px] text-emerald-700">play_arrow</span>
                    <span>ऑडियो</span>
                  </button>
                ` : `
                  <span class="text-slate-400 text-[11px] font-medium">ऑडियो नहीं</span>
                `)}

                <!-- Toggle Details Button (Click to reveal summary & full transcript) -->
                <button type="button" onclick="TelephonyUI.toggleCardDetails('${c.id}')" id="btn-toggle-card-${c.id}" class="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all" title="बातचीत का पूरा विवरण देखें">
                  <span class="material-symbols-outlined text-[15px]">expand_more</span>
                  <span>विवरण</span>
                </button>
              </div>

              <div class="flex items-center gap-1.5 ml-auto">
                <button type="button" onclick="TelephonyUI.redialCustomer('${c.rawPhone || c.phone}', '${c.customerName}')" class="h-8 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer">
                  <span class="material-symbols-outlined text-[15px]">call</span>
                  <span>कॉल</span>
                </button>
                ${c.rawPhone ? `
                  <a href="https://wa.me/${c.rawPhone.replace(/\D/g, '')}?text=नमस्ते%20${encodeURIComponent(c.customerName)}%20जी,%20रामकुमार%20भंडार%20से%20कॉल%20के%20संदर्भ%20में।" target="_blank" class="h-8 w-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-200 active:scale-95 transition-all" title="व्हाट्सऐप भेजें">
                    <span class="material-symbols-outlined text-[15px] text-emerald-700">chat</span>
                  </a>
                ` : ''}
              </div>
            </div>

            <!-- Expandable Details: Summary & Full Transcript (Hidden by default, shown on click) -->
            <div id="card-details-${c.id}" class="hidden pt-2.5 border-t border-slate-100 flex flex-col gap-2 transition-all">
              ${c.summary ? `
                <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800">
                  <strong class="text-slate-900 block mb-0.5">📝 बातचीत सारांश:</strong>
                  <span>${c.summary}</span>
                </div>
              ` : ''}

              ${c.transcript ? `
                <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs text-slate-700 max-h-48 overflow-y-auto">
                  <div class="flex items-center justify-between mb-1">
                    <strong class="text-slate-900">💬 पूरी बातचीत ट्रांसक्रिप्ट:</strong>
                    <button type="button" onclick="TelephonyUI.openConversationModal('${c.id}')" class="text-indigo-700 hover:underline font-bold text-[11px]">
                      फुल स्क्रीन देखें ↗
                    </button>
                  </div>
                  <div class="space-y-1 font-mono text-[11px] text-slate-800 leading-relaxed">${c.transcript}</div>
                </div>
              ` : ''}

              ${c.failReason ? `
                <div class="bg-rose-50 p-2 rounded-xl border border-rose-200 text-xs text-rose-800">
                  <strong>कारण:</strong> ${c.failReason}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderPendingCards(customers) {
    const shopId = this.currentWingFilter === 'all' ? AppState.currentShopId : this.currentWingFilter;
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${customers.map(c => {
          const due = (c.balancesRupees ? c.balancesRupees[shopId] : (c.balances?.[shopId] ? c.balances[shopId] / 100 : 0)) || 0;
          return `
            <div class="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2.5">
                  <input type="checkbox" ${this.selectedInTab.has(c.id) ? 'checked' : ''} onchange="TelephonyUI.toggleCustomerInTab('${c.id}', this.checked)" class="w-4 h-4 rounded accent-emerald-600 cursor-pointer"/>
                  <div>
                    <h4 class="font-bold text-slate-900 text-sm">${c.name}</h4>
                    <span class="text-xs text-slate-500">${c.phone} • ${c.village || 'गांव'}</span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-[10px] font-bold text-rose-700 uppercase block">बाकी</span>
                  <span class="font-numeric-display font-extrabold text-sm text-rose-700">₹${due.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                <button onclick="TelephonyUI.startBatchAutoDial([{ id: '${c.id}', name: '${c.name}', phone: '${c.phone}', due: ${due}, shopId: '${shopId}' }])" class="flex-1 h-9 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95">
                  <span class="material-symbols-outlined text-[16px]">smart_toy</span>
                  <span>AI कॉल लगाएं</span>
                </button>
                <a href="https://wa.me/${(c.phone || '').replace(/\D/g, '')}?text=नमस्ते%20${encodeURIComponent(c.name)}%20जी,%20रामकुमार%20भंडार%20से%20सूचना%20है।%20आपके%20खाते%20में%20₹${due}%20का%20बकाया%20है।" target="_blank" class="h-9 px-3 rounded-xl bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                  <span class="material-symbols-outlined text-[16px] text-emerald-700">chat</span>
                  <span>व्हाट्सऐप</span>
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // ----------------------------------------------------
  // CONVERSATION TRANSCRIPT MODAL VIEWER
  // ----------------------------------------------------
  openConversationModal(callId) {
    const data = this.getProcessedData();
    const call = data.allCalls.find(c => c.id === callId);
    if (!call) return;

    this.activeTranscriptCall = call;

    const modal = document.getElementById('modal-call-conversation');
    const titleEl = document.getElementById('transcript-modal-title');
    const subtitleEl = document.getElementById('transcript-modal-subtitle');
    const audioContainer = document.getElementById('transcript-modal-audio-container');
    const bodyEl = document.getElementById('transcript-modal-body');

    if (titleEl) titleEl.innerText = `${call.customerName} (${call.phone}) से बातचीत`;
    if (subtitleEl) subtitleEl.innerText = `${call.time} • अवधि: ${call.durationStr} • स्थिति: ${call.statusText}`;

    if (audioContainer) {
      if (call.audioUrl) {
        audioContainer.classList.remove('hidden');
        audioContainer.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-emerald-800 text-[20px]">volume_up</span>
            <span class="text-xs font-bold text-slate-800">वास्तविक कॉल रिकॉर्डिंग:</span>
          </div>
          <audio controls autoplay preload="metadata" class="h-8 max-w-[240px] rounded" src="${TelephonyUI.getAudioStreamUrl(call.audioUrl)}"></audio>
        `;
      } else {
        audioContainer.classList.add('hidden');
      }
    }

    if (bodyEl) {
      // Parse HTML or LLM: / User: transcript
      const raw = call.transcript || '';
      if (!raw) {
        bodyEl.innerHTML = `<div class="p-4 text-center text-xs text-slate-500">कोई ट्रांसक्रिप्ट उपलब्ध नहीं है</div>`;
      } else {
        const turns = raw.split(/<br\s*\/?>|\n/).filter(t => t.trim());
        bodyEl.innerHTML = turns.map(t => {
          const isAi = t.toLowerCase().startsWith('llm:') || t.toLowerCase().startsWith('ai:');
          const isUser = t.toLowerCase().startsWith('user:') || t.toLowerCase().startsWith('caller:');
          const cleanText = t.replace(/^(llm:|user:|ai:|caller:)/i, '').trim();

          if (isAi) {
            return `
              <div class="flex items-start gap-2 max-w-[85%] self-start">
                <div class="w-7 h-7 rounded-full bg-emerald-800 text-emerald-100 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  AI
                </div>
                <div class="p-3 bg-emerald-50 border border-emerald-200/90 text-emerald-950 rounded-2xl rounded-tl-none text-xs leading-relaxed font-medium">
                  ${cleanText}
                </div>
              </div>
            `;
          } else if (isUser) {
            return `
              <div class="flex items-start gap-2 max-w-[85%] self-end flex-row-reverse">
                <div class="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ग
                </div>
                <div class="p-3 bg-slate-100 border border-slate-200 text-slate-900 rounded-2xl rounded-tr-none text-xs leading-relaxed font-medium">
                  ${cleanText}
                </div>
              </div>
            `;
          } else {
            return `
              <div class="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 text-center font-medium">
                ${t}
              </div>
            `;
          }
        }).join('');
      }
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeConversationModal() {
    const modal = document.getElementById('modal-call-conversation');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  copyTranscriptText() {
    if (!this.activeTranscriptCall) return;
    const clean = (this.activeTranscriptCall.transcript || '').replace(/<br\s*\/?>/gi, '\n');
    navigator.clipboard.writeText(clean);
    AppState.showToast('✓ पूरी बातचीत ट्रांसक्रिप्ट कॉपी हो गई');
  },

  // ----------------------------------------------------
  // MULTI-SELECTION & BATCH ACTIONS
  // ----------------------------------------------------
  toggleSelectAllInTab(isChecked) {
    const data = this.getProcessedData();
    let targetList = data.allCalls;
    if (this.currentCallTab === 'connected') targetList = data.connectedCalls;
    else if (this.currentCallTab === 'failed') targetList = data.failedCalls;
    else if (this.currentCallTab === 'pending') targetList = data.pendingCustomers;
    else if (this.currentCallTab === 'total_all') targetList = data.totalAllList;

    if (isChecked) {
      targetList.forEach(c => this.selectedInTab.add(c.id));
    } else {
      this.selectedInTab.clear();
    }
    this.renderCurrentTab();
  },

  toggleSelectAllFailed(isChecked) {
    const data = this.getProcessedData();
    if (isChecked) {
      data.failedCalls.forEach(c => this.selectedInTab.add(c.id));
    } else {
      data.failedCalls.forEach(c => this.selectedInTab.delete(c.id));
    }
    const countEl = document.getElementById('call-tab-selected-count');
    if (countEl) countEl.innerText = this.selectedInTab.size;
    const toolbar = document.getElementById('call-tab-toolbar');
    if (toolbar) {
      if (this.selectedInTab.size > 0) {
        toolbar.classList.remove('hidden');
        toolbar.classList.add('flex');
      } else {
        toolbar.classList.add('hidden');
        toolbar.classList.remove('flex');
      }
    }
    this.renderCurrentTab();
  },

  exportToCsv() {
    const data = this.getProcessedData();
    let list = data.allCalls;
    if (this.currentCallTab === 'connected') list = data.connectedCalls;
    else if (this.currentCallTab === 'failed') list = data.failedCalls;
    else if (this.currentCallTab === 'pending') list = data.pendingCustomers;
    else if (this.currentCallTab === 'total_all') list = data.totalAllList;

    if (!list || list.length === 0) {
      alert('डाउनलोड करने के लिए कोई रिकॉर्ड उपलब्ध नहीं है');
      return;
    }

    const headers = ['क्र.सं.', 'स्थिति', 'ग्राहक का नाम', 'मोबाइल नंबर', 'गांव/पता', 'दिशा', 'कॉल अवधि', 'तारीख व समय', 'बातचीत सारांश'];
    const rows = list.map((c, idx) => [
      idx + 1,
      `"${c.statusText || (c.isConnected ? 'सफल बात' : 'कॉल नहीं लगी')}"`,
      `"${(c.customerName || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${(c.village || '').replace(/"/g, '""')}"`,
      `"${c.direction === 'outbound' ? 'आउटगोइंग' : (c.direction === 'inbound' ? 'इनकमिंग' : 'लंबित')}"`,
      `"${c.durationStr || '00:00'}"`,
      `"${c.time || ''}"`,
      `"${(c.summary || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ramkumar_Bhandar_Call_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    AppState.showToast('✓ स्प्रेडशीट CSV सफलतापूर्वक डाउनलोड हुई');
  },

  shareReportWhatsApp() {
    const data = this.getProcessedData();
    const dateStr = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const text = `📋 *रामकुमार भंडार — AI टेलीफोन कॉलिंग रिपोर्ट*
📅 तारीख: ${dateStr}
━━━━━━━━━━━━━━━━━━
📞 कुल डायल किए नंबर: ${data.allCalls.length}
✅ बात हुई (सफल): ${data.connectedCalls.length}
❌ कनेक्ट नहीं हुआ (अनुत्तरित/व्यस्त): ${data.failedCalls.length}
⏳ शेष उधार तकादा बाकी: ${data.pendingCustomers.length}
━━━━━━━━━━━━━━━━━━
💡 *अंतिम 3 कनेक्टेड कॉल्स:*
${data.connectedCalls.slice(0, 3).map(c => `• ${c.customerName} (${c.phone}): ${c.durationStr} - ${c.summary.substring(0, 40)}...`).join('\n') || 'कोई नहीं'}

🔍 *तत्काल री-डायल योग्य नंबर:*
${data.failedCalls.slice(0, 3).map(c => `• ${c.customerName} (${c.phone}) - ${c.failReason || 'नहीं उठा'}`).join('\n') || 'सभी नंबर कनेक्ट हो चुके हैं'}

(रामकुमार भंडार ऐप से लाइव स्वचालित रिपोर्ट)`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  toggleCustomerInTab(id, isChecked) {
    if (isChecked) {
      this.selectedInTab.add(id);
    } else {
      this.selectedInTab.delete(id);
    }
    const countEl = document.getElementById('call-tab-selected-count');
    if (countEl) countEl.innerText = this.selectedInTab.size;

    const toolbar = document.getElementById('call-tab-toolbar');
    if (toolbar && this.selectedInTab.size > 0) {
      toolbar.classList.remove('hidden');
      toolbar.classList.add('flex');
    }
  },

  clearSelectionInTab() {
    this.selectedInTab.clear();
    this.renderCurrentTab();
  },

  startBatchDialFromTab() {
    const data = this.getProcessedData();
    let toCall = [];

    if (this.selectedInTab.size > 0) {
      // Find items in either calls or pending customers or total list
      const allSources = [...data.allCalls, ...data.pendingCustomers, ...data.totalAllList];
      // Deduplicate by ID
      const seenIds = new Set();
      const uniqueSources = allSources.filter(item => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });

      toCall = uniqueSources.filter(c => this.selectedInTab.has(c.id)).map(c => ({
        id: c.id,
        name: c.customerName || c.name || 'ग्राहक',
        phone: c.rawPhone || c.phone,
        due: c.dueAmount || c.due || 0,
        shopId: c.shopId || AppState.currentShopId
      })).filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
    } else if (this.currentCallTab === 'failed') {
      toCall = data.failedCalls.map(c => ({
        id: c.id,
        name: c.customerName,
        phone: c.rawPhone || c.phone,
        due: c.dueAmount || 0,
        shopId: c.shopId
      })).filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
    } else if (this.currentCallTab === 'pending') {
      toCall = data.pendingCustomers.map(c => {
        const due = (c.balancesRupees ? c.balancesRupees[AppState.currentShopId] : (c.balances?.[AppState.currentShopId] ? c.balances[AppState.currentShopId] / 100 : 0)) || 0;
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          due,
          shopId: AppState.currentShopId
        };
      }).filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
    } else if (this.currentCallTab === 'inauguration') {
      toCall = (data.inaugurationCalls || []).map(c => ({
        id: c.id,
        name: c.customerName,
        phone: c.rawPhone || c.phone,
        cleanPhone: c.rawPhone,
        due: 0,
        shopId: 'kirana',
        campaign: 'inauguration'
      })).filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
    }

    if (toCall.length === 0) {
      alert('कॉल करने के लिए कोई वैध नंबर नहीं चुना गया');
      return;
    }

    if (this.currentCallTab === 'inauguration') {
      if (confirm(`क्या आप उद्घाटन आमंत्रण हेतु चुने हुए ${toCall.length} नंबरों पर एक-एक करके बैकग्राउंड AI कॉलिंग शुरू करना चाहते हैं?`)) {
        this.selectedInTab.clear();
        this.startSequentialCampaignDial(toCall);
      }
      return;
    }

    if (confirm(`क्या आप चुने हुए ${toCall.length} नंबरों पर बैकग्राउंड AI ऑटो-कॉलिंग शुरू करना चाहते हैं?`)) {
      this.selectedInTab.clear();
      this.startBatchAutoDial(toCall);
    }
  },

  redialAllFailed() {
    const data = this.getProcessedData();
    const toDial = data.failedCalls.map(c => ({
      id: c.id,
      name: c.customerName,
      phone: c.phone,
      due: 0,
      shopId: c.shopId
    })).filter(c => c.phone);

    if (toDial.length === 0) {
      alert('कोई अनुत्तरित नंबर नहीं मिला');
      return;
    }

    if (confirm(`क्या आप इन सभी ${toDial.length} अनुत्तरित नंबरों पर दोबारा AI कॉल लगाना चाहते हैं?`)) {
      this.startBatchAutoDial(toDial);
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

  // ----------------------------------------------------
  // BACKGROUND AUTO-DIALER QUEUE
  // ----------------------------------------------------
  startBatchAutoDial(customerList, shopId = null) {
    if (!Array.isArray(customerList) || customerList.length === 0) {
      alert('कॉल करने के लिए कोई ग्राहक नहीं चुना गया');
      return;
    }

    const validList = customerList.filter(c => {
      const clean = (c.cleanPhone || c.phone || '').replace(/\D/g, '').slice(-10);
      return clean.length === 10;
    });

    if (validList.length === 0) {
      alert('चुने हुए ग्राहकों में कोई वैध 10-अंकों का मोबाइल नंबर नहीं मिला');
      return;
    }

    // Guard: Prevent concurrent dialing sessions (at a time, only 1 call session is allowed)
    if (this.isAutoDialing || this.isCampaignCalling) {
      if (!confirm('एक AI कॉलिंग सत्र पहले से चल रहा है। क्या आप उसे रोककर नई कतार शुरू करना चाहते हैं?')) {
        return;
      }
      this.stopAutoDial();
    }

    this.autoDialQueue = validList;
    this.autoDialCurrentIndex = 0;
    this.isAutoDialing = true;
    this.isAutoDialPaused = false;

    // Show persistent banner
    const banner = document.getElementById('active-calling-banner');
    if (banner) {
      banner.classList.remove('hidden');
      banner.classList.add('flex');
    }

    AppState.showToast(`🚀 क्रमिक 1-बाय-1 AI कॉलिंग शुरू: कुल ${validList.length} ग्राहक (एक समय पर एक कॉल)`);
    this.processNextAutoDial();
  },

  async processNextAutoDial() {
    if (!this.isAutoDialing) return;
    if (this.isAutoDialPaused) return;

    if (this.autoDialCurrentIndex >= this.autoDialQueue.length) {
      this.stopAutoDial();
      AppState.showToast('🎉 सभी ग्राहकों को AI कॉल सफलतापूर्वक लगा दी गई है!');
      await this.fetchCampaignContacts();
      await this.fetchLiveOmnidimLogs(true);
      return;
    }

    const currentCustomer = this.autoDialQueue[this.autoDialCurrentIndex];
    const cleanPhone = (currentCustomer.cleanPhone || currentCustomer.phone || '').replace(/\D/g, '').slice(-10);
    const total = this.autoDialQueue.length;
    const currentNum = this.autoDialCurrentIndex + 1;

    // Skip if customer is already connected in the meantime
    const { connectedCalls } = this.getProcessedData();
    const isAlreadyConnected = connectedCalls.some(c => (c.rawPhone || c.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone);
    if (isAlreadyConnected) {
      console.log(`Skipping already connected customer: ${currentCustomer.name} (${cleanPhone})`);
      this.autoDialCurrentIndex++;
      this.processNextAutoDial();
      return;
    }

    // Update Banner UI - Stage 1: Initiating call
    const progressEl = document.getElementById('calling-banner-progress');
    const targetEl = document.getElementById('calling-banner-current-target');
    const statusEl = document.getElementById('calling-banner-status');

    if (progressEl) progressEl.innerText = `📞 AI 1-बाय-1 कॉलिंग: (${currentNum}/${total})`;
    if (targetEl) targetEl.innerText = `वर्तमान: ${currentCustomer.name} (+91 ${cleanPhone}) • ₹${currentCustomer.due || 0} बकाया`;
    if (statusEl) {
      statusEl.innerText = '📞 कॉल लगाई जा रही है...';
      statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900 text-amber-200 border border-amber-700 animate-pulse';
    }

    // Mark as calling in UI
    const campMatch = (this.campaignContacts || []).find(c => c.cleanPhone === cleanPhone || c.id === currentCustomer.id);
    if (campMatch) {
      campMatch.status = 'calling';
      this.renderCurrentTab();
    }

    const due = currentCustomer.due || currentCustomer.dueAmount || 0;
    const prompt = currentCustomer.prompt || (due > 0 
      ? `नमस्ते ${currentCustomer.name} जी, रामकुमार भंडार से तकादा कॉल है। आपके खाते में ₹${due} का बकाया है। कृपया समय पर भुगतान करने का कष्ट करें। धन्यवाद!`
      : `नमस्ते ${currentCustomer.name} जी, रामकुमार किराना एवं जनरल स्टोर के उद्घाटन समारोह में आप सादर आमंत्रित हैं। 4 नवंबर को पधारें।`);

    // Dispatch Call (Single active call at a time)
    try {
      await fetch('/api/omnidim/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 276578,
          toNumber: '+91' + cleanPhone,
          prompt,
          context: {
            customerName: currentCustomer.name,
            amount: due,
            shopId: currentCustomer.shopId || AppState.currentShopId
          }
        })
      });
    } catch (err) {
      console.warn('Auto-dial call dispatch failed:', err);
    }

    if (statusEl) {
      statusEl.innerText = '🔔 घंटी बज रही है / बातचीत जारी... (कॉल समाप्त होने की प्रतीक्षा)';
      statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-900 text-sky-200 border border-sky-700 animate-pulse';
    }

    // STRICT 1-BY-1 TELECOM TRACKING:
    // Poll logs every 2.5s until this specific call FINISHES (or max 85s carrier timeout)
    const startTime = Date.now();
    const maxPollTimeMs = 85000;
    let callEnded = false;
    let finalStatus = 'failed';
    let durationStr = '00:00';
    let summary = '';
    let audioUrl = null;

    while (!callEnded && (Date.now() - startTime) < maxPollTimeMs) {
      if (!this.isAutoDialing) return; // User stopped the queue
      if (this.isAutoDialPaused) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }

      await new Promise(r => setTimeout(r, 2500));

      try {
        const logsRes = await fetch('/api/omnidim/call-logs');
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          const logs = logsData.logs || [];

          const matchingLog = logs.find(l => {
            const toClean = (l.to_number || '').replace(/\D/g, '');
            const fromClean = (l.from_number || '').replace(/\D/g, '');
            return toClean.endsWith(cleanPhone) || fromClean.endsWith(cleanPhone);
          });

          if (matchingLog) {
            const rawStatus = (matchingLog.call_status || '').toLowerCase();
            const sec = matchingLog.call_duration_in_seconds || 0;
            const min = matchingLog.call_duration_in_minutes || 0;
            const totalSec = (min * 60) + sec;

            if (rawStatus === 'completed') {
              callEnded = true;
              finalStatus = totalSec > 0 ? 'connected' : 'failed';
              durationStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
              summary = matchingLog.sentiment_analysis_details || matchingLog.call_summary || (totalSec > 0 ? 'सफल बातचीत पूरी हुई' : 'कॉल कनेक्ट नहीं हुई');
              audioUrl = matchingLog.internal_recording_url || matchingLog.recording_url || null;
              break;
            } else if (rawStatus === 'no-answer' || rawStatus === 'busy' || rawStatus === 'failed') {
              callEnded = true;
              finalStatus = 'failed';
              durationStr = '00:00';
              summary = rawStatus === 'no-answer' ? 'घंटी बजी पर नहीं उठा (No Answer)' : (rawStatus === 'busy' ? 'फोन व्यस्त था (Busy)' : 'नेटवर्क समस्या (Failed)');
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Polling logs error:', e);
      }
    }

    if (!callEnded) {
      finalStatus = 'failed';
      summary = 'कॉल समय-सीमा समाप्त (Timeout)';
    }

    // Persist final call status to server
    try {
      await fetch('/api/campaign/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanPhone,
          status: finalStatus,
          durationStr,
          summary,
          audioUrl
        })
      });
    } catch (e) {}

    if (campMatch) {
      campMatch.status = finalStatus;
      campMatch.durationStr = durationStr;
      campMatch.summary = summary;
      campMatch.audioUrl = audioUrl;
      campMatch.lastCallAt = new Date().toISOString();
    }

    this.renderCurrentTab();

    // Update banner with call outcome
    if (statusEl) {
      if (finalStatus === 'connected') {
        statusEl.innerText = `✅ कॉल समाप्त (अवधि ${durationStr}) • अगली कॉल 3s में`;
        statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700';
      } else {
        statusEl.innerText = `❌ कॉल नहीं उठी • लाइन खाली हो रही है...`;
        statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-900 text-rose-200 border border-rose-700';
      }
    }

    // Channel Release Buffer: Wait 3.5s so telecom carrier clears line
    this.autoDialCurrentIndex++;

    if (this.autoDialTimer) clearTimeout(this.autoDialTimer);
    this.autoDialTimer = setTimeout(() => {
      this.processNextAutoDial();
    }, 3500);
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
      if (this.isCampaignCalling) {
        this.processNextSequentialCall();
      } else {
        this.processNextAutoDial();
      }
    }
  },

  stopAutoDial() {
    this.isAutoDialing = false;
    this.isCampaignCalling = false;
    this.isAutoDialPaused = false;
    this.autoDialQueue = [];
    this.campaignQueue = [];
    if (this.autoDialTimer) clearTimeout(this.autoDialTimer);

    const banner = document.getElementById('active-calling-banner');
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }
  },

  // ----------------------------------------------------
  // CARD DETAILS TOGGLE (विवरण दिखाएं / छिपाएं)
  // ----------------------------------------------------
  toggleCardDetails(id) {
    const drawer = document.getElementById(`card-details-${id}`);
    const btn = document.getElementById(`btn-toggle-card-${id}`);
    if (!drawer) return;
    if (drawer.classList.contains('hidden')) {
      drawer.classList.remove('hidden');
      if (btn) btn.innerHTML = `<span class="material-symbols-outlined text-[15px]">expand_less</span><span>छिपाएं</span>`;
    } else {
      drawer.classList.add('hidden');
      if (btn) btn.innerHTML = `<span class="material-symbols-outlined text-[15px]">expand_more</span><span>विवरण</span>`;
    }
  },

  // ----------------------------------------------------
  // BULK NUMBERS & INAUGURATION CAMPAIGN SYSTEM
  // ----------------------------------------------------
  openBulkNumbersModal() {
    const modal = document.getElementById('modal-bulk-numbers');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const input = document.getElementById('bulk-numbers-input');
    if (input) {
      this.parseBulkNumbersInput(input.value);
      input.focus();
    }
  },

  closeBulkNumbersModal() {
    const modal = document.getElementById('modal-bulk-numbers');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  handleCampaignPresetChange(val) {
    const promptEl = document.getElementById('bulk-prompt-input');
    if (!promptEl) return;
    if (val === 'inauguration') {
      promptEl.value = 'नमस्ते! रामकुमार किराना एवं जनरल स्टोर, कुँवरगद्दी की नई शाखा के भव्य उद्घाटन समारोह में आप सपरिवार सादर आमंत्रित हैं। 4 नवंबर को पधारकर हमारा उत्साहवर्धन करें। धन्यवाद!';
    } else if (val === 'krishi_stock') {
      promptEl.value = 'नमस्ते! रामकुमार खाद भंडार, कुँवरगद्दी से सूचना है। उत्तम गुणवत्ता की यूरिया खाद एवं प्रमाणित गेहूं-सरसों बीज का नया स्टॉक आ गया है। उचित मूल्य पर प्राप्त करने हेतु संपर्क करें।';
    } else if (val === 'udhar_reminder') {
      promptEl.value = 'नमस्ते! रामकुमार भंडार से तकादा सूचना है। आपके खाते में पुराना बकाया शेष है। कृपया शीघ्र दुकान पर पधारकर हिसाब चुकता करने का कष्ट करें।';
    }
  },

  parseBulkNumbersInput(text) {
    const raw = text || '';
    const lines = raw.split(/\r?\n/);
    const contacts = [];
    const seen = new Set();

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;

      // Also support multiple comma/semicolon separated items if no name text is present
      const subItems = (rawLine.includes(',') && !/[a-zA-Z\u0900-\u097F]/.test(rawLine)) ?
        rawLine.split(/[,;]+/) : [rawLine];

      for (const item of subItems) {
        const trimmed = item.trim();
        if (!trimmed) continue;

        // Matches Indian mobile: optional +91, 91, or 0, followed by 10 digits starting with 6, 7, 8, or 9
        const match = trimmed.match(/(?:(?:\+?91[\s-]?)|\b0)?([6-9]\d{9})\b/);
        if (match) {
          const last10 = match[1];
          if (!seen.has(last10)) {
            seen.add(last10);
            let name = trimmed.replace(match[0], '').replace(/[-:–—()\t]/g, ' ').replace(/\s+/g, ' ').trim();
            if (!name || name.length < 2) name = 'ग्रामवासी / ग्राहक';
            contacts.push({
              name,
              cleanPhone: last10,
              phone: `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`
            });
          }
        }
      }
    }

    const counter = document.getElementById('bulk-numbers-counter');
    if (counter) {
      counter.innerText = `✓ ${contacts.length} वैध नंबर मिले`;
      counter.className = contacts.length > 0 ? 
        'text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300' :
        'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300';
    }

    return contacts;
  },

  // ----------------------------------------------------
  // PERMANENT CONTACTS DIRECTORY (स्थायी संपर्क डायरेक्टरी)
  // ----------------------------------------------------
  async fetchContactsBook() {
    try {
      const res = await fetch('/api/contacts-book');
      if (res.ok) {
        const data = await res.json();
        this.contactsBook = data.contacts || [];
        this.updateContactsBookBadges();
      }
    } catch (err) {
      console.warn('Fetch contacts book error:', err.message);
    }
  },

  updateContactsBookBadges() {
    const count = this.contactsBook ? this.contactsBook.length : 0;
    const badge1 = document.getElementById('contacts-book-count-badge');
    const badge2 = document.getElementById('top-contacts-book-count');
    if (badge1) badge1.innerText = count;
    if (badge2) badge2.innerText = count;
  },

  loadFromContactsBookModal() {
    if (!this.contactsBook || this.contactsBook.length === 0) {
      alert('डायरेक्टरी में अभी कोई सुरक्षित नंबर नहीं है। नीचे दिए गए टेक्स्ट एरिया में नंबर दर्ज करें, वे स्वतः डायरेक्टरी में हमेशा के लिए सुरक्षित हो जाएंगे।');
      return;
    }
    const input = document.getElementById('bulk-numbers-input');
    if (!input) return;

    // Load formatted list: Name - Clean 10 digits
    const lines = this.contactsBook.map(c => {
      const clean = (c.cleanPhone || c.phone || '').replace(/\D/g, '').slice(-10);
      if (c.name && c.name !== 'ग्रामवासी / ग्राहक') {
        return `${c.name} - ${clean}`;
      }
      return clean;
    });

    input.value = lines.join('\n');
    this.parseBulkNumbersInput(input.value);
    AppState.showToast(`📖 डायरेक्टरी से ${this.contactsBook.length} सुरक्षित नंबर लोड किए गए`);
  },

  pasteExampleNumbers() {
    const input = document.getElementById('bulk-numbers-input');
    if (!input) return;
    input.value = `8175044956\n+91 9208321477 (राकेश वर्मा)\nसुरेश कुमार - 9876543210\n9123456780, 8877665544`;
    this.parseBulkNumbersInput(input.value);
    AppState.showToast('✓ उदाहरण नंबर भर दिए गए');
  },

  openContactsDirectoryModal() {
    const modal = document.getElementById('modal-contacts-directory');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.renderContactsDirectory();
  },

  closeContactsDirectoryModal() {
    const modal = document.getElementById('modal-contacts-directory');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  renderContactsDirectory(filterText = '') {
    const listEl = document.getElementById('contacts-directory-list');
    const countEl = document.getElementById('contacts-directory-total-count');
    if (!listEl) return;

    const query = (filterText || '').toLowerCase().trim();
    const contacts = (this.contactsBook || []).filter(c => {
      if (!query) return true;
      return (c.name && c.name.toLowerCase().includes(query)) ||
             (c.cleanPhone && c.cleanPhone.includes(query)) ||
             (c.village && c.village.toLowerCase().includes(query));
    });

    if (countEl) countEl.innerText = this.contactsBook ? this.contactsBook.length : 0;

    if (contacts.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1.5 border border-slate-200">
          <span class="material-symbols-outlined text-[32px] text-slate-400">contact_phone</span>
          <span class="font-bold text-slate-700">कोई संपर्क नहीं मिला</span>
          <span class="text-[11px]">अभियान में नंबर जोड़ते ही वे यहाँ स्वतः बिना डुप्लीकेट के सुरक्षित हो जाएंगे।</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = contacts.map(c => {
      const campTags = (c.campaigns || []).map(cp => `
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-medium">
          ${cp}
        </span>
      `).join('');

      return `
        <div class="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold text-xs shrink-0">
              ${(c.name || 'ग')[0]}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-bold text-xs text-slate-900 truncate">${c.name || 'ग्रामवासी / ग्राहक'}</span>
                ${c.village ? `<span class="text-[10px] text-slate-500">(${c.village})</span>` : ''}
              </div>
              <span class="font-mono text-xs font-bold text-emerald-800">${c.phone || ('+91 ' + c.cleanPhone)}</span>
              ${campTags ? `<div class="flex items-center gap-1 mt-1 flex-wrap">${campTags}</div>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button onclick="TelephonyUI.redialCustomer('${c.cleanPhone}', '${c.name}')" class="h-8 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 cursor-pointer">
              <span class="material-symbols-outlined text-[14px]">call</span>
              <span>कॉल</span>
            </button>
            <button onclick="TelephonyUI.deleteContactFromDirectory('${c.cleanPhone}')" class="h-8 w-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 flex items-center justify-center active:scale-95 cursor-pointer" title="हटाएं">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async deleteContactFromDirectory(cleanPhone) {
    if (!confirm('क्या आप इस नंबर को डायरेक्टरी से हटाना चाहते हैं?')) return;
    try {
      const res = await fetch(`/api/contacts-book/${cleanPhone}`, { method: 'DELETE' });
      if (res.ok) {
        this.contactsBook = this.contactsBook.filter(c => c.cleanPhone !== cleanPhone);
        this.updateContactsBookBadges();
        this.renderContactsDirectory();
        AppState.showToast('संपर्क डायरेक्टरी से हटाया गया');
      }
    } catch (e) {
      alert('हटाने में त्रुटि: ' + e.message);
    }
  },

  async fetchCampaignContacts() {
    try {
      const res = await fetch('/api/campaign/contacts');
      if (res.ok) {
        const data = await res.json();
        this.campaignContacts = data.contacts || [];
        const bInaug = document.getElementById('badge-count-inauguration');
        if (bInaug) bInaug.innerText = this.campaignContacts.length;
        if (this.currentCallTab === 'inauguration') {
          this.renderCurrentTab();
        }
      }
    } catch (err) {
      console.warn('Campaign contacts fetch skipped:', err.message);
    }
  },

  async saveBulkNumbersAndStart() {
    const input = document.getElementById('bulk-numbers-input');
    const promptEl = document.getElementById('bulk-prompt-input');
    const campaignSelect = document.getElementById('bulk-campaign-select');

    const text = input ? input.value : '';
    const contacts = this.parseBulkNumbersInput(text);

    if (contacts.length === 0) {
      alert('कृपया कम से कम एक 10-अंकों का वैध भारतीय मोबाइल नंबर दर्ज करें');
      return;
    }

    const campaignName = campaignSelect ? campaignSelect.options[campaignSelect.selectedIndex]?.text : 'नई किराना दुकान उद्घाटन आमंत्रण';
    const promptText = promptEl ? promptEl.value.trim() : '';

    const saveBtn = document.getElementById('btn-save-bulk-numbers');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">sync</span><span>जोड़ रहे हैं...</span>`;
    }

    try {
      const res = await fetch('/api/campaign/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts,
          campaign: campaignName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'नंबर सहेजने में विफल');

      this.campaignContacts = data.contacts || [];
      this.closeBulkNumbersModal();
      if (input) input.value = '';

      AppState.showToast(`🎉 ${data.addedCount || contacts.length} नंबर सफलतापूर्वक जोड़े गए!`);
      this.switchCallTab('inauguration');

      // Sequential auto-calling confirmation
      if (confirm(`क्या आप इन सभी ${contacts.length} नंबरों पर एक-एक करके AI उद्घाटन आमंत्रण कॉल शुरू करना चाहते हैं?\n(एक कॉल समाप्त होने पर दूसरी अपने-आप लगेगी)`)) {
        this.startSequentialCampaignDial(this.campaignContacts, promptText);
      }
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">phone_in_talk</span><span>✓ सूची जोड़ें और कॉल लगाएं</span>`;
      }
    }
  },

  // ----------------------------------------------------
  // SEQUENTIAL BACKGROUND CAMPAIGN AUTO-DIALER
  // Calls one by one in the background; when one ends, initiates the next!
  // ----------------------------------------------------
  startSequentialCampaignDial(contactsToDial, promptText = null) {
    if (!contactsToDial || contactsToDial.length === 0) {
      alert('कॉल करने के लिए कोई संपर्क नहीं चुना गया');
      return;
    }

    const defaultPrompt = promptText || (document.getElementById('bulk-prompt-input')?.value) || 
      'नमस्ते! रामकुमार किराना एवं जनरल स्टोर, कुँवरगद्दी की नई शाखा के भव्य उद्घाटन समारोह में आप सपरिवार सादर आमंत्रित हैं। 4 नवंबर को पधारकर हमारा उत्साहवर्धन करें। धन्यवाद!';

    this.campaignQueue = contactsToDial.map(c => ({
      id: c.id,
      name: c.customerName || c.name || 'ग्रामवासी / ग्राहक',
      phone: c.phone || c.rawPhone || ('+91 ' + c.cleanPhone),
      cleanPhone: (c.cleanPhone || c.rawPhone || c.phone || '').replace(/\D/g, '').slice(-10),
      prompt: defaultPrompt
    })).filter(c => c.cleanPhone.length === 10);

    if (this.campaignQueue.length === 0) {
      alert('चुने हुए संपर्कों में कोई वैध 10-अंकों का नंबर नहीं मिला');
      return;
    }

    this.campaignCurrentIndex = 0;
    this.isCampaignCalling = true;
    this.isAutoDialPaused = false;

    // Show persistent top banner
    const banner = document.getElementById('active-calling-banner');
    if (banner) {
      banner.classList.remove('hidden');
      banner.classList.add('flex');
    }

    AppState.showToast(`🚀 उद्घाटन आमंत्रण: कुल ${this.campaignQueue.length} नंबरों पर क्रमिक AI कॉलिंग शुरू`);
    this.processNextSequentialCall();
  },

  async processNextSequentialCall() {
    if (!this.isCampaignCalling) return;
    if (this.isAutoDialPaused) return;

    if (this.campaignCurrentIndex >= this.campaignQueue.length) {
      this.stopAutoDial();
      AppState.showToast('🎉 सभी नंबरों पर उद्घाटन आमंत्रण AI कॉल सफलतापूर्वक पूरी हो गई!');
      await this.fetchCampaignContacts();
      await this.fetchLiveOmnidimLogs(true);
      return;
    }

    const contact = this.campaignQueue[this.campaignCurrentIndex];
    const total = this.campaignQueue.length;
    const currentNum = this.campaignCurrentIndex + 1;

    // Update banner UI
    const progressEl = document.getElementById('calling-banner-progress');
    const targetEl = document.getElementById('calling-banner-current-target');
    const statusEl = document.getElementById('calling-banner-status');

    if (progressEl) progressEl.innerText = `🎈 उद्घाटन आमंत्रण AI कॉलिंग: (${currentNum}/${total})`;
    if (targetEl) targetEl.innerText = `वर्तमान: ${contact.name} (+91 ${contact.cleanPhone}) • दुकान उद्घाटन`;
    if (statusEl) {
      statusEl.innerText = '📞 कॉल लगाई जा रही है...';
      statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900 text-amber-200 border border-amber-700 animate-pulse';
    }

    // Mark status as 'calling' in local list and backend
    const localC = (this.campaignContacts || []).find(c => c.cleanPhone === contact.cleanPhone || c.id === contact.id);
    if (localC) {
      localC.status = 'calling';
      this.renderCurrentTab();
    }
    fetch('/api/campaign/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cleanPhone: contact.cleanPhone, status: 'calling' })
    }).catch(() => {});

    // Dispatch call via Omnidimension Outgoing Bot (#276578)
    try {
      await fetch('/api/omnidim/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 276578,
          toNumber: '+91' + contact.cleanPhone,
          prompt: contact.prompt,
          context: {
            customerName: contact.name,
            campaign: 'inauguration',
            shopName: 'रामकुमार किराना एवं जनरल स्टोर'
          }
        })
      });
    } catch (err) {
      console.warn('Call dispatch error:', err);
    }

    if (statusEl) {
      statusEl.innerText = '📞 फोन पर घंटी बज रही है... (स्थिति जांची जा रही है)';
      statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-900 text-sky-200 border border-sky-700 animate-pulse';
    }

    // Poll Omnidimension Call Logs to detect call completion
    // Wait until call finishes (or max 75 seconds timeout)
    const startTime = Date.now();
    const maxPollTimeMs = 75000;
    let callEnded = false;
    let finalStatus = 'failed';
    let durationStr = '00:00';
    let summary = '';
    let audioUrl = null;

    while (!callEnded && (Date.now() - startTime) < maxPollTimeMs) {
      if (!this.isCampaignCalling) return;
      if (this.isAutoDialPaused) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      await new Promise(r => setTimeout(r, 3500));

      try {
        const logsRes = await fetch('/api/omnidim/call-logs');
        const logsData = await logsRes.json();
        const logs = logsData.logs || logsData.calls || [];

        const matchingLog = logs.find(l => {
          const toClean = (l.to_number || '').replace(/\D/g, '');
          const fromClean = (l.from_number || '').replace(/\D/g, '');
          return toClean.endsWith(contact.cleanPhone) || fromClean.endsWith(contact.cleanPhone);
        });

        if (matchingLog) {
          const rawStatus = (matchingLog.call_status || '').toLowerCase();
          const durationSec = matchingLog.call_duration_in_seconds || 0;
          const durationMin = matchingLog.call_duration_in_minutes || 0;
          const totalSec = (durationMin * 60) + durationSec;

          if (rawStatus === 'completed') {
            callEnded = true;
            finalStatus = totalSec > 0 ? 'connected' : 'failed';
            durationStr = `${String(durationMin).padStart(2, '0')}:${String(durationSec).padStart(2, '0')}`;
            summary = matchingLog.sentiment_analysis_details || matchingLog.call_summary || (totalSec > 0 ? 'उद्घाटन आमंत्रण सफल' : 'कॉल कनेक्ट नहीं हुई');
            audioUrl = matchingLog.internal_recording_url || matchingLog.recording_url || null;
            if (audioUrl && audioUrl.startsWith('/')) audioUrl = 'https://omnidim.io' + audioUrl;
            break;
          } else if (rawStatus === 'no-answer' || rawStatus === 'busy' || rawStatus === 'failed') {
            callEnded = true;
            finalStatus = 'failed';
            durationStr = '00:00';
            summary = rawStatus === 'no-answer' ? 'घंटी बजी पर नहीं उठा (No Answer)' : (rawStatus === 'busy' ? 'फोन व्यस्त था (Busy)' : 'नेटवर्क समस्या (Failed)');
            break;
          }
        }
      } catch (e) {
        console.warn('Polling logs error:', e);
      }
    }

    if (!callEnded) {
      finalStatus = 'failed';
      summary = 'कॉल समय-सीमा समाप्त (Timeout)';
    }

    // Persist final status to server and state
    try {
      await fetch('/api/campaign/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanPhone: contact.cleanPhone,
          status: finalStatus,
          durationStr,
          summary,
          audioUrl
        })
      });
    } catch (e) {}

    if (localC) {
      localC.status = finalStatus;
      localC.durationStr = durationStr;
      localC.summary = summary;
      localC.audioUrl = audioUrl;
      localC.lastCallAt = new Date().toISOString();
    }
    this.renderCurrentTab();

    if (statusEl) {
      statusEl.innerText = finalStatus === 'connected' ? '✅ बातचीत पूरी हुई • अगली कॉल...' : '❌ कॉल नहीं उठी • अगली कॉल...';
      statusEl.className = finalStatus === 'connected' ? 
        'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700' :
        'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-900 text-rose-200 border border-rose-700';
    }

    // Move to next contact in queue!
    this.campaignCurrentIndex++;

    // Polite pause of 2.5 seconds between calls
    setTimeout(() => {
      this.processNextSequentialCall();
    }, 2500);
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
  },

  // ----------------------------------------------------
  // CUSTOMER CRM PROFILE & NUMBER-WISE DATA STORAGE
  // ----------------------------------------------------
  activeProfileContact: null,

  async openCustomerProfileModal(cleanPhone) {
    if (!cleanPhone) return;
    const clean = String(cleanPhone).replace(/\D/g, '').slice(-10);
    if (!clean) return;

    const modal = document.getElementById('modal-customer-crm-profile');
    if (!modal) return;

    // Reset fields while loading
    const nameEl = document.getElementById('crm-profile-name');
    const phoneEl = document.getElementById('crm-profile-phone');
    const sourceBadge = document.getElementById('crm-profile-source-badge');
    const totalCallsEl = document.getElementById('crm-profile-total-calls');
    const lastStatusEl = document.getElementById('crm-profile-last-status');
    const lastDurationEl = document.getElementById('crm-profile-last-duration');
    const notesInput = document.getElementById('crm-profile-notes');
    const inquiryInput = document.getElementById('crm-profile-inquiry-topic');
    const historyList = document.getElementById('crm-profile-history-list');

    if (nameEl) nameEl.innerText = 'लोड हो रहा है...';
    if (phoneEl) phoneEl.innerText = `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    if (notesInput) notesInput.value = '';
    if (inquiryInput) inquiryInput.value = '';
    if (historyList) historyList.innerHTML = '<div class="p-4 text-center text-xs text-slate-400">लोड हो रहा है...</div>';

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    let profile = null;
    try {
      const res = await fetch(`/api/contacts-book/${clean}/profile`);
      if (res.ok) {
        const json = await res.json();
        profile = json.profile;
      }
    } catch (e) {
      console.warn('Profile fetch failed:', e);
    }

    // Fallback to local contactsBook or search in cachedOmniLogs
    if (!profile) {
      profile = (this.contactsBook || []).find(c => (c.cleanPhone || '').replace(/\D/g, '').slice(-10) === clean);
    }

    if (!profile) {
      const match = (this.cachedOmniLogs || []).find(c => {
        const toClean = (c.to_number || '').replace(/\D/g, '');
        const fromClean = (c.from_number || '').replace(/\D/g, '');
        return toClean.endsWith(clean) || fromClean.endsWith(clean);
      });
      profile = {
        cleanPhone: clean,
        phone: `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`,
        name: match?.user_name || 'ग्रामवासी / ग्राहक',
        source: match?.call_direction === 'inbound' ? '🟢 इनकमिंग कॉलर' : 'आउटगोइंग कॉल',
        totalCalls: match ? 1 : 0,
        lastCallStatus: match?.call_status || 'pending',
        lastDurationSec: (match?.call_duration_in_minutes || 0) * 60 + (match?.call_duration_in_seconds || 0),
        personalData: {},
        callHistory: match ? [{
          id: 'hist_' + clean,
          date: match.time_of_call || 'आज',
          direction: match.call_direction || 'inbound',
          status: match.call_status,
          durationStr: '01:00',
          summary: match.sentiment_analysis_details || match.call_summary || 'कॉल रिकॉर्ड',
          transcript: match.call_conversation || '',
          audioUrl: match.internal_recording_url || match.recording_url
        }] : []
      };
    }

    this.activeProfileContact = profile;

    // Populate Modal
    if (nameEl) nameEl.innerText = profile.name || 'ग्रामवासी / ग्राहक';
    if (phoneEl) phoneEl.innerText = profile.phone || `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    if (sourceBadge) {
      const isInc = profile.source === 'इनकमिंग कॉलर' || (profile.callHistory && profile.callHistory.some(h => h.direction === 'inbound'));
      sourceBadge.innerText = isInc ? '🟢 इनकमिंग कॉलर' : (profile.source || 'स्थायी सुरक्षित');
      sourceBadge.className = isInc ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300' : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200';
    }

    const total = profile.totalCalls || (profile.callHistory ? profile.callHistory.length : 0) || 0;
    if (totalCallsEl) totalCallsEl.innerText = `${total} बार`;

    const isConnected = profile.lastCallStatus === 'completed' || (profile.callHistory && profile.callHistory.some(h => h.status === 'completed'));
    if (lastStatusEl) {
      lastStatusEl.innerText = isConnected ? '✅ सफल बात' : (profile.lastCallStatus === 'failed' ? '❌ नहीं उठा' : '⏳ लंबित');
      lastStatusEl.className = isConnected ? 'font-bold text-xs text-emerald-700' : (profile.lastCallStatus === 'failed' ? 'font-bold text-xs text-rose-700' : 'font-bold text-xs text-amber-700');
    }

    const dur = profile.lastDurationSec ? `${Math.floor(profile.lastDurationSec / 60)}m ${profile.lastDurationSec % 60}s` : '--';
    if (lastDurationEl) lastDurationEl.innerText = dur;

    // Fill personal notes
    if (notesInput) notesInput.value = profile.personalData?.notes || '';
    if (inquiryInput) inquiryInput.value = profile.personalData?.inquiryTopic || '';

    // Render Turn-by-Turn History & Recordings
    const history = profile.callHistory || [];
    if (historyList) {
      if (history.length === 0) {
        historyList.innerHTML = `
          <div class="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 border border-slate-200">
            इस नंबर पर अभी कोई कॉल इतिहास दर्ज नहीं है। जब भी कॉल होगी, पूरी बातचीत यहाँ सुरक्षित रहेगी।
          </div>
        `;
      } else {
        historyList.innerHTML = history.map((h, i) => {
          const isInbound = h.direction === 'inbound';
          let audioSrc = h.audioUrl;
          if (audioSrc && audioSrc.startsWith('/')) audioSrc = 'https://omnidim.io' + audioSrc;

          return `
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5 font-bold">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] ${isInbound ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-indigo-100 text-indigo-900 border border-indigo-200'}">
                    <span class="material-symbols-outlined text-[13px]">${isInbound ? 'call_received' : 'call_made'}</span>
                    <span>${isInbound ? 'इनकमिंग कॉल' : 'आउटगोइंग कॉल'}</span>
                  </span>
                  <span class="text-slate-500 font-normal text-[11px]">${h.date ? new Date(h.date).toLocaleString('hi-IN') : 'हाल ही में'}</span>
                </div>
                <span class="font-mono font-bold text-[11px] text-slate-700">⏱️ ${h.durationStr || '00:00'}</span>
              </div>

              ${h.summary ? `
                <div class="text-xs text-slate-800 font-medium bg-white p-2 rounded-xl border border-slate-200">
                  <span class="font-bold text-slate-600 block text-[10px] uppercase">बातचीत सारांश:</span>
                  ${h.summary}
                </div>
              ` : ''}

              ${audioSrc ? `
                <div class="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 gap-2">
                  <span class="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px] text-emerald-700">record_voice_over</span>
                    <span>कॉल रिकॉर्डिंग:</span>
                  </span>
                  <audio controls preload="metadata" class="h-8 max-w-[200px]" src="${TelephonyUI.getAudioStreamUrl(audioSrc)}"></audio>
                </div>
              ` : ''}

              ${h.transcript ? `
                <details class="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-200 cursor-pointer">
                  <summary class="font-bold text-indigo-700 hover:text-indigo-900 select-none text-[11px]">
                    चैट ट्रांसक्रिप्ट (शब्द-दर-शब्द बातचीत) देखें
                  </summary>
                  <div class="mt-2 pt-2 border-t border-slate-100 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-36 overflow-y-auto">
                    ${h.transcript.replace(/<br\s*\/?>/gi, '\n')}
                  </div>
                </details>
              ` : ''}
            </div>
          `;
        }).join('');
      }
    }
  },

  closeCustomerProfileModal() {
    const modal = document.getElementById('modal-customer-crm-profile');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.activeProfileContact = null;
  },

  async saveContactPersonalData() {
    if (!this.activeProfileContact) return;
    const clean = this.activeProfileContact.cleanPhone;
    const notes = document.getElementById('crm-profile-notes')?.value?.trim() || '';
    const inquiryTopic = document.getElementById('crm-profile-inquiry-topic')?.value?.trim() || '';

    try {
      const res = await fetch(`/api/contacts-book/${clean}/personal-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, inquiryTopic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'सहेजने में विफल');

      if (!this.activeProfileContact.personalData) this.activeProfileContact.personalData = {};
      this.activeProfileContact.personalData.notes = notes;
      this.activeProfileContact.personalData.inquiryTopic = inquiryTopic;

      // Update in local contactsBook array
      const local = (this.contactsBook || []).find(c => c.cleanPhone === clean);
      if (local) {
        if (!local.personalData) local.personalData = {};
        local.personalData.notes = notes;
        local.personalData.inquiryTopic = inquiryTopic;
      }

      AppState.showToast('✓ व्यक्तिगत डेटा भविष्य की कॉल्स के लिए सुरक्षित कर लिया गया!');
      this.renderCurrentTab();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  dialActiveProfileContact() {
    if (!this.activeProfileContact) return;
    const phone = this.activeProfileContact.rawPhone || this.activeProfileContact.phone;
    const name = this.activeProfileContact.name || 'ग्राहक';
    this.closeCustomerProfileModal();
    this.redialCustomer(phone, name);
  }
  }
};

window.TelephonyUI = TelephonyUI;

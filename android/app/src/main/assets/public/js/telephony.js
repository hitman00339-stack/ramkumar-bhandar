// AI Telephony UI and Remote Synchronization Engine
const TelephonyUI = {
  currentFilter: 'all',
  selectedWing: 'krishi', // 'krishi' | 'kirana'

  init() {
    this.setupListeners();
  },

  setupListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-telephony');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        AppState.retryShopSync(this.selectedWing);
        AppState.fetchCallLogs(this.selectedWing);
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
    this.renderCallLogs();
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
      <button onclick="AppState.retryShopSync('${this.selectedWing}')" class="px-space-sm py-1 rounded bg-surface-container-high text-primary font-label-sm text-label-sm flex-shrink-0 active:scale-95 transition-transform">
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

  renderCallLogs() {
    const container = document.getElementById('call-logs-container');
    if (!container) return;

    let logs = AppState.callLogs.filter(c => !this.selectedWing || c.shopId === this.selectedWing);

    if (logs.length === 0) {
      container.innerHTML = `
        <div class="p-space-lg bg-surface-container-lowest rounded-xl text-center flex flex-col items-center justify-center gap-2 shadow-sm">
          <span class="material-symbols-outlined text-[36px] text-outline-variant">phone_missed</span>
          <p class="font-headline-sm text-on-surface">कोई कॉल लॉग नहीं है</p>
          <p class="font-body-sm text-on-surface-variant">कॉल आते ही सारांश और ऑडियो यहाँ दिखेगा</p>
        </div>
      `;
      return;
    }

    container.innerHTML = logs.map(c => this.renderCallCard(c)).join('');
  },

  renderCallCard(c) {
    const isUrgent = c.isUrgent;
    const stripeColor = isUrgent ? 'bg-error' : (c.shopId === 'krishi' ? 'bg-primary' : 'bg-secondary');
    const badgeColor = isUrgent ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant';
    const badgeIcon = isUrgent ? 'phone_callback' : 'check_circle';
    const wingLabel = c.shopId === 'krishi' ? 'कृषि दुकान विंग' : 'किराना विंग';

    return `
      <div class="w-full bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col">
        <div class="flex">
          <div class="w-1.5 ${stripeColor} flex-shrink-0"></div>
          <div class="flex-1 p-space-md flex flex-col gap-space-sm">
            <div class="flex items-start justify-between gap-space-xs">
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-label-lg text-label-lg text-on-surface truncate">${c.customerName || 'अज्ञात ग्राहक'}</span>
                  <span class="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">${c.role || 'ग्राहक'}</span>
                </div>
                <span class="font-body-sm text-body-sm text-on-surface-variant">${c.date || 'आज'} • ${wingLabel}</span>
              </div>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${badgeColor} font-label-sm text-label-sm flex-shrink-0">
                <span class="material-symbols-outlined text-[14px]">${badgeIcon}</span>
                ${c.statusLabel || (isUrgent ? 'वापस फोन करें' : 'सफल बात')}
              </span>
            </div>

            <div class="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1.5">
              <div class="flex items-start gap-2">
                <span class="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5 flex-shrink-0">record_voice_over</span>
                <div class="font-body-sm text-body-sm text-on-surface">
                  <strong class="font-label-md text-label-md text-on-surface">ग्राहक ने पूछा:</strong>
                  "${c.transcriptUser || 'दुकान खुली है क्या?'}"
                </div>
              </div>
              <div class="flex items-start gap-2 pt-1">
                <span class="material-symbols-outlined text-[18px] text-primary mt-0.5 flex-shrink-0">smart_toy</span>
                <div class="font-body-sm text-body-sm text-on-surface">
                  <strong class="font-label-md text-label-md text-primary">एआई ने बताया:</strong>
                  "${c.transcriptAi || 'दुकान खुली है'}"
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between px-space-sm py-2 rounded-lg bg-surface-container">
              <div class="flex items-center gap-2">
                <button onclick="TelephonyUI.playSampleAudio('${c.id}')" class="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center active:scale-90 transition-transform">
                  <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                </button>
                <div class="flex flex-col">
                  <span class="font-label-sm text-label-sm text-on-surface">ऑडियो रिकॉर्डिंग सुनें</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant">अवधि: ${c.audioDuration || '0:35 मिनट'}</span>
                </div>
              </div>
              <div class="flex items-center gap-0.5 h-5 px-2">
                <span class="w-1 h-2 bg-outline rounded-full"></span>
                <span class="w-1 h-4 bg-primary rounded-full"></span>
                <span class="w-1 h-5 bg-primary rounded-full"></span>
                <span class="w-1 h-3 bg-primary rounded-full"></span>
                <span class="w-1 h-4 bg-outline rounded-full"></span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-space-sm pt-1">
              <a class="min-h-[48px] py-2 px-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow active:scale-98 transition-transform" href="tel:${c.phone || '+919826000000'}">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">call</span>
                <span>अभी फोन करें</span>
              </a>
              <a class="min-h-[48px] py-2 px-3 rounded-xl bg-surface-container-high text-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform" href="https://wa.me/${c.phone ? c.phone.replace(/[^\d]/g, '') : ''}?text=नमस्ते%20जी,%20रामकुमार%20भंडार%20से%20आपकी%20कॉल%20के%20संदर्भ%20में।">
                <span class="material-symbols-outlined text-[20px]">chat</span>
                <span>व्हाट्सऐप जवाब</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  playSampleAudio(callId) {
    AppState.showToast('🔊 ऑडियो रिकॉर्डिंग चलाई जा रही है...');
    // Web Audio API Beep/Simulation
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
      // AudioContext not allowed without gesture
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

  async fetchLiveOmnidimLogs() {
    const container = document.getElementById('omnidim-call-logs-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="p-4 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs flex items-center justify-center gap-2">
        <span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
        <span>Omnidimension AI सर्वर से लाइव कॉल लोड हो रही हैं...</span>
      </div>
    `;

    try {
      const res = await fetch('/api/omnidim/call-logs');
      if (!res.ok) throw new Error('सर्वर से डेटा नहीं मिला');
      const data = await res.json();
      const logs = data.logs || [];
      this.renderLiveOmnidimLogs(logs);
    } catch (err) {
      container.innerHTML = `
        <div class="p-4 bg-rose-50 rounded-2xl text-center text-rose-700 text-xs">
          ⚠️ कॉल लॉग प्राप्त करने में त्रुटि: ${err.message}
        </div>
      `;
    }
  },

  renderLiveOmnidimLogs(logs) {
    const container = document.getElementById('omnidim-call-logs-container');
    if (!container) return;

    if (!logs || logs.length === 0) {
      container.innerHTML = `
        <div class="p-6 bg-white rounded-2xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[36px] text-slate-400">call_missed</span>
          <p class="font-bold text-slate-700 text-sm">अभी कोई लाइव कॉल रिकॉर्ड नहीं है</p>
        </div>
      `;
      return;
    }

    container.innerHTML = logs.map(call => {
      const isOutbound = call.call_direction === 'outbound';
      const dirIcon = isOutbound ? 'call_made' : 'call_received';
      const dirColor = isOutbound ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
      const dirLabel = isOutbound ? 'आउटगोइंग तकादा' : 'इनकमिंग पूछताछ';
      const phone = call.to_number || call.from_number || 'नंबर उपलब्ध नहीं';
      const durationSec = call.call_duration_in_seconds || 0;
      const durationMin = call.call_duration_in_minutes || 0;
      const durationStr = durationMin > 0 ? `${durationMin} मिनट ${durationSec} सेकंड` : `${durationSec} सेकंड`;
      const audioUrl = call.internal_recording_url || call.recording_url;

      let convHtml = '';
      if (call.call_conversation) {
        convHtml = `
          <div class="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 max-h-36 overflow-y-auto border border-slate-200/80">
            <span class="font-bold text-slate-900 block mb-1">📝 बातचीत ट्रांसक्रिप्ट:</span>
            <div class="space-y-1">${call.call_conversation}</div>
          </div>
        `;
      } else if (call.sentiment_analysis_details) {
        convHtml = `
          <div class="mt-2 p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200">
            <strong>बातचीत सारांश:</strong> ${call.sentiment_analysis_details}
          </div>
        `;
      }

      return `
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center ${dirColor} border flex-shrink-0">
                <span class="material-symbols-outlined text-[20px]">${dirIcon}</span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 text-sm md:text-base">${phone}</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${dirColor} border">
                    ${dirLabel}
                  </span>
                </div>
                <span class="text-xs text-slate-500 font-medium">${call.time_of_call || 'आज'} • ${call.bot_name || 'AI Agent'}</span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                ${durationStr}
              </span>
            </div>
          </div>

          ${convHtml}

          <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div class="flex items-center gap-2">
              ${audioUrl ? `
                <a href="${audioUrl}" target="_blank" class="h-8 px-3 rounded-lg bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all">
                  <span class="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>ऑडियो सुनें</span>
                </a>
              ` : `
                <span class="text-slate-400">ऑडियो उपलब्ध नहीं</span>
              `}
            </div>
            <a href="tel:${phone.replace(/[^\d+]/g, '')}" class="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">phone</span>
              <span>कॉल करें</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
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

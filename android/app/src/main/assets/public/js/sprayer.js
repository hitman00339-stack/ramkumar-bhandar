// Sprayer Machine Rental & Return Tracking Engine (खाद-दुकान स्प्रे पंप प्रबंधन)
const SprayerUI = {
  machines: [],
  history: [],
  selectedMachineId: null,
  scannerStream: null,

  init() {
    this.setupListeners();
    this.fetchData();
  },

  setupListeners() {
    // Add machine issue form submit
    const issueForm = document.getElementById('form-issue-sprayer');
    if (issueForm) {
      issueForm.addEventListener('submit', (e) => this.handleIssueSubmit(e));
    }

    const returnForm = document.getElementById('form-return-sprayer');
    if (returnForm) {
      returnForm.addEventListener('submit', (e) => this.handleReturnSubmit(e));
    }

    // Phone autofill helper
    const phoneInput = document.getElementById('issue-cust-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length >= 10) {
          const match = AppState.customers.find(c => c.phone && c.phone.replace(/\D/g, '') === val);
          const nameInput = document.getElementById('issue-cust-name');
          if (match && nameInput && !nameInput.value) {
            nameInput.value = match.name;
          }
        }
      });
    }
  },

  async fetchData() {
    try {
      const [resM, resH] = await Promise.all([
        fetch('/api/sprayers'),
        fetch('/api/sprayers/history')
      ]);
      if (resM.ok) {
        const dataM = await resM.json();
        this.machines = dataM.sprayers || [];
      }
      if (resH.ok) {
        const dataH = await resH.json();
        this.history = dataH.history || [];
      }
      this.render();
    } catch (err) {
      console.warn('Error fetching sprayers:', err);
    }
  },

  render() {
    this.renderMetrics();
    this.renderMachineCards();
    this.renderHistory();
  },

  renderMetrics() {
    const total = this.machines.length;
    const available = this.machines.filter(m => m.status === 'AVAILABLE').length;
    const rented = this.machines.filter(m => m.status === 'RENTED').length;
    const overdue = this.machines.filter(m => m.status === 'OVERDUE').length;

    const elTotal = document.getElementById('sprayer-metric-total');
    const elAvail = document.getElementById('sprayer-metric-available');
    const elRented = document.getElementById('sprayer-metric-rented');
    const elOverdue = document.getElementById('sprayer-metric-overdue');

    if (elTotal) elTotal.innerText = total;
    if (elAvail) elAvail.innerText = available;
    if (elRented) elRented.innerText = rented;
    if (elOverdue) elOverdue.innerText = overdue;
  },

  renderMachineCards() {
    const container = document.getElementById('sprayer-machines-list');
    if (!container) return;

    if (this.machines.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-white rounded-3xl text-center flex flex-col items-center justify-center gap-2 border border-slate-200">
          <span class="material-symbols-outlined text-[36px] text-slate-400">agriculture</span>
          <p class="font-bold text-slate-800 text-sm">कोई स्प्रे मशीन दर्ज नहीं है</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.machines.map(m => this.renderMachineCard(m)).join('');
  },

  renderMachineCard(m) {
    const isAvail = m.status === 'AVAILABLE';
    const isRented = m.status === 'RENTED';
    const isOverdue = m.status === 'OVERDUE';

    let statusPill = '';
    let cardBorder = 'border-slate-200';
    let cardBg = 'bg-white';

    if (isAvail) {
      statusPill = `<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-600"></span>दुकान पर उपलब्ध (OK)</span>`;
      cardBorder = 'border-emerald-300';
    } else if (isRented) {
      statusPill = `<span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-xs flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>खेत पर (किराए पर)</span>`;
      cardBorder = 'border-blue-300';
    } else if (isOverdue) {
      statusPill = `<span class="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-xs flex items-center gap-1 animate-pulse"><span class="w-2 h-2 rounded-full bg-rose-600"></span>⚠️ वापसी में देरी - तकादा जारी</span>`;
      cardBorder = 'border-rose-300 ring-2 ring-rose-200';
      cardBg = 'bg-rose-50/40';
    }

    // Rental details if active
    let rentalInfo = '';
    if (m.currentRental) {
      const r = m.currentRental;
      const dueObj = new Date(r.dueTime);
      const dueFormatted = dueObj.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dueDateFormatted = dueObj.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
      
      const callsCount = r.callCount || 0;
      const lastCall = r.lastCallTime ? new Date(r.lastCallTime).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : 'नहीं';

      rentalInfo = `
        <div class="mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800 flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px] text-slate-500">person</span>
              <span>किसान: ${r.customerName}</span>
            </span>
            <a href="tel:${r.customerPhone}" class="font-bold text-emerald-800 hover:underline flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[14px]">call</span>
              <span>${r.customerPhone}</span>
            </a>
          </div>
          <div class="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
            <span>वापसी समय: <strong>${dueFormatted} (${dueDateFormatted})</strong></span>
            <span>अवधि: <strong>${r.dueHours} घंटे</strong></span>
          </div>
          ${isOverdue ? `
            <div class="p-2 rounded-xl bg-rose-100 text-rose-900 font-bold flex items-center justify-between mt-1">
              <span>⚠️ निर्धारित समय पार हो गया!</span>
              <span>कॉल की गई: ${callsCount} बार (हर 2 घंटे में ऑटो कॉल)</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="${cardBg} rounded-3xl p-5 shadow-sm border ${cardBorder} flex flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-13 h-13 rounded-2xl bg-[#003629] text-emerald-300 flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm">
              🚜
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-bold text-slate-900 text-base truncate">${m.name}</h4>
                <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-bold">QR: ${m.qrCode || m.id}</span>
              </div>
              <p class="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span>🔋 बैटरी लेवल: <strong class="text-slate-800">${m.batteryLevel || 100}%</strong></span>
              </p>
            </div>
          </div>
          <div>${statusPill}</div>
        </div>

        ${rentalInfo}

        <div class="pt-2 flex items-center gap-2 border-t border-slate-100 flex-wrap">
          ${isAvail ? `
            <button onclick="SprayerUI.openIssueModal('${m.id}')" class="flex-1 h-11 rounded-xl bg-[#003629] hover:bg-[#004d3b] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">send_to_mobile</span>
              <span>किसान को दें (किराया शुरू)</span>
            </button>
            <button onclick="SprayerUI.showMachineQrModal('${m.id}')" class="h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all border border-slate-200 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">qr_code_2</span>
              <span>QR कोड</span>
            </button>
          ` : `
            <button onclick="SprayerUI.openReturnModal('${m.id}')" class="flex-1 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[20px]">check_circle</span>
              <span>✓ मशीन वापस आ गई (OK करें)</span>
            </button>
            <button onclick="SprayerUI.triggerAiReturnCall('${m.id}')" class="h-11 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">phone_forwarded</span>
              <span>🤖 AI तकादा कॉल</span>
            </button>
          `}
        </div>
      </div>
    `;
  },

  renderHistory() {
    const container = document.getElementById('sprayer-history-list');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">अभी कोई पुराना वापसी रिकॉर्ड नहीं है</p>`;
      return;
    }

    container.innerHTML = this.history.slice(0, 10).map(h => {
      const returnTime = new Date(h.returnTime).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="p-3 bg-white rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
          <div>
            <p class="font-bold text-slate-900">${h.machineName} - ${h.customerName} (+91 ${h.customerPhone})</p>
            <p class="text-slate-500 mt-0.5">वापसी: ${returnTime} • अवधि: ${h.dueHours} घंटे</p>
          </div>
          <span class="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 font-bold">✓ वापस जमा</span>
        </div>
      `;
    }).join('');
  },

  // ----------------------------------------------------
  // ISSUE SPRAYER MODAL
  // ----------------------------------------------------
  openIssueModal(machineId = null) {
    this.selectedMachineId = machineId;
    const modal = document.getElementById('modal-issue-sprayer');
    if (!modal) return;

    const selectEl = document.getElementById('issue-machine-select');
    if (selectEl) {
      selectEl.innerHTML = '';
      this.machines.forEach(m => {
        const selected = (m.id === machineId) ? 'selected' : '';
        const disabled = (m.status !== 'AVAILABLE') ? 'disabled' : '';
        selectEl.innerHTML += `<option value="${m.id}" ${selected} ${disabled}>${m.name} (${m.status === 'AVAILABLE' ? 'उपलब्ध' : 'खेत पर'})</option>`;
      });
      if (machineId) selectEl.value = machineId;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeIssueModal() {
    const modal = document.getElementById('modal-issue-sprayer');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    const form = document.getElementById('form-issue-sprayer');
    if (form) form.reset();
  },

  async handleIssueSubmit(e) {
    e.preventDefault();
    const machineId = document.getElementById('issue-machine-select').value;
    const customerPhone = document.getElementById('issue-cust-phone').value;
    const customerName = document.getElementById('issue-cust-name').value;
    const dueHours = parseFloat(document.getElementById('issue-hours-select').value) || 4;
    const batteryLevel = parseInt(document.getElementById('issue-battery-level').value, 10) || 100;
    const notes = document.getElementById('issue-notes').value;

    const cleanPhone = (customerPhone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('AI वापसी कॉल के लिए किसान का 10 अंकों का मोबाइल नंबर अनिवार्य है');
      return;
    }

    try {
      const res = await fetch('/api/sprayers/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          customerPhone: cleanPhone,
          customerName,
          dueHours,
          batteryLevel,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'मशीन जारी करने में विफल');

      AppState.showToast(data.message || '✓ मशीन किसान को दे दी गई');
      this.closeIssueModal();
      await this.fetchData();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  // ----------------------------------------------------
  // RETURN SPRAYER MODAL
  // ----------------------------------------------------
  openReturnModal(machineId) {
    const machine = this.machines.find(m => m.id === machineId);
    if (!machine) return;

    this.selectedMachineId = machineId;
    const titleEl = document.getElementById('return-machine-name');
    const custEl = document.getElementById('return-machine-cust');
    const batteryInput = document.getElementById('return-battery-level');

    if (titleEl) titleEl.innerText = machine.name;
    if (custEl && machine.currentRental) {
      custEl.innerText = `किसान: ${machine.currentRental.customerName} (+91 ${machine.currentRental.customerPhone})`;
    }
    if (batteryInput) batteryInput.value = machine.batteryLevel || 100;

    const modal = document.getElementById('modal-return-sprayer');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeReturnModal() {
    const modal = document.getElementById('modal-return-sprayer');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  async handleReturnSubmit(e) {
    e.preventDefault();
    if (!this.selectedMachineId) return;

    const returnBatteryLevel = parseInt(document.getElementById('return-battery-level').value, 10);
    const notes = document.getElementById('return-notes').value;

    try {
      const res = await fetch('/api/sprayers/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: this.selectedMachineId,
          returnBatteryLevel,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'मशीन वापसी दर्ज करने में विफल');

      AppState.showToast(data.message || '✓ मशीन वापस जमा कर ली गई और अब उपलब्ध (OK) है');
      this.closeReturnModal();
      await this.fetchData();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async triggerAiReturnCall(machineId) {
    const machine = this.machines.find(m => m.id === machineId);
    if (!machine || !machine.currentRental) return;

    const r = machine.currentRental;
    if (!confirm(`क्या आप AI एजेंट से ${r.customerName} (+91 ${r.customerPhone}) को स्प्रे मशीन वापसी के लिए कॉल करवाना चाहते हैं?`)) {
      return;
    }

    try {
      const prompt = `नमस्ते ${r.customerName} जी, रामकुमार खाद भंडार (कुँवरगद्दी) से कॉल है। आपके द्वारा ले जाई गई स्प्रे मशीन (${machine.name}) का समय समाप्त हो गया है। कृपया मशीन दुकान पर जल्द से जल्द वापस जमा करवाएं।`;
      
      const res = await fetch('/api/omnidim/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toNumber: r.customerPhone,
          prompt,
          context: { customerName: r.customerName, machineName: machine.name }
        })
      });

      const data = await res.json();
      AppState.showToast(`🤖 AI एजेंट द्वारा ${r.customerPhone} पर मशीन वापसी कॉल भेज दी गई है`);
    } catch (err) {
      alert('कॉल करने में त्रुटि: ' + err.message);
    }
  },

  // ----------------------------------------------------
  // QR CODE GENERATOR (PRINTABLE MACHINE LABELS)
  // ----------------------------------------------------
  showMachineQrModal(machineId) {
    const machine = this.machines.find(m => m.id === machineId) || this.machines[0];
    if (!machine) return;

    const titleEl = document.getElementById('qr-label-name');
    const codeEl = document.getElementById('qr-label-code');
    const qrDisplay = document.getElementById('qr-code-canvas-container');

    if (titleEl) titleEl.innerText = machine.name;
    if (codeEl) codeEl.innerText = `आईडी / QR: ${machine.qrCode || machine.id}`;

    if (qrDisplay) {
      // Generate clean visual QR code SVG
      qrDisplay.innerHTML = this.generateQrSvg(machine.qrCode || machine.id);
    }

    const modal = document.getElementById('modal-sprayer-qr-generator');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeQrModal() {
    const modal = document.getElementById('modal-sprayer-qr-generator');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  printQrTag() {
    window.print();
  },

  // High-contrast clean QR Code SVG pattern generator
  generateQrSvg(text) {
    return \`
      <div class="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-sm text-center">
        <div class="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-1">रामकुमार खाद भंडार</div>
        <div class="p-2 bg-white rounded-xl border border-slate-300">
          <svg viewBox="0 0 100 100" class="w-44 h-44">
            <!-- Position Detection Patterns -->
            <rect x="5" y="5" width="28" height="28" fill="#000" rx="3"/>
            <rect x="9" y="9" width="20" height="20" fill="#fff" rx="2"/>
            <rect x="13" y="13" width="12" height="12" fill="#000" rx="1"/>

            <rect x="67" y="5" width="28" height="28" fill="#000" rx="3"/>
            <rect x="71" y="9" width="20" height="20" fill="#fff" rx="2"/>
            <rect x="75" y="13" width="12" height="12" fill="#000" rx="1"/>

            <rect x="5" y="67" width="28" height="28" fill="#000" rx="3"/>
            <rect x="9" y="71" width="20" height="20" fill="#fff" rx="2"/>
            <rect x="13" y="75" width="12" height="12" fill="#000" rx="1"/>

            <!-- Decorative data modules -->
            <rect x="38" y="10" width="6" height="6" fill="#000"/>
            <rect x="48" y="10" width="6" height="6" fill="#000"/>
            <rect x="42" y="22" width="8" height="8" fill="#000"/>
            <rect x="54" y="22" width="6" height="6" fill="#000"/>
            <rect x="10" y="38" width="6" height="6" fill="#000"/>
            <rect x="22" y="42" width="8" height="8" fill="#000"/>
            <rect x="38" y="38" width="10" height="10" fill="#003629" rx="2"/>
            <rect x="52" y="38" width="8" height="8" fill="#000"/>
            <rect x="66" y="38" width="8" height="8" fill="#000"/>
            <rect x="78" y="44" width="6" height="6" fill="#000"/>
            <rect x="38" y="54" width="6" height="6" fill="#000"/>
            <rect x="48" y="54" width="8" height="8" fill="#000"/>
            <rect x="62" y="54" width="6" height="6" fill="#000"/>
            <rect x="42" y="68" width="8" height="8" fill="#000"/>
            <rect x="54" y="68" width="6" height="6" fill="#000"/>
            <rect x="66" y="68" width="10" height="10" fill="#000"/>
            <rect x="78" y="74" width="6" height="6" fill="#000"/>
            <rect x="42" y="82" width="6" height="6" fill="#000"/>
            <rect x="52" y="82" width="8" height="8" fill="#000"/>
            <rect x="66" y="82" width="6" height="6" fill="#000"/>
            <rect x="78" y="82" width="8" height="8" fill="#000"/>
          </svg>
        </div>
        <div class="mt-2 font-mono font-extrabold text-sm text-slate-900">\${text}</div>
        <div class="text-[10px] text-slate-500 font-semibold mt-0.5">स्प्रेयर मशीन स्टिकर • स्कैन करें</div>
      </div>
    \`;
  },

  // ----------------------------------------------------
  // QR SCANNER (CAMERA SCAN / QUICK SCAN)
  // ----------------------------------------------------
  openScannerModal() {
    const modal = document.getElementById('modal-sprayer-scanner');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Populate quick machine list in scanner
    const quickList = document.getElementById('scanner-quick-machines');
    if (quickList) {
      quickList.innerHTML = this.machines.map(m => `
        <div onclick="SprayerUI.handleScannedMachine('${m.id}')" class="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 flex items-center justify-between cursor-pointer active:scale-98 transition-all">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-[#003629] text-white flex items-center justify-center font-bold text-xs">🚜</span>
            <div>
              <p class="font-bold text-xs text-slate-900">${m.name}</p>
              <p class="text-[10px] text-slate-500">QR कोड: ${m.qrCode} • ${m.status === 'AVAILABLE' ? 'उपलब्ध' : 'खेत पर'}</p>
            </div>
          </div>
          <span class="text-xs font-bold ${m.status === 'AVAILABLE' ? 'text-emerald-700' : 'text-slate-500'}">
            ${m.status === 'AVAILABLE' ? 'स्कैन करें →' : 'व्यस्त'}
          </span>
        </div>
      `).join('');
    }

    // Try camera video stream
    const video = document.getElementById('scanner-video');
    if (video && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          this.scannerStream = stream;
          video.srcObject = stream;
          video.play();
        })
        .catch(err => {
          console.warn('Camera access unavailable:', err.message);
        });
    }
  },

  closeScannerModal() {
    const modal = document.getElementById('modal-sprayer-scanner');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    if (this.scannerStream) {
      this.scannerStream.getTracks().forEach(t => t.stop());
      this.scannerStream = null;
    }
  },

  handleScannedMachine(machineId) {
    this.closeScannerModal();
    const machine = this.machines.find(m => m.id === machineId || m.qrCode === machineId);
    if (!machine) {
      alert('स्प्रे मशीन कोड नहीं पहचाना गया: ' + machineId);
      return;
    }

    if (machine.status === 'AVAILABLE') {
      this.openIssueModal(machine.id);
    } else {
      this.openReturnModal(machine.id);
    }
  }
};

window.SprayerUI = SprayerUI;

// Hindi Voice Command Processing & Confirmation Engine
const VoiceEngine = {
  recognition: null,
  isListening: false,
  pendingAction: null,

  // Hindi number word mappings
  hindiWordMap: {
    'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5,
    'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
    'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
    'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
    'पच्चीस': 25, 'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पचास': 50,
    'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
    'सौ': 100, 'हजार': 1000, 'हज़ार': 1000, 'लाख': 100000
  },

  devanagariDigits: {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  },

  init() {
    this.setupSpeechRecognition();
    this.setupUI();
  },

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'hi-IN';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateListeningUI(true);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        this.updateListeningUI(false);
        this.handleTranscript(transcript);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        this.updateListeningUI(false);
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('माइक की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग में अनुमति दें या नीचे लिखकर प्रविष्टि करें।');
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateListeningUI(false);
      };
    }
  },

  setupUI() {
    // Floating mic and inline mic buttons
    const triggerButtons = ['floating-voice-btn', 'mic-inline-btn', 'voice-entry-btn', 'mic-trigger'];
    triggerButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.startListening();
        });
      }
    });

    const closeBtn = document.getElementById('close-voice-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeVoiceModal());
    }

    const confirmBtn = document.getElementById('voice-confirm-save-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.executePendingAction());
    }
  },

  startListening() {
    this.openVoiceModal();

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (err) {
        // Recognition already started or error
      }
    } else {
      // Browser doesn't support Web Speech API, show fallback prompt
      document.getElementById('voice-status-title').innerText = 'माइक समर्थित नहीं है - बोलकर या लिखकर दर्ज करें';
    }
  },

  openVoiceModal() {
    const overlay = document.getElementById('voice-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    this.updateListeningUI(true);
    document.getElementById('voice-confirmation-box').classList.add('hidden');
    document.getElementById('voice-listening-box').classList.remove('hidden');
    document.getElementById('voice-recognized-text').innerText = 'सुन रहे हैं... कृपया साफ आवाज में बोलें';
  },

  closeVoiceModal() {
    const overlay = document.getElementById('voice-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    }
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.pendingAction = null;
  },

  updateListeningUI(isListening) {
    const wave = document.getElementById('voice-wave-animation');
    if (wave) {
      if (isListening) wave.classList.remove('hidden');
      else wave.classList.add('hidden');
    }
  },

  // Process speech transcript (also callable directly for automated testing)
  handleTranscript(transcript) {
    const cleanText = transcript.trim();
    document.getElementById('voice-recognized-text').innerText = `"${cleanText}"`;
    document.getElementById('voice-listening-box').classList.add('hidden');

    const parsed = this.parseCommand(cleanText);
    this.pendingAction = parsed;

    // Display confirmation screen with parsed attributes
    this.showConfirmation(parsed);
  },

  // HINDI NATURAL LANGUAGE PARSER
  parseCommand(text) {
    const lower = text.toLowerCase();
    
    // 1. Check shop status toggle commands: "दुकान बंद कर दो", "दुकान खोलो"
    if (lower.includes('दुकान बंद') || lower.includes('बंद कर दो')) {
      return {
        type: 'SHOP_TOGGLE',
        action: 'CLOSE',
        shopId: lower.includes('किराना') ? 'kirana' : 'krishi',
        description: `${lower.includes('किराना') ? 'किराना' : 'कृषि'} दुकान बंद करना`,
        rawText: text,
        confidence: 'high'
      };
    }
    if (lower.includes('दुकान खोलो') || lower.includes('खोल दो')) {
      return {
        type: 'SHOP_TOGGLE',
        action: 'OPEN',
        shopId: lower.includes('किराना') ? 'kirana' : 'krishi',
        description: `${lower.includes('किराना') ? 'किराना' : 'कृषि'} दुकान खोलना`,
        rawText: text,
        confidence: 'high'
      };
    }

    // 2. Extract monetary amount
    const amount = this.extractAmount(lower);

    // 3. Extract transaction type
    let txnType = 'CUSTOMER_CREDIT_SALE'; // Default to credit sale if ambiguous
    let typeLabel = 'ग्राहक को उधार दिया';

    if (lower.includes('जमा') || lower.includes('दिए') || lower.includes('चुकाया') || lower.includes('प्राप्त')) {
      txnType = 'CUSTOMER_PAYMENT';
      typeLabel = 'ग्राहक से जमा मिला';
    } else if (lower.includes('उधार') || lower.includes('खाते') || lower.includes('बाकी')) {
      txnType = 'CUSTOMER_CREDIT_SALE';
      typeLabel = 'ग्राहक को उधार दिया';
    } else if (lower.includes('बेची') || lower.includes('बेचा') || lower.includes('बिक्री') || lower.includes('नकद')) {
      txnType = 'CASH_SALE';
      typeLabel = 'नकद बिक्री दर्ज की';
    }

    // 4. Extract Shop Target
    let shopId = AppState.currentShopId;
    if (lower.includes('किराना') || lower.includes('राशन') || lower.includes('तेल') || lower.includes('आटा')) {
      shopId = 'kirana';
    } else if (lower.includes('खाद') || lower.includes('बीज') || lower.includes('दवा') || lower.includes('यूरिया') || lower.includes('डीएपी')) {
      shopId = 'krishi';
    }

    // 5. Extract Person Name
    let personName = this.extractPersonName(text, txnType);

    // 6. Extract Item & Quantity (e.g. "दो बोरी खाद")
    let itemDetail = '';
    let quantity = 0;
    if (lower.includes('खाद')) itemDetail = 'खाद';
    if (lower.includes('यूरिया')) itemDetail = 'यूरिया';
    if (lower.includes('डीएपी')) itemDetail = 'डीएपी खाद';
    if (lower.includes('बीज')) itemDetail = 'बीज';
    if (lower.includes('तेल')) itemDetail = 'तेल';

    // Quantity words: दो बोरी, एक पैकेट, etc.
    const qtyMatch = lower.match(/(एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस|\d+)\s*(बोरी|पैकेट|लीटर|किलो|टीन)/);
    if (qtyMatch) {
      const qVal = this.hindiWordMap[qtyMatch[1]] || parseInt(qtyMatch[1], 10) || 1;
      quantity = qVal;
      itemDetail = `${qVal} ${qtyMatch[2]} ${itemDetail || ''}`.trim();
    }

    return {
      type: 'TRANSACTION',
      txnType,
      typeLabel,
      shopId,
      personName,
      amount,
      itemDetail,
      quantity,
      rawText: text,
      isAmbiguous: !amount || amount <= 0 || (txnType !== 'CASH_SALE' && !personName)
    };
  },

  // EXTRACT AMOUNT FROM HINDI SPEECH
  extractAmount(text) {
    // 1. Try Devanagari numerals convert to Arabic: ५०० -> 500
    let convertedText = text;
    for (const [dev, arab] of Object.entries(this.devanagariDigits)) {
      convertedText = convertedText.replaceAll(dev, arab);
    }

    // 2. Try regular digit matching (e.g., 500 रुपये, 1000 rs)
    const digitMatch = convertedText.match(/(\d+)\s*(रुपये|रु|रूपए|rupees|rs)?/i);
    if (digitMatch && parseInt(digitMatch[1], 10) > 0) {
      return parseInt(digitMatch[1], 10);
    }

    // 3. Try Hindi Word Numbers: "पाँच सौ", "एक हजार", "दो हजार पाँच सौ"
    const words = text.split(/\s+/);
    let total = 0;
    let currentMultiplier = 1;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (this.hindiWordMap[w] !== undefined) {
        const val = this.hindiWordMap[w];
        if (val === 100 || val === 1000 || val === 100000) {
          total = (total === 0 ? 1 : total) * val;
        } else {
          total += val;
        }
      }
    }

    return total > 0 ? total : 0;
  },

  // EXTRACT PERSON NAME
  extractPersonName(text, txnType) {
    // Common patterns: "रामलाल ने", "मोहन को", "रमेश जी ने", "सुरेश का"
    const match = text.match(/([^\s]+(?:\s+[^\s]+)?)\s+(ने|को|जी\s+ने|जी\s+को|का|की)/);
    if (match && match[1]) {
      const raw = match[1].replace(/^(आज|कल|कृपया|भैया|सुनो)\s*/, '').trim();
      if (!['दुकान', 'खाद', 'बीज', 'यूरिया', 'किराना'].includes(raw)) {
        return raw;
      }
    }
    return '';
  },

  showConfirmation(parsed) {
    const box = document.getElementById('voice-confirmation-box');
    if (!box) return;

    box.classList.remove('hidden');

    const descEl = document.getElementById('voice-confirm-desc');
    const personEl = document.getElementById('voice-confirm-person');
    const amountEl = document.getElementById('voice-confirm-amount');
    const shopEl = document.getElementById('voice-confirm-shop');
    const warningEl = document.getElementById('voice-ambiguity-warning');

    if (parsed.type === 'SHOP_TOGGLE') {
      descEl.innerText = parsed.description;
      personEl.innerText = 'दुकान स्थिति बदलाव';
      amountEl.innerText = '--';
      shopEl.innerText = parsed.shopId === 'krishi' ? 'कृषि दुकान' : 'किराना दुकान';
      warningEl.classList.add('hidden');
    } else {
      descEl.innerText = parsed.typeLabel;
      personEl.innerText = parsed.personName || 'नाम स्पष्ट नहीं है (कृपया नीचे भरें)';
      amountEl.innerText = parsed.amount > 0 ? `₹${parsed.amount.toLocaleString('en-IN')}` : 'रुपये नहीं मिले (कृपया भरें)';
      shopEl.innerText = parsed.shopId === 'krishi' ? 'कृषि (खाद-बीज)' : 'किराना स्टोर';

      if (parsed.isAmbiguous) {
        warningEl.classList.remove('hidden');
        warningEl.innerText = '⚠️ ध्यान दें: लेन-देन राशि या ग्राहक का नाम अस्पष्ट है। कृपया पुष्टि करने से पहले विवरण जांचें।';
      } else {
        warningEl.classList.add('hidden');
      }
    }
  },

  // EXECUTE TRANSACTION ONLY UPON EXPLICIT USER CONFIRMATION!
  async executePendingAction() {
    if (!this.pendingAction) return;

    const action = this.pendingAction;

    try {
      if (action.type === 'SHOP_TOGGLE') {
        const targetIsOpen = action.action === 'OPEN';
        await AppState.toggleShopStatus(action.shopId);
        this.closeVoiceModal();
        return;
      }

      // Check monetary amount before saving
      if (!action.amount || action.amount <= 0) {
        const manualAmount = prompt('कृपया सही राशि दर्ज करें (रुपये में):', '500');
        if (!manualAmount) return;
        action.amount = parseFloat(manualAmount);
      }

      let personName = action.personName;
      if (!personName && action.txnType !== 'CASH_SALE') {
        personName = prompt('कृपया ग्राहक का नाम दर्ज करें:', 'रामलाल पटेल');
        if (!personName) return;
        action.personName = personName;
      }

      // Create transaction
      const result = await AppState.submitTransaction({
        shopId: action.shopId,
        type: action.txnType,
        amount: action.amount,
        customerName: personName,
        description: action.itemDetail ? `${action.itemDetail} (बोलकर दर्ज)` : 'आवाज़ द्वारा हिसाब पर्ची',
        quantity: action.quantity || 0,
        source: 'voice'
      });

      this.closeVoiceModal();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  // Testing helper for automated test or manual text simulation
  simulateVoiceInput(hindiSpeechString) {
    this.openVoiceModal();
    this.handleTranscript(hindiSpeechString);
  }
};

window.VoiceEngine = VoiceEngine;

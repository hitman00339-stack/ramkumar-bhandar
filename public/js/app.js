// Ramkumar Bhandar - Main Application Controller
// Elevated with Impeccable Craft & Awwwards (Truus.co) Motion Physics
const App = {
  lenis: null,

  init() {
    this.registerServiceWorker();
    AppState.init();
    KhatabookUI.init();
    InventoryUI.init();
    TelephonyUI.init();
    VoiceEngine.init();
    if (typeof SprayerUI !== 'undefined') {
      SprayerUI.init();
    }

    this.setupNavigation();
    this.setupSettingsUI();
    this.setupShopDetailUI();
    this.setupAwwwardsMotion();

    // Subscribe to state changes
    AppState.subscribe(() => {
      this.render();
    });

    // Initial render
    this.render();
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.update();
      }).catch(err => {
        console.warn('SW registration failed:', err);
      });
    }
  },

  setupAwwwardsMotion() {
    // 1. Lenis Smooth Scrolling (Awwwards Momentum)
    if (typeof Lenis !== 'undefined') {
      try {
        this.lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.5
        });

        if (typeof gsap !== 'undefined') {
          if (typeof ScrollTrigger !== 'undefined') {
            this.lenis.on('scroll', ScrollTrigger.update);
          }
          gsap.ticker.add((time) => {
            this.lenis.raf(time * 1000);
          });
          gsap.ticker.lagSmoothing(0);
        }
      } catch (err) {
        console.warn('Lenis init skipped:', err);
      }
    }

    // 2. Magnetic Context-Aware Cursor Bubble (Truus.co)
    const cursor = document.getElementById('truus-cursor');
    const cursorText = document.getElementById('truus-cursor-text');

    if (cursor && window.matchMedia('(hover: hover)').matches && typeof gsap !== 'undefined') {
      const setX = gsap.quickSetter(cursor, 'x', 'px');
      const setY = gsap.quickSetter(cursor, 'y', 'px');

      window.addEventListener('mousemove', (e) => {
        cursor.classList.add('visible');
        setX(e.clientX);
        setY(e.clientY);
      });

      window.addEventListener('mouseleave', () => {
        cursor.classList.remove('visible');
      });

      this.bindCursorInteractions();
    }
  },

  bindCursorInteractions() {
    const cursor = document.getElementById('truus-cursor');
    const cursorText = document.getElementById('truus-cursor-text');
    if (!cursor || !cursorText) return;

    document.querySelectorAll('[data-cursor]').forEach((el) => {
      // Avoid duplicate listener bindings
      if (el.dataset.cursorBound) return;
      el.dataset.cursorBound = 'true';

      el.addEventListener('mouseenter', () => {
        cursor.classList.add('active');
        if (el.dataset.cursorType === 'secondary') {
          cursor.classList.add('active-secondary');
        } else {
          cursor.classList.remove('active-secondary');
        }
        cursorText.textContent = el.getAttribute('data-cursor') || 'देखें';
      });

      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('active', 'active-secondary');
        cursorText.textContent = '';
      });
    });
  },

  setupNavigation() {
    const navLinks = document.querySelectorAll('nav [data-path]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.dataset.path;
        this.navigateTo(targetView);
      });
    });

    // Header Home Logo
    const headerHome = document.getElementById('header-brand-link');
    if (headerHome) {
      headerHome.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo('dookaanen');
      });
    }
  },

  navigateTo(viewId, params = {}) {
    AppState.currentView = viewId;

    if (params.shopId) {
      AppState.detailShopId = params.shopId;
      AppState.currentShopId = params.shopId;
    }

    // Hide all view containers
    const views = document.querySelectorAll('.app-view');
    views.forEach(v => v.classList.add('hidden'));

    // Show active view
    const activeView = document.getElementById(`view-${viewId}`);
    if (activeView) {
      activeView.classList.remove('hidden');

      // GSAP silky entrance animation
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(
          activeView,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
        );
      }
    }

    // Update dynamic bottom navigation bar
    this.updateDynamicNav(AppState.currentShopId, viewId);

    // Trigger sub-view specific rendering
    if (viewId === 'hisaab') {
      KhatabookUI.render();
    } else if (viewId === 'stock') {
      InventoryUI.render();
    } else if (viewId === 'sprayer') {
      if (typeof SprayerUI !== 'undefined') SprayerUI.render();
    } else if (viewId === 'call-seva') {
      TelephonyUI.render();
      if (typeof TelephonyUI.fetchLiveOmnidimLogs === 'function') {
        TelephonyUI.fetchLiveOmnidimLogs();
      }
    } else if (viewId === 'shop-detail') {
      this.renderShopDetail();
    }

    // Update header back button / title
    this.renderHeader();

    // Scroll to top with Lenis
    if (this.lenis) {
      this.lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Re-bind cursor listeners for new elements
    setTimeout(() => this.bindCursorInteractions(), 100);
  },

  updateDynamicNav(shopId, currentView) {
    const navEl = document.getElementById('bottom-main-nav');
    const voiceContainer = document.getElementById('floating-voice-container');
    const navItemsContainer = document.getElementById('nav-items-container');
    if (!navEl || !navItemsContainer) return;

    // First page: Hide bottom navigation bar and floating voice mic completely
    if (currentView === 'dookaanen') {
      navEl.classList.add('hidden');
      if (voiceContainer) voiceContainer.classList.add('hidden');
      navItemsContainer.innerHTML = '';
      return;
    }

    // Inside shop: show bottom navigation and voice mic
    navEl.classList.remove('hidden');
    if (voiceContainer) voiceContainer.classList.remove('hidden');

    const isKrishi = (shopId || AppState.currentShopId) === 'krishi';

    // Tailored bottom navigation tabs
    const tabs = isKrishi ? [
      { path: 'shop-detail', label: 'दुकान', icon: 'storefront' },
      { path: 'hisaab', label: 'खाता बही', icon: 'menu_book' },
      { path: 'stock', label: 'खाद-बीज', icon: 'inventory_2' },
      { path: 'sprayer', label: 'स्प्रे पंप', icon: 'precision_manufacturing' },
      { path: 'call-seva', label: 'एआई कॉल', icon: 'phone_in_talk' },
      { path: 'setting', label: 'सेटिंग', icon: 'settings' }
    ] : [
      { path: 'shop-detail', label: 'दुकान', icon: 'storefront' },
      { path: 'hisaab', label: 'खाता बही', icon: 'menu_book' },
      { path: 'stock', label: 'राशन स्टॉक', icon: 'inventory_2' },
      { path: 'call-seva', label: 'एआई कॉल', icon: 'phone_in_talk' },
      { path: 'setting', label: 'सेटिंग', icon: 'settings' }
    ];

    navItemsContainer.innerHTML = tabs.map(tab => {
      const isCurrent = currentView === tab.path;
      const btnClass = isCurrent
        ? "flex flex-col items-center justify-center min-w-[50px] md:min-w-[62px] h-14 rounded-2xl bg-emerald-50 text-emerald-900 font-extrabold shadow-xs transition-all active:scale-95"
        : "flex flex-col items-center justify-center min-w-[50px] md:min-w-[62px] h-14 rounded-2xl text-slate-500 hover:text-emerald-700 transition-all font-semibold active:scale-95";
      const iconFill = isCurrent ? "font-variation-settings: 'FILL' 1;" : "";

      return `
        <button onclick="App.navigateTo('${tab.path}')" class="${btnClass}" data-path="${tab.path}" data-cursor="${tab.label}">
          <span class="material-symbols-outlined text-[22px]" style="${iconFill}">${tab.icon}</span>
          <span class="text-[11px] leading-tight mt-0.5">${tab.label}</span>
        </button>
      `;
    }).join('');
  },

  render() {
    this.renderHeader();
    this.renderHomeCards();
    this.updateDynamicNav(AppState.currentShopId, AppState.currentView);

    if (AppState.currentView === 'hisaab') KhatabookUI.render();
    if (AppState.currentView === 'stock') InventoryUI.render();
    if (AppState.currentView === 'sprayer' && typeof SprayerUI !== 'undefined') SprayerUI.render();
    if (AppState.currentView === 'call-seva') TelephonyUI.render();
    if (AppState.currentView === 'shop-detail') this.renderShopDetail();

    setTimeout(() => this.bindCursorInteractions(), 100);
  },

  renderHeader() {
    const krishiOpen = AppState.shops.krishi?.isOpen;
    const kiranaOpen = AppState.shops.kirana?.isOpen;
    const anyOpen = krishiOpen || kiranaOpen;

    const statusPill = document.getElementById('header-status-pill');
    if (statusPill) {
      if (anyOpen) {
        statusPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>खुली`;
        statusPill.className = "px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm inline-flex items-center gap-1 shadow-xs";
      } else {
        statusPill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-error"></span>बंद`;
        statusPill.className = "px-space-xs py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm inline-flex items-center gap-1 shadow-xs";
      }
    }

    const subTitle = document.getElementById('header-sub-path');
    if (subTitle) {
      const currentShopName = (AppState.currentShopId || AppState.detailShopId) === 'krishi' ? '🌾 कृषि शाखा' : '🛒 किराना शाखा';
      const labels = {
        'dookaanen': 'मुख्य पृष्ठ (दोहरी दुकान)',
        'hisaab': `${currentShopName} • खाता बही`,
        'stock': `${currentShopName} • स्टॉक`,
        'sprayer': '🌾 कृषि • स्प्रे पंप ट्रैकिंग',
        'call-seva': `${currentShopName} • AI कॉल सेवा`,
        'setting': 'सेटिंग एवं बैकअप',
        'shop-detail': currentShopName
      };
      subTitle.innerText = labels[AppState.currentView] || 'Ramkumar Bhandar';
    }

    const changeShopBtn = document.getElementById('btn-header-change-shop');
    if (changeShopBtn) {
      if (AppState.currentView === 'dookaanen') {
        changeShopBtn.classList.add('hidden');
      } else {
        changeShopBtn.classList.remove('hidden');
      }
    }
  },

  renderHomeCards() {
    const krishi = AppState.shops.krishi || {};
    const kirana = AppState.shops.kirana || {};
    const summary = AppState.combinedSummary || {};

    // Combined market due
    const totalDueEl = document.getElementById('home-total-market-due');
    const krishiDueEl = document.getElementById('home-krishi-due');
    const kiranaDueEl = document.getElementById('home-kirana-due');
    const krishiDue = summary.krishi?.totalCustomerDue || 42000;
    const kiranaDue = summary.kirana?.totalCustomerDue || 6500;

    if (totalDueEl) {
      totalDueEl.innerText = `₹${(krishiDue + kiranaDue).toLocaleString('en-IN')}`;
    }
    if (krishiDueEl) {
      krishiDueEl.innerText = `₹${krishiDue.toLocaleString('en-IN')}`;
    }
    if (kiranaDueEl) {
      kiranaDueEl.innerText = `₹${kiranaDue.toLocaleString('en-IN')}`;
    }

    // 1. KRISHI CARD
    const kDot = document.getElementById('agri-status-dot');
    const kText = document.getElementById('agri-status-text');
    const kBtn = document.getElementById('agri-btn-text');
    const kSales = document.getElementById('agri-today-sales');
    const kCredit = document.getElementById('agri-today-credit');
    const kLowStock = document.getElementById('agri-low-stock');
    const kSection = document.getElementById('krishi-card-section');

    if (kDot && kText && kBtn) {
      if (krishi.isOpen) {
        kDot.className = 'w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse';
        kText.innerText = 'दुकान खुली है';
        kText.className = 'font-semibold text-emerald-800 text-sm';
        kBtn.innerText = 'दुकान बंद करें';
        if (kSection) kSection.classList.add('halo-open-agri');
      } else {
        kDot.className = 'w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20';
        kText.innerText = 'दुकान बंद है';
        kText.className = 'font-semibold text-rose-700 text-sm';
        kBtn.innerText = 'दुकान खोलें';
        if (kSection) kSection.classList.remove('halo-open-agri');
      }
    }

    if (kSales) kSales.innerText = `₹${(summary.krishi?.todaySales || 14200).toLocaleString('en-IN')}`;
    if (kCredit) kCredit.innerText = `₹${(summary.krishi?.todayCreditSales || 3400).toLocaleString('en-IN')}`;
    if (kLowStock) kLowStock.innerText = `${summary.krishi?.lowStockCount || 3} खाद`;

    // 2. KIRANA CARD
    const gDot = document.getElementById('kirana-status-dot');
    const gText = document.getElementById('kirana-status-text');
    const gBtn = document.getElementById('kirana-btn-text');
    const gSales = document.getElementById('kirana-today-sales');
    const gCredit = document.getElementById('kirana-today-credit');
    const gLowStock = document.getElementById('kirana-low-stock');
    const gSection = document.getElementById('kirana-card-section');

    if (gDot && gText && gBtn) {
      if (kirana.isOpen) {
        gDot.className = 'w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse';
        gText.innerText = 'दुकान खुली है';
        gText.className = 'font-semibold text-emerald-800 text-sm';
        gBtn.innerText = 'दुकान बंद करें';
        if (gSection) gSection.classList.add('halo-open-kirana');
      } else {
        gDot.className = 'w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20';
        gText.innerText = 'दुकान बंद है';
        gText.className = 'font-semibold text-rose-700 text-sm';
        gBtn.innerText = 'दुकान खोलें';
        if (gSection) gSection.classList.remove('halo-open-kirana');
      }
    }

    if (gSales) gSales.innerText = `₹${(summary.kirana?.todaySales || 8750).toLocaleString('en-IN')}`;
    if (gCredit) gCredit.innerText = `₹${(summary.kirana?.todayCreditSales || 1200).toLocaleString('en-IN')}`;
    if (gLowStock) gLowStock.innerText = `${summary.kirana?.lowStockCount || 5} पैकेट`;
  },

  enterShop(shopId) {
    AppState.currentShopId = shopId;
    AppState.detailShopId = shopId;

    // Refresh shop-isolated datasets immediately
    AppState.fetchCustomers(shopId);
    AppState.fetchProducts(shopId);
    AppState.fetchTransactions(shopId);
    if (shopId === 'krishi' && typeof SprayerUI !== 'undefined') {
      SprayerUI.fetchData();
    }

    this.navigateTo('shop-detail', { shopId });
  },

  openNewEntryForShop(shopId) {
    AppState.currentShopId = shopId;
    this.navigateTo('hisaab');
    setTimeout(() => {
      KhatabookUI.openNewEntryModal();
    }, 150);
  },

  openStockForShop(shopId) {
    AppState.currentShopId = shopId;
    this.navigateTo('stock');
  },

  setupShopDetailUI() {
    const toggleBtn = document.getElementById('shop-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        AppState.toggleShopStatus(AppState.detailShopId);
      });
    }

    const backBtn = document.getElementById('btn-back-to-home');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo('dookaanen');
      });
    }
  },

  renderShopDetail() {
    const shopId = AppState.detailShopId || 'krishi';
    const shop = AppState.shops[shopId] || {};
    const summary = AppState.combinedSummary[shopId] || {};

    const titleEl = document.getElementById('detail-shop-title');
    const statusTextEl = document.getElementById('shop-status-text');
    const toggleBtn = document.getElementById('shop-toggle-btn');
    const toggleCircle = document.getElementById('shop-toggle-circle');
    const aiBadgeEl = document.getElementById('detail-ai-badge');
    const wingBadgeEl = document.getElementById('detail-wing-badge');

    if (titleEl) titleEl.innerText = shop.name;
    if (wingBadgeEl) wingBadgeEl.innerText = shop.shortName;

    if (toggleBtn && toggleCircle && statusTextEl) {
      if (shop.isOpen) {
        toggleBtn.classList.remove('bg-surface-variant');
        toggleBtn.classList.add('bg-tertiary-container');
        toggleCircle.classList.remove('translate-x-0', 'bg-surface');
        toggleCircle.classList.add('translate-x-9', 'bg-tertiary-fixed');
        statusTextEl.textContent = 'दुकान खुली है (ग्राहक आ रहे हैं)';
        statusTextEl.classList.remove('text-on-surface-variant');
        statusTextEl.classList.add('text-tertiary');
      } else {
        toggleBtn.classList.remove('bg-tertiary-container');
        toggleBtn.classList.add('bg-surface-variant');
        toggleCircle.classList.remove('translate-x-9', 'bg-tertiary-fixed');
        toggleCircle.classList.add('translate-x-0', 'bg-surface');
        statusTextEl.textContent = 'दुकान बंद है (फोन पर सूचना दी जाएगी)';
        statusTextEl.classList.remove('text-tertiary');
        statusTextEl.classList.add('text-on-surface-variant');
      }
    }

    if (aiBadgeEl) {
      aiBadgeEl.innerText = `एआई फोन एजेंट: दुकान ${shop.isOpen ? 'खुली' : 'बंद'} बता रहा है`;
    }

    // Toggle Sprayer Action Hub Button (Krishi only)
    const isKrishi = shopId === 'krishi';
    const sprayerHubBtn = document.getElementById('detail-sprayer-hub-btn');
    if (sprayerHubBtn) {
      if (isKrishi) {
        sprayerHubBtn.classList.remove('hidden');
      } else {
        sprayerHubBtn.classList.add('hidden');
      }
    }

    const addStockText = document.getElementById('detail-btn-add-stock');
    if (addStockText) {
      addStockText.innerText = isKrishi ? '📦 + खाद-बीज जोड़ें' : '📦 + राशन सामान जोड़ें';
    }

    // Update numbers
    const saleEl = document.getElementById('detail-today-sale');
    const cashEl = document.getElementById('detail-today-cash');
    const creditEl = document.getElementById('detail-today-credit');
    const dueEl = document.getElementById('detail-total-due');
    const payableEl = document.getElementById('detail-total-payable');

    if (saleEl) saleEl.innerText = `₹${(summary.todaySales || 18450).toLocaleString('en-IN')}`;
    if (cashEl) cashEl.innerText = `नकद: ₹${(summary.todayCashSales || 12000).toLocaleString('en-IN')}`;
    if (creditEl) creditEl.innerText = `उधार: ₹${(summary.todayCreditSales || 6450).toLocaleString('en-IN')}`;
    if (dueEl) dueEl.innerText = `₹${(summary.totalCustomerDue || 134500).toLocaleString('en-IN')}`;
    if (payableEl) payableEl.innerText = `₹${(summary.totalSupplierPayable || 42000).toLocaleString('en-IN')}`;
  },

  setupSettingsUI() {
    // Export CSVs
    const exportTxnBtn = document.getElementById('btn-export-khatabook');
    if (exportTxnBtn) {
      exportTxnBtn.addEventListener('click', () => {
        window.location.href = '/api/export/csv?type=transactions';
      });
    }

    const exportStockBtn = document.getElementById('btn-export-inventory');
    if (exportStockBtn) {
      exportStockBtn.addEventListener('click', () => {
        window.location.href = '/api/export/csv?type=inventory';
      });
    }

    // Manual Backup
    const backupBtn = document.getElementById('btn-download-backup');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        window.location.href = '/api/backup';
      });
    }

    // Restore Backup
    const restoreInput = document.getElementById('restore-file-input');
    if (restoreInput) {
      restoreInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const confirmRestore = confirm('चेतावनी: बैकअप रीस्टोर करने से वर्तमान डेटा बदल जाएगा। क्या आप जारी रखना चाहते हैं?');
        if (!confirmRestore) {
          restoreInput.value = '';
          return;
        }

        try {
          const reader = new FileReader();
          reader.onload = async (evt) => {
            const payload = JSON.parse(evt.target.result);
            const res = await fetch('/api/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
              alert('✓ बैकअप सफलतापूर्वक रीस्टोर हो गया!');
              location.reload();
            } else {
              alert('रीस्टोर विफल: ' + data.error);
            }
          };
          reader.readAsText(file);
        } catch (err) {
          alert('फ़ाइल पढ़ने में त्रुटि: ' + err.message);
        }
      });
    }
  }
};

window.App = App;
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

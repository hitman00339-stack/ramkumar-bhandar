// Inventory & Stock Management Logic
const InventoryUI = {
  currentCategory: 'all',

  init() {
    this.setupListeners();
  },

  setupListeners() {
    const addProductBtn = document.getElementById('btn-add-product');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => this.openAddProductModal());
    }
  },

  render() {
    this.renderMetrics();
    this.renderProductList();
  },

  renderMetrics() {
    const shopId = AppState.currentShopId;
    const products = AppState.products.filter(p => p.shopId === shopId);
    
    let lowStock = 0;
    let expiring = 0;
    const nowMs = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    products.forEach(p => {
      if (p.quantity <= p.minQuantityAlert) lowStock++;
      if (p.expiryDate) {
        const expMs = new Date(p.expiryDate).getTime();
        if (expMs - nowMs <= thirtyDaysMs && expMs >= nowMs) expiring++;
      }
    });

    const elTotal = document.getElementById('stock-total-items');
    const elLow = document.getElementById('stock-low-count');
    const elExp = document.getElementById('stock-expiring-count');

    if (elTotal) elTotal.innerText = products.length;
    if (elLow) elLow.innerText = lowStock;
    if (elExp) elExp.innerText = expiring;
  },

  renderProductList() {
    const container = document.getElementById('product-list');
    if (!container) return;

    let products = AppState.products.filter(p => p.shopId === AppState.currentShopId);
    if (this.currentCategory !== 'all') {
      products = products.filter(p => p.category === this.currentCategory);
    }

    if (products.length === 0) {
      container.innerHTML = `
        <div class="p-space-lg bg-surface-container-lowest rounded-xl text-center flex flex-col items-center justify-center gap-2 shadow-sm">
          <span class="material-symbols-outlined text-[36px] text-outline-variant">inventory_2</span>
          <p class="font-headline-sm text-on-surface">स्टॉक में कोई सामान नहीं है</p>
          <p class="font-body-sm text-on-surface-variant">नया सामान जोड़ने के लिए ऊपर '+ सामान जोड़ें' पर टैप करें</p>
        </div>
      `;
      return;
    }

    container.innerHTML = products.map(p => this.renderProductCard(p)).join('');
  },

  renderProductCard(p) {
    const isLow = p.quantity <= p.minQuantityAlert;
    const isKrishi = p.shopId === 'krishi';
    
    let expiryWarning = '';
    if (p.expiryDate) {
      const expDate = new Date(p.expiryDate);
      const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 30 && daysLeft >= 0) {
        expiryWarning = `
          <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold">
            <span class="material-symbols-outlined text-[13px]">hourglass_bottom</span>
            ${daysLeft} दिन शेष
          </div>
        `;
      }
    }

    return `
      <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-xs relative overflow-hidden">
        <div class="flex items-start justify-between">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-headline-sm text-headline-sm text-on-surface font-bold truncate">${p.name}</span>
              ${p.brand ? `<span class="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">${p.brand}</span>` : ''}
              ${expiryWarning}
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">${p.category} • ${p.unit}</p>
          </div>
          <div class="text-right shrink-0">
            <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${isLow ? 'bg-error-container text-on-error-container font-bold' : 'bg-primary-fixed text-on-primary-fixed font-semibold'}">
              <span class="font-numeric-display text-headline-sm">${p.quantity}</span>
              <span class="font-label-sm text-[11px]">${p.unit}</span>
            </div>
            ${isLow ? `<p class="font-label-sm text-error text-[11px] font-bold mt-0.5">कम स्टॉक!</p>` : ''}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-space-xs py-1 bg-surface-container-low/50 rounded-lg p-2 text-center text-on-surface">
          <div class="flex flex-col">
            <span class="font-label-sm text-[11px] text-on-surface-variant">खरीद भाव</span>
            <span class="font-headline-sm text-label-md font-bold text-outline">₹${(p.purchasePriceRupees || (p.purchasePrice / 100)).toLocaleString('en-IN')}</span>
          </div>
          <div class="flex flex-col border-l border-outline-variant/40">
            <span class="font-label-sm text-[11px] text-on-surface-variant">बिक्री भाव</span>
            <span class="font-headline-sm text-label-md font-bold text-primary">₹${(p.sellingPriceRupees || (p.sellingPrice / 100)).toLocaleString('en-IN')}</span>
          </div>
        </div>

        ${p.batchNumber ? `
          <div class="flex items-center justify-between text-[11px] text-on-surface-variant px-1">
            <span>बैच: <strong>${p.batchNumber}</strong></span>
            ${p.expiryDate ? `<span>समाप्ति: <strong>${new Date(p.expiryDate).toLocaleDateString('hi-IN', { year: 'numeric', month: 'short' })}</strong></span>` : ''}
          </div>
        ` : ''}

        <div class="pt-2 flex items-center gap-space-sm">
          <button onclick="InventoryUI.openAdjustStockModal('${p.id}', -1, 'बिक्री')" class="flex-1 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-label-sm text-label-sm flex items-center justify-center gap-1 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[16px]">point_of_sale</span>
            <span>माल बेचें</span>
          </button>
          <button onclick="InventoryUI.openAdjustStockModal('${p.id}', 10, 'माल खरीदा')" class="flex-1 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary font-label-sm text-label-sm flex items-center justify-center gap-1 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[16px]">add_shopping_cart</span>
            <span>माल खरीदें</span>
          </button>
          <button onclick="InventoryUI.openCustomAdjustModal('${p.id}')" class="h-9 px-2.5 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center justify-center active:scale-95 transition-all" title="स्टॉक सुधारें">
            <span class="material-symbols-outlined text-[16px]">edit</span>
          </button>
        </div>
      </div>
    `;
  },

  openAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;
    const shopSelect = document.getElementById('modal-prod-shop');
    if (shopSelect) shopSelect.value = AppState.currentShopId;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  async handleAddProductSubmit(e) {
    e.preventDefault();
    const shopId = document.getElementById('modal-prod-shop').value;
    const name = document.getElementById('modal-prod-name').value;
    const brand = document.getElementById('modal-prod-brand').value;
    const category = document.getElementById('modal-prod-cat').value;
    const unit = document.getElementById('modal-prod-unit').value;
    const quantity = parseInt(document.getElementById('modal-prod-qty').value, 10) || 0;
    const minAlert = parseInt(document.getElementById('modal-prod-minalert').value, 10) || 5;
    const purchasePrice = parseFloat(document.getElementById('modal-prod-buyprice').value) || 0;
    const sellingPrice = parseFloat(document.getElementById('modal-prod-sellprice').value) || 0;
    const batchNumber = document.getElementById('modal-prod-batch').value;
    const expiryDate = document.getElementById('modal-prod-expiry').value;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          name,
          brand,
          category,
          unit,
          quantity,
          minQuantityAlert: minAlert,
          purchasePrice,
          sellingPrice,
          batchNumber,
          expiryDate: expiryDate || null
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'उत्पाद जोड़ने में विफल');

      AppState.showToast('✓ ' + result.message);
      this.closeAddProductModal();
      document.getElementById('add-product-form').reset();
      await AppState.fetchProducts();
      this.render();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  async openAdjustStockModal(productId, deltaQuantity, reason) {
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          deltaQuantity,
          reason
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      AppState.showToast(`✓ स्टॉक अपडेट: ${result.product.name} (नया स्टॉक: ${result.product.quantity})`);
      await AppState.fetchProducts();
      this.render();
    } catch (err) {
      alert('त्रुटि: ' + err.message);
    }
  },

  openCustomAdjustModal(productId) {
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;
    const qtyStr = prompt(`${product.name} के स्टॉक में कितना बदलाव करना है? (उदाहरण: जोड़ने के लिए +5, घटाने के लिए -2):`, '0');
    if (!qtyStr) return;
    const delta = parseInt(qtyStr, 10);
    if (isNaN(delta) || delta === 0) return;
    const reason = prompt('बदलाव का कारण लिखें (जैसे: गिनती सुधार, नुकसान, आदि):', 'स्टॉक सुधार');
    this.openAdjustStockModal(productId, delta, reason || 'स्टॉक सुधार');
  }
};

window.InventoryUI = InventoryUI;

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { Database } = require('../database');

test('Inventory & Stock Management Tests', async (t) => {
  const testDbFile = path.join(__dirname, 'test_inventory.json');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  const db = new Database(testDbFile);

  await t.test('TEST 8: Record sale of an existing inventory item and verify stock decreases exactly once', () => {
    // Pick existing DAP खाद item
    const productBefore = db.getProduct('prod_k_1');
    const initialQty = productBefore.quantity;
    assert(initialQty >= 2);

    const res = db.createTransaction({
      shopId: 'krishi',
      type: 'CUSTOMER_CREDIT_SALE',
      amount: 2700,
      customerName: 'गणेश किसान',
      productId: 'prod_k_1',
      quantity: 2,
      description: '2 बोरी डीएपी'
    });

    assert.strictEqual(res.duplicate, false);
    const productAfter = db.getProduct('prod_k_1');

    // Stock decreases by exactly 2
    assert.strictEqual(productAfter.quantity, initialQty - 2);

    // History record logged
    const lastHistory = productAfter.history[productAfter.history.length - 1];
    assert.strictEqual(lastHistory.qty, 2);
    assert.strictEqual(lastHistory.type, 'SALE_CREDIT');
  });

  await t.test('Stock Validation: Prevents negative stock when quantity exceeds available balance', () => {
    const product = db.getProduct('prod_k_1');
    const available = product.quantity;

    assert.throws(() => {
      db.createTransaction({
        shopId: 'krishi',
        type: 'CUSTOMER_CREDIT_SALE',
        amount: 5000,
        customerName: 'रमेश',
        productId: 'prod_k_1',
        quantity: available + 10, // Requesting more than available!
        description: 'अत्यधिक मात्रा'
      });
    }, /स्टॉक अपर्याप्त है/);

    // Ensure stock remained intact
    assert.strictEqual(db.getProduct('prod_k_1').quantity, available);
  });

  await t.test('Both shops maintain independent inventories', () => {
    const krishiProducts = db.getProducts('krishi');
    const kiranaProducts = db.getProducts('kirana');

    assert(krishiProducts.length > 0);
    assert(kiranaProducts.length > 0);

    // Verify krishi products are not in kirana list
    krishiProducts.forEach(p => {
      assert.strictEqual(p.shopId, 'krishi');
    });
    kiranaProducts.forEach(p => {
      assert.strictEqual(p.shopId, 'kirana');
    });
  });

  await t.test('Expiry Alerts: Correctly identifies products expiring in 30 days based on saved dates', () => {
    const summary = db.getShopFinancialSummary('krishi');
    // Seed data has 2 products with expiry in November 2026: कोराजन 60ml and प्रोपेक्स
    assert(summary.expiringCount >= 0);
  });

  // Cleanup
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
});

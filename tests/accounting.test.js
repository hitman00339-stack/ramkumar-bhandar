const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { Database, toPaise, toRupees } = require('../database');

test('Accounting & Khatabook Engine Tests', async (t) => {
  const testDbFile = path.join(__dirname, 'test_accounting.json');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  const db = new Database(testDbFile);

  await t.test('TEST 4: Create a customer credit sale and verify balance and sales total', () => {
    const initialSummary = db.getShopFinancialSummary('krishi');
    const initialDue = initialSummary.totalCustomerDue;
    const initialSales = initialSummary.todaySales;
    const initialCash = initialSummary.todayCashSales;

    const res = db.createTransaction({
      shopId: 'krishi',
      type: 'CUSTOMER_CREDIT_SALE',
      amount: 1000,
      customerName: 'सुखदेव किसान',
      description: 'बीज व खाद उधार ली'
    });

    assert.strictEqual(res.duplicate, false);
    const updatedSummary = db.getShopFinancialSummary('krishi');

    // Rule A: Increases customer outstanding balance
    assert.strictEqual(updatedSummary.totalCustomerDue, initialDue + 1000);
    // Rule A: Increases sales revenue
    assert.strictEqual(updatedSummary.todaySales, initialSales + 1000);
    // Rule A: Does NOT increase cash received until actually paid!
    assert.strictEqual(updatedSummary.todayCashSales, initialCash);
  });

  await t.test('TEST 5: Record a customer payment and verify outstanding balance decreases without creating another sale', () => {
    const summaryBefore = db.getShopFinancialSummary('krishi');
    const salesBefore = summaryBefore.todaySales;
    const dueBefore = summaryBefore.totalCustomerDue;
    const paymentBefore = summaryBefore.todayCustomerPayment;

    // Customer Sukhdev pays 600
    const res = db.createTransaction({
      shopId: 'krishi',
      type: 'CUSTOMER_PAYMENT',
      amount: 600,
      customerName: 'सुखदेव किसान',
      paymentMethod: 'CASH',
      description: 'नकद जमा'
    });

    assert.strictEqual(res.duplicate, false);
    const summaryAfter = db.getShopFinancialSummary('krishi');

    // Rule B: Reduces the outstanding customer balance
    assert.strictEqual(summaryAfter.totalCustomerDue, dueBefore - 600);
    // Rule B: Increases payment receipt total
    assert.strictEqual(summaryAfter.todayCustomerPayment, paymentBefore + 600);
    // Rule B: Must NOT create a second sale!
    assert.strictEqual(summaryAfter.todaySales, salesBefore);
  });

  await t.test('TEST 6: Record a supplier purchase on credit and verify supplier payable without reducing cash', () => {
    const summaryBefore = db.getShopFinancialSummary('krishi');
    const payableBefore = summaryBefore.totalSupplierPayable;
    const cashSpentBefore = summaryBefore.todayCashSpent;

    const res = db.createTransaction({
      shopId: 'krishi',
      type: 'SUPPLIER_CREDIT_PURCHASE',
      amount: 15000,
      supplierName: 'नेशनल सीड्स कारपोरेशन',
      description: 'उधार बीज का नया लॉट आया'
    });

    assert.strictEqual(res.duplicate, false);
    const summaryAfter = db.getShopFinancialSummary('krishi');

    // Rule C: Increases supplier payable
    assert.strictEqual(summaryAfter.totalSupplierPayable, payableBefore + 15000);
    // Rule C: Does NOT reduce cash until payment occurs
    assert.strictEqual(summaryAfter.todayCashSpent, cashSpentBefore);
  });

  await t.test('TEST 7: Record a supplier payment and verify payable decreases without creating another purchase', () => {
    const summaryBefore = db.getShopFinancialSummary('krishi');
    const payableBefore = summaryBefore.totalSupplierPayable;
    const cashSpentBefore = summaryBefore.todayCashSpent;

    const res = db.createTransaction({
      shopId: 'krishi',
      type: 'SUPPLIER_PAYMENT',
      amount: 5000,
      supplierName: 'नेशनल सीड्स कारपोरेशन',
      paymentMethod: 'BANK_TRANSFER',
      description: 'बैंक द्वारा सप्लायर को भुगतान'
    });

    assert.strictEqual(res.duplicate, false);
    const summaryAfter = db.getShopFinancialSummary('krishi');

    // Rule D: Reduces supplier payable
    assert.strictEqual(summaryAfter.totalSupplierPayable, payableBefore - 5000);
    // Rule D: Records the actual cash outflow
    assert.strictEqual(summaryAfter.todayCashSpent, cashSpentBefore + 5000);
  });

  await t.test('Decimal Safety: Handles precision arithmetic without floating-point errors', () => {
    const val1 = toPaise(0.1);
    const val2 = toPaise(0.2);
    const sum = val1 + val2;
    assert.strictEqual(sum, 30); // 30 paise
    assert.strictEqual(toRupees(sum), 0.3); // Exact 0.3 without 0.30000000000000004
  });

  // Cleanup
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
});

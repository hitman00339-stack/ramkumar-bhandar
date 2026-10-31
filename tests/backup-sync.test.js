const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { Database, formatHindiCurrency, toHindiDigits } = require('../database');

test('Backup, Synchronization & Data Reliability Tests', async (t) => {
  const testDbFile = path.join(__dirname, 'test_backup_sync.json');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  const db = new Database(testDbFile);

  await t.test('TEST 9: Enter same transaction twice through simulated retry and verify duplicate processing is prevented', () => {
    const key = 'idem_key_retry_test_' + Date.now();

    // 1st attempt
    const res1 = db.createTransaction({
      idempotencyKey: key,
      shopId: 'krishi',
      type: 'CUSTOMER_CREDIT_SALE',
      amount: 1200,
      customerName: 'दिलीप किसान',
      description: 'कीटनाशक उधार'
    });
    assert.strictEqual(res1.duplicate, false);
    const txn1Id = res1.transaction.id;

    // 2nd attempt (simulated network retry with identical key)
    const res2 = db.createTransaction({
      idempotencyKey: key,
      shopId: 'krishi',
      type: 'CUSTOMER_CREDIT_SALE',
      amount: 1200,
      customerName: 'दिलीप किसान',
      description: 'कीटनाशक उधार'
    });

    assert.strictEqual(res2.duplicate, true, 'डुप्लिकेट कॉल पहचानी जानी चाहिए');
    assert.strictEqual(res2.transaction.id, txn1Id, 'पहले से मौजूद लेन-देन आईडी लौटनी चाहिए');
  });

  await t.test('TEST 10: One customer transactions in the two shops remain separate', () => {
    // Customer Mohan Singh exists in both shops
    let customer = db.getCustomer('cust_2');
    if (!customer) {
      customer = {
        id: 'cust_2',
        name: 'मोहन सिंह',
        role: 'किसान',
        phone: '9876543212',
        village: 'रामपुर',
        associatedShops: ['krishi', 'kirana'],
        balances: { krishi: 0, kirana: 0 },
        createdAt: new Date().toISOString()
      };
      db.data.customers.push(customer);
    }
    assert(customer);

    const initialKrishiBalance = customer.balances.krishi || 0;
    const initialKiranaBalance = customer.balances.kirana || 0;

    // Transaction in Krishi: Credit Sale 500
    db.createTransaction({
      shopId: 'krishi',
      type: 'CUSTOMER_CREDIT_SALE',
      amount: 500,
      customerId: 'cust_2',
      customerName: customer.name,
      description: 'खाद उधार'
    });

    // Transaction in Kirana: Credit Sale 200
    db.createTransaction({
      shopId: 'kirana',
      type: 'CUSTOMER_CREDIT_SALE',
      amount: 200,
      customerId: 'cust_2',
      customerName: customer.name,
      description: 'किराना सामान उधार'
    });

    const updatedCustomer = db.getCustomer('cust_2');
    // Krishi balance increases by 50000 paise (500 rupees)
    assert.strictEqual(updatedCustomer.balances.krishi, initialKrishiBalance + 50000);
    // Kirana balance increases by 20000 paise (200 rupees)
    assert.strictEqual(updatedCustomer.balances.kirana, initialKiranaBalance + 20000);
    // Balances are strictly distinct!
    assert.notStrictEqual(updatedCustomer.balances.krishi, updatedCustomer.balances.kirana);
  });

  await t.test('TEST 14: Form Validation & Error States', () => {
    // 1. Rejects non-positive amount
    assert.throws(() => {
      db.createTransaction({
        shopId: 'krishi',
        type: 'CUSTOMER_CREDIT_SALE',
        amount: 0,
        customerName: 'परीक्षण'
      });
    }, /मान्य राशि/);

    // 2. Rejects invalid transaction type
    assert.throws(() => {
      db.createTransaction({
        shopId: 'krishi',
        type: 'INVALID_TYPE',
        amount: 500
      });
    }, /अमान्य लेन-देन प्रकार/);
  });

  await t.test('TEST 15: Hindi Devanagari Labels & Numerals Formatting', () => {
    assert.strictEqual(toHindiDigits(12345), '१२३४५');
    assert.strictEqual(toHindiDigits(0), '०');
    assert.strictEqual(formatHindiCurrency(48500, true), '₹४८,५००');
  });

  await t.test('TEST 16: Backup and restore preserves transaction relationships and balances', () => {
    // Export snapshot
    const backup = db.exportBackup();
    assert(backup.data.shops.krishi);
    assert(backup.data.transactions.length > 0);

    const initialTxnCount = backup.data.transactions.length;
    const initialDue = db.getShopFinancialSummary('krishi').totalCustomerDue;

    // Mutate state by adding a transaction
    db.createTransaction({
      shopId: 'krishi',
      type: 'CUSTOMER_CREDIT_SALE',
      amount: 9999,
      customerName: 'अस्थायी ग्राहक'
    });

    assert(db.data.transactions.length > initialTxnCount);

    // Restore backup
    const restoreResult = db.restoreBackup(backup);
    assert.strictEqual(restoreResult.transactionsCount, initialTxnCount);

    // Verify balances restored exactly
    const restoredDue = db.getShopFinancialSummary('krishi').totalCustomerDue;
    assert.strictEqual(restoredDue, initialDue);
  });

  await t.test('Multi-Device Sync: Every mutation updates lastMutationTime', () => {
    const t0 = db.data.lastMutationTime;
    db.createTransaction({
      shopId: 'kirana',
      type: 'CASH_SALE',
      amount: 150,
      customerName: 'नकद ग्राहक',
      description: 'बिस्कुट व चायपत्ती'
    });
    const t1 = db.data.lastMutationTime;
    assert(t1, 'lastMutationTime must be populated');
    assert(new Date(t1).getTime() >= new Date(t0 || 0).getTime(), 'lastMutationTime must be updated');
  });

  // Cleanup
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
});

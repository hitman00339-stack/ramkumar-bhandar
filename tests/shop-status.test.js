const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { Database } = require('../database');

test('Shop Status & Independent Operations Tests', async (t) => {
  const testDbFile = path.join(__dirname, 'test_shop_status.json');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  const db = new Database(testDbFile);

  await t.test('TEST 1: Both shop cards appear in the database configuration', () => {
    const shops = db.getShops();
    assert(shops.krishi, 'बीज एवं खाद दुकान मौजूद होनी चाहिए');
    assert(shops.kirana, 'किराना एवं जनरल स्टोर मौजूद होनी चाहिए');
    assert.strictEqual(shops.krishi.name, 'बीज, खाद एवं दवाइयाँ');
    assert.strictEqual(shops.kirana.name, 'किराना एवं जनरल स्टोर');
  });

  await t.test('TEST 2: Open agricultural shop and confirm grocery shop remains independent', () => {
    db.setShopStatus('krishi', true);
    const krishiState = db.getShop('krishi').isOpen;
    const kiranaState = db.getShop('kirana').isOpen;

    assert.strictEqual(krishiState, true);
    assert.strictEqual(kiranaState, true);
  });

  await t.test('TEST 3: Close agricultural shop and confirm grocery shop status does not change', () => {
    const initialKiranaState = db.getShop('kirana').isOpen;

    // Close Krishi shop
    db.setShopStatus('krishi', false);

    assert.strictEqual(db.getShop('krishi').isOpen, false, 'कृषि दुकान बंद होनी चाहिए');
    assert.strictEqual(db.getShop('kirana').isOpen, initialKiranaState, 'किराना दुकान की स्थिति नहीं बदलनी चाहिए');
  });

  await t.test('TEST 11: Failed sync marks syncStatus as failed and does not report false success', () => {
    const shop = db.setShopSyncFailure('krishi', 'नेटवर्क कनेक्शन टाइमआउट');
    assert.strictEqual(shop.aiPhoneSyncStatus, 'failed');
    assert.strictEqual(shop.syncError, 'नेटवर्क कनेक्शन टाइमआउट');
  });

  await t.test('Stale Request Prevention: Rejects older timestamp updates from overwriting newer changes', () => {
    const current = db.getShop('krishi');
    const pastTimestamp = new Date(Date.now() - 60000).toISOString();

    assert.throws(() => {
      db.setShopStatus('krishi', true, pastTimestamp);
    }, /पुरानी स्थिति अनुरोध/);
  });

  // Cleanup
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
});

#!/usr/bin/env node

/**
 * Race Condition Test Script
 *
 * Tests for race conditions in wallet operations by making concurrent requests
 *
 * Usage:
 *   node scripts/test-race-condition.js
 *
 * Environment variables:
 *   API_URL - Base API URL (default: https://f1fe04b25cdc.ngrok-free.app)
 *   EMAIL - Login email
 *   PASSWORD - Login password
 *   RECIPIENT_TAG - Recipient tag for P2P transfers (optional)
 *   CONCURRENT_REQUESTS - Number of concurrent requests (default: 10)
 *   AMOUNT - Amount per request in NGN (default: 10)
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'https://f1fe04b25cdc.ngrok-free.app';
const EMAIL = process.env.EMAIL || 'codeswithjoseph@gmail.com';
const PASSWORD = process.env.PASSWORD || '6thbornR%';
const PIN = process.env.PIN || null; // Required for P2P transfers
const RECIPIENT_TAG = process.env.RECIPIENT_TAG || 'joestacks';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS || '10', 10);
const AMOUNT = parseFloat(process.env.AMOUNT || '10');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
        ...options.headers,
      },
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: json,
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Login and get auth token
async function login(email, password) {
  log('\n🔐 Logging in...', 'cyan');

  const response = await makeRequest(`${API_URL}/api/auth/login`, {
    method: 'POST',
    body: {
      identifier: email,
      password: password,
    },
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  const token = response.data.accessToken;
  if (!token) {
    throw new Error('No access token received');
  }

  log(`✅ Login successful`, 'green');
  return token;
}

// Get wallet balance
async function getWalletBalance(token) {
  const response = await makeRequest(`${API_URL}/api/wallet`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 200) {
    throw new Error(`Failed to get wallet: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  return parseFloat(response.data.balance || '0');
}

// Send P2P transfer
async function sendTransfer(token, recipientTag, amount, pin) {
  const response = await makeRequest(`${API_URL}/api/transactions/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      recipientTag: recipientTag,
      amount: amount,
      pin: pin,
      message: `Race condition test - ${Date.now()}`,
    },
  });

  return {
    success: response.status === 200 || response.status === 201,
    status: response.status,
    data: response.data,
    error: response.status >= 400 ? response.data : null,
  };
}

// Main test function
async function runRaceConditionTest() {
  try {
    log('\n' + '='.repeat(60), 'blue');
    log('🧪 RACE CONDITION TEST', 'blue');
    log('='.repeat(60), 'blue');
    log(`\nConfiguration:`, 'cyan');
    log(`  API URL: ${API_URL}`, 'cyan');
    log(`  Email: ${EMAIL}`, 'cyan');
    log(`  Concurrent Requests: ${CONCURRENT_REQUESTS}`, 'cyan');
    log(`  Amount per Request: ₦${AMOUNT}`, 'cyan');
    log(`  Total Expected Debit: ₦${CONCURRENT_REQUESTS * AMOUNT}`, 'cyan');

    if (!RECIPIENT_TAG) {
      log(`\n⚠️  No RECIPIENT_TAG provided.`, 'yellow');
      log(`   For P2P transfer test, set RECIPIENT_TAG environment variable.`, 'yellow');
      log(`   Example: RECIPIENT_TAG=recipient_tag node scripts/test-race-condition.js`, 'yellow');
      log(`\n   Testing will simulate concurrent balance checks instead.`, 'yellow');
      process.exit(1);
    }

    if (!PIN) {
      log(`\n⚠️  No PIN provided.`, 'yellow');
      log(`   P2P transfers require a 4-digit PIN.`, 'yellow');
      log(
        `   Set PIN environment variable: PIN=1234 node scripts/test-race-condition.js`,
        'yellow',
      );
      log(`   ⚠️  WARNING: PIN will be visible in process list!`, 'red');
      process.exit(1);
    }

    log(`  Recipient Tag: ${RECIPIENT_TAG}`, 'cyan');
    log(`  PIN: ${PIN.replace(/\d/g, '*')}`, 'cyan'); // Mask PIN in output

    // Step 1: Login
    const token = await login(EMAIL, PASSWORD);

    // Step 2: Get initial balance
    log('\n💰 Getting initial wallet balance...', 'cyan');
    const initialBalance = await getWalletBalance(token);
    log(`   Initial Balance: ₦${initialBalance.toLocaleString()}`, 'green');

    // Check if balance is sufficient
    const totalDebit = CONCURRENT_REQUESTS * AMOUNT;
    if (initialBalance < totalDebit) {
      log(`\n❌ Insufficient balance!`, 'red');
      log(
        `   You have ₦${initialBalance.toLocaleString()} but need ₦${totalDebit.toLocaleString()}`,
        'red',
      );
      log(`   Please fund your wallet or reduce CONCURRENT_REQUESTS/AMOUNT`, 'red');
      process.exit(1);
    }

    // Step 3: Make concurrent requests
    log(`\n🚀 Sending ${CONCURRENT_REQUESTS} concurrent transfer requests...`, 'cyan');
    log(`   Each request: ₦${AMOUNT}`, 'cyan');

    const startTime = Date.now();
    const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
      sendTransfer(token, RECIPIENT_TAG, AMOUNT, PIN)
        .then((result) => ({
          index: i + 1,
          ...result,
          timestamp: Date.now(),
        }))
        .catch((error) => ({
          index: i + 1,
          success: false,
          error: error.message,
          timestamp: Date.now(),
        })),
    );

    const results = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Step 4: Analyze results
    log(`\n⏱️  Test completed in ${duration}ms`, 'cyan');

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    const insufficientBalance = results.filter(
      (r) =>
        r.error &&
        (r.error.message?.includes('Insufficient') || r.error.message?.includes('balance')),
    );

    log(`\n📊 Results:`, 'cyan');
    log(
      `   ✅ Successful: ${successful.length}/${CONCURRENT_REQUESTS}`,
      successful.length === CONCURRENT_REQUESTS ? 'green' : 'yellow',
    );
    log(
      `   ❌ Failed: ${failed.length}/${CONCURRENT_REQUESTS}`,
      failed.length === 0 ? 'green' : 'red',
    );

    if (insufficientBalance.length > 0) {
      log(`   ⚠️  Insufficient Balance Errors: ${insufficientBalance.length}`, 'yellow');
    }

    // Step 5: Get final balance
    log('\n💰 Getting final wallet balance...', 'cyan');
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds for DB to sync and cache to clear
    const finalBalance = await getWalletBalance(token);
    log(`   Final Balance: ₦${finalBalance.toLocaleString()}`, 'green');

    // Step 6: Calculate expected vs actual
    const expectedBalance = initialBalance - successful.length * AMOUNT;
    const actualDebit = initialBalance - finalBalance;
    const expectedDebit = successful.length * AMOUNT;
    const balanceDifference = Math.abs(finalBalance - expectedBalance);

    log(`\n📈 Balance Analysis:`, 'cyan');
    log(`   Initial Balance: ₦${initialBalance.toLocaleString()}`, 'cyan');
    log(
      `   Successful Transfers: ${successful.length} × ₦${AMOUNT} = ₦${expectedDebit.toLocaleString()}`,
      'cyan',
    );
    log(`   Expected Final Balance: ₦${expectedBalance.toLocaleString()}`, 'cyan');
    log(`   Actual Final Balance: ₦${finalBalance.toLocaleString()}`, 'cyan');
    log(`   Actual Debit: ₦${actualDebit.toLocaleString()}`, 'cyan');
    log(
      `   Difference: ₦${balanceDifference.toLocaleString()}`,
      balanceDifference === 0 ? 'green' : 'red',
    );

    // Step 7: Detect race conditions
    log(`\n🔍 Race Condition Detection:`, 'cyan');

    if (balanceDifference > 0.01) {
      // Allow 1 kobo tolerance for floating point
      log(`\n❌ RACE CONDITION DETECTED!`, 'red');
      log(`   Balance mismatch detected!`, 'red');
      log(`   Expected: ₦${expectedBalance.toLocaleString()}`, 'red');
      log(`   Actual: ₦${finalBalance.toLocaleString()}`, 'red');
      log(`   Difference: ₦${balanceDifference.toLocaleString()}`, 'red');
      log(`\n   This indicates:`, 'red');
      log(`   - Possible double-spending (multiple debits with same balance)`, 'red');
      log(`   - Lost updates (concurrent updates overwriting each other)`, 'red');
      log(`   - Missing pessimistic locking (SELECT FOR UPDATE)`, 'red');
      log(`   - Missing serializable isolation level`, 'red');

      if (actualDebit < expectedDebit) {
        log(`\n   ⚠️  LESS money was debited than expected!`, 'yellow');
        log(`   This suggests some transfers succeeded but didn't debit the wallet.`, 'yellow');
      } else if (actualDebit > expectedDebit) {
        log(`\n   ⚠️  MORE money was debited than expected!`, 'yellow');
        log(`   This suggests double-debiting or race conditions.`, 'yellow');
      }

      process.exit(1);
    } else {
      log(`\n✅ No race condition detected!`, 'green');
      log(`   Balance matches expected value.`, 'green');
      log(`   However, this doesn't guarantee absence of race conditions.`, 'yellow');
      log(`   Consider running multiple tests with higher concurrency.`, 'yellow');
    }

    // Step 8: Show failed requests details
    if (failed.length > 0) {
      log(`\n❌ Failed Requests Details (showing first 5):`, 'red');
      failed.slice(0, 5).forEach((req, idx) => {
        log(`   Request ${req.index}:`, 'red');
        if (req.error) {
          log(`     Error: ${JSON.stringify(req.error)}`, 'red');
        } else {
          log(`     Status: ${req.status}`, 'red');
          if (req.data && req.data.message) {
            log(`     Message: ${req.data.message}`, 'red');
          }
          if (req.data && req.data.error) {
            log(`     Error Type: ${req.data.error}`, 'red');
          }
        }
      });
      if (failed.length > 5) {
        log(`   ... and ${failed.length - 5} more failed requests`, 'red');
      }
    }

    // Step 9: Summary
    log(`\n` + '='.repeat(60), 'blue');
    log('📋 TEST SUMMARY', 'blue');
    log('='.repeat(60), 'blue');
    log(`   Total Requests: ${CONCURRENT_REQUESTS}`, 'cyan');
    log(`   Successful: ${successful.length}`, successful.length > 0 ? 'green' : 'red');
    log(`   Failed: ${failed.length}`, failed.length === 0 ? 'green' : 'red');
    log(`   Expected Debit: ₦${expectedDebit.toLocaleString()}`, 'cyan');
    log(`   Actual Debit: ₦${actualDebit.toLocaleString()}`, 'cyan');
    log(
      `   Balance Match: ${balanceDifference === 0 ? '✅ YES' : '❌ NO'}`,
      balanceDifference === 0 ? 'green' : 'red',
    );
    log('='.repeat(60), 'blue');
    log('');
  } catch (error) {
    log(`\n❌ Test failed with error:`, 'red');
    log(`   ${error.message}`, 'red');
    if (error.stack) {
      log(`\nStack trace:`, 'red');
      log(error.stack, 'red');
    }
    process.exit(1);
  }
}

// Run the test
runRaceConditionTest();

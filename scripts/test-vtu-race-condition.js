#!/usr/bin/env node

/**
 * VTU Race Condition Test Script
 *
 * Tests for race conditions in VTU airtime purchases by making concurrent requests
 *
 * Usage:
 *   node scripts/test-vtu-race-condition.js
 *
 * Environment variables:
 *   API_URL - Base API URL (default: http://localhost:3001)
 *   EMAIL - Login email
 *   PASSWORD - Login password
 *   PIN - User PIN (required)
 *   PHONE - Phone number to purchase airtime for (default: 08011111111)
 *   NETWORK - Network provider (default: MTN)
 *   CONCURRENT_REQUESTS - Number of concurrent requests (default: 10)
 *   AMOUNT - Amount per request in NGN (default: 50)
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const EMAIL = process.env.EMAIL || 'codeswithjoseph@gmail.com';
const PASSWORD = process.env.PASSWORD || '6thbornR%';
const PIN = process.env.PIN || '9406';
const PHONE = process.env.PHONE || '08011111111';
const NETWORK = process.env.NETWORK || 'MTN';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS || '10', 10);
const AMOUNT = parseFloat(process.env.AMOUNT || '50');

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
        'ngrok-skip-browser-warning': 'true',
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

  if (response.status !== 200 || !response.data.accessToken) {
    log(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`, 'red');
    throw new Error('Login failed');
  }

  log('✅ Login successful', 'green');
  return response.data.accessToken;
}

// Get wallet balance
async function getWalletBalance(token) {
  log('\n💰 Getting wallet balance...', 'cyan');
  const response = await makeRequest(`${API_URL}/api/wallet`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 200) {
    log(`Failed to get balance: ${response.status} - ${JSON.stringify(response.data)}`, 'red');
    throw new Error('Failed to get balance');
  }

  const balance = parseFloat(response.data.balance || 0);
  log(`   Balance: ₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 'green');
  return balance;
}

// Purchase airtime
async function purchaseAirtime(token, network, phone, amount, pin) {
  const response = await makeRequest(`${API_URL}/api/vtu/airtime/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      network,
      phone,
      amount,
      pin,
    },
  });

  return {
    success: response.status >= 200 && response.status < 300,
    status: response.status,
    data: response.data,
  };
}

// Main test function
async function runTest() {
  log('\n============================================================', 'blue');
  log('🧪 VTU RACE CONDITION TEST', 'blue');
  log('============================================================', 'blue');
  log(`\nConfiguration:`, 'cyan');
  log(`  API URL: ${API_URL}`, 'cyan');
  log(`  Email: ${EMAIL}`, 'cyan');
  log(`  Concurrent Requests: ${CONCURRENT_REQUESTS}`, 'cyan');
  log(`  Amount per Request: ₦${AMOUNT}`, 'cyan');
  log(`  Total Expected Debit: ₦${CONCURRENT_REQUESTS * AMOUNT}`, 'cyan');
  log(`  Phone: ${PHONE}`, 'cyan');
  log(`  Network: ${NETWORK}`, 'cyan');
  log(`  PIN: ****`, 'cyan');

  try {
    // Login
    const token = await login(EMAIL, PASSWORD);

    // Get initial balance
    const initialBalance = await getWalletBalance(token);

    // Calculate expected final balance (assuming fee is 0 for simplicity)
    // Note: Actual fee calculation happens server-side
    const expectedTotalDebit = CONCURRENT_REQUESTS * AMOUNT;
    const expectedFinalBalance = initialBalance - expectedTotalDebit;

    log(`\n🚀 Sending ${CONCURRENT_REQUESTS} concurrent airtime purchase requests...`, 'cyan');
    log(`   Each request: ₦${AMOUNT}`, 'cyan');

    const startTime = Date.now();
    // Use slightly different amounts to avoid duplicate order detection
    // This allows us to test race condition prevention
    const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => {
      // Add 0.01 to each amount to make them unique (e.g., 50.01, 50.02, etc.)
      const uniqueAmount = AMOUNT + i * 0.01;
      return purchaseAirtime(token, NETWORK, PHONE, uniqueAmount, PIN).then((result) => ({
        index: i + 1,
        amount: uniqueAmount,
        ...result,
      }));
    });

    const results = await Promise.allSettled(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    log(`\n⏱️  Test completed in ${duration}ms`, 'cyan');

    // Analyze results
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter((r) => r.status === 'rejected' || !r.value?.success);

    log(`\n📊 Results:`, 'cyan');
    log(`   ✅ Successful: ${successful.length}/${CONCURRENT_REQUESTS}`, 'yellow');
    log(`   ❌ Failed: ${failed.length}/${CONCURRENT_REQUESTS}`, 'red');

    // Show failed requests
    if (failed.length > 0) {
      log(`\n❌ Failed Requests Details (showing first 5):`, 'red');
      failed.slice(0, 5).forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          log(`   Request ${result.value.index || idx + 1}:`, 'red');
          log(`     Error: ${JSON.stringify(result.value.data)}`, 'red');
        } else {
          log(`   Request ${idx + 1}:`, 'red');
          log(`     Error: ${result.reason?.message || 'Unknown error'}`, 'red');
        }
      });
      if (failed.length > 5) {
        log(`   ... and ${failed.length - 5} more failed requests`, 'red');
      }
    }

    // Wait a bit for balance to update
    log(`\n💰 Getting final wallet balance...`, 'cyan');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const finalBalance = await getWalletBalance(token);

    // Calculate actual debit
    const actualDebit = initialBalance - finalBalance;
    // Sum up the amounts from successful requests
    const expectedDebit = successful.reduce((sum, r) => {
      const amount = r.value?.amount || AMOUNT;
      return sum + amount;
    }, 0);

    log(`\n📈 Balance Analysis:`, 'cyan');
    log(
      `   Initial Balance: ₦${initialBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      'cyan',
    );
    log(
      `   Successful Purchases: ${successful.length} × ₦${AMOUNT} = ₦${expectedDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      'cyan',
    );
    log(
      `   Expected Final Balance: ₦${expectedFinalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      'cyan',
    );
    log(
      `   Actual Final Balance: ₦${finalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      'cyan',
    );
    log(
      `   Actual Debit: ₦${actualDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      'cyan',
    );

    const difference = Math.abs(finalBalance - expectedFinalBalance);
    const debitDifference = Math.abs(actualDebit - expectedDebit);

    if (difference < 0.01 && debitDifference < 0.01) {
      log(`   Difference: ₦${difference.toFixed(2)}`, 'green');
      log(`\n🔍 Race Condition Detection:`, 'cyan');
      log(`\n✅ No race condition detected!`, 'green');
      log(`   Balance matches expected value.`, 'green');
    } else {
      log(`   Difference: ₦${difference.toFixed(2)}`, 'red');
      log(`\n🔍 Race Condition Detection:`, 'cyan');
      log(`\n❌ RACE CONDITION DETECTED!`, 'red');
      log(`   Balance mismatch detected!`, 'red');
      log(`   Expected debit: ₦${expectedDebit.toFixed(2)}`, 'red');
      log(`   Actual debit: ₦${actualDebit.toFixed(2)}`, 'red');
      log(`   Difference: ₦${debitDifference.toFixed(2)}`, 'red');
      log(`   This indicates:`, 'red');
      log(`   - Possible double-spending`, 'red');
      log(`   - Lost updates`, 'red');
      log(`   - Missing pessimistic locking`, 'red');
    }

    log(`\n============================================================`, 'blue');
    log(`📋 TEST SUMMARY`, 'blue');
    log(`============================================================`, 'blue');
    log(`   Total Requests: ${CONCURRENT_REQUESTS}`, 'cyan');
    log(`   Successful: ${successful.length}`, 'green');
    log(`   Failed: ${failed.length}`, 'red');
    log(`   Expected Debit: ₦${expectedDebit.toFixed(2)}`, 'cyan');
    log(`   Actual Debit: ₦${actualDebit.toFixed(2)}`, 'cyan');
    log(
      `   Balance Match: ${difference < 0.01 ? '✅ YES' : '❌ NO'}`,
      difference < 0.01 ? 'green' : 'red',
    );
    log(`============================================================`, 'blue');
  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();

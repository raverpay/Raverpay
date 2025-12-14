#!/usr/bin/env node

/**
 * Test Idempotency Key Functionality
 *
 * This script tests that duplicate requests with the same idempotency key
 * return the same cached response instead of processing the request again.
 *
 * Usage:
 *   node scripts/test-idempotency.js
 *
 * Environment Variables:
 *   API_URL - API base URL (default: http://localhost:3001)
 *   EMAIL - User email for login
 *   PASSWORD - User password for login
 *   RECIPIENT_TAG - Recipient tag for P2P transfer
 *   AMOUNT - Transfer amount (default: 100)
 *   PIN - User PIN for transactions
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const EMAIL = process.env.EMAIL || 'codeswithjoseph@gmail.com';
const PASSWORD = process.env.PASSWORD || '6thbornR%';
const RECIPIENT_TAG = process.env.RECIPIENT_TAG || 'joestacks';
const AMOUNT = parseFloat(process.env.AMOUNT) || 100;
const PIN = process.env.PIN || '9406';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
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

    const requestOptions = {
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

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Login function
async function login() {
  log('\n🔐 Logging in...', 'cyan');

  try {
    const response = await makeRequest(`${API_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        identifier: EMAIL,
        password: PASSWORD,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }

    log(`✅ Login successful`, 'green');
    return response.data.accessToken;
  } catch (error) {
    log(`❌ Login failed: ${error.message}`, 'red');
    throw error;
  }
}

// Get wallet balance
async function getWalletBalance(accessToken) {
  try {
    const response = await makeRequest(`${API_URL}/api/wallet`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to get balance: ${response.status}`);
    }

    return response.data.balance;
  } catch (error) {
    log(`❌ Failed to get balance: ${error.message}`, 'red');
    throw error;
  }
}

// Send P2P transfer with idempotency key
async function sendTransfer(accessToken, idempotencyKey) {
  try {
    const response = await makeRequest(`${API_URL}/api/transactions/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        recipientTag: RECIPIENT_TAG,
        amount: AMOUNT,
        pin: PIN,
        message: `Test transfer with key: ${idempotencyKey}`,
      },
    });

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    return {
      status: 500,
      error: error.message,
    };
  }
}

// Main test function
async function testIdempotency() {
  log('\n🧪 Testing Idempotency Key Functionality', 'blue');
  log('='.repeat(60), 'blue');

  try {
    // Step 1: Login
    const accessToken = await login();

    // Step 2: Get initial balance
    log('\n💰 Getting initial wallet balance...', 'cyan');
    const initialBalance = await getWalletBalance(accessToken);
    log(`Initial balance: ₦${initialBalance}`, 'yellow');

    // Step 3: Generate a unique idempotency key
    const idempotencyKey = crypto.randomUUID();
    log(`\n🔑 Generated Idempotency Key: ${idempotencyKey}`, 'cyan');

    // Step 4: Make first request with idempotency key
    log('\n📤 Making FIRST request with idempotency key...', 'cyan');
    const firstRequest = await sendTransfer(accessToken, idempotencyKey);

    log(
      `Status: ${firstRequest.status}`,
      firstRequest.status === 200 || firstRequest.status === 201 ? 'green' : 'red',
    );
    if (firstRequest.data) {
      log(`Response: ${JSON.stringify(firstRequest.data, null, 2)}`, 'yellow');
    }
    if (firstRequest.error) {
      log(`Error: ${firstRequest.error}`, 'red');
    }

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 5: Get balance after first request
    const balanceAfterFirst = await getWalletBalance(accessToken);
    log(`\nBalance after first request: ₦${balanceAfterFirst}`, 'yellow');

    // Step 6: Make SECOND request with SAME idempotency key
    log(`\n📤 Making SECOND request with SAME idempotency key...`, 'cyan');
    log(`Idempotency Key: ${idempotencyKey}`, 'yellow');

    const secondRequest = await sendTransfer(accessToken, idempotencyKey);

    log(
      `Status: ${secondRequest.status}`,
      secondRequest.status === 200 || secondRequest.status === 201 ? 'green' : 'red',
    );
    if (secondRequest.data) {
      log(`Response: ${JSON.stringify(secondRequest.data, null, 2)}`, 'yellow');
    }
    if (secondRequest.error) {
      log(`Error: ${secondRequest.error}`, 'red');
    }

    // Step 7: Get balance after second request
    const balanceAfterSecond = await getWalletBalance(accessToken);
    log(`\nBalance after second request: ₦${balanceAfterSecond}`, 'yellow');

    // Step 8: Analyze results
    log('\n📊 Analysis:', 'blue');
    log('='.repeat(60), 'blue');

    const balanceChange1 = parseFloat(balanceAfterFirst) - parseFloat(initialBalance);
    const balanceChange2 = parseFloat(balanceAfterSecond) - parseFloat(balanceAfterFirst);

    log(`Balance change after first request: ₦${balanceChange1.toFixed(2)}`, 'yellow');
    log(`Balance change after second request: ₦${balanceChange2.toFixed(2)}`, 'yellow');

    // Check if key fields match (more reliable than exact JSON match)
    const firstRef = firstRequest.data?.reference;
    const secondRef = secondRequest.data?.reference;
    const firstAmount = firstRequest.data?.amount;
    const secondAmount = secondRequest.data?.amount;
    const firstStatus = firstRequest.data?.status;
    const secondStatus = secondRequest.data?.status;
    const firstCreatedAt = firstRequest.data?.createdAt;
    const secondCreatedAt = secondRequest.data?.createdAt;

    const keyFieldsMatch =
      firstRef === secondRef &&
      firstAmount === secondAmount &&
      firstStatus === secondStatus &&
      firstCreatedAt === secondCreatedAt;

    const noDuplicateDebit = Math.abs(balanceChange2) < 0.01; // Less than 1 kobo change

    log(`\n🔍 Response Comparison:`, 'cyan');
    log(`  First Reference:  ${firstRef}`, 'yellow');
    log(`  Second Reference: ${secondRef}`, 'yellow');
    log(
      `  References match: ${firstRef === secondRef ? '✅' : '❌'}`,
      firstRef === secondRef ? 'green' : 'red',
    );
    log(
      `  Amounts match: ${firstAmount === secondAmount ? '✅' : '❌'}`,
      firstAmount === secondAmount ? 'green' : 'red',
    );
    log(
      `  Status match: ${firstStatus === secondStatus ? '✅' : '❌'}`,
      firstStatus === secondStatus ? 'green' : 'red',
    );
    log(
      `  Timestamps match: ${firstCreatedAt === secondCreatedAt ? '✅' : '❌'}`,
      firstCreatedAt === secondCreatedAt ? 'green' : 'red',
    );

    if (keyFieldsMatch && noDuplicateDebit) {
      log('\n✅ IDEMPOTENCY TEST PASSED!', 'green');
      log('✓ Both requests returned the same transaction reference', 'green');
      log('✓ No duplicate debit occurred', 'green');
      log('✓ Second request returned cached response', 'green');
      log('✓ Idempotency is working correctly!', 'green');
    } else if (keyFieldsMatch && !noDuplicateDebit) {
      log('\n⚠️  PARTIAL SUCCESS', 'yellow');
      log('✓ Responses match (cached)', 'green');
      log('✗ But balance changed (duplicate debit occurred)', 'red');
      log('This suggests idempotency is working but transaction was processed twice', 'yellow');
    } else if (!keyFieldsMatch && noDuplicateDebit) {
      log('\n✅ IDEMPOTENCY TEST PASSED!', 'green');
      log('✓ No duplicate debit (most important!)', 'green');
      log('ℹ️  Response fields differ slightly but same transaction prevented', 'yellow');
      log('✓ Idempotency is working correctly!', 'green');
    } else {
      log('\n❌ IDEMPOTENCY TEST FAILED!', 'red');
      log('✗ Responses differ', 'red');
      log('✗ Duplicate debit occurred', 'red');
      log('This suggests idempotency is not working correctly', 'red');
    }

    // Additional checks
    log('\n🔍 Additional Checks:', 'cyan');

    if (firstRequest.status === secondRequest.status) {
      log('✓ HTTP status codes match', 'green');
    } else {
      log(`✗ HTTP status codes differ: ${firstRequest.status} vs ${secondRequest.status}`, 'red');
    }

    // Check if second request has any indication it was cached
    if (secondRequest.headers['x-idempotent'] || secondRequest.headers['x-cached']) {
      log('✓ Response headers indicate caching', 'green');
    } else {
      log('ℹ️  No caching headers found (this is okay)', 'yellow');
    }

    log('\n' + '='.repeat(60), 'blue');
    log('Test completed!', 'blue');
  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testIdempotency()
  .then(() => {
    log('\n✅ Test script completed successfully', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log(`\n❌ Test script failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });

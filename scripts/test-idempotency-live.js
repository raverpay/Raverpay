#!/usr/bin/env node

/**
 * Test Idempotency Key Functionality - Live Test
 *
 * Tests idempotency with actual API endpoint
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

// Configuration
const API_URL = process.env.API_URL || 'https://f1fe04b25cdc.ngrok-free.app';
const EMAIL = process.env.EMAIL || 'archjo6@gmail.com';
const PASSWORD = process.env.PASSWORD || '6thbornR%';
const RECIPIENT_TAG = process.env.RECIPIENT_TAG || 'designbyola';
const AMOUNT = parseFloat(process.env.AMOUNT) || 50;
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

// Send P2P transfer with idempotency key
async function sendTransfer(accessToken, idempotencyKey) {
  try {
    log(`\n📤 Sending transfer with Idempotency-Key: ${idempotencyKey}`, 'cyan');

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

    log(
      `Status: ${response.status}`,
      response.status === 200 || response.status === 201 ? 'green' : 'red',
    );
    log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'yellow');

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    return {
      status: 500,
      error: error.message,
    };
  }
}

// Main test function
async function testIdempotency() {
  log('\n🧪 Testing Idempotency Key Functionality (Live)', 'blue');
  log('='.repeat(60), 'blue');
  log(`API URL: ${API_URL}`, 'cyan');

  try {
    // Step 1: Login
    const accessToken = await login();

    // Step 2: Generate a unique idempotency key
    const idempotencyKey = crypto.randomUUID();
    log(`\n🔑 Generated Idempotency Key: ${idempotencyKey}`, 'cyan');

    // Step 3: Make first request with idempotency key
    log('\n📤 Making FIRST request with idempotency key...', 'cyan');
    const firstRequest = await sendTransfer(accessToken, idempotencyKey);

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Make SECOND request with SAME idempotency key
    log(`\n📤 Making SECOND request with SAME idempotency key...`, 'cyan');
    log(`Idempotency Key: ${idempotencyKey}`, 'yellow');

    const secondRequest = await sendTransfer(accessToken, idempotencyKey);

    // Step 5: Analyze results
    log('\n📊 Analysis:', 'blue');
    log('='.repeat(60), 'blue');

    const firstRef = firstRequest.data?.reference;
    const secondRef = secondRequest.data?.reference;

    log(`First Reference:  ${firstRef}`, 'yellow');
    log(`Second Reference: ${secondRef}`, 'yellow');
    log(
      `References match: ${firstRef === secondRef ? '✅' : '❌'}`,
      firstRef === secondRef ? 'green' : 'red',
    );

    if (firstRef === secondRef) {
      log('\n✅ IDEMPOTENCY WORKING!', 'green');
      log('✓ Both requests returned the same transaction reference', 'green');
      log('✓ Second request returned cached response', 'green');
    } else {
      log('\n❌ IDEMPOTENCY NOT WORKING', 'red');
      log('✗ Different transaction references', 'red');
      log('✗ Second request created a new transaction', 'red');
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
    log('\n✅ Test script completed', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log(`\n❌ Test script failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });

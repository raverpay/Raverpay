import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';

// CONFIGURATION
const API_URL = 'http://localhost:3001/api';
const EMAIL = 'codeswithjoseph@gmail.com';
const PASSWORD = '6thbornR%';

// ENDPOINTS TO TEST
const WITHDRAW_ENDPOINT = '/transactions/withdraw';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('       SECURITY LAYER VERIFICATION TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. LOGIN
    console.log('🔐 Step 1: Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      identifier: EMAIL,
      password: PASSWORD,
    });
    
    const token = loginRes.data.accessToken;
    console.log('   ✅ Logged in successfully\n');
    
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 2. TEST MANDATORY IDEMPOTENCY
    console.log('🚫 Step 2: Testing Mandatory Idempotency...');
    console.log('   Sending withdrawal request WITHOUT Idempotency-Key header...');
    
    try {
      await axios.post(
        `${API_URL}${WITHDRAW_ENDPOINT}`,
        {
            amount: 100,
            accountNumber: '5123946180',
            accountName: 'JOSEPH OLAMIDE POPOOLA',
            bankCode: '50515', // Moniepoint
            pin: '9406',
            narration: 'Idempotency Test'
        },
        { headers: authHeaders } // No Idempotency-Key
      );
      console.log('   ❌ FAILED: Request succeeded but should have been blocked!');
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        console.log('   ✅ SUCCESS: Request blocked with 400 Bad Request');
        console.log(`   Response: ${error.response.data.message}`);
      } else {
        console.log(`   ❌ FAILED: Unexpected error: ${error.message}`);
        if(error.response) console.log(`   Status: ${error.response.status}`);
      }
    }
    console.log('');

    // 3. TEST BURST RATE LIMITING
    console.log('🚀 Step 3: Testing Burst Rate Limiting...');
    console.log('   Sending 3 rapid withdrawal preview requests (Limit: 1 per 5s)...');
    
    // Using withdrawal-preview as it's safer/cheaper but still protected if we added it? 
    // Wait, checked controller, only withdraw is protected. Let's use withdraw but rely on 429
    // Actually, let's use a VTU endpoint for safety if possible, but withdraw is fine as it will fail 429 before processing
    
    const requests: Promise<string>[] = [];
    const iterations = 3;
    
    for (let i = 0; i < iterations; i++) {
        const idempotencyKey = crypto.randomUUID();
        requests.push(
            axios.post(
                `${API_URL}${WITHDRAW_ENDPOINT}`,
                {
                    amount: 100,
                    accountNumber: '5123946180',
                    accountName: 'JOSEPH OLAMIDE POPOOLA',
                    bankCode: '50515', 
                    pin: '9406',
                    narration: `Burst Test ${i}`
                },
                { 
                    headers: { 
                        ...authHeaders, 
                        'Idempotency-Key': idempotencyKey 
                    } 
                }
            ).then(() => 'Success').catch((e: AxiosError) => {
                if (e.response?.status === 429) return 'RateLimited';
                // Log detailed error for debugging
                const msg = (e.response?.data as any)?.message || e.message;
                return `Error: ${e.response?.status} - ${msg}`;
            })
        );
    }
    
    const results = await Promise.all(requests);
    
    console.log('   Results:', results);
    
    const rateLimitedCount = results.filter(r => r === 'RateLimited').length;
    const successCount = results.filter(r => r === 'Success' || r.startsWith('Error: 400')).length; // 400 might happen if validation fails
    
    if (rateLimitedCount > 0) {
        console.log(`   ✅ SUCCESS: ${rateLimitedCount} requests were rate limited!`);
    } else {
        console.log('   ❌ FAILED: No requests were rate limited.');
    }

  } catch (error: any) {
    console.error('❌ Test failed unexpectedly:', error.message);
    if (error.response) {
        console.error('Response data:', error.response.data);
    }
  }
}

main();

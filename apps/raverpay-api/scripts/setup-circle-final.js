/**
 * Circle Entity Secret Setup - Using Circle's Official Method
 * Based on: https://github.com/circlefin/w3s-entity-secret-sample-code
 */

const crypto = require('crypto');
const forge = require('node-forge');

const API_KEY =
  process.env.CIRCLE_API_KEY ||
  'TEST_API_KEY:68af3d57d809fa2ae81ba046a4d82ec3:278a0f49247c66e233298e05946ae43d';
const API_BASE_URL = 'https://api.circle.com/v1/w3s';

async function fetchPublicKey() {
  console.log('📡 Fetching Circle public key...');

  const response = await fetch(`${API_BASE_URL}/config/entity/publicKey`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to fetch public key: ${response.status} - ${error}`,
    );
  }

  const data = await response.json();
  console.log('✅ Public key fetched successfully');
  return data.data.publicKey;
}

function generateEntitySecret() {
  console.log('🔐 Generating 32-byte entity secret...');
  const randomBytes = crypto.randomBytes(32);
  const hexSecret = randomBytes.toString('hex');
  console.log('✅ Entity secret generated');
  return hexSecret;
}

function encryptEntitySecret(hexEncodedEntitySecret, publicKeyPem) {
  console.log('🔒 Encrypting entity secret (Circle method)...');

  // Convert hex to bytes
  const entitySecret = forge.util.hexToBytes(hexEncodedEntitySecret);

  if (entitySecret.length !== 32) {
    throw new Error('Invalid entity secret length');
  }

  // Encrypt using RSA-OAEP with SHA-256 (Circle's method)
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const encryptedData = publicKey.encrypt(entitySecret, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create(),
    },
  });

  // Encode to base64
  const ciphertext = forge.util.encode64(encryptedData);
  console.log('✅ Entity secret encrypted');
  return ciphertext;
}

async function registerEntitySecret(ciphertext) {
  console.log('📝 Registering entity secret with Circle...');

  const idempotencyKey = crypto.randomUUID();

  const response = await fetch(`${API_BASE_URL}/config/entity/entitySecret`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotencyKey,
      entitySecretCiphertext: ciphertext,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('✅ Entity secret registered successfully!');
  return data.data?.recoveryFile;
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       Circle Entity Secret Setup                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Using API Key: ${API_KEY.substring(0, 30)}...`);
  console.log('');

  try {
    // Step 1: Generate entity secret
    const entitySecret = generateEntitySecret();

    // Step 2: Fetch Circle's public key
    const publicKey = await fetchPublicKey();

    // Step 3: Encrypt entity secret (Circle's method - no padding)
    const ciphertext = encryptEntitySecret(entitySecret, publicKey);

    // Step 4: Register with Circle
    const recoveryFile = await registerEntitySecret(ciphertext);

    // Step 5: Save recovery file if provided
    if (recoveryFile) {
      const fs = require('fs');
      fs.writeFileSync('./circle-recovery.dat', recoveryFile);
      console.log('💾 Recovery file saved to: ./circle-recovery.dat');
    }

    // Output results
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║       ✅ SETUP COMPLETE!                                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Add this to your .env file:');
    console.log('');
    console.log(
      '─────────────────────────────────────────────────────────────',
    );
    console.log(`CIRCLE_API_KEY=${API_KEY}`);
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
    console.log('CIRCLE_ENVIRONMENT=testnet');
    console.log('CIRCLE_API_BASE_URL=https://api.circle.com/v1/w3s');
    console.log(
      '─────────────────────────────────────────────────────────────',
    );
    console.log('');
    console.log('⚠️  IMPORTANT: Save the entity secret securely!');
    console.log('⚠️  Circle does NOT store it and cannot recover it for you.');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

main();

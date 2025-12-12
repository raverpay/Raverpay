// Quick Redis connection test
const Redis = require('ioredis');

// Your current REDIS_URL from .env
const REDIS_URL =
  process.env.REDIS_URL ||
  'rediss://default:AXHIAAIncDIxYjkzYTY3Mzg5OGU0MDBlYWE1YzBiYWZjNmI5NzAzMnAyMjkxMjg@select-malamute-29128.upstash.io:6379';

console.log('Testing Redis connection...');
console.log('URL:', REDIS_URL.replace(/:[^:@]*@/, ':****@'));

// Parse URL manually
const url = new URL(REDIS_URL);
console.log('\nParsed connection details:');
console.log('- Host:', url.hostname);
console.log('- Port:', url.port);
console.log('- Username:', url.username);
console.log(
  '- Password:',
  url.password ? url.password.substring(0, 10) + '...' : 'none',
);
console.log('- Protocol:', url.protocol);

// Try connecting
const redis = new Redis({
  host: url.hostname,
  port: parseInt(url.port),
  password: url.password,
  tls: url.protocol === 'rediss:' ? {} : undefined,
  retryStrategy: () => null, // Don't retry
  connectTimeout: 5000,
});

redis.on('connect', () => {
  console.log('\n✅ Successfully connected to Redis!');
  redis
    .set('test', 'hello')
    .then(() => {
      console.log('✅ SET test=hello');
      return redis.get('test');
    })
    .then((value) => {
      console.log('✅ GET test =', value);
      redis.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error during test:', err.message);
      redis.disconnect();
      process.exit(1);
    });
});

redis.on('error', (err) => {
  console.error('\n❌ Redis connection error:', err.message);
  console.error('\nPossible issues:');
  console.error('1. Wrong password/token in REDIS_URL');
  console.error('2. Check Upstash dashboard for correct TCP credentials');
  console.error('3. Database might be paused (free tier)');
  console.error('\nTo fix:');
  console.error('- Go to https://console.upstash.com');
  console.error('- Select your database: select-malamute-29128');
  console.error('- Look for "Connect" section');
  console.error('- Copy the "Node.js (ioredis)" connection string');
  redis.disconnect();
  process.exit(1);
});

setTimeout(() => {
  console.error('\n❌ Connection timeout (5 seconds)');
  redis.disconnect();
  process.exit(1);
}, 5000);

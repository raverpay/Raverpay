/**
 * Shared Redis client reference
 * This is set during cache module initialization and used by RedisService
 * Separated into its own file to avoid circular dependencies
 */

export let redisClient: any = null;

export function setRedisClient(client: any) {
  redisClient = client;
  console.log('✅ Redis client stored for pattern operations');
}

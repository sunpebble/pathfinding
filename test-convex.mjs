// Test Convex SDK client directly
import { ConvexHttpClient } from 'convex/browser';

// Import the API and make a query
import { api } from './packages/convex/_generated/api.js';

const url = 'https://convex.kunish.org';
console.log('Testing ConvexHttpClient to:', url);
console.log('Creating client...');

const client = new ConvexHttpClient(url);
console.log('Client created successfully');

console.log('Making query...');
const startTime = Date.now();

try {
  const result = await client.query(api.crawlJobs.list, { limit: 1 });
  const elapsed = Date.now() - startTime;
  console.log(`Query completed in ${elapsed}ms`);
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Query failed:', err);
}

console.log('Test complete');
process.exit(0);

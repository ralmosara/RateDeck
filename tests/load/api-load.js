import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users over 30 seconds
    { duration: '1m', target: 50 },  // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down to 0 users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'], // 95% of requests must complete below 250ms (NFR target)
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

// Assuming we have an API token configured in the environment
const API_TOKEN = __ENV.RATEDECK_API_TOKEN || 'test-token-123';
const BASE_URL = __ENV.RATEDECK_BASE_URL || 'http://localhost:3000/v1';

export default function () {
  const headers = {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Scenario 1: Get Rate Quote (High frequency read)
  // Generating a random E.164 number format
  const prefixes = ['1212', '447', '63917', '4930', '6581'];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNumber = `${randomPrefix}${Math.floor(100000 + Math.random() * 900000)}`;

  const quoteRes = http.get(`${BASE_URL}/rates/quote?number=${randomNumber}`, { headers });
  
  check(quoteRes, {
    'quote status is 200': (r) => r.status === 200,
    'quote returns valid cost': (r) => {
      try {
        const body = r.json();
        return body && body.cost !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  // Short pause to simulate user think time or staggered API requests
  sleep(Math.random() * 0.5 + 0.1); // Sleep between 0.1s and 0.6s
}

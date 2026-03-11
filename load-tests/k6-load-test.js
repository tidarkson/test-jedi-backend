/**
 * k6 Load Test – Test-Jedi Backend
 * =================================
 * Target NFRs:
 *   • 1000-case repository loads in <2s
 *   • 2000-case run loads in <3s
 *   • Full-text search responds in <1s (100k cases)
 *   • Redis cache hit rate >80% for suite tree
 *   • Passes with 500 VUs, error rate <1%
 *
 * Usage (requires k6: https://k6.io/docs/getting-started/installation/):
 *   k6 run load-tests/k6-load-test.js \
 *       --env BASE_URL=http://localhost:3000 \
 *       --env AUTH_TOKEN=<bearer_token> \
 *       --env PROJECT_ID=<uuid> \
 *       --env RUN_ID=<uuid>
 *
 * Baseline run (single VU):
 *   k6 run load-tests/k6-load-test.js -u 1 -d 30s \
 *       --env BASE_URL=http://localhost:3000 ...
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
const suiteTreeDuration   = new Trend('suite_tree_duration_ms',   true);
const runLoadDuration     = new Trend('run_load_duration_ms',     true);
const searchDuration      = new Trend('search_duration_ms',       true);
const caseListDuration    = new Trend('case_list_duration_ms',    true);
const errorCount          = new Counter('error_count');
const cacheHitRate        = new Rate('cache_hit_rate');

// ─── Test Configuration ───────────────────────────────────────────────────────
export const options = {
  stages: [
    // Ramp up to 500 VUs over 2 minutes
    { duration: '2m',  target: 100  },
    { duration: '1m',  target: 250  },
    { duration: '2m',  target: 500  },
    // Sustain at 500 VUs for 5 minutes
    { duration: '5m',  target: 500  },
    // Ramp down
    { duration: '1m',  target: 250  },
    { duration: '1m',  target: 0    },
  ],

  thresholds: {
    // Acceptance criteria from NFRs
    'suite_tree_duration_ms': ['p(95)<2000'],          // AC1: 1000-case repo < 2s
    'run_load_duration_ms':   ['p(95)<3000'],          // AC2: 2000-case run < 3s
    'search_duration_ms':     ['p(95)<1000'],          // AC2 FTS: < 1s
    'cache_hit_rate':         ['rate>0.80'],           // AC3: >80% cache hit
    'http_req_failed':        ['rate<0.01'],           // AC4: <1% error rate
    'http_req_duration':      ['p(95)<3000'],
  },

  // Simulate realistic browser-like connection behaviour
  noConnectionReuse: false,
  discardResponseBodies: false,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:3000';
const API_PREFIX = `${BASE_URL}/api/v1`;
const TOKEN      = __ENV.AUTH_TOKEN || '';
const PROJECT_ID = __ENV.PROJECT_ID || '';
const RUN_ID     = __ENV.RUN_ID     || '';

const API_VERSION = 'v1';

function authHeaders() {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'Accept':        'application/json',
  };
}

function ok(res, label) {
  const success = check(res, {
    [`${label}: status 200`]: (r) => r.status === 200 || r.status === 201,
    [`${label}: body not empty`]: (r) => r.body && r.body.length > 0,
  });

  if (!success) {
    errorCount.add(1);
    console.error(`[FAIL] ${label} – Status: ${res.status} Body: ${res.body?.slice(0, 200)}`);
  }

  return success;
}

function detectCacheHit(res) {
  // Server sets X-Cache-Hit: 'true' when returning from Redis
  const hitHeader = res.headers['X-Cache-Hit'] || res.headers['x-cache-hit'] || '';
  cacheHitRate.add(hitHeader === 'true' ? 1 : 0);
}

// ─── Scenario: Read-heavy (70% of traffic) ───────────────────────────────────
export function readHeavy() {
  const headers = authHeaders();

  group('Suite Tree (should be cached after first hit)', () => {
    const res = http.get(`${API_PREFIX}/projects/${PROJECT_ID}/suites`, { headers });
    suiteTreeDuration.add(res.timings.duration);
    detectCacheHit(res);
    ok(res, 'suite-tree');
  });

  sleep(0.1 + Math.random() * 0.4);

  group('Test Case List – first page', () => {
    const res = http.get(
      `${API_PREFIX}/projects/${PROJECT_ID}/cases?limit=50`,
      { headers },
    );
    caseListDuration.add(res.timings.duration);
    ok(res, 'case-list-page1');
  });

  sleep(0.1 + Math.random() * 0.4);

  group('Test Case List – cursor page', () => {
    // Get first page, then follow cursor
    const first = http.get(
      `${API_PREFIX}/projects/${PROJECT_ID}/cases?limit=50`,
      { headers },
    );

    if (first.status === 200) {
      let body;
      try {
        body = JSON.parse(first.body);
      } catch (_) {}

      const cursor = body?.pagination?.nextCursor;
      if (cursor) {
        const second = http.get(
          `${API_PREFIX}/projects/${PROJECT_ID}/cases?limit=50&cursor=${cursor}`,
          { headers },
        );
        caseListDuration.add(second.timings.duration);
        ok(second, 'case-list-cursor');
      }
    }
  });

  sleep(0.2);
}

// ─── Scenario: Full-text search (15% of traffic) ─────────────────────────────
const searchTerms = [
  'login', 'authentication', 'payment', 'checkout', 'password',
  'timeout', 'error', 'validation', 'upload', 'dashboard',
];

export function searchScenario() {
  const headers = authHeaders();
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  group('Full-text search', () => {
    const res = http.get(
      `${API_PREFIX}/projects/${PROJECT_ID}/cases?search=${encodeURIComponent(term)}&limit=20`,
      { headers },
    );
    searchDuration.add(res.timings.duration);
    ok(res, `search:${term}`);
  });

  sleep(0.5 + Math.random() * 1);
}

// ─── Scenario: Run detail load (10% of traffic) ──────────────────────────────
export function runDetailScenario() {
  const headers = authHeaders();

  group('Run detail (2000-case run)', () => {
    const res = http.get(
      `${API_PREFIX}/projects/${PROJECT_ID}/runs/${RUN_ID}`,
      { headers },
    );
    runLoadDuration.add(res.timings.duration);
    ok(res, 'run-detail');
  });

  sleep(0.5);

  group('Run metrics', () => {
    const res = http.get(
      `${API_PREFIX}/runs/${RUN_ID}/metrics`,
      { headers },
    );
    detectCacheHit(res);
    ok(res, 'run-metrics');
  });

  sleep(0.5);

  group('Run cases list', () => {
    const res = http.get(
      `${API_PREFIX}/runs/${RUN_ID}/cases`,
      { headers },
    );
    ok(res, 'run-cases');
  });

  sleep(0.5);
}

// ─── Scenario: Write operations (5% of traffic) ──────────────────────────────
export function writeScenario() {
  const headers = authHeaders();

  group('Analytics trends (write-like read)', () => {
    const res = http.get(
      `${API_PREFIX}/projects/${PROJECT_ID}/analytics/trends`,
      { headers },
    );
    ok(res, 'analytics-trends');
  });

  sleep(1 + Math.random() * 2);
}

// ─── Default function (weighted scenario orchestrator) ───────────────────────
export default function () {
  const roll = Math.random();

  if (roll < 0.70) {
    readHeavy();
  } else if (roll < 0.85) {
    searchScenario();
  } else if (roll < 0.95) {
    runDetailScenario();
  } else {
    writeScenario();
  }
}

// ─── Lifecycle hooks ─────────────────────────────────────────────────────────
export function setup() {
  console.log('=== Test-Jedi k6 Load Test ===');
  console.log(`BASE_URL:   ${BASE_URL}`);
  console.log(`PROJECT_ID: ${PROJECT_ID}`);
  console.log(`RUN_ID:     ${RUN_ID}`);

  // Verify target server is alive
  const health = http.get(`${BASE_URL}/health`, { timeout: '5s' });
  if (health.status !== 200) {
    throw new Error(`Server health check failed: ${health.status}`);
  }
  console.log('Server is healthy, starting load test...');
}

export function teardown(data) {
  console.log('=== Load Test Complete ===');
}

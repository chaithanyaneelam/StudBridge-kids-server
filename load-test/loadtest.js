/**
 * Flexible load-test runner built on autocannon.
 *
 * Usage examples (run from project root):
 *   node load-test/loadtest.js --url http://localhost:5000/health -c 50 -d 20
 *   node load-test/loadtest.js --url http://localhost:5000/api/auth/login \
 *        --method POST --body '{"identifier":"test","password":"x"}' -c 20 -d 15
 *
 * Flags:
 *   --url       Target URL (required)
 *   --method    HTTP method (default GET)
 *   --body      JSON string body (for POST/PUT)
 *   --headers   JSON string of extra headers, e.g. '{"Authorization":"Bearer ..."}'
 *   -c          Concurrent connections (simulated simultaneous users) (default 50)
 *   -d          Duration in seconds (default 20)
 *   -p          Pipelining factor (requests in flight per connection) (default 1)
 */

const autocannon = require("autocannon");

function getArg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const url = getArg("--url", "http://localhost:5000/health");
const method = getArg("--method", "GET");
const body = getArg("--body", undefined);
const headersRaw = getArg("--headers", undefined);
const connections = parseInt(getArg("-c", "50"), 10);
const duration = parseInt(getArg("-d", "20"), 10);
const pipelining = parseInt(getArg("-p", "1"), 10);

const headers = { "Content-Type": "application/json" };
if (headersRaw) Object.assign(headers, JSON.parse(headersRaw));

console.log("\n=== StudBridge Kids — Load Test ===");
console.log(`Target      : ${method} ${url}`);
console.log(`Connections : ${connections} (concurrent virtual users)`);
console.log(`Duration    : ${duration}s`);
console.log(`Pipelining  : ${pipelining}`);
console.log("Running...\n");

const instance = autocannon(
  {
    url,
    method,
    headers,
    body,
    connections,
    duration,
    pipelining,
  },
  (err, result) => {
    if (err) {
      console.error("Load test error:", err);
      process.exit(1);
    }

    const ok = result["2xx"] || 0;
    const non2xx = result.non2xx || 0;
    const total = result.requests.total || 0;

    console.log("\n=== SUMMARY ===");
    console.log(`Requests/sec (avg) : ${result.requests.average.toFixed(2)}`);
    console.log(`Requests/sec (max) : ${result.requests.max}`);
    console.log(`Latency avg        : ${result.latency.average} ms`);
    console.log(`Latency p99        : ${result.latency.p99} ms`);
    console.log(`Latency max        : ${result.latency.max} ms`);
    console.log(`Throughput avg     : ${(result.throughput.average / 1024).toFixed(1)} KB/s`);
    console.log(`Total requests     : ${total}`);
    console.log(`2xx responses      : ${ok}`);
    console.log(`Non-2xx responses  : ${non2xx} (rate-limit / errors)`);
    console.log(`Timeouts/errors    : ${result.errors} errors, ${result.timeouts} timeouts`);
    console.log("===============\n");
  },
);

autocannon.track(instance, { renderProgressBar: true });

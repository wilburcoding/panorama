import { db } from "./client.js";
import bcrypt from "bcrypt";

export function migrate() {
  db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            first_name TEXT,
            last_name TEXT,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_id TEXT
        )
    `);
  db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id),
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            color TEXT  
        )
    `);
  db.exec(`
        CREATE TABLE IF NOT EXISTS deployments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL REFERENCES projects(id),
            version TEXT NOT NULL, 
            environment TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            last_deployed DATETIME,
            type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            api_key TEXT NOT NULL,
            meta TEXT DEFAULT '{}'
        )`);
  db.exec(`
        CREATE TABLE IF NOT EXISTS error_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deployment_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            stack_trace TEXT NOT NULL,
            environment TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            similar_count INTEGER DEFAULT 0,
            meta TEXT DEFAULT '{}',
            updates TEXT DEFAULT '[]'
        ) `);
  console.log("Database migrated");
}

export function reset() {
  db.exec("DROP TABLE IF EXISTS error_events");
  db.exec("DROP TABLE IF EXISTS deployments");
  db.exec("DROP TABLE IF EXISTS projects");
  db.exec("DROP TABLE IF EXISTS users");
  console.log("Database reset");
}

function generateTimestamps(count, intervalMs) {
    let timestamps = [];
    for (let k = count; k > 0; k--) {
        timestamps.push(new Date(Date.now() - intervalMs * k).toISOString());
    }
    return timestamps;
}

export function sample_data() {
  const HASHED_PASSWORD = bcrypt.hashSync("12345678", 10);
  db.prepare(
    "INSERT into users (email, first_name, last_name, password_hash) values (?, ?, ?, ?)",
  ).run("john@example.com", "John", "Doe", HASHED_PASSWORD);
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get("john@example.com");
  const user_id = user.id;

  const projects = [
    { name: "E-Commerce Web App", desc: "Customer-facing storefront", color: "#5cff87" },
    { name: "Payment Gateway API", desc: "Core API for transactions", color: "#4d7ef0" },
    { name: "Internal Admin Dashboard", desc: "Backoffice management portal", color: "#e05cff" }
  ];

  for (const p of projects) {
    db.prepare("INSERT into projects (name, user_id, description, color) values (?, ?, ?, ?)").run(p.name, user_id, p.desc, p.color);
  }

  // --- Project 1: E-Commerce Web App (Frontend) ---
  const proj1 = db.prepare("SELECT * FROM projects WHERE name = ?").get("E-Commerce Web App");
  const p1_deployments = [
      { version: "v2.4.1", env: "production", name: "Production Storefront", type: "frontend", api_key: "ecommerce_prod_key" },
      { version: "v2.5.0-beta", env: "staging", name: "Staging Storefront", type: "frontend", api_key: "ecommerce_staging_key" }
  ];

  for (const d of p1_deployments) {
      let web_vitals_timestamps = generateTimestamps(40, 60000 * 15);
      let isProd = d.env === "production";
      
      let sample_lcp = web_vitals_timestamps.map(() => Math.floor(Math.random() * (isProd ? 1500 : 2500) + 500));
      let sample_inp = web_vitals_timestamps.map(() => Math.floor(Math.random() * (isProd ? 100 : 300) + 50));
      let sample_fcp = web_vitals_timestamps.map(() => Math.floor(Math.random() * (isProd ? 800 : 1500) + 300));
      let sample_ttfb = web_vitals_timestamps.map(() => Math.floor(Math.random() * (isProd ? 200 : 500) + 100));

      let monitor_timestamps = generateTimestamps(300, 60000 * 10);
      let monitor_daily = Array.from({length: 90}, () => (Math.random() > 0.02 ? 1 : 0));
      
      const meta = {
          performance: {
              frontend_monitoring: {
                  lcp: sample_lcp, inp: sample_inp, ttfb: sample_ttfb, fcp: sample_fcp, timestamps: web_vitals_timestamps
              },
              benchmarks: [
                  { name: "React Hydration", expected_time: 150, id: "bm_front_1", times: web_vitals_timestamps.map(() => Math.floor(Math.random() * 50 + 120)), timestamps: web_vitals_timestamps },
                  { name: "CSS Paint", expected_time: 50, id: "bm_front_2", times: web_vitals_timestamps.map(() => Math.floor(Math.random() * 20 + 40)), timestamps: web_vitals_timestamps },
                  { name: "API Initial Fetch", expected_time: 400, id: "bm_front_3", times: web_vitals_timestamps.map(() => Math.floor(Math.random() * 200 + 300)), timestamps: web_vitals_timestamps }
              ]
          },
          uptime: {
              monitors: [
                  {
                      id: `mon_1_${d.env}`, name: "Storefront Homepage", url: `https://${isProd ? 'www' : 'staging'}.shop.example.com`,
                      statuses: Array.from({length: 300}, () => Math.random() > 0.01), daily_timeline: monitor_daily,
                      status: "up", timestamps: monitor_timestamps, active: true,
                      response_times: Array.from({length: 300}, () => Math.floor(Math.random() * 150 + 50))
                  },
                  {
                      id: `mon_2_${d.env}`, name: "Checkout API", url: `https://${isProd ? 'api' : 'api-staging'}.shop.example.com/checkout`,
                      statuses: Array.from({length: 300}, () => Math.random() > 0.05), daily_timeline: Array.from({length: 90}, () => (Math.random() > 0.05 ? 1 : 0)),
                      status: isProd ? "up" : "down", timestamps: monitor_timestamps, active: true,
                      response_times: Array.from({length: 300}, () => Math.floor(Math.random() * 300 + 100))
                  }
              ]
          }
      };

      const result = db.prepare(
        "INSERT into deployments (project_id, version, environment, status, api_key, name, last_deployed, meta, type) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(proj1.id, d.version, d.env, "active", d.api_key, d.name, null, JSON.stringify(meta), d.type);

      for (let j = 0; j < 5; j++) {
          const title = j % 2 === 0 ? "TypeError: Cannot read properties of undefined (reading 'price')" : "ReferenceError: Stripe is not defined";
          const status = j === 0 ? "resolved" : "unresolved";
          const stack_trace = `Error: ${title}\n    at Checkout.render (checkout.js:45:12)\n    at React.render (react-dom.js:122:5)\n    at Object.init (index.js:10:15)`;
          
          let perf_timestamps = generateTimestamps(20, 30000);
          let perf_cpu = perf_timestamps.map(() => Math.floor(Math.random() * 50 + 10));
          let perf_memory = perf_timestamps.map(() => Math.floor(Math.random() * 50 + 20));

          let breadcrumb_timestamps = generateTimestamps(15, 2000);
          const errorMeta = {
              performance: {
                  cpu: perf_cpu,
                  memory: perf_memory,
                  timestamps: perf_timestamps,
                  benchmarks: {
                      "React Render": { duration: 240, expected_duration: 150 },
                      "Fetch Products API": { duration: 420, expected_duration: 300 }
                  }
              },
              breadcrumbs: [
                  { message: "User navigated to /", type: "info", source: "navigation", timestamp: breadcrumb_timestamps[0] },
                  { message: "Loaded 15 products", type: "info", source: "ui", timestamp: breadcrumb_timestamps[1] },
                  { message: "User scrolled down", type: "debug", source: "ui", timestamp: breadcrumb_timestamps[2] },
                  { message: "User navigated to /category/electronics", type: "info", source: "navigation", timestamp: breadcrumb_timestamps[3] },
                  { message: "Failed to load image resource for product id 102", type: "warning", source: "network", timestamp: breadcrumb_timestamps[4] },
                  { message: "User navigated to /products/123", type: "info", source: "navigation", timestamp: breadcrumb_timestamps[5] },
                  { message: "Added item to cart", type: "info", source: "ui", timestamp: breadcrumb_timestamps[6] },
                  { message: "User navigated to /products/124", type: "info", source: "navigation", timestamp: breadcrumb_timestamps[7] },
                  { message: "Added item to cart", type: "info", source: "ui", timestamp: breadcrumb_timestamps[8] },
                  { message: "User navigated to /cart", type: "info", source: "navigation", timestamp: breadcrumb_timestamps[9] },
                  { message: "Removed item 123 from cart", type: "info", source: "ui", timestamp: breadcrumb_timestamps[10] },
                  { message: "User navigated to /checkout", type: "info", source: "navigation", timestamp: breadcrumb_timestamps[11] },
                  { message: "Started Stripe initialization", type: "debug", source: "log", timestamp: breadcrumb_timestamps[12] },
                  { message: "Failed to load resource: the server responded with a status of 400", type: "error", source: "network", timestamp: breadcrumb_timestamps[13] },
                  { message: "Checkout render failed", type: "error", source: "log", timestamp: breadcrumb_timestamps[14] }
              ]
          };
          const updates = j === 1 ? [
              { email: "john@example.com", message: "Stripe SDK failed to load due to adblocker. Looking for a workaround.", status: "unresolved", timestamp: new Date(Date.now() - 3600000).toISOString() },
              { email: "john@example.com", message: "Added a fallback UI when Stripe fails to load.", status: "resolved", timestamp: new Date(Date.now() - 1800000).toISOString() }
          ] : [];
          
          db.prepare("INSERT into error_events (deployment_id, title, status, stack_trace, environment, timestamp, similar_count, meta, updates) values (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .run(result.lastInsertRowid, title, status, stack_trace, "Chrome 114, Windows 11", new Date(Date.now() - Math.random() * 86400000).toISOString(), Math.floor(Math.random() * 150) + 10, JSON.stringify(errorMeta), JSON.stringify(updates));
      }
  }

  // --- Project 2: Payment Gateway API (Backend) ---
  const proj2 = db.prepare("SELECT * FROM projects WHERE name = ?").get("Payment Gateway API");
  const p2_deployments = [
      { version: "v1.2.0", env: "production", name: "Main API Cluster", type: "backend", api_key: "pay_api_prod" }
  ];

  for (const d of p2_deployments) {
      let sample_timestamps = generateTimestamps(240, 30000); 
      let sample_cpu = sample_timestamps.map((_, i) => i % 60 === 0 ? Math.floor(Math.random() * 20 + 70) : Math.floor(Math.random() * 20 + 10)); 
      let sample_memory = sample_timestamps.map((_, i) => Math.min(100, 40 + (i * 0.1) + Math.random() * 5)); 

      let benchmark_timestamps = generateTimestamps(30, 60000 * 30);
      let monitor_timestamps = generateTimestamps(300, 60000 * 10);
      
      const meta = {
          performance: {
              backend_monitoring: { cpu_usage: sample_cpu, memory_usage: sample_memory, timestamps: sample_timestamps },
              benchmarks: [
                  { name: "Process Transaction", expected_time: 250, id: "bm_pay_1", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 100 + 200)), timestamps: benchmark_timestamps },
                  { name: "DB Query: Fetch User", expected_time: 50, id: "bm_pay_2", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 40 + 20)), timestamps: benchmark_timestamps },
                  { name: "Hash Password", expected_time: 80, id: "bm_pay_3", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 20 + 70)), timestamps: benchmark_timestamps },
                  { name: "API Request to Stripe", expected_time: 300, id: "bm_pay_4", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 150 + 200)), timestamps: benchmark_timestamps },
                  { name: "Generate Invoice PDF", expected_time: 500, id: "bm_pay_5", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 200 + 400)), timestamps: benchmark_timestamps }
              ]
          },
          uptime: {
              monitors: [
                  {
                      id: "mon_api_prod", name: "Transaction Endpoint", url: "https://api.payments.example.com/v1/charge",
                      statuses: Array.from({length: 300}, () => Math.random() > 0.005), daily_timeline: Array.from({length: 90}, () => 1),
                      status: "up", timestamps: monitor_timestamps, active: true,
                      response_times: Array.from({length: 300}, () => Math.floor(Math.random() * 50 + 200))
                  }
              ]
          }
      };

      const result = db.prepare("INSERT into deployments (project_id, version, environment, status, api_key, name, last_deployed, meta, type) values (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(proj2.id, d.version, d.env, "active", d.api_key, d.name, null, JSON.stringify(meta), d.type);

      for (let j = 0; j < 3; j++) {
          const title = j === 0 ? "TimeoutError: Database query timeout" : "AuthError: Invalid API token provided";
          const status = j === 0 ? "unresolved" : "resolved";
          const stack_trace = `Error: ${title}\n    at Database.query (db.js:105:22)\n    at UserService.fetch (user.js:44:12)\n    at handleRequest (server.js:80:15)`;
          let perf_timestamps = generateTimestamps(20, 30000);
          let perf_cpu = perf_timestamps.map(() => Math.floor(Math.random() * 50 + 40));
          let perf_memory = perf_timestamps.map(() => Math.floor(Math.random() * 30 + 60));

          let breadcrumb_timestamps = generateTimestamps(15, 200);
          const errorMeta = {
              performance: {
                  cpu: perf_cpu,
                  memory: perf_memory,
                  timestamps: perf_timestamps,
                  benchmarks: {
                      "DB Query: Fetch User": { duration: 3000, expected_duration: 50 },
                      "Token Validation": { duration: 12, expected_duration: 15 }
                  }
              },
              breadcrumbs: [
                  { message: "Server started", type: "info", source: "system", timestamp: breadcrumb_timestamps[0] },
                  { message: "Incoming GET /health", type: "debug", source: "http", timestamp: breadcrumb_timestamps[1] },
                  { message: "Incoming POST /v1/charge", type: "info", source: "http", timestamp: breadcrumb_timestamps[2] },
                  { message: "Validating payload format", type: "debug", source: "log", timestamp: breadcrumb_timestamps[3] },
                  { message: "Payload valid", type: "debug", source: "log", timestamp: breadcrumb_timestamps[4] },
                  { message: "Authenticating token", type: "info", source: "auth", timestamp: breadcrumb_timestamps[5] },
                  { message: "Token valid for user 5512", type: "info", source: "auth", timestamp: breadcrumb_timestamps[6] },
                  { message: "Initiating DB Transaction", type: "info", source: "db", timestamp: breadcrumb_timestamps[7] },
                  { message: "DB query taking longer than expected (3000ms)", type: "warning", source: "db", timestamp: breadcrumb_timestamps[8] },
                  { message: "Attempting reconnect to DB pool", type: "warning", source: "db", timestamp: breadcrumb_timestamps[9] },
                  { message: "Reconnect failed", type: "error", source: "db", timestamp: breadcrumb_timestamps[10] },
                  { message: "Connection pool exhausted", type: "error", source: "db", timestamp: breadcrumb_timestamps[11] },
                  { message: "Aborting HTTP response", type: "error", source: "http", timestamp: breadcrumb_timestamps[12] },
                  { message: "Returning 503 Service Unavailable", type: "info", source: "http", timestamp: breadcrumb_timestamps[13] },
                  { message: "Request duration: 5231ms", type: "debug", source: "http", timestamp: breadcrumb_timestamps[14] }
              ]
          };
          const updates = j === 0 ? [
              { email: "john@example.com", message: "Getting alerts about this. Investigating the DB load.", status: "unresolved", timestamp: new Date(Date.now() - 7200000).toISOString() },
              { email: "john@example.com", message: "Looks like a missing index on the transactions table.", status: "unresolved", timestamp: new Date(Date.now() - 3600000).toISOString() },
              { email: "john@example.com", message: "Index added. Monitoring for recurrence.", status: "resolved", timestamp: new Date(Date.now() - 1800000).toISOString() }
          ] : [];
          
          db.prepare("INSERT into error_events (deployment_id, title, status, stack_trace, environment, timestamp, similar_count, meta, updates) values (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .run(result.lastInsertRowid, title, status, stack_trace, "Node.js v18.16.0, Ubuntu 22.04", new Date(Date.now() - Math.random() * 86400000).toISOString(), Math.floor(Math.random() * 500) + 100, JSON.stringify(errorMeta), JSON.stringify(updates));
      }
  }

  // --- Project 3: Internal Admin Dashboard (Mixed) ---
  const proj3 = db.prepare("SELECT * FROM projects WHERE name = ?").get("Internal Admin Dashboard");
  const p3_deployments = [
      { version: "v1.0.5", env: "production", name: "Admin Dashboard UI", type: "frontend", api_key: "admin_ui_key" },
      { version: "v1.0.5", env: "production", name: "Admin API", type: "backend", api_key: "admin_api_key" }
  ];
  
  for (const d of p3_deployments) {
      const isBackend = d.type === "backend";
      let meta = { performance: {}, uptime: { monitors: [] } };
      
      if (isBackend) {
          let sample_timestamps = generateTimestamps(240, 30000); 
          let sample_cpu = sample_timestamps.map(() => Math.floor(Math.random() * 10 + 5)); 
          let sample_memory = sample_timestamps.map(() => Math.floor(Math.random() * 10 + 20));
          let benchmark_timestamps = generateTimestamps(30, 60000 * 30);
          
          meta.performance.backend_monitoring = { cpu_usage: sample_cpu, memory_usage: sample_memory, timestamps: sample_timestamps };
          meta.performance.benchmarks = [
              { name: "Generate Monthly Report", expected_time: 5000, id: "bm_admin_1", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 1000 + 4500)), timestamps: benchmark_timestamps },
              { name: "Fetch All Users", expected_time: 1500, id: "bm_admin_2", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 300 + 1200)), timestamps: benchmark_timestamps },
              { name: "Export CSV Data", expected_time: 3000, id: "bm_admin_3", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 500 + 2500)), timestamps: benchmark_timestamps },
              { name: "Cache Clear Job", expected_time: 200, id: "bm_admin_4", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 50 + 150)), timestamps: benchmark_timestamps }
          ];
      } else {
          let web_vitals_timestamps = generateTimestamps(40, 60000 * 15);
          meta.performance.frontend_monitoring = {
              lcp: web_vitals_timestamps.map(() => Math.floor(Math.random() * 500 + 200)), 
              inp: web_vitals_timestamps.map(() => Math.floor(Math.random() * 50 + 20)),
              ttfb: web_vitals_timestamps.map(() => Math.floor(Math.random() * 100 + 50)),
              fcp: web_vitals_timestamps.map(() => Math.floor(Math.random() * 300 + 100)),
              timestamps: web_vitals_timestamps
          };
          let benchmark_timestamps = generateTimestamps(30, 60000 * 30);
          meta.performance.benchmarks = [
              { name: "Initial Paint", expected_time: 100, id: "bm_admin_f1", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 50 + 80)), timestamps: benchmark_timestamps },
              { name: "Script Execution", expected_time: 250, id: "bm_admin_f2", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 100 + 200)), timestamps: benchmark_timestamps },
              { name: "Dashboard Render", expected_time: 180, id: "bm_admin_f3", times: benchmark_timestamps.map(() => Math.floor(Math.random() * 60 + 150)), timestamps: benchmark_timestamps }
          ];
      }

      const result = db.prepare("INSERT into deployments (project_id, version, environment, status, api_key, name, last_deployed, meta, type) values (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(proj3.id, d.version, d.env, "active", d.api_key, d.name, null, JSON.stringify(meta), d.type);

      const title = isBackend ? "UnhandledPromiseRejection: Report generation failed" : "Error: Chart.js failed to render";
      const stack_trace = `Error: ${title}\n    at module.exports (main.js:1:1)`;
      
      let perf_timestamps = generateTimestamps(20, 30000);
      let perf_cpu = perf_timestamps.map(() => Math.floor(Math.random() * 50 + 10));
      let perf_memory = perf_timestamps.map(() => Math.floor(Math.random() * 50 + 20));

      let breadcrumb_timestamps = generateTimestamps(15, 5000);
      const errorMeta = { 
          performance: {
              cpu: perf_cpu,
              memory: perf_memory,
              timestamps: perf_timestamps,
              benchmarks: isBackend ? {
                  "Generate Monthly Report": { duration: 8200, expected_duration: 5000 },
                  "Fetch All Users": { duration: 1800, expected_duration: 1500 }
              } : {
                  "Chart.js Initialization": { duration: 450, expected_duration: 200 }
              }
          },
          breadcrumbs: [
              { message: "Admin authenticated", type: "info", source: "auth", timestamp: breadcrumb_timestamps[0] },
              { message: "Requested admin data view", type: "info", source: "ui", timestamp: breadcrumb_timestamps[1] },
              { message: "Data fetched from cache", type: "debug", source: "cache", timestamp: breadcrumb_timestamps[2] },
              { message: "Clicked 'Generate Report'", type: "info", source: "ui", timestamp: breadcrumb_timestamps[3] },
              { message: "Report generation started", type: "info", source: "worker", timestamp: breadcrumb_timestamps[4] },
              { message: "Processing row 1/1000", type: "debug", source: "worker", timestamp: breadcrumb_timestamps[5] },
              { message: "Processing row 500/1000", type: "debug", source: "worker", timestamp: breadcrumb_timestamps[6] },
              { message: "Memory usage approaching limits", type: "warning", source: "system", timestamp: breadcrumb_timestamps[7] },
              { message: "Processing row 999/1000", type: "debug", source: "worker", timestamp: breadcrumb_timestamps[8] },
              { message: "File write initiated", type: "info", source: "fs", timestamp: breadcrumb_timestamps[9] },
              { message: "Disk full error", type: "error", source: "fs", timestamp: breadcrumb_timestamps[10] },
              { message: "Failing gracefully", type: "info", source: "worker", timestamp: breadcrumb_timestamps[11] },
              { message: "Report generation failed", type: "error", source: "worker", timestamp: breadcrumb_timestamps[12] },
              { message: "Rendering error state UI", type: "info", source: "ui", timestamp: breadcrumb_timestamps[13] },
              { message: "Exception during render", type: "error", source: "ui", timestamp: breadcrumb_timestamps[14] }
          ] 
      };
      
      const updates = [
          { email: "john@example.com", message: "Getting reports from the ops team about this.", status: "unresolved", timestamp: new Date(Date.now() - 3600000).toISOString() },
          { email: "john@example.com", message: "It's an out-of-disk-space issue on the ephemeral storage. Clearing up old logs.", status: "resolved", timestamp: new Date(Date.now() - 1800000).toISOString() }
      ];
      
      db.prepare("INSERT into error_events (deployment_id, title, status, stack_trace, environment, timestamp, similar_count, meta, updates) values (?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .run(result.lastInsertRowid, title, "resolved", stack_trace, isBackend ? "Node.js v20" : "Firefox 115", new Date().toISOString(), Math.floor(Math.random() * 5), JSON.stringify(errorMeta), JSON.stringify(updates));
  }

  console.log("Sample data created");
}

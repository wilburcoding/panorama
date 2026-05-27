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

export function sample_data() {
  // create sample user
  const HASHED_PASSWORD = bcrypt.hashSync("12345678", 10);
  db.prepare(
    "INSERT into users (email, first_name, last_name, password_hash) values (?, ?, ?, ?)",
  ).run("john@example.com", "John", "Doe", HASHED_PASSWORD);
  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get("john@example.com");
  const user_id = user.id;

  // create sample projects
  db.prepare(
    "INSERT into projects (name, user_id, description, color) values (?, ?, ?, ?)",
  ).run("Sample Project 1", user_id, "Panorama testing project #1", "#5cff87");
  db.prepare(
    "INSERT into projects (name, user_id, description, color) values (?, ?, ?, ?)",
  ).run("Sample Project 2", user_id, "Panorama testing project #2", "#4d7ef0");
  db.prepare(
    "INSERT into projects (name, user_id, description, color) values (?, ?, ?, ?)",
  ).run("Sample Project 3", user_id, "Panorama testing project #3", "#5d7cc3");

  //create sample deployments for each project

  for (let i = 1; i <= 2; i++) {
    const project = db
      .prepare("SELECT * FROM projects WHERE name = ?")
      .get("Sample Project " + i);
    const project_id = project.id;
    for (let j = 0; j < 2; j++) {
      const version = "v1.0.0";
      const environment = j % 2 === 0 ? "production" : "development";
      const status = "active";
      const api_key = "sample_api_key_" + i + "_" + j;
      const deployment = "Deployment " + (j + 1 + (i - 1) * 2);
      let sample_cpu = [];
      let sample_memory = [];
      let sample_timestamps = [];
      for (let k = 240; k > 0; k--) {
        sample_cpu.push(Math.floor(Math.random() * 50 + 10));
        sample_memory.push(Math.floor(Math.random() * 50 + 20));
        sample_timestamps.push(new Date(Date.now() - 30000 * k).toISOString());
      }

      let sample_statuses = [];
      let sample_statuses2 = [];
      for (let k = 0; k < 300; k++) {
        sample_statuses.push(Math.random() > 0.05);
        sample_statuses2.push(Math.random() > 0.3);
      }
      let sample_response_times = [];
      let sample_response_times2 = [];
      for (let k = 0; k < 300; k++) {
        sample_response_times.push(Math.floor(Math.random() * 100 + 10));
        sample_response_times2.push(Math.floor(Math.random() * 150 + 20));
      }

      let timestamps = []; // uptime monitoring -> assuming 10 minute intervals, max 300 records (50 hours of data)
      for (let k = 300; k > 0; k--) {
        timestamps.push(
          new Date(Date.now() - 60 * 1000 * 10 * k).toISOString(),
        );
      }

      let benchmark_timestamps = [];
      for (let k = 0; k < 30; k++) {
        benchmark_timestamps.push(
          new Date(Date.now() - 60000 * 30 * k).toISOString(),
        ); // 30x at 30 minute intervals
      }

      let benchmark_times_1 = [];
      let benchmark_times_2 = [];
      let benchmark_times_3 = [];
      let benchmark_times_4 = [];
      for (let k = 0; k < 30; k++) {
        benchmark_times_1.push(Math.floor(Math.random() * 100 + 10)); // random times between 10 ms and 110 ms
        benchmark_times_2.push(Math.floor(Math.random() * 100 + 10)); // random times between 10 ms and 110 ms
        benchmark_times_3.push(Math.floor(Math.random() * 80 + 10));
        benchmark_times_4.push(Math.floor(Math.random() * 50 + 20));
      }

      let sample_stat;

      let sample_lcp = [];
      let sample_inp = [];
      let sample_ttfb = [];
      let sample_fcp = [];
      let web_vitals_timestamps = [];
      for (let k = 0; k < 40; k++) {
        web_vitals_timestamps.push(
          new Date(Date.now() - 60000 * 15 * k).toISOString(),
        );
        // 40x at 15 minute intervals
      }

      for (let k = 0; k < 40; k++) {
        sample_lcp.push(Math.floor(Math.random() * 2000 + 500));
        sample_inp.push(Math.floor(Math.random() * 300 + 50));
        sample_fcp.push(Math.floor(Math.random() * 2000 + 300));
        sample_ttfb.push(Math.floor(Math.random() * 500 + 100));
      }
      const meta = {
        performance: {
          backend_monitoring: {
            cpu_usage: sample_cpu,
            memory_usage: sample_memory,
            timestamps: sample_timestamps,
          },
          frontend_monitoring: {
            lcp: sample_lcp,
            inp: sample_inp, // measures last 40 measurements of INP/LCP
            ttfb: sample_ttfb,
            fcp: sample_fcp,
            timestamps: web_vitals_timestamps,
          },
          benchmarks: [
            {
              name: "DB Query Performance",
              expected_time: 70,
              times: benchmark_times_1,
              timestamps: benchmark_timestamps, // last 30 times are recorded
            },
            {
              name: "API Response Time",
              expected_time: 70,
              times: benchmark_times_2,
              timestamps: benchmark_timestamps,
            },
          ],
        },
        uptime: {
          monitors: [
            {
              name: "Homepage",
              url: "https://www.example.com",
              statuses: sample_statuses,
              status: "up", // current status -> separate from the last recorded status
              timestamps: timestamps,
              active: true,
              id: "monitor_1",
              response_times: sample_response_times,
            },
            {
              name: "API",
              url: "https://api.example.com/endpoint",
              statuses: sample_statuses2,
              timestamps: timestamps,
              status: "down",
              active: true,
              id: "monitor_2",
              response_times: sample_response_times2,
            },
          ],
        },
      };
      db.prepare(
        "INSERT into deployments (project_id, version, environment, status, api_key, name, last_deployed, meta, type) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        project_id,
        version,
        environment,
        status,
        api_key,
        deployment,
        null,
        JSON.stringify(meta),
        Math.random() < 0.5 ? "backend" : "frontend", // for now, only types are "backend" and "frontend"
      );
    }
  }
  console.log("Sample data created");

  // TODO: Create sample error events data

  for (let i = 0; i < 4; i++) {
    console.log(i);
    const deployment = db
      .prepare("SELECT * FROM deployments WHERE id = ?")
      .get(i + 1);
    const deployment_id = deployment.id;
    console.log("Deployment ID: " + deployment_id);
    for (let j = 0; j < Math.floor(Math.random() * 8 + 2); j++) {
      console.log("Error event created for deployment " + deployment_id);
      // random error events for each deployment
      const title = "Sample Error " + (j + 1);
      const status = j % 2 === 0 ? "unresolved" : "resolved";
      const stack_trace = `
Error: Sample error track message
at Object.<anonymous> (/app/index.js:10:15)
at Module._compile (internal/modules/cjs/loader.js:999:19)
at Module._extensions..js (internal/modules/cjs/loader.js:1027:10)
at Module.load (internal/modules/cjs/loader.js:863:32)
at Function.Module._load (internal/modules/cjs/loader.js:708:14)
at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:60:12)
      `;
      const environment = "Windows 10, Node.js v14.17.0";
      const timestamp = new Date(Date.now());
      let sample_timestamps = [];
      for (let k = 0; k < 20; k++) {
        sample_timestamps.push(
          new Date(Date.now() - 30000 * (7 - k)).toISOString(),
        );
      }
      let sample_cpu = [];
      for (let k = 0; k < 20; k++) {
        sample_cpu.push(Math.floor(Math.random() * 50 + 10));
      }
      let sample_memory = [];
      for (let k = 0; k < 20; k++) {
        sample_memory.push(Math.floor(Math.random() * 50 + 20));
      }

      const meta = {
        breadcrumbs: [
          {
            message: "Some message here",
            type: "info",
            source: "log",
          },
          {
            message: "Some message here",
            type: "error",
            source: "log",
          },
          {
            message: "Some message here",
            type: "warning",
            source: "log",
          },
          {
            message: "Some message here",
            type: "debug",
            source: "log",
          },
        ],
      };
      timestamp.setHours(
        timestamp.getHours() - j * 2 - Math.floor(Math.random() * 5),
      );
      db.prepare(
        "INSERT into error_events (deployment_id, title, status, stack_trace, environment, timestamp, similar_count, meta) values (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        deployment_id,
        title,
        status,
        stack_trace,
        environment,
        timestamp.toISOString(),
        Math.floor(Math.random() * 5),
        JSON.stringify(meta),
      );
    }
  }
}

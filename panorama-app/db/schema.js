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
            last_deployed DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            meta TEXT DEFAULT '{}',
            api_key TEXT NOT NULL
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
            updates TEXT DEFAULT '[]',
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
      db.prepare(
        "INSERT into deployments (project_id, version, environment, status, api_key, name) values (?, ?, ?, ?, ?, ?)",
      ).run(project_id, version, environment, status, api_key, deployment);
    }
  }
  console.log("Sample data created");

  // TODO: Create sample error events data

  for (let i = 0; i < 4; i++) {
    console.log(i);
    const deployment = db.prepare(
      "SELECT * FROM deployments WHERE id = ?",
    ).get(i + 1);
    const deployment_id = deployment.id;
    console.log("Deployment ID: " + deployment_id)
    for (let j =0; j < Math.floor(Math.random() * 8 + 2); j++) {
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
      `
      const environment = "Windows 10, Node.js v14.17.0";
      const timestamp = new Date(Date.now());
      timestamp.setHours(timestamp.getHours() - j * 2 - Math.floor(Math.random() * 5)); 
      db.prepare("INSERT into error_events (deployment_id, title, status, stack_trace, environment, timestamp) values (?, ?, ?, ?, ?, ?)").run(deployment_id, title, status, stack_trace, environment, timestamp.toISOString());
    
    }
  }
}

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
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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

  //create sample deployments for each project

  for (let i = 1; i <= 2; i++) {  
    const project = db
      .prepare("SELECT * FROM projects WHERE name = ?")
      .get("Sample Project " + i);
    const project_id = project.id;
    for (let j = 0; j < 2; j++) {
      const version = "v1.0.0";
      const environment = j % 2 === 0 ? "production" : "development";
      const status = j % 2 === 0 ? "active" : "inactive";
      const api_key = "sample_api_key_" + i + "_" + j;
      db.prepare(
        "INSERT into deployments (project_id, version, environment, status, api_key) values (?, ?, ?, ?, ?)",
      ).run(project_id, version, environment, status, api_key);
    }
  }
  console.log("Sample data created");

  // TODO: Create sample error events data
}

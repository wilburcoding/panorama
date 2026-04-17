import { db } from "./client.js";
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
            environment TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        )`)
    db.exec(`
        CREATE TABLE IF NOT EXISTS error_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deployment_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            stack_trace TEXT NOT NULL,
            environment TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        ) `)
    console.log("Database migrated");
}


export function reset() {
    db.exec("DROP TABLE IF EXISTS users");
    db.exec("DROP TABLE IF EXISTS error_events");
    db.exec("DROP TABLE IF EXISTS deployments");
    db.exec("DROP TABLE IF EXISTS projects");
    console.log("Database reset");
}
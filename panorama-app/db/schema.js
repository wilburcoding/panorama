const db = require("./client");
 
export function migrate() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            environment TEXT NOT NULL,
            create_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS deployments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL REFERENCES projects(id),
            version TEXT NOT NULL,
            environment TEXT NOT NULL,
            status TEXT NOT NULL,
            last_deployed DATETIME DEFAULT CURRENT_TIMESTAMP
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            meta TEXT DEFAULT '{}'
        )`)
    db.exec(`
        CREATE TABLE IF NOT EXISTS error_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deployment_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            stack_trace TEXT NOT NULL,
            environment TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ) `)
    console.log("Database migrated");
}

import Database from "better-sqlite3";

const db = new Database("panorama.db", {verbose : console.log});
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export { db };
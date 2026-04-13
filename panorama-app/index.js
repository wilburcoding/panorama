import express from "express";

const app = express();
const port = 3000;

import { migrate } from "./db/schema.js";
import { db } from "./db/client.js";

reset();
migrate();

app.use(express.static("public"));

app.listen(port, () => {
  console.log(`Panorama app listening at http://localhost:${port}`);
});

app.get("/api/projects", (req, res) => {
  // filtering options: name, environment
  // sorting options: created_at, name
  const { name, environment, sort_by, sort_order } = req.query;
  let query = "SELECT * FROM projects";
  const conditions = [];
  if (name) {
    conditions.push(`name LIKE '${name}%'`);
  }
  if (environment) {
    conditions.push(`environment = '${environment}'`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  if (sort_by) {
    query += ` ORDER BY ${sort_by}`;
  }

  if (sort_order) {
    query += ` ${sort_order}`; // ASC or DESC;
  }

  const projects = db.prepare(query).all();
  res.json(projects);
});

app.post("/api/projects", express.json(), (req, res) => {
  const { name, environment, description } = req.body;
  const result = db
    .prepare(
      "INSERT INTO projects (name, environment, description) VALUES (?, ?, ?)",
    )
    .run(name, environment, description);
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(result.lastInsertRowid);

  res.json({ success: true, project: project });
});

app.post("/api/deployments", express.json(), (req, res) => {
  const { project_id, version, environment, status } = req.body;
  const result = db
    .prepare(
      "INSERT INTO deployments (project_id, version, environment, status) VALUES (?, ?, ?, ?)",
    )
    .run(project_id, version, environment, status);
  const deployment = db
    .prepare("SELECT * FROM deployments WHERE id = ?")
    .get(result.lastInsertRowid);
  res.json({ success: true, deployment: deployment });
});

app.post("/api/error-events", express.json(), (req, res) => {
  const { deployment_id, title, stack_trace, environment, status } = req.body;
  const result = db
    .prepare(
      "INSERT INTO error_events (deployment_id, title, stack_trace, environment, status) VALUES (?, ?, ?, ?, ?)",
    )
    .run(deployment_id, title, stack_trace, environment, status);
  const error_event = db
    .prepare("SELECT * FROM error_events WHERE id=?")
    .get(result.lastInsertRowid);
  res.json({ success: true, error_event: error_event });
});

app.put("/api/projects/:id", express.json(), (req, res) => {
  const { id } = req.params;
  const { name, environment, description } = req.body;
  db.prepare(
    "UPDATE projects SET name = ?, environment = ?, description = ? WHERE id = ?",
  ).run(name, environment, description, id);
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  res.json({ success: true, project: project });
});

app.put("/api/deployments/:id", express.json(), (req, res) => {
  const { id } = req.params;
  const { version, environment, status } = req.body;
  db.prepare(
    "UPDATE deployments SET version = ?, environment = ?, status = ? WHERE id = ?",
  ).run(version, environment, status, id);
  const deployment = db
    .prepare("SELECT * FROM deployments WHERE id = ?")
    .get(id);
  res.json({ success: true, deployment: deployment });
});

app.put("/api/error-events/:id", express.json(), (req, res) => {
  const { id } = req.params;
  const { title, stack_trace, environment, status } = req.body;
  db.prepare(
    "UPDATE error_events SET title = ?, stack_trace = ?, environment = ?, status = ? WHERE id = ?",
  ).run(title, stack_trace, environment, status, id);
  const error_event = db
    .prepare("SELECT * FROM error_events WHERE id = ?")
    .get(id);
  res.json({ success: true, error_event: error_event });
});

app.delete("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM projects WHERE id = ?").run("id");
  res.json({ success: true });
});

app.delete("/api/deployments/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM deployments WHERE id = ?").run("id");
  res.json({ success: true });
});

app.delete("/api/error-events/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM error_events WHERE id = ?").run("id");
  res.json({ success: true });
});

import express from "express";
import bcrypt from "bcrypt";

const saltRounds = 10;

const app = express();
const port = 3000;

import { migrate, reset, sample_data } from "./db/schema.js";
import { db } from "./db/client.js";

reset();
migrate();
sample_data();

function generateApiKey() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

async function hashPassword(password) {
  return await bcrypt.hashSync(password, saltRounds);
}

async function checkPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

app.use(express.static("public"));

app.listen(port, () => {
  console.log(`Panorama app listening at http://localhost:${port}`);
});

app.get("/api/projects", (req, res) => {
  // filtering options: name, environment
  // sorting options: created_at, name
  const { name, environment, sort_by, sort_order, session_id } = req.query;
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

  if (session_id) {
    const user = db
      .prepare("SELECT * FROM users WHERE session_id = ?")
      .get(session_id);
    if (user) {
      query += ` WHERE user_id = ${user.id}`;
    } else {
      res.status(403).json({ success: false, message: "Invalid session ID" });
      return;
    }
  }

  const projects = db.prepare(query).all();
  res.json(projects);
});

app.post("/api/users", express.json(), async (req, res) => {
  const { first_name, last_name, email, password } = req.body;
  const password_hash = await hashPassword(password);
  // check if user already exists with that email
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (existing) {
    res.json({
      success: false,
      message: "A user with that email already exists. Try signing in.",
    });
    return;
  }
  const session_id = generateApiKey();
  const result = db
    .prepare(
      "INSERT INTO users (first_name, last_name, email, password_hash, session_id) VALUES (?, ?, ?, ?, ?)",
    )
    .run(first_name, last_name, email, password_hash, session_id);
  const user = db
    .prepare(
      "SELECT first_name, last_name, email, id, created_at, session_id FROM users WHERE id = ?",
    )
    .get(result.lastInsertRowid);
  res.json({ success: true, user: user });
});

app.get("/api/users/find/:id", (req, res) => {
  const { id } = req.params;
  const user = db
    .prepare(
      "SELECT first_name, last_name, email, id, created_at FROM users WHERE id = ?",
    )
    .get(id);
  res.json(user);
});

app.get("/api/users/check-session", (req, res) => {
  console.log(req.query);
  const { session_id } = req.query;

  const user = db
    .prepare("SELECT * FROM users WHERE session_id = ?")
    .get(session_id);

  if (!user) {
    res.status(404).json({ success: false, message: "Session not found" });
  } else {
    user.password_hash = undefined;
    res.status(200).json({ success: true, user: user });
  }
});

// user log in
app.post("/api/users/check-credentials", express.json(), async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
  } else {
    // create new session id
    const session_id = generateApiKey();
    db.prepare("UPDATE users SET session_id = ? WHERE id = ?").run(
      session_id,
      user.id,
    );

    res.json({
      success: true,
      valid: await checkPassword(password, user.password_hash),
      session_id: session_id,
    });
  }
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const { session_id } = req.query;
  if (session_id) {
    const user = db
      .prepare("SELECT * FROM users WHERE session_id = ?")
      .get(session_id);
    if (!user) {
      res.status(403).json({ success: false, message: "Invalid session ID" });
      return;
    }
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);

    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
    }
    if (project.user_id !== user.id) {
      res.status(403).json({ success: false, message: "Unauthorized" });
      return;
    }
    res.json({ success: true, project: project });
    return;
  }
  res.status(403).json({ success: false, message: "Session ID required" });
});

app.get("/api/deployments", (req, res) => {
  //filtering options: project_id, environment, status
  const { project_id, environment, status } = req.query;
  let query = "SELECT * FROM deployments";
  const conditions = [];
  if (project_id) {
    console.log("project id filter");
    if (project_id === "null") {
      res.json([]);
        return;
      }
    conditions.push(`project_id IN (${project_id})`);
  }
  if (environment) {
    conditions.push(`environment IN ('${environment}')`);
  }
  if (status) {
    conditions.push(`status IN ('${status}')`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  const deployments = db.prepare(query).all();
  res.json(deployments);
});

app.get("/api/deployments/:id", (req, res) => {
  const { id } = req.params;
  const deployment = db
    .prepare("SELECT * FROM deployments WHERE id = ?")
    .get(id);
  res.json(deployment);
});

app.get("/api/error_events", (req, res) => {
  //filtering options: deployment_id, environment, status
  const { deployment_id, environment, status } = req.query;
  let query = "SELECT * FROM error_events";
  const conditions = [];
  if (deployment_id) {
    conditions.push(`deployment_id IN (${deployment_id})`);
  }

  if (environment) {
    conditions.push(`environment IN ('${environment}')`); // error environment != deployment environment
  }
  if (status) {
    conditions.push(`status IN ('${status}')`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  const error_events = db.prepare(query).all();
  res.json(error_events);
});

app.get("/api/error_events/:id", (req, res) => {
  const { id } = req.params;
  const error_event = db
    .prepare("SELECT * FROM error_events WHERE id = ?")
    .get(id);
  res.json(error_event);
});

app.post("/api/projects", express.json(), (req, res) => {
  const { name, description, color, session_id } = req.body;

  // check session id and get user
  if (!session_id) {
    res.status(403).json({ success: false, message: "Session ID required" });
    return;
  }

  const user = db
    .prepare("SELECT * FROM users WHERE session_Id = ?")
    .get(session_id);
  if (!user) {
    res.status(403).json({ success: false, message: "Invalid session ID" });
    return;
  }
  const result = db
    .prepare(
      "INSERT INTO projects (name, description, color, user_id) VALUES (?, ?, ?, ?)",
    )
    .run(name, description, color, user.id);
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(result.lastInsertRowid);

  res.json({ success: true, project: project });
});

app.post("/api/deployments", express.json(), (req, res) => {
  const { project_id, name, version, environment, status } = req.body;
  const result = db
    .prepare(
      "INSERT INTO deployments (project_id, name, version, environment, status, api_key) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(project_id, name, version, environment, status, generateApiKey());
  const deployment = db
    .prepare("SELECT * FROM deployments WHERE id = ?")
    .get(result.lastInsertRowid);
  res.json({ success: true, deployment: deployment });
});

app.post("/api/deployments/:id/connect", express.json(), (req, res) => {
  // initializing connection from comment where id is the deployment id
  const { id, api_key } = req.body;
  const deployment = db
    .prepare("SELECT * FROM deployments WHERE id = ?")
    .get(id);
  if (!deployment) {
    res.status(404).json({ success: false, message: "Deployment not found" });
    return;
  }

  if (deployment.api_key !== api_key) {
    res.status(403).json({ success: false, message: "Invalid API key" });
    return;
  }

  if (deployment.status !== "active") {
    res
      .status(403)
      .json({ success: false, message: "Deployment is not active" });
  }
  // don't send api_key back in response
  deployment.api_key = "";

  db.prepare("UPDATE deployments SET last_deployed = ? WHERE id = ?").run(
    new Date().toISOString(),
    id
  )
  res.json({ success: true, deployment: deployment });
});

app.post("/api/error-events", express.json(), (req, res) => {
  const { deployment_id, title, stack_trace, environment,breadcrumbs, console_logs } = req.body;

  // check for similar events
  const one_hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let similar_events = db.prepare("SELECT * FROM error_events WHERE deployment_id = ? AND title = ? AND stack_trace = ?").all(deployment_id, title, stack_trace);
  console.log(similar_events);
  similar_events = similar_events.filter(
    (event) => (event.timestamp.replace(" ", "T") + "Z") > one_hour,
  );
  console.log(similar_events);
  if (similar_events.length > 0) {
    console.log("similar events found")
    for (let event of similar_events) {
      const event_similar_count = event.similar_count;
      db.prepare("UPDATE error_events SET similar_count = ? WHERE id = ?").run(event_similar_count + 1, event.id);
    }
    res.json({ success: true, message: "Similar error event already exists"});
    return;
  }
  const meta = {
    breadcrumbs: breadcrumbs || [],
    console_logs: console_logs || []
  }
  const result = db
    .prepare(
      "INSERT INTO error_events (deployment_id, title, stack_trace, environment, status, meta) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(deployment_id, title, stack_trace, environment, "unresolved", JSON.stringify(meta));
  const error_event = db
    .prepare("SELECT * FROM error_events WHERE id=?")
    .get(result.lastInsertRowid);
  res.json({ success: true, error_event: error_event });
});

app.post("/api/error-events/similar", express.json(), (req, res) => {
  const {deployment_id, title, stack_trace} = req.body;
  // check similar events in the same deployment from the past 1 hour
  const one_hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const similar_events = db.prepare("SELECT * FROM error_events WHERE deployment_id = ? AND title = ? AND stack_trace = ? AND timestamp > ?").all(deployment_id, title, stack_trace, one_hour);
  for (let event of similar_events) {
    const event_similar_count = event.similar_count;
    db.prepare("UPDATE error_events SET similar_count = ? WHERE id = ?").run(event_similar_count + 1, event.id);
  }

  res.json({ success: true})
})

app.put("/api/projects/:id", express.json(), (req, res) => {
  const { id } = req.params;
  const { name, color, description } = req.body;
  db.prepare(
    "UPDATE projects SET name = ?, color = ?, description = ? WHERE id = ?",
  ).run(name, color, description, id);
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  res.json({ success: true, project: project });
});

app.put("/api/deployments/:id", express.json(), (req, res) => {
  const { id } = req.params;
  const { name, version, environment, status, regen } = req.body;
  let api_key = "";
  if (regen) {
    api_key = generateApiKey();
    db.prepare("UPDATE deployments SET api_key = ? WHERE id = ?").run(
      api_key,
      id,
    );
    console.log("api key regenerated ");
  }
  db.prepare(
    "UPDATE deployments SET name = ?, version = ?, environment = ?, status = ? WHERE id = ?",
  ).run(name, version, environment, status, id);
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
  // get deployments with the project
  const deployments = db.prepare("SELECT * FROM deployments WHERE project_id = ?").all(id);
  for (let deployment of deployments) {
    let error_events = db.prepare("SELECT * FROM error_events WHERE deployment_id = ?").all(deployment.id);
    for (let event of error_events) {
      db.prepare("DELETE FROM error_events WHERE id = ?").run(event.id);
    }
    db.prepare("DELETE FROM deployments WHERE id = ?").run(deployment.id);
  }
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  res.json({ success: true });
});

app.delete("/api/deployments/:id", (req, res) => {
  const { id } = req.params;
  let error_events = db.prepare("SELECT * FROM error_events WHERE deployment_id = ?").all(id);
  for (let event of error_events) {
    db.prepare("DELETE FROM error_events WHERE id = ?").run(event.id);
  }
  db.prepare("DELETE FROM deployments WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/api/error-events/delete", express.json(), (req, res) => {
  const { ids } = req.body;
  let ids_string = ids.join(",");
  console.log(ids_string);
  db.prepare("DELETE FROM error_events WHERE id IN (" + ids_string + ")").run();
  res.json({ success: true });
});

app.post("/api/error-events/update", express.json(), (req, res) => {
  const { update, ids } = req.body;
  //get list of existing updates for each error event
  console.log(ids);
  for (let id of ids) {
    console.log(id);
    const error_event = db
      .prepare("SELECT * FROM error_events WHERE id = ?")
      .get(id);

    console.log(error_event);
    let updates = JSON.parse(error_event.updates);
    update.timestamp = new Date().toISOString();
    updates.push(update);
    db.prepare(
      "UPDATE error_events SET updates = ?, status = ? WHERE id = ?",
    ).run(JSON.stringify(updates), update.status, id);
    const updated_event = db
      .prepare("SELECT * FROM error_events WHERE id = ?")
      .get(id);
  }

  res.json({ success: true });
});

// users settings options -> change name, change password, delete account
app.post("/api/users/:id/update_name", express.json(), (req, res) => {
  const { id } = req.params;
  console.log(id);
  const { first_name, last_name, session_id } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  if (user.session_id !== session_id) {
    res.status(403).json({ success: false, message: "Unauthorized" });
    return;
  }
  db.prepare("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?").run(
    first_name,
    last_name,
    id,
  );
  let updated_user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

  updated_user.session_id = session_id;
  res.json({ success: true, user: updated_user });
});

app.post("/api/users/:id/update_password", express.json(), async (req, res) => {
  const { id } = req.params;
  const { current_password, new_password, session_id } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  if (user.session_id !== session_id) {
    res.status(403).json({ success: false, message: "Unauthorized" });
    return;
  }
  console.log(current_password);
  console.log(user);
  const old_valid = await checkPassword(current_password, user.password_hash);
  if (!old_valid) {
    res.status(403).json({ success: false, message: "Unauthorized" });
    return;
  }

  const new_hash = await hashPassword(new_password);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    new_hash,
    id,
  );
  let updated_user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  updated_user.password_hash = undefined;
  res.json({ success: true, user: updated_user });
});

import express from "express";
import bcrypt from "bcrypt";
import cors from "cors"

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

function generateID(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}

async function hashPassword(password) {
  return await bcrypt.hashSync(password, saltRounds);
}

async function checkPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

app.use(express.static("public"));

app.use(cors())

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
      "INSERT INTO deployments (project_id, name, version, environment, status, api_key, meta) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(project_id, name, version, environment, status, generateApiKey(), JSON.stringify({
      performance: {
        backend_monitoring: {
          cpu_usage:[],
          memory_usage: [],
          timestamps:[],
        },
        frontend_monitoring: {
          lcp: [],
          inp: [],
          ttfb: [],
          fcp: [],
          timestamps: []
        },
        benchmarks: [

        ]
      },
      uptime: {
        monitors: [
          
        ]
      }
    }));
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
  const { deployment_id, title, stack_trace, environment,breadcrumbs, performance_metrics} = req.body;

  // check if deployment exists
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(deployment_id);
  if (!deployment) {
    res.status(404).json({ success: false, message: "Deployment not found"});
  }
  // check for similar events
  const one_hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let similar_events = db.prepare("SELECT * FROM error_events WHERE deployment_id = ? AND title = ? AND stack_trace = ?").all(deployment_id, title, stack_trace);
  similar_events = similar_events.filter(
    (event) => (event.timestamp.replace(" ", "T") + "Z") > one_hour,
  );
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
    performance_metrics: performance_metrics || {}
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
  const { name, version, environment, status, type } = req.body;
  db.prepare(
    "UPDATE deployments SET name = ?, version = ?, environment = ?, status = ?, type = ? WHERE id = ?",
  ).run(name, version, environment, status, type, id);
  const deployment = db
    .prepare("SELECT * FROM deployments WHERE id = ?")
    .get(id);
  res.json({ success: true, deployment: deployment });
});

app.get("/api/deployments/:id/reset_api_key", (req, res) => {
  const { id } = req.params;
  // check if delpoyment exists
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  if (!deployment) {
    res.status(404).json({ success: false, message: "Deployment not found"});
    return;
  } 
  const new_api_key = generateApiKey();
  db.prepare("UPDATE deployments SET api_key = ? WHERE id = ?").run(new_api_key, id);
  res.json({ success: true, api_key: new_api_key});

})

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

// handle monitors -> posting, deleting, editing
app.post("/api/deployments/:id/monitors", express.json(), (req, res) => {
  const { id } = req.params;
  
  // get deployment info
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  if (!deployment) {
    res.status(404).json({success: false, message: "Deployment not found"});
    return;
  }
  
  const { name, url, active } = req.body;

  let meta = JSON.parse(deployment.meta);
  if (!meta.uptime.monitors) {
    meta.uptime.monitors = [];
  }
  const monitor_id = generateID();
  meta.uptime.monitors.push({
    id: monitor_id,
    name: name,
    url: url,
    active: active,
    response_times: [],
    timestamps: [],
    status: "down",
    statuses: [],
    daily_timeline: [],
  })
  
  db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), id);
  const updated_deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  res.json({success: true, deployment: updated_deployment, monitor_id: monitor_id});
})


app.delete("/api/deployments/:deployment_id/monitors/:monitor_id", (req, res) => {
  const { deployment_id, monitor_id } = req.params;
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(deployment_id);
  if (!deployment) {
    res.status(404).json({success: false, message: "Deployment not found"});
    return;
  }
  let meta = JSON.parse(deployment.meta);
  meta.uptime.monitors = meta.uptime.monitors.filter((monitor) => monitor.id !== monitor_id);
  const updated_deployment = db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), deployment_id);
  res.json({ success: true, deployment: updated_deployment});

})

app.put("/api/deployments/:deployment_id/monitors/:monitor_id", express.json(), (req, res) => {
  const { deployment_id, monitor_id} = req.params;
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(deployment_id);
  if (!deployment) {
    res.status(404).json({success: false, message: "Deployment not found"});
    return;
  }
  let meta = JSON.parse(deployment.meta);
  const monitor = meta.uptime.monitors.find((monitor) => monitor.id === monitor_id);
  if (!monitor) {
    res.status(404).json({success: false, message: "Monitor not found"});
    return;
  }
  const { name, url, active } = req.body;
  monitor.name = name;
  monitor.url = url;
  monitor.active = active; 
  db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), deployment_id);
  const updated_deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(deployment_id);
  res.json({ success: true, deployment: updated_deployment});
})


// handle benchmarks -> posting, deleting, editing
app.post("/api/deployments/:id/benchmarks", express.json(), (req, res) => {
  const { id } = req.params;
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  if (!deployment) {
    res.status(404).json({ success: false, message: "Deployment not found"});
    return;
  }
  const { name, expected_time } = req.body;
  let meta = JSON.parse(deployment.meta);
  meta.performance.benchmarks.push({
    id: generateID(),
    name: name,
    expected_time: parseInt(expected_time),
    times: [],
    timestamps: [],
  });
  db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), id);
  const updated_deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  res.json({ success: true, deployment: updated_deployment});
})

app.delete("/api/deployments/:deployment_id/benchmarks/:benchmark_id", (req, res) => {
  const { deployment_id, benchmark_id }= req.params;
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(deployment_id);
  if (!deployment) {
    res.status(404).json({ success: false, message: "Deployment not found"});
    return;
  }
  let meta = JSON.parse(deployment.meta);
  meta.performance.benchmarks = meta.performance.benchmarks.filter((benchmark) => benchmark.id !== benchmark_id);
  db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), deployment_id);
  const updated_deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(deployment_id);
  res.json({ success: true, deployment:updated_deployment});

})

app.put("/api/deployments/:deployment_id/benchmarks/:benchmark_id", express.json(), (req, res) => {
  const { deployment_id, benchmark_id } = req.params;
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(deployment_id);
  if (!deployment) {
    res.status(404).json({ success: false, message: "Deployment not found"});
    return;
  }
  let meta = JSON.parse(deployment.meta);
  const benchmark = meta.performance.benchmarks.find((benchmark) => benchmark.id === benchmark_id);
  if (!benchmark) {
    res.status(404).json({ success: false, message: "Benchmark not found"});
    return;
  }
  const { name, expected_time } = req.body;
  benchmark.name = name;
  benchmark.expected_time = parseInt(expected_time);
  db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), deployment_id);
  const updated_deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(deployment_id);
  res.json({ success: true, deployment: updated_deployment});
})

// posting performance metrics -> benchmarks, performance (backend and frontend)
app.post("/api/deployments/:id/benchmarks", express.json(), (req, res) => {
  const { id } = req.params;
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  if (!deployment) {
    res.status(404).json({ success: false, message: "Deployment not found"})
    return;
  }
  const { benchmark_id, time } = req.body;
  let meta = JSON.parse(deployment.meta);
  const benchmark = meta.performance.benchmarks.find((benchmark) => benchmark.id === benchmark_id);
  if (!benchmark) {
    res.status(404).json({ success: false, message: "Benchmark not found"});
    return;
  }

  benchmark.times.push(parseInt(time));
  benchmark.timestamps.push(new Date().toISOString());
  db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), id);
  const updated_deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  res.json({ success: true, deployment: updated_deployment});
})

app.post("/api/deployments/:id/performance", express.json(), (req, res) => {
  const { id} = req.params;
  const deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  if (!deployment) {
    res.status(404).json({ success: false, message: "Deployment not found"});
    return;
  }


  let meta = JSON.parse(deployment.meta);

  if (deployment.type == "backend") {
    const { cpu_usage, memory_usage} = req.body;
    if (cpu_usage === undefined || memory_usage === undefined) {
      res.status(400).json({ success: false, message: "CPU usage and memory usage required"});
      return;
    } 
    // console.log(cpu_usage, memory_usage);
    meta.performance.backend_monitoring.cpu_usage.push(cpu_usage);
    meta.performance.backend_monitoring.memory_usage.push(memory_usage);
    meta.performance.backend_monitoring.timestamps.push(new Date().toISOString());
    if (meta.performance.backend_monitoring.timestamps.length > 300) {
      meta.performance.backend_monitoring.cpu_usage.shift();
      meta.performance.backend_monitoring.memory_usage.shift();
      meta.performance.backend_monitoring.timestamps.shift();
    }
  } else {
    const { lcp, inp, ttfb, fcp } = req.body;
    if (lcp === undefined || inp === undefined || ttfb === undefined || fcp === undefined) {
      res.status(400).json({ success: false, message: "LCP, INP, TTFB, and FCP required"});
      return;
    }
    // console.log(lcp, inp, ttfb, fcp);
    // console.log(meta.performance.frontend_monitoring);
    meta.performance.frontend_monitoring.lcp.push(lcp);
    meta.performance.frontend_monitoring.inp.push(inp);
    meta.performance.frontend_monitoring.ttfb.push(ttfb);
    meta.performance.frontend_monitoring.fcp.push(fcp);
    meta.performance.frontend_monitoring.timestamps.push(new Date().toISOString());
    if (meta.performance.frontend_monitoring.timestamps.length > 300) {
      meta.performance.frontend_monitoring.lcp.shift();
      meta.performance.frontend_monitoring.inp.shift();
      meta.performance.frontend_monitoring.ttfb.shift();
      meta.performance.frontend_monitoring.fcp.shift();
    }
  }
  db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), id);
  const updated_deployment = db.prepare("SELECT * FROM deployments WHERE id = ?").get(id);
  res.json({ success: true, deployment: updated_deployment});
})


// uptime checks
async function checkUptime() {
  const deployments = db.prepare("SELECT * FROM deployments").all();
  for (let deployment of deployments) {
    let meta = JSON.parse(deployment.meta);
    const monitors = meta.uptime.monitors;
    monitors.forEach(async (monitor) => {
      const start = performance.now();
      try {
        const res = await fetch(monitor.url, {
          signal: AbortSignal.timeout(10000)
        })
        const response_time = Math.round(performance.now() - start);
        let status = res.ok;
        monitor.statuses.push(status);
        monitor.response_times.push(response_time);
        monitor.timestamps.push(new Date().toISOString());
        if (monitor.statuses.length > 50) {
          monitor.statuses.shift();
          monitor.response_times.shift();
          monitor.timestamps.shift();  
        }
      } catch (error) {
        monitor.statuses.push(false);
        monitor.response_times.push(null);
        monitor.timestamps.push(new Date().toISOString());
      }

    });
    db.prepare("UPDATE deployments SET meta = ? WHERE id = ?").run(JSON.stringify(meta), deployment.id);
  }
  setTimeout(checkUptime, 15 * 60 * 1000); // every 15 minutes
}

checkUptime();
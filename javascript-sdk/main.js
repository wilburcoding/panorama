import os from "os";

class PanoramaClient {
  initialized = false;
  version = null;
  api_key = null;
  environment = null;
  id = null;
  queue = [];
  breadcrumbs = []; // later feature
  max_breadcrumbs = 20;
  past_errors = []; // check for very recent duplicate errors
  system = "";

  constructor() {}

  async init({ api_key, id }) {
    if (this.initialized) {
      console.warn("PanoramaClient is already initialized");
      return;
    }

    this._setupHandlers();

    await fetch("http://localhost:3000/api/deployments/" + id + "/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: id,
        api_key: api_key,
      }),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          console.log("Connected to Panorama backend");
          this.api_key = api_key;
          this.id = id;
          this.initialized = true;
          this.environment = response.deployment.environment;
          this.version = response.deployment.version;
          console.log("Deployment: ", response.deployment);

          // get system information
          this.system = `${os.type()} ${os.release()} Node ${process.version}`;
          console.log(this.system);
        } else {
          console.error(
            "Failed to connect to Panorama backend: " + response.message,
          );
        }
      })
      .catch((error) => {
        console.error("Failed to connect to Panorama backend:", error);
      });
  }

  captureError(error) {
    this._postError({
      error_title: error.message,
      stack_trace: error.stack,
    });
  }

  async _postError({ error_title, error, stack_trace }) {
    // TODO: get error information and post to backend

    let stacktrace = "";
    let stack_lines = stack_trace.split("\n");
    for (let i = 0; i < stack_lines.length; i++) {
      let line = stack_lines[i];
      stacktrace += line.trim() + "\n";
    }

    error_title = error_title.trim();
    if (error_title.charAt(error_title.length - 1) === ".") {
      error_title = error_title.slice(0, -1);
    }

    stack_trace = stacktrace.trim();

    for (let i = 0; i < this.past_errors.length; i++) {
      let past_error = this.past_errors[i];
      if (past_error.timestamp < Date.now() - 60 * 1000 * 60) {
        // save up to an hour
        this.past_errors.splice(i, 1);
        i--;
        continue;
      }

      if (
        past_error.title === error_title &&
        past_error.stack_trace === stack_trace
      ) {
        // skipping post
        return;
      }
    }
    this.past_errors.push({
      title: error_title,
      stack_trace: stack_trace,
      timestamp: Date.now(),
    });

    const response = await fetch("http://localhost:3000/api/error-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deployment_id: this.id,
        title: error_title,
        stack_trace: stacktrace,
        environment: this.system,
        breadcrumbs: this.breadcrumbs.slice(),
      }),
    });

    const data = await response.json();
    console.log(data);
  }

  addBreadcrumb({message, source, type}) {
    // add to queue and post with new error events
    this.breadcrumbs.push({
      message: message, // some text descrpition
      source: source, // navigation, user, log, etc
      type: type, //info, warning, error, debug
      timestamp: new Date().toISOString(),
    });
    if (this.breadcrumbs.length > this.max_breadcrumbs) {
        this.breadcrumbs.shift();
    }
  } 

  _setupHandlers() {
    // watch process for uncaught exceptions and unhandled rejections
    process.on("uncaughtException", (err) => {
      this._postError({
        error_title: err.message,
        stack_trace: err.stack,
      }).catch((e) => {
        console.log("Failed to post error: ", e);
      });
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.log("unhandled rejection: ", reason);
      this._postError({
        error_title: reason.message || "Unhandled Rejection",
        stack_trace: reason.stack || "",
      }).catch((e) => {
        console.log("Faile to post error: ", e);
      });
    });
  }

}

export default PanoramaClient;

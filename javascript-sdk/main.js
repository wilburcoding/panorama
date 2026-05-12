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
  max_metrics = 20;
  past_errors = []; // check for very recent duplicate errors
  system = "";
  // console_logs = []; SCRAPPED -> pretty redundant honestly
  performance_metrics = {
    memory: [],
    cpu: [],
    timestamps: [], // when metrics were recorded
    benchmarks: {}, // record response times for different processes of functions -> user sets this up
  };

  constructor() {}

  async init({ api_key, id }) {
    if (this.initialized) {
      console.warn("PanoramaClient is already initialized");
      return;
    }

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

          // get system information
          this.system = `${os.type()} ${os.release()} Node ${process.version}`;

          this._setupHandlers();
          this._performanceMonitoring();

          console.log("Deployment: ", response.deployment);
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

  beginBenchmark({ name, expected_duration }) {
    if (!this.initialized) {
      console.warn("Client has not been initialized yet");
      return;
    }

    if (Object.keys(this.performance_metrics.benchmarks).includes(name)) {
      console.warn(
        "Benchmark with name " + name + " already exists, overwriting",
      );
    }
    this.performance_metrics.benchmarks[name] = {
      start: Date.now(),
      end: null,
      duration: null,
      expected_duration: expected_duration || null,
    };
  }

  endBenchmark(name) {
    if (!this.initialized) {
      console.warn("Client has not been initialized yet");
      return;
    }

    if (!Object.keys(this.performance_metrics.benchmarks).includes(name)) {
      console.warn("Benchmark with name " + name + " does not exist");
      return;
    }

    const benchmark = this.performance_metrics.benchmarks[name];
    if (benchmark.end !== null) {
      console.log(
        "Benchmark with name " + name + " already ended, overwriting",
      );
    }
    benchmark.end = Date.now();
    benchmark.duration = benchmark.end - benchmark.start;

    return benchmark;
  }

  async _postError({ error_title, stack_trace }) {
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
        performance_metrics: this.performance_metrics,
      }),
    });

    const data = await response.json();
    console.log(data);
  }

  addBreadcrumb({ message, source, type }) {
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
      this._postError({
        error_title: reason.message || "Unhandled Rejection",
        stack_trace: reason.stack || "",
      }).catch((e) => {
        console.log("Failed to post error: ", e);
      });
    });
  }

  _performanceMonitoring() {
    function getCPUUsage() {
      const cpus = os.cpus();
      let idle = 0;
      let total = 0;
      cpus.forEach((cpu) => {
        for (let type of Object.keys(cpu.times)) {
          total += cpu.times[type];
        }
        idle += cpu.times.idle;
      });
      return { idle, total };
    }
    const start = getCPUUsage();

    setInterval(() => {
      const end = getCPUUsage();

      const idleDiff = end.idle - start.idle;
      const totalDiff = end.total - start.total;

      const cpuUsage = 100 - Math.round((100 * idleDiff) / totalDiff);

      const memoryUsage = process.memoryUsage();
      const memoryPercent = Math.round(
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      );

      this.performance_metrics.cpu.push(cpuUsage);
      this.performance_metrics.memory.push(memoryPercent);
      this.performance_metrics.timestamps.push(new Date().toISOString());

      if (this.max_metrics > 25) {
        console.warn(
          "Max_metrics value of " +
            this.max_metrics +
            " exceeds maximum of 25, resetting to 25",
        );
        this.max_metrics = 25;
      }
      if (this.performance_metrics.cpu.length > this.max_metrics) {
        for (
          let i = 0;
          i < this.performance_metrics.cpu.length - this.max_metrics;
          i++
        ) {
          this.performance_metrics.cpu.shift();
          this.performance_metrics.memory.shift();
          this.performance_metrics.timestamps.shift();
        }
      }
    }, 30000); // every 30 seconds for now
  }
}

export default PanoramaClient;

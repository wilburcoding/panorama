import {
  onFCP,
  onINP,
  onLCP,
  onTTFB,
} from "https://unpkg.com/web-vitals@4?module";

export class PanoramaWeb {
  initialized = false;
  api_key = null;
  id = null;
  version = null;
  environment = null;
  posted_metrics = false;
  metrics = {
    lcp: null,
    inp: null,
    ttfb: null,
    cls: null,
  };
  queue = [];
  breadcrumbs = [];
  max_breadcrumbs = 20;
  past_errors = [];
  system = "";

  api_url = null;

  constructor() {}

  async init({ api_key, id, api_url }) {
    if (this.initialized) {
      console.warn("PanoramaWeb client is already initialized");
      return;
    }
    if (!api_url) {
      console.error("PanoramaWeb client initialization failed: api_url is required");
      return;
    }
    if (api_url.endsWith("/")) {
      api_url = api_url.slice(0, -1);
    }
    await fetch(api_url + "/api/deployments/" + id + "/connect", {
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
          this.api_url = api_url;
          this.initialized = true;
          this.environment = response.deployment.environment;
          this.version = response.deployment.version;

          this.system = `${navigator.userAgent}`;

          this._setupHandlers();
          this._benchmarkQueue();
        } else {
          console.error(
            "Failed to connect to Panorama backend: " + response.message,
          );
        }
      })
      .catch((error) => {
        console.error("Failed to connect to Panorama backend: " + error);
      });
  }

  _setupHandlers() {
    onLCP((metric) => {
      this.metrics.lcp = metric.value;
      console.log("LCP: " + metric.value);
      this._handleVitals();
    });
    onINP((metric) => {
      this.metrics.inp = metric.value;
      console.log("INP: " + metric.value);
      this._handleVitals();
    });
    onFCP((metric) => {
      this.metrics.fcp = metric.value;
      console.log("FCP: " + metric.value);
      this._handleVitals();
    });
    onTTFB((metric) => {
      this.metrics.ttfb = metric.value;
      console.log("TTFB: " + metric.value);
      this._handleVitals();
    });

    window.addEventListener("error", (event) => {
      this._postError({
        error_title: err.message,
        stack_trace: err.stack,
      }).catch((e) => {
        console.log("Failed to post error: ", e);
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this._postError({
        error_title: reason.message || "Unhandled Rejection",
        stack_trace: reason.stack || "",
      }).catch((e) => {
        console.log("Failed to post error: ", e);
      });
    });
  }
  _handleVitals() {
    console.log(this.metrics);
    if (
      this.metrics.lcp != null &&
      this.metrics.inp != null &&
      this.metrics.ttfb != null &&
      this.metrics.fcp != null &&
      !this.posted_metrics
    ) {
      // check if everything is calculated
      console.log("Posting performance metrics: " + this.metrics);
      fetch(
        this.api_url + "/api/deployments/" + this.id + "/performance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lcp: this.metrics.lcp,
            inp: this.metrics.inp,
            ttfb: this.metrics.ttfb,
            fcp: this.metrics.fcp,
          }),
        },
      )
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            console.log("Posted performance metrics");
            this.posted_metrics = true;
          } else {
            console.error(
              "Failed to post performance metrics: " + json.message,
            );
          }
        })
        .catch((error) => {
          console.error("Failed to post performance metrics: " + error);
        });
    }
  }

  async _benchmarkQueue() {
    while (true) {
      if (this.queue.length > 0) {
        const item = this.queue.shift();
        const response = await fetch(
          this.api_url + "/api/deployments/" + this.id + "/benchmarks",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              benchmark_id: item.id,
              time: item.duration,
            }),
          },
        );
        const json = await response.json();
        if (json.success) {
          console.log(
            "Posted benchmark " + item.id + " with duration " + item.duration,
          );
        } else {
          console.error(
            "Failed to post benchmark " + item.id + ": " + json.message,
          );
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  beginBenchmark(id) {
    if (!this.initialized) {
      console.warn("Client has not been initialized yet");
      return;
    }

    if (Object.keys(this.benchmarks).includes(id)) {
      console.warn("Benchmark with id " + id + " already exists");
      return;
    }

    this.benchmarks[id] = {
      start: performance.now(),
      end: null,
      duration: null,
    };
  }

  endBenchmark(id) {
    if (!this.initialized) {
      console.warn("Client has not been initialized yet");
      return;
    }

    if (!Object.keys(this.benchmarks).includes(id)) {
      console.warn("Benchmark with id " + id + " does not exist");
      return;
    }

    if (this.benchmarks[id].end != null) {
      console.warn("Benchmark with id " + id + " has already been ended");
      return;
    }

    this.benchmarks[id].end = performance.now();
    this.benchmarks[id].duration =
      this.benchmarks[id].end - this.benchmarks[id].start;

    return this.benchmarks[id].duration;
  }

  captureError(error) {
    this._postError({
      error_title: error.message,
      stack_trace: error.stack,
    });
  }

  async _postError({ error_title, stack_trace }) {
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
        this.past_errors.splice(i, 1);
        i--;
        continue;
      }
      if (
        past_error.error_title === error_title &&
        past_error.stack_trace === stack_trace
      ) {
        return;
      }
    }
    this.past_errors.push({
      title: error_title,
      stack_trace: stack_trace,
      timestamp: Date.now(),
    });

    const response = await fetch(this.api_url + "/api/error-events", {
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
    const json = await response.json();
    if (json.success) {
      console.log("Posted error event: " + error_title);
    } else {
      console.error("Failed to post error event: " + json.message);
    }
  }
}

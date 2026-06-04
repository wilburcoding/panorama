import { onFCP, onINP, onLCP, onTTFB } from "https://unpkg.com/web-vitals@4?module";

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

  constructor() {}

  async init({ api_key, id }) {
    if (this.initialized) {
      console.warn("PanoramaWeb is already initialized");
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
          this._setupHandlers();
        }
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
      console.log("Posting performance metrics: " + this.metrics)
      fetch(
        "http://localhost:3000/api/deployments/" + this.id + "/performance",
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
                console.error("Failed to post performance metrics: " + json.message);
            }
        }).catch((error) => {
            console.error("Failed to post performance metrics: " + error);
        })
    }
  }
}

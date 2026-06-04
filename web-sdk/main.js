import { onCLS, onINP, onLCP, onTTFB } from "https://cdn.jsdelivr.net/npm/web-vitals@5.3.0/dist/web-vitals.attribution.iife.min.js";

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
    fcp: null,
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
        }
      });
  }

  _setupHandlers() {
    onLCP((metric) => {
      this.metrics.lcp = metric.value;
      this._handleVitals();
    });
    onINP((metric) => {
      this.metrics.inp = metric.value;
      this._handleVitals();
    });
    onLCP((metric) => {
      this.metrics.fcp = metric.value;
      this._handleVitals();
    });
    onTTFB((metric) => {
      this.metrics.ttfb = metric.value;
      this._handleVitals();
    });
  }
  _handleVitals() {
    if (
      this.metrics.lcp &&
      this.metrics.inp &&
      this.metrics.ttfb &&
      this.metrics.fcp &&
      !this.posted_metrics
    ) {
      // check if everything is calculated

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

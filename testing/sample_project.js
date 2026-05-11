import PanoramaClient from "../javascript-sdk/main.js";

async function main() {
  const client = new PanoramaClient();
  await client.init({
    api_key: "sample_api_key_1_0",
    id: 1,
  });

  client.addBreadcrumb({
    type: "info",
    source: "navigation",
    message: "User navigated to homepage",
  });
  client.addBreadcrumb({
    type: "warning",
    source: "api",
    message: "POST /api/data took 500ms",
  });
  client.addBreadcrumb({
    type: "error",
    source: "database",
    message: "Database connection failed"
  })

  client.beginBenchmark("data processing");
  for (let i =0; i < 100000; i++) {
    const random = Math.random() * 500 + 219;

  }
  client.endBenchmark("data processing");
  
  const count = 0;
  count += 1;
}

main();

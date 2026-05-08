import PanoramaClient from "../javascript-sdk/main.js";

async function main() {
  const client = new PanoramaClient();
  await client.init({
    api_key: "sample_api_key_1_0",
    id: 1,
  });
  
  const count = 0;
  count += 1;
}

main();

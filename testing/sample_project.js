import PanoramaClient from "../javascript-sdk/main.js";
import express from "express";
import fs from "fs";

const app = express();
const PORT = 3001;

async function main() {
  const client = new PanoramaClient();

  try {
    await client.init({
      api_key: "sample_api_key_1_0",
      id: 1,
    });

    app.listen(PORT, () => {
      console.log(`Sample project listening at http://localhost:${PORT}`);
    });

    app.get("/", (req, res) => {
      res.send(`
        Sample Project is active!
        <br/><br/>
        Following endpoints can be used to test different features with Panorama:
        <ul>
          <li><code>/error</code></li>
        </ul>
        `);
    });

    app.get("/error1", (req, res) => {
      // simulate undefined function calling error
      try {
        client.addBreadcrumb({
          message: "User clicked on error1 endpoint",
          source: "user",
          type: "info",
        });
        const obj = {};
        client.addBreadcrumb({
          message: "Object value: " + JSON.stringify(obj),
          source: "log",
          type: "debug",
        });
        client.addBreadcrumb({
          message: "Object is empty",
          source: "log",
          type: "warning"
        });
        obj.nonExistentFunction();
      } catch (error) {
        client.captureError(error);
      }
      res.send("Successfully captured error with Panorama client!");
    });

    app.get("/error2", (req, res) => {
      // simulate changing constant variable
      try {
        const constantValue = "I am constant";
        client.addBreadcrumb({
          message: "User clicked on error2 endpoint",
          source: "user",
          type: "info"
        });
        constantValue = "something";
      } catch (error) {
        client.captureError(error);
      }
      res.send("Successfully captured error with Panorama client!");

    });

    app.get("/error3", (req, res) => {
      // simulate file not found error
      try {
        client.addBreadcrumb({
          message: "User clicked on error3 endpoint",
          source: "user",
          type: "info"
        });
        client.addBreadcrumb({
          message: "Attempting to read file data",
          source: "log",
          type: "debug"
        })
        fs.readFile("not_real_file.txt", "utf-8", (err, data) => {
          if (err) {
            client.captureError(err);
            res.send("Successfully captured error with Panorama client!");

          } else {
            res.send("File content: " + data);
          }

        })
      } catch (error) {
        client.captureError(error);
      }
      res.send("Successfully captured error with Panorama client!");
    });

    app.get("/benchmark1", (req, res) => {
      // simulate benchmark for a function
      function fibonacci(n) {
        if (n <= 1) {
          return n;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
      client.beginBenchmark({
        name: "Fibonacci benchmark",
        expected_duration: 180,
      });
      const result = fibonacci(35);
      const benchmark = client.endBenchmark("Fibonacci benchmark");

      res.send("Fibonacci result: " + result + ". Completed in " + benchmark.duration + " ms");

    });

    app.get("/benchmark2", (req, res) => {
      // benchmark for random number generation with different amounts;
      function genRandomNumbers(x) {
        let ranNums = [];
        for (let i = 0; i < x; i++) {
          ranNums.push(Math.random());
        }
        return ranNums;
      }

      client.beginBenchmark({
        name: "Random number generation benchmark",
        expected_duration: 33,
      });
      const result = genRandomNumbers(1000000 + Math.floor(Math.random() * 500000));
      const benchmark = client.endBenchmark("Random number generation benchmark");
      

      res.send("Generated " + result.length + " random numbers in " + benchmark.duration + " ms");

    })

    app.get("/benchmark3", (req, res) => {
      // benchmark for sorting algorithm
      function selectionSort(arr) {
        const n = arr.length;
        for (let i =0; i < n; i++) {
          let minIndex = i;
          for (let j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIndex]) {
              minIndex = j;
            }
          }
          const temp = arr[i];
          arr[i] = arr[minIndex];
          arr[minIndex] = temp;


        }
        return arr;
      }

      const randomArr = [];
      for (let i = 0; i < 20000; i++) {
        randomArr.push(Math.floor(Math.random() * 500));
      }
      client.beginBenchmark({
        name: "Selection sort benchmark",
        expected_duration: 200
      })
      const result = selectionSort(randomArr);
      const benchmark = client.endBenchmark("Selection sort benchmark");

      res.send("Selection sorted array of length " + result.length + " in " + benchmark.duration + " ms");
    })
    
  } catch (error) {
    console.error("Error initializing sample project: ", error);
  }
}

main();

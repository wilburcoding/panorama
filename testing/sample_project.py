import python_sdk
from flask import Flask
import requests
import random
app = Flask(__name__)

print("Successfully imported PanoramaClient")
client = python_sdk.PanoramaClient()
client.init({
    "id": 1,
    "api_key": "sample_api_key_1_0",
    "api_url": "http://localhost:3000"
})

@app.route("/")
def home():
    return """
        Sample Project is active!
        <br/><br/>
        Following endpoints can be used to test different features with Panorama:
        <ul>
          <li><code>/error</code></li>
        </ul>
        `
"""

@app.route("/error1")
def error1():
    # testing undefined function call error
    client.add_breadcrumb("User clicked error1 endpoint", "user", "info")
    data = {}
    client.add_breadcrumb("Data object created", "log", "info")
    client.add_breadcrumb("Data object is empty", "log", "warning")
    try:
        data["undefined_function"].test()
    except Exception as e:
        client.capture_error(e)
    return "Successfully captured error #1"

@app.route("/error2")
def error2():
    # testing division by zero error
    client.add_breadcrumb("User clicked error2 endpoint", "user", "info")
    try:
        num1 = 5
        client.add_breadcrumb("num1 variable created with value 5", "log", "debug")
        num2 = 0
        client.add_breadcrumb("num2 variable created with value 0", "log", "debug")
        result = num1 / num2
    except Exception as e:
        client.capture_error(e)
    return "Successfully captured error #2"

@app.route("/error3")
def error3():
    # testing file not foudn error
    client.add_breadcrumb("User clicked error3 endpoint", "user", "info")
    try:
        file_name = "non_existent_file.txt"
        client.add_breadcrumb(f"Attempting to open file: {file_name}", "log", "debug")
        with open(file_name, "r") as f:
            content = f.read()
    except Exception as e:
        client.capture_error(e)
    return "Successfully captured error #3"

@app.route("/benchmark1")
def benchmark1():
    # testing fibonacci function benchmark
    client.begin_benchmark("Fibonacci benchmark", 220)
    def fibonacci(n):
        if n <= 1:
            return n
        else:
            return fibonacci(n-1) + fibonacci(n - 2)
    result = fibonacci(30)
    benchmark = client.end_benchmark("Fibonacci benchmark")
    return f"Benchmark completed in {benchmark['duration']} ms"
    
@app.route("/benchmark2")
def benchmark2():
    # benchmarking creating 200000 random numbers
    client.begin_benchmark("Create random numbers", 95)
    nums = []
    for i in range(200000):
        nums.append(random.randint(1,10000))
    
    benchmark = client.end_benchmark("Create random numbers")
    return f"Benchmark completed in {benchmark["duration"]} ms"
    
@app.route("/benchmark3")
def benchmark3():
    # benchmarking sorting list of 50000 random numbers
    client.begin_benchmark("Sort random numbers", 45)
    nums = []
    for i in range(50000):
        nums.append(random.randint(1, 10000))
    nums.sort()
    benchmark = client.end_benchmark("Sort random numbers")
    return f"Benchmark completed in {benchmark["duration"]} ms"
        
    
if __name__ == "__main__":
    app.run(port = 3001, debug = True)
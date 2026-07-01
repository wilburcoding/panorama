# panorama sdk files
import sys
import requests
import platform
import traceback
from datetime import datetime, timedelta, timezone
import psutil
import asyncio
import threading


class PanoramaClient:
    initialized = False
    version = None
    api_key = None
    environment = None
    deployment_id = None;
    queue = []
    breadcrumbs = []
    max_breadcrumbs = 20
    max_metrics = 20
    past_errors = []
    system = "";
    performance_metrics = {
        "memory": [],
        "cpu": [],
        "timestamps": [],
        "benchmarks": {},
    }

    api_url = None

    def __init__(self):
        pass

    def init(self, config):
        if (self.initialized):
            print("PanoramaClient is already initialized.")
            return
        
        config_api_url = config.get("api_url")
        if (config_api_url is None):
            print("Configuration must include an api_url.")
            return
        
        if config_api_url.endswith("/"):
            config_api_url = config_api_url[:-1]
        
        self.api_url = config_api_url

        config_id = config.get("id")
        if (config_id is None):
            print("Configuration must include a deployment ID.")
            return

        config_api_key = config.get("api_key")
        if (config_api_key is None):
            print("Configuration must include an API key.")
            return
        res = requests.post(self.api_url + "/api/deployments/" + str(config_id) + "/connect", json={
            "id": config_id,
            "api_key": config_api_key,
        })
        if (res.status_code == 200):
            rjson = res.json()
            if (rjson["success"] is True):
                print("Successfully connected to Panorama server.")
                self.initialized = True
                self.deployment_id = config_id
                self.api_key = config_api_key
                self.environment = rjson["deployment"]["environment"]
                self.version = rjson["deployment"]["version"]

                self.system = f"{platform.system()} {platform.release()} Python {sys.version.split()[0]}"

                self.setupHandlers();
                self.performanceMonitoring()

                print(rjson["deployment"])
            else:
                print("Failed to connect to Panorama server: " +
                      rjson["message"])

        else:
            print("Failed to connect to Panorama server: \nStatus code: " +
                  str(res.status_code) + "\nResponse: " + res.text)
    def capture_error(self, e):
        exc_type, exc_value, exc_traceback = sys.exc_info()
        stack_trace = [s.strip() for s in traceback.format_tb(exc_traceback)]
        self._post_error(str(exc_value)[0].upper(
        ) + str(exc_value)[1:], stack_trace)
        
    def begin_benchmark(self, benchmark_name, expected_duration):
        
        if not self.initialized:
            print("PanoramaClient needs to be initlialized before capturing benchmarks")
        if benchmark_name in self.performance_metrics["benchmarks"]:
            print(f"Benchmark {benchmark_name} already exists, overwriting")
        
        self.performance_metrics["benchmarks"][benchmark_name] = {
            "start": datetime.now().isoformat(),
            "end": None,
            "duration": None,
            "expected_duration": expected_duration
        }
        
    def end_benchmark(self, benchmark_name):
        if not self.initialized:
            print("PanoramaClient needs to be initialized before capturing benchmarks")
            
        if benchmark_name not in self.performance_metrics["benchmarks"]:
            print(f"Benchmark {benchmark_name} does not exist")
            
        benchmark = self.performance_metrics["benchmarks"][benchmark_name]
        if (benchmark["end"] is not None):
            print(f"Benchmark {benchmark_name} already ended, overwriting end time")
        benchmark["end"] = datetime.now().isoformat()
        benchmark["duration"] = (datetime.fromisoformat(benchmark["end"]) - datetime.fromisoformat(benchmark["start"])).total_seconds() * 1000
        
        return benchmark
            
    
        
    def _post_error(self, error_title, stack_trace):
        stack_trace_str = "\n".join(stack_trace)

        # check past errors
        for i in range(len(self.past_errors)-1, -1, -1):
            error = self.past_errors[i]
            past_date = datetime.fromisoformat(error["timestamp"])
            if past_date < datetime.now(timezone.utc) - timedelta(hours=1):
                self.past_errors.pop(i)
                continue

            if error["title"] == error_title and error["stack_trace"] == stack_trace_str:
                print("Error already reported, skipping")
                return

        self.past_errors.append({
            "title": error_title,
            "stack_trace": stack_trace_str,
            "timestamp": datetime.now().isoformat()
        })
        res = requests.post(self.api_url + "/api/deployments/" + str(self.deployment_id) + "/errors", json={
            "deployment_id": self.deployment_id,
            "title": error_title,
            "stack_trace": stack_trace_str,
            "environment": self.environment,
            "breadcrumbs": self.breadcrumbs,
        })
        res = res.json()

    def handle_exception(self, exc_type, exc_value, exc_traceback):
        stack_trace = [s.strip() for s in traceback.format_tb(exc_traceback)]
        self._post_error(str(exc_value)[0].upper(
        ) + str(exc_value)[1:], stack_trace)
        
    def add_breadcrumb(self, message, source, b_type):
        self.breadcrumbs.append({
            "message": message, # text descrpition
            "timestamp": datetime.now().isoformat(),
            "source": source,  # navigation, user, log, etc
            "type": b_type #info, warning, error, debug
        })
        
        if (len(self.breadcrumbs) > self.max_breadcrumbs):
            self.breadcrumbs.pop(0)
        

    def setupHandlers(self):
        # create global error handlers
        sys.excepthook = self.handle_exception

    def performanceMonitoring(self):
        # create performance monitoring loop
        async def monitor():
            while True:
                if (self.max_metrics > 40):
                    print("Max metrics cannot be greater than 40, setting to 40");
                    self.max_metrics = 40
                    
                if (len(self.performance_metrics["timestamps"]) >= self.max_metrics):
                    self.performance_metrics["timestamps"].pop(0)
                    self.performance_metrics["cpu"].pop(0)
                    self.performance_metrics["memory"].pop(0)
                self.performance_metrics["timestamps"].append(
                    datetime.now().isoformat())
                self.performance_metrics["cpu"].append(
                    psutil.cpu_percent())
                vm = psutil.virtual_memory()
                self.performance_metrics["memory"].append(round(vm.percent))
                if (self.performance_metrics["memory"][-1] > 100):
                    self.performance_metrics["memory"][-1] = 100
                if (self.performance_metrics["cpu"][-1] > 100):
                    self.performance_metrics["cpu"][-1] = 100               
                res = requests.post(self.api_url + "/api/deployments/" + str(self.deployment_id) + "/performance", json= {
                    "cpu_usage": self.performance_metrics["cpu"],
                    "memory_usage": self.performance_metrics["memory"]
                })
                res = res.json()
                if (res["success"] is False):
                    print("Failed to post performance metrics: " + res["message"]);
                
                
                
                await asyncio.sleep(60)
        threading.Thread(target = lambda: asyncio.run(monitor())).start()
        pass
    
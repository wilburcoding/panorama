# panorama sdk files
import sys
import requests
import platform
import traceback


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

    def __init__(self):
        pass

    def init(self, config):
        if (self.initialized):
            print("PanoramaClient is already initialized.")
            return
        config_id = config.get("id")
        if (config_id is None):
            print("Configuration must include a deployment ID.")
            return

        config_api_key = config.get("api_key")
        if (config_api_key is None):
            print("Configuration must include an API key.")
            return
        res = requests.post("http://localhost:3000/api/deployments/" + str(config_id) + "/connect", json={
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
                print("Failed to connect to Panorama server: " + rjson["message"])
            
        else:
            print("Failed to connect to Panorama server: \nStatus code: " + str(res.status_code) + "\nResponse: " + res.text)
            
        
    def _post_error(self, error_title, stack_trace):
        stack_trace_str = "\n".join(stack_trace)
        res = requests.post("http://localhost:3000/api/deployments/" + str(self.delpoyment_id) + "/errors", json= {
            "deployment_id": self.deplyoment_id,
            "title": error_title,
            "stack_trace": stack_trace_str,
            "environment": self.environment,
            "breadcrumbs": self.breadcrumbs,
            "performance_metrics": self.performance_metrics  
        })
        res = res.json()
        print(res)
        
        
    def handle_exception(self, exc_type, exc_value, exc_traceback):
        stack_trace = [s.strip() for s in traceback.format_tb(exc_traceback)]
        self._post_error(str(exc_value)[0].upper() + str(exc_value)[1:], stack_trace)
        
    def setupHandlers(self):
        # create global error handlers
        sys.excepthook = self.handle_exception
        
    
    def performanceMonitoring(self):
        # create performance monitoring loop
        pass
import axios from 'axios';

class PanoramaClient {
    initialized = false;
    version = null;
    api_key = null;
    environment = null;
    id = null;
    queue = [];
    breadcrumbs = []; // later feature
    max_breadcrumbs = 20;
    post_interval = 5000;


    constructor() {
    
    }

    async init({ api_key, id }) {
        if (this.initialized) {
            console.warn('PanoramaClient is already initialized');
            return;
        }
        
        this._setupHandlers();
        this._postBreadcrumbs();

    
        await axios.post("http://localhost:3000/api/deployments/" + id + "/connect", {
            id: id,
            api_key: api_key,
        }).then((response) => {
            if (response.data.success) {
                console.log("Connected to Panorama backend");
                this.api_key = api_key;
                this.id = id;
                this.initialized = true;
                this.environment = response.data.deployment.environment;
                this.version = response.data.deployment.version;
                // console.log("Deployment: ", response.data.deployment);
            } else {
                console.error("Failed to connect to Panorama backend: " + response.data.message);
            }
        }).catch((error) => {
            console.error("Failed to connect to Panorama backend:", error);
        });


        


        
    }

    captureError({}) {
        // TODO: get error information and post to backend
    }

    addBreadcrumb({}) {
    }




    _setupHandlers() {
        // watch process for uncaught exceptions and unhandled rejections
        process.on("uncaughtException", (err) => {
        })

        process.on("unhandledRejection", (reason, promise) => {
        })

    }

    _postBreadcrumbs() {
        // continuously post errors from queue
        setInterval(async () => {
            if (this.queue.length === 0) {
                return;
            }   
            

        }, post_interval);
        
    }



}

export default PanoramaClient;
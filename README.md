# Panorama
Goal: Performance monitoring, error catching, general logging, and statistics collecting across projects



# TODO
 - [ ] express for the api / site
   - [ ] do database stuff using better-sqlite
     - [x] tables for errors, logs, metrics
     - [x] Setup schema
     - [x] Database reset function
     - [x] Handle users
       - [x] Figure out how to securely store passwords using bcryptjs
     - [x] Sample data
   - [ ] Setup API endpoints
     - [x] CRUD operations for projects
     - [x] CRUD operations for deployments
     - [x] CRUD operations for error_events (paginated) (with filtering options)
     - [x] Operations to get singular projects/deployments/error_events
     - [ ] Input sanitazation (i think i spelled it wrong)
     - [x] Handle user account creation
     - [x] Handle user credentials check
 - [ ] javascript sdk -> going to start with a js sdk first
   - [x] initiate
   - [ ] track errors
     - [ ] incorporate data straight from node.js error catching
     - [ ] track breadcrumbs 
   - [ ] track logs
   - [ ] track metrics
   - [ ] track performance
 - [ ] python sdk
 - [ ] web app
   - [ ] UI
     - [ ] Home page
     - [ ] Dashboard
     - [ ] user signin/create account
   - [x] User signup + sign in base functionality
     - [x] Check if user is logged in already
     - [x] Handle sessions 
   - [ ] Dashboard
     - [ ] Sidebar 
       - [x] Sidebar layout
       - [x] Populate sidebar project list
       - [ ] Sidebar project list functionality
     - [x] main dashboard page
       - [x] Dashboard layout
         - [x] Stacked bar graph
       - [x] dashboard populating
       - [ ] interactive dashboard functions
     - [x] project overview 
       - [x] Cards for each project
       - [x] Dynamically populate
       - [x] Functionality -> mainly the timeline
     - [ ] project detail page
       - [x] Project detail page layout
       - [x] Populate data 
       - [ ] Project detail page functionality
         - [ ] Project details editing
     - [x] deployment detail page
       - [x] Deployment detail page layout
       - [x] Populate data
       - [x] page functionality
         - [x] Error events sorting functionality
     - [ ] error event detail page
       - [ ] page layout
       - [ ] populate data
       - [ ] functionality (mainly just changing status + deleting)
     - [ ] user account management
     - [x] Functionality to switch between pages
       - [ ] Loading animation to prevent weird UI glitches from being seen
     - [ ] Switch to async/await instead of promises
   - [ ] Toast messages



# IDEA DUMP

Using SQLite as a local database to keep it simple. Maybe use something like MongoDB in the future? idk 

How users would use this
 - Install SDK 
 - Call function to begin monitoring with an API url 
 - Users install SDK in other project
 - Users use the API url to send data to other service
 - Users can launch dashboard from the monitoring service to view data
 - ....

Deployment version should be (eventually) based on Github repo commits but for now, defaults to v1
Website planning:
 - Make a website logo (eventually)
 - Minimalistic theme?  Scrap that I'm taking on neobrutalism
 - Colors 
   - White
   - MIdish blue #2c69ed
   - Green #31a047
   - Dark yellow? #cbd23e
   - Gray: #9B9B9B
   - Light blue #96C5FF
   - Light green: #7fd58f
   - Light gray: rgb(186, 186, 186);
   - Light red: rgb(245, 140, 140);
 - Keep it simple probably
 - Pages
   - Home page
     - Show heading + options to create an account or login
   - Log in / sign up page
     - Dialog + input areas + buttons to create an account or login
   - Dashboard
     - Sidebar menu with options for
       - Home page (summary of projects, deployments, recent events)
         - Top card layer with active project count, new error count, 
         - Second layer -> large past errors timeline 
         - Third layer -> Condensed list of projects underneath 
       - List of projects
         - Card list of projects with basic overview
         - Project overview
           - Show statics regarding project
             - project description + environment
             - number of issues
             - percent issues resolved
             - most recent issues bar chart based on deployment
           - Single project page
             - Big info box on top -> description, creation date, settings options (another card to the right), stuff like that
             - General overview of errors (timeline + statistics)
             - List of deployments 
       - Deployment information
         - top row -> all deployment information (version, name, environment, status)
           - mid row and beyond -> full list of error events
             - Search options -> text based 
               - Use queries
               - Only going to have a status query FOR NOW (bcs no other one really works)
                 - Ex. status:active
             - Edit error_events -> change status, delete
       - Error information
         - Basically show everything that is available about the event
         - Options to delete, tag
       - Settings
         - With user account options

# NOTES

Used a tiny bit of Claude to work out the database stuff but I think I figured it out

Timeline:
- [ ] API
- [ ] dashboard
- [ ] SDK
- [ ] dashboard functionality
- [ ] testing

Color for database schema should be in HEX
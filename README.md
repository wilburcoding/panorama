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
     - [ ] Check if user is logged in already
     - [ ] Handle sessions
   - [ ] Dashboard
     - [ ] project list page
     - [ ] project detail page
     - [ ] user account management



# IDEA DUMP

Using SQLite as a local database to keep it simple. Maybe use something like MongoDB in the future? idk 

How users would use this
 - Install SDK 
 - Call function to begin monitoring with an API url 
 - Users install SDK in other project
 - Users use the API url to send data to other service
 - Users can launch dashboard from the monitoring service to view data
 - ....

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
   - Light green: #47a558
 - Keep it simple probably
 - Pages
   - Home page
     - Show heading + options to create an account or login
   - Log in / sign up page
     - Dialog + input areas + buttons to create an account or login
   - Dashboard
     - Sidebar menu with options for
       - Home page (summary of projects, deployments, recent events);
       - List of projects
         - Card list of projects with basic overview
         - Open project page
           - Show statics regarding project
           - List of deployments 
           - Settings
       - Deployment information
         - Show some basic information and statistics
         - list of error events
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

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
 - [x] javascript sdk -> going to start with a js sdk first
   - [x] initiate
   - [x] track errors
     - [x] incorporate data straight from node.js error catching
     - [x] track breadcrumbs 
     - [x] avoid recent duplicate errors
       - [x] count recent duplicates
   - [x] track metrics
   - [x] track performance
     - [x] Metrics
       - [x] Backend (SDK + API) functionality
       - [x] CLient side UI/UX
     - [x] Benchmarking
       - [x] Backend (SDK + API) functionality
       - [x] Client side UI/UX 
   - [x] sample project for testing sdk
     - [x] basic usage (initialization, post error)
     - [x] breadcrumbs?
     - [x] performance metrics
     - [x] Full rewrite -> make a sample api project with endpoints to test different features
       - [x] post errors with breadcrumbs (multiple types)
       - [x] benchmark testing
 - [x] python sdk
   - [x] initiate
   - [x] track errors
     - [x] catch all uncaught python errors
     - [x] track breadcrumbs
     - [x] avoid recent duplicate errors
       - [x] count recent duplicates
   - [x] track performance metrics
     - [x] system metrics
     - [x] benchmarks
   - [x] sample project for testing sdk
     - [x] post errors with breadcrumbs (multiple types)
     - [x] benchmark testing
 - [ ] web app
   - [x] User signup + sign in base functionality
     - [x] Check if user is logged in already
     - [x] Handle sessions 
   - [ ] Dashboard
     - [x] Sidebar 
       - [x] Sidebar layout
       - [x] Populate sidebar project list
       - [x] Sidebar project list functionality
     - [x] main dashboard page
       - [x] Dashboard layout
         - [x] Stacked bar graph
       - [x] dashboard populating
       - [x] interactive dashboard functions
     - [ ] project overview 
       - [x] Cards for each project
       - [x] Dynamically populate
       - [x] Functionality -> mainly the timeline
         - [x] Project creating
     - [ ] project detail page
       - [x] Project detail page layout
       - [x] Populate data 
       - [x] Project detail page functionality
         - [x] Project details editing (only description and name)
         - [x] Deployment creation
         - [x] Deleting project functionality
     - [x] deployment detail page
       - [x] Deployment detail page layout
         - [ ] logs UI
       - [x] Populate data
       - [x] page functionality
         - [x] Error events sorting functionality
         - [x] Changing deployment name, status, environment, version
         - [x] Error list functionality (deleting multiple)
           - [x] Updating multiple items functionality 
         - [x] Deleting project functionality
         - [ ] logs functionality
           - [ ] searching logs
           - [ ] deleting logs
     - [ ] error event detail page
       - [x] page layout
       - [x] populate data
       - [x] functionality (mainly just deleting)
         - [x] Handle user posting updates to keep track of progress
     - [x] user account management
       - [x] Change account password
       - [x] Change account name
     - [x] Functionality to switch between pages
       - [ ] Loading animation to prevent weird UI glitches from being seen
     - [ ] Back buttons for each page
     - [ ] More security for requests (require session_id)
   - [ ] Toast messages
   - [x] Modal
     - [x] Modal layout and styling
     - [ ] Modal functionality
   - [ ] In site info
     - [ ] Deployment guide
     - [ ] Feature info
 - [ ] Additional features + Bug fixes
   - [ ] Plugin feature for additional stuff
     - [ ] unified logging
     - [ ] cron/uptime monitoring
   - [ ] Restructuring plan
     - [ ] Reorganize UI
       - [x] Sidebar improvements
       - [ ] Error events has multiple pages for different features (performance)
         - [x] Overview pages should include information on everything
         - [ ] Reduce clutter
     - [ ] Restructure how deployments work
       - [ ] Deployment types
     - [ ] More interactive elements
       - [ ] Interactive deployment creation guide
       - [ ] Interactive account creation guide
   - [ ] Improved backend monitoring? (record requests data?)



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
         - Options to delete, tag, update
         - Update UI + functionality
       - Settings 
         - UI
           - Singular card with account infmoration
           - Bottom row with buttons for actions
         - With user account options
           - CHange password
           - More TBD (maybe display name options in the future?)
   - Modal
     - From program -> calls modal function (which is a promise)
     - Wait till promise is fulfilled
     - Return data with promise

SDK planning
 - Finding duplicate errors:
   - SDK client itself keeps list of last one hour of errors -> should keep individual clients from spamming
   - Checks on actual API side for all individual clients -> this is where the actual similar event counting is going to be

Big Restructuring Plan 
 - Issues right now
   - Not a lot of room for additions (Both frontend/backend is completely centered around error events)
   - Navigation is difficult -> going between error events and deployments is difficult
   - Not very user friendly -> lacking information + guidance
   - Doesn't cater to different types of projects (doesn't have options for like backend, frontend, full stack stuff like that) 
 - Changes planned
   - Reorganize UI
     - Projects into different tabs
   - Side bar improvements
   - interactive guides in places where needed
     - based on project type selected
 - New layouts!!
  - Overview tab of deployments
    - First row -> basic deployment information
      - Settings button near it was originally
    - Second row -> errors list (chart + recent errors list) 
      - Option to enable + description if not enabled
    - Third row -> performance overview (cpu + memory usage chart or site loading statistics)
      - Option to enable + description if not enabled
      - Backend -> show cpu / memory info
        - graphs for both
      - Frontend -> core web vitals data
        - show statistics (TTFB, FCP, LCP)
        - response times over time chart
    - Fourth row -> uptime overview (list of tracking location statuses + last 24 hours statistics, overall statistics next to it)
      - Option to enable + desription if not enabled
  - Performance tab of deployments
    - Based on type of performance tracking (backend or frontend)
      - Backend performance monitoring
        - first row -> cpu graph + memory graph
        - second row -> benchmarks (example: api post latency or duration)
      - Frontend performance monitoring
        - Core web vitals data (cards with numbers) overall 
        - Graphs of important metrics (LCP) over time 
        - List of pages with worst performance numbers
      - need to refine some of these metrics to be actually worthwhile
  - Errors tab of deployments
    - Header container with error list basic details 
    - first row -> maybe timeline + some statistics
    - second row -> list of errors (with the options that were there before -> select, delete)
  - Uptime tab of deployments
    - header container with uptime basic details
    - first row -> basic charts + statitsics
    - second row -> history (maybe like a timeline grid Github style?) 
    - third row -> list of active monitoring services 
  - Settings tab of deployments
    - Similar to settings format
# NOTES

Used a tiny bit of Claude to work out the database stuff but I think I figured it out

Timeline:
- [x] API
- [x] dashboard
- [ ] SDK
- [x] dashboard functionality
- [ ] testing

Color for database schema should be in HEX
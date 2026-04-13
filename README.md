# Panorama
Goal: Performance monitoring, error catching, general logging, and statistics collecting across projects



# TODO
 - [ ] express for the api / site
   - [ ] do database stuff using better-sqlite
     - [ ] tables for errors, logs, metrics
     - [x] Setup schema
     - [x] Database reset function
   - [ ] Setup API endpoints
     - [x] CRUD operations for projects
     - [x] CRUD operations for deployments
     - [x] CRUD operations for error_events (paginated) (with filtering options)
     - [ ] Operations to get singular projects/deployments/error_events
     - [ ] Input sanitazation (i think i spelled it wrong)
 - [ ] javascript sdk -> going to start with a js sdk first
   - [ ] track errors
   - [ ] track logs
   - [ ] track metrics
   - [ ] track performance
 - [ ] python sdk



# IDEA DUMP

Using SQLite as a local database to keep it simple. Maybe use something like MongoDB in the future? idk 

How users would use this
 - Install SDK 
 - Call function to begin monitoring with an API url 
 - Users install SDK in other project
 - Users use the API url to send data to other service
 - Users can launch dashboard from the monitoring service to view data
 - ....

# NOTES

Used a tiny bit of Claude to work out the database stuff but I think I figured it out

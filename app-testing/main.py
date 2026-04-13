import requests

r = requests.post("http://localhost:3000/api/projects", json={
    "name": "Test Project",
    "environment": "production",
    
})

print(r.json())

g = requests.get("http://localhost:3000/api/projects")
print(g.json())




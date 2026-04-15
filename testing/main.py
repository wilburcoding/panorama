import requests

r = requests.post("http://localhost:3000/api/deployments", json={
    "project_id": 1,
    "version": "1.0.0",
    "environment": "production",
})

print(r.json())

g = requests.get("http://localhost:3000/api/deployments")
print(g.json())




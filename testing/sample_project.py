import python_sdk

print("Successfully imported PanoramaClient")
client = python_sdk.PanoramaClient()
client.init({
    "id": 1,
    "api_key": "sample_api_key_1_0"
})

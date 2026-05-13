import python_sdk

print("Successfully imported PanoramaClient")
client = python_sdk.PanoramaClient()
client.init({
    "id": 1,
    "api_key": "sample_api_key_1_0"
})

try:
    raise Exception("this is a test exception")
except Exception as e:
    print("capturing error")
    client.capture_error(e)

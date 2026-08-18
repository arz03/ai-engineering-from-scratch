# import os
# import urllib.request
# import json

# api_key = os.environ.get('apikey')
# print('key', api_key)
# api_url = "https://api.groq.com/openai/v1/chat/completions"
# model="openai/gpt-oss-120b"


# headers = {
#     "Content-Type": "application/json",
#     "Authorization": f"Bearer {api_key}"
# }
# body = json.dumps({
#     "model": model,
#     "messages": [{"role": "user", "content": "What is a neural network in one sentence?"}],
# }).encode()

# req = urllib.request.Request(api_url, data=body, headers=headers, method="POST")
# with urllib.request.urlopen(req) as resp:
#     result = json.loads(resp.read())
#     print(result["choices"][0]["message"]["content"])
# print('='*8)
# print(req)


import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from .env
groq_api_key = os.getenv("apikey")

# Endpoint for chat completions
url = "https://api.groq.com/openai/v1/chat/completions"

# Headers with authorization
headers = {
    "Authorization": f"Bearer {groq_api_key}",
    "Content-Type": "application/json"
}

# Request payload
payload = {
    "model": "openai/gpt-oss-120b",  # Replace with desired model
    "messages": [
        {"role": "user", "content": "Explain the importance of fast language models"}
    ]
}

# Make the request
response = requests.post(url, headers=headers, json=payload)
# Print the response
result=response.json()["choices"][0]["message"]["content"]
print(result)

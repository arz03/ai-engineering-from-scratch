import os, requests
apikey=os.environ.get('apikey')
url="https://api.groq.com/openai/v1/chat/completions"

headers = {
    'Authorization' : f'Bearer {apikey}',
    'Content-Type': 'application/json'
}

body = {
    'model' : 'openai/gpt-oss-120b',
    "messages": [{
      "role": "user",
      "content": "who are you?"
    }]
}

resp=requests.post(headers=headers,url=url,json=body)
print(resp.json()['choices'][0]['message']['content'])
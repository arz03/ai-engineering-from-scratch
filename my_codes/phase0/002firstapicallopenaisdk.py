import os
from openai import OpenAI

apikey=os.environ.get('apikey')
url="https://api.groq.com/openai/v1"

client = OpenAI(
    api_key=apikey,
    base_url=url
)
res = client.responses.create(
    input='who are you?',
    model='openai/gpt-oss-20b'
)
print(res)
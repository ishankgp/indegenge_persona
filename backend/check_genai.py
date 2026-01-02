import google.ai.generativelanguage as glm
import sys

try:
    client = glm.RetrieverServiceClient
    print(f"Client methods: {[m for m in dir(client) if 'query' in m or 'search' in m]}")
except Exception as e:
    print(f"Error: {e}")

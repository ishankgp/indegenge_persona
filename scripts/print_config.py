import os, json, socket
from pathlib import Path

CONFIG = {
    'BACKEND_HOST': os.environ.get('BACKEND_HOST'),
    'BACKEND_PORT': os.environ.get('BACKEND_PORT', '8000'),
    'DATABASE_URL': os.environ.get('DATABASE_URL'),
    'OPENAI_MODEL': os.environ.get('OPENAI_MODEL'),
    'HAS_OPENAI_KEY': bool(os.environ.get('OPENAI_API_KEY')),
}

print("=== Effective Backend Configuration ===")
for k, v in CONFIG.items():
    if k == 'DATABASE_URL' and v and '///' in v:
        print(f"{k}: {v} (resolved path: {Path(v.split('///')[-1]).resolve() if v.startswith('sqlite') else v})")
    elif k == 'HAS_OPENAI_KEY':
        print(f"OPENAI_API_KEY set: {v}")
    else:
        print(f"{k}: {v}")

# Quick socket test
host = CONFIG['BACKEND_HOST'] or '0.0.0.0'
port = int(CONFIG['BACKEND_PORT'])
print('\nSocket bind test (dry run):', host, port)
try:
    s = socket.socket()
    s.bind(('', 0))
    s.close()
    print('Socket environment OK')
except Exception as e:
    print('Socket test failed:', e)

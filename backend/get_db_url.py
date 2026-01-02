with open('railway_vars.txt', 'rb') as f:
    try:
        content = f.read().decode('utf-16')
    except:
        content = f.read().decode('utf-8', errors='ignore')
        
    for line in content.splitlines():
        if 'DATABASE_URL=' in line:
            print(line.strip())
            break

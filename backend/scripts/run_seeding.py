import os
import sys

# Add current dir to path
sys.path.append(os.getcwd())

def get_env_vars():
    db_url = None
    try:
        with open('railway_vars.txt', 'rb') as f:
            try:
                content = f.read().decode('utf-16')
            except:
                content = f.read().decode('utf-8', errors='ignore')
                
        for line in content.splitlines():
            if 'DATABASE_URL=' in line:
                db_url = line.strip().replace('DATABASE_URL=', '')
                break
    except Exception as e:
        print(f"Error reading vars: {e}")
    return db_url

def main():
    print("🚀 Starting Seeding Runner...")
    
    # 1. Load Env Vars
    db_url = get_env_vars()
    if not db_url:
        print("❌ Could not find DATABASE_URL in railway_vars.txt")
        return

    print(f"✅ Loaded DATABASE_URL: {db_url[:20]}...")
    os.environ['DATABASE_URL'] = db_url.strip()
    
    # Set OpenAI Key (from environment or railway_vars.txt)
    openai_key = os.getenv('OPENAI_API_KEY')
    if not openai_key:
        # Try reading from railway_vars.txt
        try:
            with open('railway_vars.txt', 'rb') as f:
                try:
                    content = f.read().decode('utf-16')
                except:
                    content = f.read().decode('utf-8', errors='ignore')
            for line in content.splitlines():
                if 'OPENAI_API_KEY=' in line:
                    openai_key = line.strip().replace('OPENAI_API_KEY=', '')
                    break
        except:
            pass
    
    if openai_key:
        os.environ['OPENAI_API_KEY'] = openai_key
        print("✅ Loaded OPENAI_API_KEY")
    else:
        print("⚠️  OPENAI_API_KEY not found, some operations may fail")
    
    # 2. Run Setup Mounjaro
    # try:
    #     print("\n--- Running setup_mounjaro.py ---")
    #     import setup_mounjaro
    #     setup_mounjaro.setup_mounjaro_brand()
    # except Exception as e:
    #     print(f"❌ setup_mounjaro failed: {e}")
    #     import traceback
    #     traceback.print_exc()

    # 3. Run Create Personas
    try:
        print("\n--- Running create_sample_personas.py ---")
        import create_sample_personas
        create_sample_personas.create_personas()
    except Exception as e:
        print(f"❌ create_sample_personas failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

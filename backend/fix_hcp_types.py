import requests

BASE_URL = "http://127.0.0.1:8000"

def fix_hcp_types():
    # IDs 2, 3, 4 are the new ones based on previous output
    hcp_ids = [2, 3, 4]
    
    for pid in hcp_ids:
        print(f"Updating Persona {pid} to HCP...")
        try:
            payload = {"persona_type": "HCP"}
            res = requests.put(f"{BASE_URL}/api/personas/{pid}", json=payload)
            if res.status_code == 200:
                print(f"✅ Persona {pid} updated to HCP")
            else:
                print(f"❌ Failed to update {pid}: {res.text}")
        except Exception as e:
            print(f"❌ Error updating {pid}: {e}")

if __name__ == "__main__":
    fix_hcp_types()

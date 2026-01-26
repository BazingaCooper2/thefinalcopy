from supabase import create_client, Client
import json

url = "https://asbfhxdomvclwsrekdxi.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYmZoeGRvbXZjbHdzcmVrZHhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyMjc5NSwiZXhwIjoyMDY5ODk4Nzk1fQ.iPXQg3KBXGXNlJwMzv5Novm0Qnc7Y5sPNE4RYxg3wqI"

supabase: Client = create_client(url, key)

print("--- LATEST INCIDENT REPORTS ---")
# Get last 5 incidents
res = supabase.table("incident_reports").select("*").order("id", desc=True).limit(5).execute()
for item in res.data:
    print(f"ID: {item.get('id')}")
    print(f"  incident_location (DB): {item.get('incident_location')}")
    print(f"  created_at: {item.get('created_at')}")
    print("-" * 20)

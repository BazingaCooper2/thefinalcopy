from supabase import create_client, Client
import json

url = "https://asbfhxdomvclwsrekdxi.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYmZoeGRvbXZjbHdzcmVrZHhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyMjc5NSwiZXhwIjoyMDY5ODk4Nzk1fQ.iPXQg3KBXGXNlJwMzv5Novm0Qnc7Y5sPNE4RYxg3wqI"

supabase: Client = create_client(url, key)

print("--- INJURY REPORTS ---")
res1 = supabase.table("injury_reports").select("*").execute()
print(f"Count: {len(res1.data)}")

print("\n--- HAZARD REPORTS ---")
res2 = supabase.table("hazard_near_miss_reports").select("*").execute()
print(f"Count: {len(res2.data)}")

print("\n--- INCIDENT REPORTS ---")
res3 = supabase.table("incident_reports").select("*").execute()
print(json.dumps(res3.data, indent=2))

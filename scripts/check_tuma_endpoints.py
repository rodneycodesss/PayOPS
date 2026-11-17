import httpx
from pathlib import Path

env_file = Path(".env")
config = {}
with open(env_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            config[k.strip()] = v.strip().strip('"').strip("'")

email = config["TUMA_BUSINESS_EMAIL"]
api_key = config["TUMA_API_KEY"]
base_url = config.get("TUMA_BASE_URL", "https://api.tuma.co.ke").rstrip("/")

with httpx.Client(timeout=10.0) as client:
    auth_res = client.post(f"{base_url}/auth/token", json={"email": email, "api_key": api_key})
    token = auth_res.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    print("Token obtained. Testing endpoints...")

    endpoints = [
        ("GET", "/payment/transactions"),
        ("GET", "/payments"),
        ("GET", "/transactions"),
        ("GET", "/payment/stk-push/status"),
        ("GET", "/payment/status"),
        ("GET", "/payment/history"),
        ("GET", "/businesses"),
        ("GET", "/shops"),
        ("GET", "/shop"),
    ]

    for method, ep in endpoints:
        try:
            r = client.request(method, f"{base_url}{ep}", headers=headers)
            print(f"{method:4} {ep:25} -> {r.status_code} | {r.text[:100]}")
        except Exception as e:
            print(f"{method:4} {ep:25} -> ERR: {e}")

#!/usr/bin/env python3
"""
ShipSafe - Configure Supabase OAuth Providers via Management API / CLI
Usage:
  python scripts/update_oauth_credentials.py --provider github --client-id <id> --secret <secret>
  python scripts/update_oauth_credentials.py --provider google --client-id <id> --secret <secret>
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "okbryysoxihmamujoipb")
SUPABASE_MANAGEMENT_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")

def update_oauth(provider: str, client_id: str, client_secret: str):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth"
    
    if provider.lower() == "google":
        payload = {
            "external_google_enabled": True,
            "external_google_client_id": client_id,
            "external_google_secret": client_secret,
            "external_google_skip_nonce_check": True
        }
    elif provider.lower() == "github":
        payload = {
            "external_github_enabled": True,
            "external_github_client_id": client_id,
            "external_github_secret": client_secret
        }
    else:
        print(f"Error: Unsupported provider '{provider}'. Must be 'google' or 'github'.")
        sys.exit(1)

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {SUPABASE_MANAGEMENT_TOKEN}",
            "Content-Type": "application/json"
        },
        method="PATCH"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[OK] Successfully updated {provider.upper()} OAuth settings on Supabase ({PROJECT_REF})!")
            print(f"     Enabled: {data.get(f'external_{provider.lower()}_enabled')}")
            print(f"     Client ID: {data.get(f'external_{provider.lower()}_client_id')}")
            return True
    except urllib.error.HTTPError as e:
        print(f"[ERROR] HTTP {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Failed to update config: {e}")
        sys.exit(1)

def get_status():
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {SUPABASE_MANAGEMENT_TOKEN}"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("\n=== Current Supabase OAuth Status ===")
        print(f"Google Enabled: {data.get('external_google_enabled')}")
        print(f"Google Client ID: {data.get('external_google_client_id')}")
        print(f"GitHub Enabled: {data.get('external_github_enabled')}")
        print(f"GitHub Client ID: {data.get('external_github_client_id')}")
        print("=====================================\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Configure Supabase OAuth Providers")
    parser.add_argument("--provider", choices=["google", "github"], help="OAuth provider")
    parser.add_argument("--client-id", help="OAuth Client ID")
    parser.add_argument("--secret", help="OAuth Client Secret")
    parser.add_argument("--status", action="store_true", help="Print current OAuth status")
    
    args = parser.parse_args()
    
    if args.status or (not args.provider and not args.client_id):
        get_status()
    elif args.provider and args.client_id and args.secret:
        update_oauth(args.provider, args.client_id, args.secret)
        get_status()
    else:
        parser.print_help()

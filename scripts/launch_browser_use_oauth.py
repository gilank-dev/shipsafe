#!/usr/bin/env python3
"""
ShipSafe - Browser-Use OAuth Setup Assistant
Launches a visible browser window directly to:
1. Supabase Auth Providers: https://supabase.com/dashboard/project/okbryysoxihmamujoipb/auth/providers
2. GitHub New OAuth App: https://github.com/settings/applications/new
3. Google Cloud Credentials: https://console.cloud.google.com/apis/credentials/oauthclient
"""

import sys
import subprocess
from playwright.sync_api import sync_playwright

CALLBACK_URL = "https://okbryysoxihmamujoipb.supabase.co/auth/v1/callback"
HOMEPAGE_URL = "https://shipsafe.lankdev.my.id"

def launch_setup_browser():
    print("\n[ShipSafe] Launching Browser for OAuth Provider Configuration...")
    print(f"Callback URL to copy: {CALLBACK_URL}")
    print(f"Homepage URL:        {HOMEPAGE_URL}\n")
    
    with sync_playwright() as p:
        # Launch visible Chromium browser
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        
        # Page 1: Supabase Dashboard
        page1 = context.new_page()
        page1.goto("https://supabase.com/dashboard/project/okbryysoxihmamujoipb/auth/providers")
        
        # Page 2: GitHub New OAuth Application
        page2 = context.new_page()
        page2.goto("https://github.com/settings/applications/new")
        
        print("[ShipSafe] Browser opened successfully with 2 tabs:")
        print("  Tab 1: Supabase Auth Providers (okbryysoxihmamujoipb)")
        print("  Tab 2: GitHub Register a new OAuth Application")
        print("\nFill in GitHub OAuth App:")
        print("  - Application name: ShipSafe")
        print(f"  - Homepage URL: {HOMEPAGE_URL}")
        print(f"  - Authorization callback URL: {CALLBACK_URL}")
        print("\nOnce you generate the Client ID and Client Secret, run:")
        print("  python scripts/update_oauth_credentials.py --provider github --client-id <ID> --secret <SECRET>")
        print("  python scripts/update_oauth_credentials.py --provider google --client-id <ID> --secret <SECRET>")
        print("\nPress Ctrl+C or close browser when done.\n")
        
        try:
            # Keep browser alive until user closes it
            page1.wait_for_timeout(300000) # 5 minutes timeout
        except KeyboardInterrupt:
            print("[ShipSafe] Closing browser.")
        finally:
            browser.close()

if __name__ == "__main__":
    launch_setup_browser()

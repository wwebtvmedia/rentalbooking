#!/usr/bin/env python3
import argparse
import requests
import json
import os
import sys
from datetime import datetime, timedelta

TOKEN_FILE = ".rental_cli_token"

class RentalCLI:
    def __init__(self, base_url, token=None):
        self.base_url = base_url.rstrip('/')
        self.token = token or os.getenv("RENTAL_TOKEN") or self._load_token()
        self.session = requests.Session()
        if self.token:
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})

    # ... (other methods)

    # UCP
    def ucp_discover(self, capability_hash):
        res = self.session.get(f"{self.base_url}/ucp/discover", params={"capabilityHash": capability_hash})
        return self._handle_response(res)

    def ucp_register(self, item_id, capability_hash, base_rate):
        payload = {
            "itemId": item_id,
            "capabilityHash": capability_hash,
            "baseRate": base_rate
        }
        res = self.session.post(f"{self.base_url}/ucp/register", json=payload)
        return self._handle_response(res)

    def ucp_checkout(self, ucp_id, mandate_id):
        payload = {
            "ucpId": ucp_id,
            "paymentMandateId": mandate_id
        }
        res = self.session.post(f"{self.base_url}/ucp/checkout", json=payload)
        return self._handle_response(res)

    def _save_token(self, token):
        self.token = token
        with open(TOKEN_FILE, "w") as f:
            f.write(token)
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def _load_token(self):
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, "r") as f:
                return f.read().strip()
        return None

    def _clear_token(self):
        """Destroy the local session: remove the cached token and drop the auth header."""
        existed = os.path.exists(TOKEN_FILE)
        if existed:
            os.remove(TOKEN_FILE)
        self.token = None
        self.session.headers.pop("Authorization", None)
        return existed

    def _handle_response(self, response):
        try:
            response.raise_for_status()
            if response.status_code == 204:
                return None
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"Error: {e}")
            try:
                print(f"Details: {json.dumps(response.json(), indent=2)}")
            except:
                print(f"Response: {response.text}")
            sys.exit(1)

    # System
    def version(self):
        res = self.session.get(f"{self.base_url}/version")
        return self._handle_response(res)

    # Auth
    def login(self, email, role="guest", name="CLI User", invite_code=None):
        # Start every login from a clean slate so a failed/partial login never
        # leaves a stale token behind (which would make later calls look like the
        # wrong user is still signed in).
        self._clear_token()
        print(f"Requesting magic link for {email} ({role})...")
        payload = {"email": email, "role": role, "fullName": name}
        if invite_code:
            payload["inviteCode"] = invite_code
        res = self.session.post(f"{self.base_url}/auth/magic", json=payload)
        data = self._handle_response(res)

        if "token" in data:
            print("Received magic token (Test Mode). Verifying...")
            return self.verify_token(data["token"])
        else:
            # Production: the link is emailed, no token comes back over the API.
            print(data.get("message", "Magic link sent."))
            print("Check the inbox for the sign-in link, then run:")
            print("    python cli.py auth verify <TOKEN_FROM_LINK>")
            print("(The token is the ?token=... value in the magic-callback URL.)")
            return None

    def verify_token(self, token):
        res = self.session.post(f"{self.base_url}/auth/magic/verify", json={"token": token})
        data = self._handle_response(res)
        self._save_token(data["token"])
        print(f"Successfully logged in as {data['user']['fullName']} ({data['user']['role']})")
        return data

    def logout(self):
        """Destroy the local session token."""
        if self._clear_token():
            print(f"Logged out. Removed {TOKEN_FILE}.")
        else:
            print("No active session to log out from.")

    def status(self):
        """Show whether a session token is cached and whether it is still valid."""
        if not self.token:
            print("Not logged in (no cached token).")
            return
        res = self.session.get(f"{self.base_url}/auth/me")
        if res.status_code == 200:
            me = res.json()
            roles = ", ".join(me.get("roles", [])) or "(none)"
            print(f"Logged in as {me.get('email')} (roles: {roles})")
        else:
            print(f"Cached token is no longer valid (HTTP {res.status_code}). Run 'auth logout' then log in again.")

    def me(self):
        res = self.session.get(f"{self.base_url}/auth/me")
        return self._handle_response(res)

    # Apartments
    def list_apartments(self):
        res = self.session.get(f"{self.base_url}/apartments")
        return self._handle_response(res)

    def get_apartment(self, apt_id):
        res = self.session.get(f"{self.base_url}/apartments/{apt_id}")
        return self._handle_response(res)

    def create_apartment(self, name, address, price, description=""):
        payload = {
            "name": name,
            "address": address,
            "pricePerNight": price,
            "description": description,
            "smallDescription": description[:100]
        }
        res = self.session.post(f"{self.base_url}/apartments", json=payload)
        return self._handle_response(res)

    def delete_apartment(self, apt_id):
        res = self.session.delete(f"{self.base_url}/apartments/{apt_id}")
        return self._handle_response(res)

    # Bookings
    def list_bookings(self, apartment_id=None):
        params = {}
        if apartment_id:
            params["apartmentId"] = apartment_id
        res = self.session.get(f"{self.base_url}/bookings", params=params)
        return self._handle_response(res)

    def create_booking(self, apartment_id, start_date, end_date):
        payload = {
            "apartmentId": apartment_id,
            "start": start_date,
            "end": end_date
        }
        res = self.session.post(f"{self.base_url}/bookings", json=payload)
        return self._handle_response(res)

    def cancel_booking(self, booking_id):
        res = self.session.post(f"{self.base_url}/bookings/{booking_id}/cancel")
        return self._handle_response(res)

    # Admin
    def get_stats(self):
        res = self.session.get(f"{self.base_url}/admin/platform/stats")
        return self._handle_response(res)

    def get_customers(self):
        res = self.session.get(f"{self.base_url}/admin/platform/customers")
        return self._handle_response(res)

def main():
    parser = argparse.ArgumentParser(description="Rental Platform CLI")
    parser.add_argument("--url", default=os.getenv("BACKEND_URL", "http://localhost:4000"), help="Backend URL")
    
    subparsers = parser.add_subparsers(dest="command", help="Subcommands")

    # Auth
    auth_parser = subparsers.add_parser("auth", help="Authentication")
    auth_sub = auth_parser.add_subparsers(dest="subcommand")
    
    login_p = auth_sub.add_parser("login", help="Request magic link (supports test mode auto-login)")
    login_p.add_argument("email", help="User email")
    login_p.add_argument("--role", default="guest", help="Requested role")
    login_p.add_argument("--name", default="CLI User", help="Full name")
    login_p.add_argument("--invite", help="Invite code for staff roles")
    
    verify_p = auth_sub.add_parser("verify", help="Verify magic token")
    verify_p.add_argument("token", help="The token from magic link")

    auth_sub.add_parser("me", help="Get current user info")
    auth_sub.add_parser("logout", help="Destroy the local session (clear cached token)")
    auth_sub.add_parser("status", help="Show current login status and token validity")

    # Apt
    apt_parser = subparsers.add_parser("apt", help="Apartment Management")
    apt_sub = apt_parser.add_subparsers(dest="subcommand")
    apt_sub.add_parser("list", help="List all apartments")
    
    get_apt_p = apt_sub.add_parser("get", help="Get apartment details")
    get_apt_p.add_argument("id", help="Apartment ID or slug")
    
    create_apt_p = apt_sub.add_parser("create", help="Create new apartment (Admin)")
    create_apt_p.add_argument("--name", required=True)
    create_apt_p.add_argument("--address", required=True)
    create_apt_p.add_argument("--price", type=float, required=True)
    create_apt_p.add_argument("--desc", default="")
    
    del_apt_p = apt_sub.add_parser("delete", help="Delete apartment (Admin)")
    del_apt_p.add_argument("id")

    # Booking
    book_parser = subparsers.add_parser("booking", help="Booking Management")
    book_sub = book_parser.add_subparsers(dest="subcommand")
    
    list_book_p = book_sub.add_parser("list", help="List bookings")
    list_book_p.add_argument("--apt", help="Filter by apartment ID")
    
    create_book_p = book_sub.add_parser("create", help="Create booking")
    create_book_p.add_argument("--apt", required=True, help="Apartment ID")
    create_book_p.add_argument("--start", required=True, help="Start date (YYYY-MM-DD)")
    create_book_p.add_argument("--end", required=True, help="End date (YYYY-MM-DD)")
    
    cancel_book_p = book_sub.add_parser("cancel", help="Cancel booking")
    cancel_book_p.add_argument("id")

    # Admin
    admin_parser = subparsers.add_parser("admin", help="Admin functions")
    admin_sub = admin_parser.add_subparsers(dest="subcommand")
    admin_sub.add_parser("stats", help="Get platform stats")
    admin_sub.add_parser("customers", help="List customers")

    # UCP
    ucp_parser = subparsers.add_parser("ucp", help="Universal Commerce Platform")
    ucp_sub = ucp_parser.add_subparsers(dest="subcommand")
    
    discover_p = ucp_sub.add_parser("discover", help="Discover items")
    discover_p.add_argument("--hash", required=True, help="Capability hash")
    
    register_p = ucp_sub.add_parser("register", help="Register item for UCP")
    register_p.add_argument("--id", required=True, help="Item (Apartment) ID")
    register_p.add_argument("--hash", required=True, help="Capability hash")
    register_p.add_argument("--rate", type=float, required=True, help="Base rate")
    
    checkout_p = ucp_sub.add_parser("checkout", help="Initiate agentic checkout")
    checkout_p.add_argument("--ucp-id", required=True)
    checkout_p.add_argument("--mandate-id", required=True)

    # Version
    subparsers.add_parser("version", help="Show the version/build of the running backend")

    # Verify (Full system check)
    verify_sys_parser = subparsers.add_parser("verify-system", help="Run full API verification suite")
    verify_sys_parser.add_argument("--email", default="verify-bot@bestflats.vip", help="Admin email for verification")

    args = parser.parse_args()

    cli = RentalCLI(args.url)

    if args.command == "auth":
        if args.subcommand == "login":
            cli.login(args.email, args.role, args.name, args.invite)
        elif args.subcommand == "verify":
            cli.verify_token(args.token)
        elif args.subcommand == "me":
            print(json.dumps(cli.me(), indent=2))
        elif args.subcommand == "logout":
            cli.logout()
        elif args.subcommand == "status":
            cli.status()
            
    elif args.command == "apt":
        if args.subcommand == "list":
            print(json.dumps(cli.list_apartments(), indent=2))
        elif args.subcommand == "get":
            print(json.dumps(cli.get_apartment(args.id), indent=2))
        elif args.subcommand == "create":
            print(json.dumps(cli.create_apartment(args.name, args.address, args.price, args.desc), indent=2))
        elif args.subcommand == "delete":
            print(json.dumps(cli.delete_apartment(args.id), indent=2))
            
    elif args.command == "booking":
        if args.subcommand == "list":
            print(json.dumps(cli.list_bookings(args.apt), indent=2))
        elif args.subcommand == "create":
            print(json.dumps(cli.create_booking(args.apt, args.start, args.end), indent=2))
        elif args.subcommand == "cancel":
            print(json.dumps(cli.cancel_booking(args.id), indent=2))
            
    elif args.command == "admin":
        if args.subcommand == "stats":
            print(json.dumps(cli.get_stats(), indent=2))
        elif args.subcommand == "customers":
            print(json.dumps(cli.get_customers(), indent=2))
            
    elif args.command == "ucp":
        if args.subcommand == "discover":
            print(json.dumps(cli.ucp_discover(args.hash), indent=2))
        elif args.subcommand == "register":
            print(json.dumps(cli.ucp_register(args.id, args.hash, args.rate), indent=2))
        elif args.subcommand == "checkout":
            print(json.dumps(cli.ucp_checkout(args.ucp_id, args.mandate_id), indent=2))
            
    elif args.command == "version":
        print(json.dumps(cli.version(), indent=2))

    elif args.command == "verify-system":
        run_verification_suite(cli, args.email)
    else:
        parser.print_help()

def run_verification_suite(cli, email):
    print("=== Starting API Verification Suite ===")
    
    # 1. Auth Admin
    print("\n1. Authenticating as Admin...")
    cli.login(email, role="admin", name="Verification Bot")
    me = cli.me()
    roles_str = ", ".join(me.get("roles", []))
    print(f"Logged in as: {me['email']} (Roles: {roles_str})")
    
    # 2. Create Apartment
    print("\n2. Creating test apartment...")
    apt_name = f"Verify Apt {datetime.now().strftime('%H%M%S')}"
    apt = cli.create_apartment(apt_name, "123 Verification St", 150.0, "Test Apartment for verification suite")
    apt_id = apt["_id"]
    print(f"Apartment created: {apt_id}")
    
    # 3. List Apartments
    print("\n3. Listing apartments...")
    apts = cli.list_apartments()
    found = any(a["_id"] == apt_id for a in apts)
    if found:
        print("Test apartment found in list.")
    else:
        print("ERROR: Test apartment not found in list!")
        sys.exit(1)
        
    # 4. Create Booking
    print("\n4. Creating test booking...")
    start = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
    end = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")
    booking = cli.create_booking(apt_id, start, end)
    booking_id = booking["_id"]
    print(f"Booking created: {booking_id}")
    
    # 5. List Bookings
    print("\n5. Listing bookings...")
    bookings = cli.list_bookings()
    found = any(b["_id"] == booking_id for b in bookings)
    if found:
        print("Test booking found in list.")
    else:
        print("ERROR: Test booking not found in list!")
        sys.exit(1)
        
    # 6. Get Admin Stats
    print("\n6. Fetching admin stats...")
    stats = cli.get_stats()
    print(f"Total Revenue: {stats['summary']['totalRevenue']}")
    print(f"Total Apartments: {stats['summary']['flatCount']}")
    
    # 7. Cancel Booking
    print("\n7. Cancelling booking...")
    cli.cancel_booking(booking_id)
    print("Booking cancelled.")
    
    # 8. Delete Apartment
    print("\n8. Deleting test apartment...")
    cli.delete_apartment(apt_id)
    print("Apartment deleted.")
    
    print("\n=== Verification Suite Completed Successfully ===")

if __name__ == "__main__":
    main()

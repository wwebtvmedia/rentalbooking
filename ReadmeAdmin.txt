========================================================================
             bestflats.vip - Platform Administrator Guide
========================================================================

This document contains instructions for accessing and securing the 
Enterprise Intelligence Dashboard and managing the platform.

1. ACCESSING THE DASHBOARD
------------------------------------------------------------------------
The Platform Dashboard provides real-time analytics on revenue, customer 
growth, and property performance.

URL: https://www.bestflats.vip/admin/dashboard

NOTE: This page is secured by Mutual TLS (mTLS). You cannot access it 
without a valid client certificate installed in your browser.


2. CERTIFICATE MANAGEMENT (mTLS)
------------------------------------------------------------------------
To gain access, you must generate and install a private certificate.

A. Generate Certificates:
   Run the following command on your machine:
   $ python3 generate_admin_certs.py

B. Installation:
   1. Locate 'certs/admin_bundle.p12'.
   2. Double-click to install it in your OS Keychain or Browser.
   3. Certificate Password: bestflats-secure
   4. Restart your browser.

C. Cloudflare Configuration:
   1. Upload 'certs/ca.crt' to Cloudflare Zero Trust -> SSL/TLS -> 
      Mutual TLS.
   2. Create an Access Policy for /admin/dashboard requiring this CA.


3. PRODUCTION DEPLOYMENT (Raspberry Pi)
------------------------------------------------------------------------
To update the live site with new branding or configurations:

1. Pull latest code:    git pull origin main
2. Update .env:         nano .env
3. Build and Start:     ./start.sh
4. Clean Stack:         ./clean.sh


4. DATABASE MANAGEMENT
------------------------------------------------------------------------
The system supports a protected and unprotected seeding mechanism.

- Seed live database: 
  POST https://api.bestflats.vip/seed/unprotected?force=true

- MongoDB Path (External USB):
  /media/benyedde/rootfs/bestflats_data/mongo


5. SYSTEM MONITORING
------------------------------------------------------------------------
View real-time logs on your Raspberry Pi:

- Backend:  podman logs -f backend
- Frontend: podman logs -f frontend
- Database: podman logs -f mongo
- Emails:   http://<your-pi-ip>:8025 (Mailpit Dashboard)


========================================================================
bestflats.vip Intelligence - Confidential
========================================================================

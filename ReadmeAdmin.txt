========================================================================
             bestflats.vip - Platform Administrator Guide
========================================================================

This document contains instructions for accessing, securing, and 
managing the bestflats.vip enterprise platform.

1. ACCESSING THE DASHBOARDS
------------------------------------------------------------------------
- Platform Intelligence: https://www.bestflats.vip/admin/dashboard
- Host Portal:          https://host.bestflats.vip
- Concierge Hub:        https://conci.bestflats.vip
- Contractor Services:  https://subcont.bestflats.vip

NOTE: The Platform Intelligence dashboard is secured by Mutual TLS (mTLS).


2. CLOUDFLARE MANAGEMENT
------------------------------------------------------------------------
A. Tunnel Configuration (Zero Trust Dashboard):
   1. Go to Networks -> Tunnels.
   2. Ensure the following Public Hostnames are routed to the Pi:
      - bestflats.vip       -> http://localhost:3000
      - host.bestflats.vip  -> http://localhost:3000
      - conci.bestflats.vip -> http://localhost:3000
      - api.bestflats.vip   -> http://localhost:4000

B. Mutual TLS (mTLS) for Admin:
   1. Generate keys: $ python3 generate_admin_certs.py
   2. Upload 'certs/ca.crt' to SSL/TLS -> Client Certificates.
   3. Create an Access Application for /admin/dashboard.
   4. Policy: Allow users with a valid certificate from the uploaded CA.

C. DNS Management:
   - Always ensure "Proxy" is enabled (Orange Cloud) for all records to 
     benefit from Cloudflare's WAF and DDoS protection.


3. DATA PROTECTION & ENCRYPTION
------------------------------------------------------------------------
Sensitive data is encrypted at rest using AES-256-GCM.

- Master Key: Located in .env (MASTER_ENCRYPTION_KEY). 
  WARNING: If lost, all user data (emails/names) becomes unreadable.
- User Keys: Each user has a unique key stored in their database record.
- Blind Index: emailHash allows searching by email without storing 
  plain-text emails.


4. PRODUCTION DEPLOYMENT (Raspberry Pi)
------------------------------------------------------------------------
1. Update: git pull origin main
2. Refresh .env: rm .env && ./start.sh
3. Database Path: /media/benyedde/rootfs/bestflats_data/mongo
4. Podman Storage: /media/benyedde/rootfs/podman-storage


5. MONITORING
------------------------------------------------------------------------
- API Logs:    podman logs -f backend
- UI Logs:     podman logs -f frontend
- Email Logs:  http://bestflats.vip:8025 (Mailpit)

========================================================================
bestflats.vip Intelligence - Confidential
========================================================================

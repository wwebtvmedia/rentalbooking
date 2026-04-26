# 🏰 bestflats.vip | Project Architecture Map

This document describes the structure, functionality, and localization of all core components within the bestflats.vip platform.

## 🌟 Core Functionality
- **Luxury Booking:** End-to-end calendar and payment flow for high-end residences.
- **Multi-Profile System:** Dedicated experiences for Guests, Hosts, Concierges, and Contractors.
- **Data Protection:** Per-user AES-256-GCM encryption and blind-indexing for privacy.
- **Enterprise Intelligence:** Aggregated analytics for platform-wide revenue and performance monitoring.
- **Edge Deployment:** Specialized for Raspberry Pi 4 with USB disk optimization and Cloudflare Tunneling.

---

## 📂 Directory Map

### 1. Root Directory (Deployment & Docs)
| File / Folder | Purpose |
| :--- | :--- |
| `start.sh` | Unified deployment script (Builds, starts, and seeds). |
| `clean.sh` | Stops all containers and wipes transient stack data. |
| `prod.sh` | Interactive environment initializer for production domains. |
| `ReadmeAdmin.txt` | Master guide for Cloudflare, Security, and Dashboards. |
| `PROJECT.md` | This file. Technical architecture and logic map. |
| `generate_admin_certs.py`| Python utility for mTLS certificate generation. |

### 2. Backend (`/rental-platform/backend`)
| Path | Logic / Responsibility |
| :--- | :--- |
| `src/index.js` | Express server entry, CORS configuration, and Route registration. |
| `src/lib/encryption.js` | **Encryption Engine:** AES-256-GCM and Blind Index logic. |
| `src/models/User.js` | Multi-role user data with isolated encryption keys. |
| `src/routes/auth.js` | Subdomain-aware Magic Link authentication. |
| `src/routes/admin.js` | Anonymized SQL-style aggregation for platform stats. |
| `src/routes/host.js` | Financial analytics and property performance for owners. |
| `src/routes/concierge.js`| Service scheduling and contractor management. |
| `src/routes/payments.js` | Stripe integration and USDC crypto payment recording. |

### 3. Frontend (`/rental-platform/frontend`)
| Path | Component / Responsibility |
| :--- | :--- |
| `pages/index.tsx` | Landing page with automatic subdomain role detection. |
| `pages/admin/dashboard.tsx`| Intelligence Dashboard (Requires mTLS). |
| `pages/host/dashboard.tsx` | Revenue, Tax, and Property analytics for Hosts. |
| `pages/concierge/dashboard.tsx`| Work calendar and Contractor directory. |
| `pages/payments/[id].tsx` | Multi-modal checkout (Credit Card + USDC MetaMask). |
| `components/Layout.tsx` | Shared luxury layout (Header, Footer, Branding). |
| `e2e/` | Comprehensive test suite (Local and Production). |

---

## 🔒 Security Architecture
1. **At Rest:** Every sensitive field in MongoDB is encrypted using a key unique to that specific user.
2. **In Transit:** All traffic is proxied through Cloudflare with mandatory HTTPS.
3. **At the Edge:** Administrative pages require a hardware-linked client certificate (mTLS).
4. **Access:** Role-based access control (RBAC) enforced via JWT sub-claims and backend middleware.

## 🚀 Deployment Strategy
The project is optimized for **Podman** on **Raspberry Pi 4**. It automatically moves heavy storage (MongoDB and Container Layers) to the external USB disk found at `/media/benyedde/rootfs` to prevent SD card failure.

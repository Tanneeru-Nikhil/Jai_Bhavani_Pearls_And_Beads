# Jai Bhavani Pearls & Beads — E-Commerce & Management Platform

A modern, full-stack jewelry and bead supply platform featuring a luxury storefront and a comprehensive back-office administrative portal.

---

## 📑 Quick Navigation

- [1. System Architecture](#1-system-architecture)
- [2. Prerequisites](#2-prerequisites)
- [3. Getting Started & Startup Commands](#3-getting-started--startup-commands)
  - [Backend (FastAPI)](#backend-startup)
  - [Frontend (React + Vite)](#frontend-startup)
- [4. Default Login Credentials](#4-default-login-credentials)
- [5. Application Route Map](#5-application-route-map)
- [6. Database & Seed Data](#6-database--seed-data)
- [7. Configuration & Environment](#7-configuration--environment)

---

## 1. System Architecture

```
Jai_Bhavani_Pearls_Beads/
├── backend/
│   ├── app.db              # SQLite database (auto-created & seeded on first run)
│   ├── database.py         # DB connection, schema migrations, and initial seeds
│   └── main.py             # FastAPI REST API endpoints & business logic
├── frontend/
│   ├── index.html          # HTML entry point with Google Fonts (Cinzel, Playfair, Inter)
│   ├── package.json        # Dependencies & npm scripts
│   ├── tailwind.config.js  # Luxury color palette (Navy, Gold, Ivory, Pearl)
│   ├── vite.config.ts      # Vite dev server with reverse proxy (/api -> :8000)
│   └── src/
│       ├── components/     # UI components, modals, filters, header, footer
│       ├── contexts/       # AuthContext, CartContext, WishlistContext
│       ├── layouts/        # StorefrontLayout and AdminLayout
│       ├── lib/            # Axios API client, currency formatters, utils
│       ├── pages/
│       │   ├── admin/      # Admin dashboard, products, orders, inventory, reports
│       │   ├── auth/       # Login, register, forgot/reset password
│       │   └── storefront/ # Home, catalog, detail, cart, checkout, contact, FAQ
│       ├── router/         # AppRouter with lazy-loaded route protection
│       └── types/          # TypeScript interfaces & API types
├── docs/                   # Additional documentation
└── tests/                  # Test suites
```

---

## 2. Prerequisites

Ensure you have the following installed on your machine:
- **Python**: 3.10+ (tested with Python 3.14)
- **Node.js**: v18+ or v20+
- **npm**: v9+ or v10+

---

## 3. Getting Started & Startup Commands

### Backend Startup

Open a terminal in the project root:

```bash
# 1. Navigate into the backend directory
cd backend

# 2. (Optional) Create and activate a Python virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 3. Install required Python packages (if not already installed)
python -m pip install fastapi uvicorn pydantic

# 4. Start the FastAPI development server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

- **Backend API URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

---

### Frontend Startup

Open a second terminal in the project root:

```bash
# 1. Navigate into the frontend directory
cd frontend

# 2. Install dependencies (first time only)
npm install

# 3. Start the Vite development server
npm run dev
```

- **Frontend Application URL**: `http://localhost:3000`
- **Production Build**:
  ```bash
  npm run build
  ```
- **Type Checking**:
  ```bash
  npm run type-check
  ```

> **Note on API Proxying**: Vite is configured in `frontend/vite.config.ts` to automatically proxy all `/api` requests to `http://127.0.0.1:8000`, so no CORS issues occur during local development.

---

## 4. Default Login Credentials

The database comes pre-seeded with sample user accounts:

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@jaibhavani.com` | `admin123` | Full access to the Admin Portal (`/admin`), inventory management, order fulfillment, reports, and customer list. |
| **Customer** | `customer@jaibhavani.com` | `customer123` | Storefront browsing, shopping cart, checkout, order history, wishlist, and custom enquiries. |

---

## 5. Application Route Map

### 🛍️ Storefront Routes (`http://localhost:3000`)

| URL Path | Page Description | Auth Required? |
| :--- | :--- | :---: |
| `/` | Homepage (hero banner, featured pearls, popular categories) | No |
| `/products` | Product Catalog (filters by category, price, luster, search) | No |
| `/products/:slug` | Product Detail (high-res image gallery, stock, specs, cart) | No |
| `/categories/:slug` | Category specific product listing | No |
| `/cart` | Shopping cart drawer and dedicated cart management | No |
| `/checkout` | Multi-step checkout with address selection & payment method | Yes |
| `/orders/success/:orderId` | Order confirmation screen with tracking ID | Yes |
| `/account` | User profile settings, saved addresses, password change | Yes |
| `/account/orders` | Customer order history with tracking timeline | Yes |
| `/account/orders/:orderId` | Detailed order summary with items and receipt | Yes |
| `/account/wishlist` | Saved favorite products | Yes |
| `/enquiries` | Custom jewelry & bulk wholesale enquiry list | Yes |
| `/enquiries/:id` | Enquiry messaging thread with admin responses | Yes |
| `/contact` | Contact information, store address, business hours & form | No |
| `/faq` | Frequently Asked Questions & pearl care guides | No |
| `/login` | Customer / Admin unified login | Guest only |
| `/register` | New customer account registration | Guest only |

### 🛡️ Admin Portal Routes (`http://localhost:3000/admin`)

*Requires login with an account with the `admin` role.*

| URL Path | Feature & Capability |
| :--- | :--- |
| `/admin` | **Dashboard**: Live sales metrics, order counts, revenue charts, top products |
| `/admin/products` | **Product Management**: Search, filter, edit, delete, toggle active status |
| `/admin/products/new` | **Add Product**: Multi-image URLs, stock quantity, wholesale/retail pricing |
| `/admin/products/:id/edit` | **Edit Product**: Update specifications, images, and pricing |
| `/admin/orders` | **Orders List**: Filter by status (`pending`, `confirmed`, `shipped`, `delivered`) |
| `/admin/orders/:id` | **Order Detail**: Update shipping status, add tracking numbers, view customer info |
| `/admin/inventory` | **Inventory Control**: Real-time stock counts, low-stock warnings, inline adjustments |
| `/admin/enquiries` | **Customer Enquiries**: View custom requests, respond with quotes, update status |
| `/admin/customers` | **Customer Directory**: Registered users, order counts, total spent, contact info |
| `/admin/reports` | **Financial Analytics**: 7-day, 30-day, 90-day, 12-month revenue and trends |
| `/admin/audit-logs` | **Security Audit**: History of administrative actions, edits, and status changes |

---

## 6. Database & Seed Data

- **Database Engine**: SQLite 3
- **File Location**: `backend/app.db`
- **Auto-Initialization**: `backend/database.py` executes `init_db()` automatically on FastAPI startup:
  - Creates tables: `users`, `addresses`, `categories`, `products`, `product_images`, `cart_items`, `orders`, `order_items`, `wishlists`, `enquiries`, `enquiry_messages`, `audit_logs`.
  - Automatically seeds:
    - 5 Core Categories: *Freshwater Pearls, South Sea Pearls, Gemstone Beads, Crystal & Glass Beads, Findings & Accessories*.
    - Sample high-grade pearl and bead products with high-resolution imagery and specifications.
    - Default Admin (`admin@jaibhavani.com`) and Customer (`customer@jaibhavani.com`).

---

## 7. Configuration & Environment

### Frontend Environment Variables (`frontend/.env`)
Optional overrides can be placed in `frontend/.env`:
```env
# Optional: Set full backend URL if not using Vite reverse proxy
VITE_API_URL=/api/v1
```

### Backend Ports & Host
- Host: `127.0.0.1` (or `0.0.0.0` for local network access)
- Port: `8000`
- To run on another port, modify `--port <NEW_PORT>` and update `proxy` in `frontend/vite.config.ts`.

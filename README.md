# 🧬 AasaMedChem | Inventory & Order Management System

AasaMedChem is a premium, high-precision inventory and order management system built with **Next.js (TypeScript)**, **Neon-hosted PostgreSQL**, and **Vanilla CSS**. It is designed specifically for chemical and pharmaceutical cataloging, featuring dual dashboards, role-based JWT session controls, and a robust decimal-precision unit conversion engine.

Live Demo URL: *(To be populated upon Vercel deployment)*

---

## 🚀 Key Features

*   **Role-Based Access Control (RBAC):** Separate portals for **Admin** (Product CRUD, stock reviews, order approval/rejection) and **Seller** (Product catalog search, live quotation cart, conversion tracking).
*   **Precision Unit Conversion Engine:** Supports transacting in multiple dimensions and units:
    *   **Weight:** grams (`g`), kilograms (`kg`)
    *   **Volume:** milliliters (`mL`), liters (`L`)
    *   **Count:** items (`item`)
*   **Audit-Ready Ledger:** Admins can inspect the exact conversion calculations, internal base storage equivalents, pricing rates, and totals before approving order sheets.
*   **Atomic Stock Management:** Uses database transactions to reserve stock upon order placement, preventing double-selling. Automatically restores stock on order rejection.
*   **Premium Glassmorphic UI:** A dark obsidian backdrop with floating glass panels, glowing accent borders, hover micro-animations, and full responsiveness designed with Vanilla CSS.

---

## 🛠️ Tech Stack & System Design

```
                     ┌──────────────────────────────┐
                     │     Frontend UI (React)      │
                     │  Next.js client components   │
                     └──────────────┬───────────────┘
                                    │ (HTTP Requests)
                                    ▼
                     ┌──────────────────────────────┐
                     │     Backend APIs (Node)      │
                     │  Next.js Server API Routes   │
                     │   JWT Session Validation     │
                     └──────────────┬───────────────┘
                                    │ (pg Pool connections)
                                    ▼
                     ┌──────────────────────────────┐
                     │      Neon PostgreSQL         │
                     │   Acid Compliant Storage     │
                     └──────────────────────────────┘
```

*   **Framework:** Next.js (App Router) + TypeScript
*   **Database:** Neon-hosted PostgreSQL (fully relational, ACID-compliant)
*   **Driver:** `pg` (node-postgres) with connection pooling
*   **Authentication:** Signed JWT (HS256) stored in server-side HTTP-Only cookies using `jose`
*   **Security:** `bcryptjs` password hashing
*   **Styling:** Vanilla CSS & CSS Modules (custom variables, responsive grids, and transitions)

---

## 💾 Database Schema & Data Types

The database includes four main tables configured to handle extreme precision (e.g. sub-milligram dosages or micro-liter volumes) and large scale numbers using PostgreSQL's exact `NUMERIC` type.

### 1. `users`
Stores user records and credentials.
*   `id` `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `email` `VARCHAR(255)` (Unique, Index)
*   `password_hash` `VARCHAR(255)`
*   `name` `VARCHAR(100)`
*   `role` `VARCHAR(20)` (`'admin'` or `'seller'`)
*   `created_at` `TIMESTAMP WITH TIME ZONE`

### 2. `products`
Stores product catalog records, stock quantities, and base unit prices.
*   `id` `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `sku` `VARCHAR(50)` (Unique, Index)
*   `name` `VARCHAR(255)`
*   `description` `TEXT`
*   `category` `VARCHAR(100)`
*   `dimension` `VARCHAR(20)` (`'weight'`, `'volume'`, or `'count'`)
*   `base_unit` `VARCHAR(10)` (Restricted to `'g'`, `'mL'`, or `'item'`)
*   `base_price` `NUMERIC(20, 8)` - The price in INR for **exactly one base unit** (e.g. price per 1 gram).
*   `stock_quantity` `NUMERIC(20, 8)` - Total stock available represented in the **base unit**.
*   `created_at` `TIMESTAMP WITH TIME ZONE`
*   `updated_at` `TIMESTAMP WITH TIME ZONE`

### 3. `orders`
Stores order/quotation headers.
*   `id` `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `user_id` `UUID` (Foreign Key to `users`)
*   `status` `VARCHAR(20)` (`'pending'`, `'approved'`, or `'rejected'`)
*   `total_price` `NUMERIC(15, 2)` - Total order cost in INR.
*   `created_at` `TIMESTAMP WITH TIME ZONE`

### 4. `order_items`
Stores the individual line items for orders.
*   `id` `UUID` (Primary Key)
*   `order_id` `UUID` (Foreign Key to `orders` ON DELETE CASCADE)
*   `product_id` `UUID` (Foreign Key to `products` ON DELETE RESTRICT)
*   `ordered_quantity` `NUMERIC(20, 8)` - The quantity typed by the user (e.g. `2.5`).
*   `ordered_unit` `VARCHAR(10)` - The unit chosen by the user (e.g. `'kg'`).
*   `converted_quantity` `NUMERIC(20, 8)` - The quantity converted to the base unit (e.g. `2500.00000000` g).
*   `price_per_unit` `NUMERIC(20, 8)` - Cost in INR per ordered unit at order time (e.g. base price * 1000).
*   `line_total` `NUMERIC(15, 2)` - Subtotal in INR for this line (`ordered_quantity * price_per_unit`).

---

## 📐 Unit Storage & Conversion Strategy

To prevent rounding drift and floating-point issues (such as `0.1 + 0.2 = 0.30000000004` in Javascript), all quantities and pricing calculations are converted to **base units** before database writes, and rounded using exact string-formatting rules.

### 1. Dimension Mappings
| Dimension | Supported Units | Base Unit (Stored in DB) | Conversion Factor (to Base Unit) |
| :--- | :--- | :--- | :--- |
| **Weight** | `g`, `kg` | `g` (Grams) | `1 kg = 1000 g` (Factor: 1000) |
| **Volume** | `mL`, `L` | `mL` (Milliliters) | `1 L = 1000 mL` (Factor: 1000) |
| **Count** | `item` | `item` (Count) | `1 item = 1 item` (Factor: 1) |

### 2. Math Calculations
For any user order of quantity $Q$ in unit $U$ for a product with base unit price $P_{\text{base}}$:
1.  **Look up conversion factor** $F$ from $U$ to base unit (e.g. for `kg` to `g`, $F = 1000$).
2.  **Calculate database storage quantity:**
    $$Q_{\text{base}} = Q \times F$$
3.  **Calculate unit price rate:**
    $$P_{U} = P_{\text{base}} \times F$$
4.  **Calculate line total:**
    $$L = Q \times P_{U} = Q_{\text{base}} \times P_{\text{base}}$$
5.  **Deduct inventory:** `stock_quantity` is reduced by $Q_{\text{base}}$ during order placement. If status transitions to `'rejected'`, the reserved $Q_{\text{base}}$ is added back.

---

## 🛠️ Local Installation & Setup

### Prerequisites
*   Node.js (v18 or higher)
*   A Neon PostgreSQL connection string (or a local PostgreSQL database)

### Steps
1.  **Clone & Navigate:**
    ```bash
    git clone <repository_url>
    cd AasaMedChem
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and define the following variables:
    ```env
    DATABASE_URL="postgresql://[user]:[password]@[host]/[dbname]?sslmode=require"
    JWT_SECRET="replace-with-a-secure-32-character-secret-key"
    ```
    *(See `.env.example` for details)*

4.  **Launch Dev Server:**
    ```bash
    npm run dev
    ```
    The application will launch on [http://localhost:3000](http://localhost:3000).

5.  **Automated Database Seeding:**
    Go to the login screen and click **"Reset & Seed Database"** (or visit `http://localhost:3000/api/seed?reset=true` directly in your browser).
    This will drop any old tables, recreate the schema, and insert sample active pharmaceutical ingredients (APIs), solvents, laboratory consumables, and the default demo user credentials.

---

## 🔑 Test Credentials & Verification Flows

Use the quick-login buttons on the login screen or type the credentials manually:

### 👑 Administrator Role
*   **Email:** `admin@aasamedchem.com`
*   **Password:** `admin123`
*   **Actions:**
    1.  Click the **Inventory Catalog** tab to view product SKU levels.
    2.  Click **Add New Product** or click **Edit** on existing items. Change their base pricing and stock levels.
    3.  Monitor the **Order Queue** to view incoming seller quotes, showing detailed audits of ordered vs base storage units. Approve or reject orders.

### 💼 Seller Representative Role
*   **Email:** `seller@aasamedchem.com`
*   **Password:** `seller123`
*   **Actions:**
    1.  Browse catalog items. Filter products by search keywords or categories.
    2.  Add a product to the **Quotation Builder** cart.
    3.  Toggle the unit dropdown (e.g. swap `g` to `kg`) and modify the quantity. Notice how the unit rate and subtotal recalculate instantly.
    4.  Click **Place Quotation / Order**. If it succeeds, the quote appears in the history log at the bottom. If the quantity exceeds available stock, the UI prevents submission and highlights the offending item.

---

## ☁️ Deploying to Vercel

1.  **Create Vercel Project:**
    Log in to Vercel, click **Add New Project**, and select your GitHub repository.
2.  **Configure Environment Variables:**
    Under the project settings, add the Environment Variables:
    *   `DATABASE_URL` (your Neon connection string)
    *   `JWT_SECRET` (a strong random string)
3.  **Deploy:**
    Click **Deploy**. Vercel will automatically build and publish the Next.js App.
4.  **Seed Production:**
    Once deployed, open your live URL (e.g., `https://your-app.vercel.app`), go to the login portal, and click **Reset & Seed Database** to populate your live Neon database.

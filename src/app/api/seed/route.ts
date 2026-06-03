import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get('reset') === 'true';

    // 1. Drop existing tables if reset is requested
    if (reset) {
      console.log('Dropping existing tables...');
      await query('DROP TABLE IF EXISTS order_items CASCADE');
      await query('DROP TABLE IF EXISTS orders CASCADE');
      await query('DROP TABLE IF EXISTS products CASCADE');
      await query('DROP TABLE IF EXISTS users CASCADE');
    }

    // 2. Create tables
    console.log('Creating database tables...');

    // Users table
    // Roles can be 'admin', 'seller', or 'buyer'
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'seller', 'buyer')),
        phone VARCHAR(20) DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT ''`);

    // Products table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        dimension VARCHAR(20) NOT NULL CHECK (dimension IN ('weight', 'volume', 'count')),
        base_unit VARCHAR(10) NOT NULL CHECK (base_unit IN ('g', 'mL', 'item')),
        base_price NUMERIC(20, 8) NOT NULL,
        stock_quantity NUMERIC(20, 8) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    // Links order to both the seller who placed it and the buyer who receives/confirms it
    // Status can be: 'pending_buyer', 'pending_admin', 'approved', 'rejected'
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending_buyer' CHECK (status IN ('pending_buyer', 'pending_admin', 'approved', 'rejected')),
        total_price NUMERIC(15, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Order Items table
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
        ordered_quantity NUMERIC(20, 8) NOT NULL,
        ordered_unit VARCHAR(10) NOT NULL CHECK (ordered_unit IN ('g', 'kg', 'mL', 'L', 'item')),
        converted_quantity NUMERIC(20, 8) NOT NULL,
        price_per_unit NUMERIC(20, 8) NOT NULL,
        line_total NUMERIC(15, 2) NOT NULL
      )
    `);

    // 3. Seed users if not exists
    console.log('Seeding users...');
    const userCheck = await query('SELECT count(*) FROM users');
    const hasUsers = parseInt(userCheck.rows[0].count) > 0;

    const testUsers = [];
    if (!hasUsers || reset) {
      const adminPass = await hashPassword('admin123');
      const sellerPass = await hashPassword('seller123');
      const buyerPass = await hashPassword('buyer123');

      // Admin user
      // Admin user
      const adminRes = await query(`
        INSERT INTO users (email, password_hash, name, role, phone)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING id, email, name, role, phone
      `, ['admin@aasamedchem.com', adminPass, 'Dr. Aditi Sharma (Admin)', 'admin', '+91 99999 11111']);
      testUsers.push(adminRes.rows[0]);

      // Seller user
      const sellerRes = await query(`
        INSERT INTO users (email, password_hash, name, role, phone)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING id, email, name, role, phone
      `, ['seller@aasamedchem.com', sellerPass, 'Rahul Verma (Seller)', 'seller', '+91 98765 43210']);
      testUsers.push(sellerRes.rows[0]);

      // Buyer user 1 (Apex Diagnostics)
      const buyerRes = await query(`
        INSERT INTO users (email, password_hash, name, role, phone)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING id, email, name, role, phone
      `, ['buyer@aasamedchem.com', buyerPass, 'Apex Diagnostics Lab (Buyer)', 'buyer', '+91 88888 22222']);
      testUsers.push(buyerRes.rows[0]);

      // Buyer user 2 (BioTech Research Institute)
      const buyerRes2 = await query(`
        INSERT INTO users (email, password_hash, name, role, phone)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING id, email, name, role, phone
      `, ['buyer2@aasamedchem.com', buyerPass, 'BioTech Research Institute (Buyer)', 'buyer', '+91 77777 33333']);
      testUsers.push(buyerRes2.rows[0]);
    }

    // 4. Seed products if not exists
    console.log('Seeding products...');
    const prodCheck = await query('SELECT count(*) FROM products');
    const hasProducts = parseInt(prodCheck.rows[0].count) > 0;

    const seedProducts = [
      {
        sku: 'CHM-ASP-01',
        name: 'Aspirin USP (Powder)',
        description: 'Pharmaceutical grade Acetylsalicylic acid powder. Raw material for bulk compounds.',
        category: 'Active Ingredients',
        dimension: 'weight',
        base_unit: 'g',
        base_price: 0.15000000, // 0.15 INR per gram -> 150 INR per kg
        stock_quantity: 50000.00000000, // 50,000 g (50 kg)
      },
      {
        sku: 'CHM-CAP-02',
        name: 'Capsaicin 95%',
        description: 'High-purity crystalline capsaicin extract. Store under lock and key. Extremely pungent compound.',
        category: 'Extracts',
        dimension: 'weight',
        base_unit: 'g',
        base_price: 4.50000000, // 4.50 INR per gram -> 4,500 INR per kg
        stock_quantity: 2500.00000000, // 2,500 g (2.5 kg)
      },
      {
        sku: 'CHM-ETH-03',
        name: 'Ethanol Anhydrous 99.5%',
        description: 'ACS grade anhydrous alcohol solvent. Suitable for extraction and analytical labs.',
        category: 'Solvents',
        dimension: 'volume',
        base_unit: 'mL',
        base_price: 0.08000000, // 0.08 INR per mL -> 80 INR per Liter
        stock_quantity: 100000.00000000, // 100,000 mL (100 L)
      },
      {
        sku: 'CHM-HCL-04',
        name: 'Hydrochloric Acid 37%',
        description: 'High purity analytical reagent grade HCl solution. Store in acid cabinets.',
        category: 'Acids',
        dimension: 'volume',
        base_unit: 'mL',
        base_price: 0.12000000, // 0.12 INR per mL -> 120 INR per Liter
        stock_quantity: 25000.00000000, // 25,000 mL (25 L)
      },
      {
        sku: 'CHM-VNT-05',
        name: 'Glass Vials 10mL (Crimped)',
        description: 'Clear USP Type I borosilicate glass vials with rubber stoppers. Pack of 1.',
        category: 'Consumables',
        dimension: 'count',
        base_unit: 'item',
        base_price: 15.00000000, // 15 INR per vial
        stock_quantity: 1200.00000000, // 1200 vials
      },
      {
        sku: 'CHM-PIP-06',
        name: 'Disposable Pipettes 3mL',
        description: 'Graduated LDPE transfer pipettes, clean room packed. Pack of 1.',
        category: 'Consumables',
        dimension: 'count',
        base_unit: 'item',
        base_price: 3.50000000, // 3.50 INR per pipette
        stock_quantity: 800.00000000, // 800 pipettes
      },
    ];

    if (!hasProducts || reset) {
      for (const p of seedProducts) {
        await query(`
          INSERT INTO products (sku, name, description, category, dimension, base_unit, base_price, stock_quantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (sku) DO UPDATE SET 
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            base_price = EXCLUDED.base_price,
            stock_quantity = EXCLUDED.stock_quantity
        `, [p.sku, p.name, p.description, p.category, p.dimension, p.base_unit, p.base_price, p.stock_quantity]);
      }
    }

    const seededProductsCount = (await query('SELECT count(*) FROM products')).rows[0].count;

    return NextResponse.json({
      success: true,
      message: reset ? 'Database reset and seeded successfully!' : 'Database tables initialized/verified.',
      seededUsers: testUsers.length > 0 ? testUsers : 'Skipped user seeding (already exist)',
      totalProducts: seededProductsCount,
      credentials: {
        admin: { email: 'admin@aasamedchem.com', password: 'admin123' },
        seller: { email: 'seller@aasamedchem.com', password: 'seller123' },
        buyer: { email: 'buyer@aasamedchem.com', password: 'buyer123' },
        buyer2: { email: 'buyer2@aasamedchem.com', password: 'buyer123' }
      },
    });
  } catch (error: any) {
    console.error('Database seeding failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown database initialization error',
    }, { status: 500 });
  }
}

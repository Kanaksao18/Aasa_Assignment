import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Retrieve and filter products
export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    let queryText = 'SELECT * FROM products';
    const params: any[] = [];
    const conditions: string[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY category ASC, name ASC';

    const res = await query(queryText, params);
    return NextResponse.json({ success: true, products: res.rows });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add new product (Admin only)
export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { sku, name, description, category, dimension, base_unit, base_price, stock_quantity } = body;

    // Validate inputs
    if (!sku || !name || !dimension || !base_unit || base_price === undefined || stock_quantity === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required product fields' }, { status: 400 });
    }

    // Enforce base unit constraints per dimension
    if (dimension === 'weight' && base_unit !== 'g') {
      return NextResponse.json({ success: false, error: 'Base unit for weight must be grams (g)' }, { status: 400 });
    }
    if (dimension === 'volume' && base_unit !== 'mL') {
      return NextResponse.json({ success: false, error: 'Base unit for volume must be milliliters (mL)' }, { status: 400 });
    }
    if (dimension === 'count' && base_unit !== 'item') {
      return NextResponse.json({ success: false, error: 'Base unit for count must be item' }, { status: 400 });
    }

    const numBasePrice = parseFloat(base_price);
    const numStockQty = parseFloat(stock_quantity);

    if (isNaN(numBasePrice) || numBasePrice < 0) {
      return NextResponse.json({ success: false, error: 'Base price must be a non-negative number' }, { status: 400 });
    }
    if (isNaN(numStockQty) || numStockQty < 0) {
      return NextResponse.json({ success: false, error: 'Stock quantity must be a non-negative number' }, { status: 400 });
    }

    // Check unique SKU
    const skuCheck = await query('SELECT id FROM products WHERE sku = $1', [sku.trim().toUpperCase()]);
    if (skuCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Product with this SKU already exists' }, { status: 400 });
    }

    // Insert product
    const insertRes = await query(`
      INSERT INTO products (sku, name, description, category, dimension, base_unit, base_price, stock_quantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      sku.trim().toUpperCase(),
      name.trim(),
      description ? description.trim() : '',
      category ? category.trim() : 'Uncategorized',
      dimension,
      base_unit,
      numBasePrice,
      numStockQty
    ]);

    return NextResponse.json({ success: true, product: insertRes.rows[0] });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

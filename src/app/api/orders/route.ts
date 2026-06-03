import { NextResponse } from 'next/server';
import { query, default as pool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateLineMetrics } from '@/lib/units';

// GET: Retrieve orders (all for admin, seller-authored for seller, buyer-scoped for buyer)
export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let sql = `
      SELECT 
        o.*, 
        u.name as user_name, u.email as user_email, u.phone as user_phone,
        b.name as buyer_name, b.email as buyer_email, b.phone as buyer_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN users b ON o.buyer_id = b.id
    `;
    const params: any[] = [];

    if (session.role === 'seller') {
      sql += ' WHERE o.user_id = $1';
      params.push(session.id);
    } else if (session.role === 'buyer') {
      sql += ' WHERE o.buyer_id = $1';
      params.push(session.id);
    }

    sql += ' ORDER BY o.created_at DESC';

    const ordersRes = await query(sql, params);
    const orders = ordersRes.rows;

    // Fetch items for each order
    for (const order of orders) {
      const itemsRes = await query(`
        SELECT oi.*, p.name as product_name, p.sku as product_sku, p.dimension as product_dimension, p.base_unit as product_base_unit
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [order.id]);
      order.items = itemsRes.rows;
    }

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Place a quotation/order (Seller only, uses database transactions)
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'seller') {
      return NextResponse.json({ success: false, error: 'Forbidden: Only sellers can place orders' }, { status: 403 });
    }

    const body = await request.json();
    const { items, buyer_id } = body; // Array of { product_id, quantity, unit }, and target buyer ID

    if (!buyer_id) {
      return NextResponse.json({ success: false, error: 'Buyer selection is required to issue a quote' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Order must contain at least one item' }, { status: 400 });
    }

    // Verify buyer is valid
    const buyerCheck = await query('SELECT id, role FROM users WHERE id = $1', [buyer_id]);
    if (buyerCheck.rows.length === 0 || buyerCheck.rows[0].role !== 'buyer') {
      return NextResponse.json({ success: false, error: 'Selected buyer is invalid or not registered as a buyer' }, { status: 400 });
    }

    // Begin Transaction
    await client.query('BEGIN');

    let totalOrderPrice = 0;
    const computedItems = [];

    // 1. Process and validate all items
    for (const item of items) {
      const { product_id, quantity, unit } = item;

      if (!product_id || !quantity || !unit) {
        throw new Error('Invalid order item details provided.');
      }

      const qVal = parseFloat(quantity);
      if (isNaN(qVal) || qVal <= 0) {
        throw new Error(`Quantity must be greater than zero.`);
      }

      // Fetch product details inside the transaction for write locking
      const prodRes = await client.query(
        'SELECT id, name, sku, dimension, base_unit, base_price, stock_quantity FROM products WHERE id = $1 FOR UPDATE',
        [product_id]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Product not found.`);
      }

      const product = prodRes.rows[0];

      // Verify unit matches dimension
      const validUnits: Record<string, string[]> = {
        weight: ['g', 'kg'],
        volume: ['mL', 'L'],
        count: ['item'],
      };

      const allowed = validUnits[product.dimension];
      if (!allowed || !allowed.includes(unit)) {
        throw new Error(`Unit "${unit}" is invalid for product "${product.name}" (dimension: ${product.dimension}).`);
      }

      // Calculate conversions
      const metrics = calculateLineMetrics(qVal, unit, parseFloat(product.base_price));

      // Verify stock level (using the converted quantity in base unit)
      const currentStock = parseFloat(product.stock_quantity);
      if (metrics.convertedQuantity > currentStock) {
        throw new Error(
          `Insufficient stock for "${product.name}" (${product.sku}). ` +
          `Available stock: ${currentStock} ${product.base_unit}. ` +
          `Requested: ${metrics.convertedQuantity} ${product.base_unit} (equivalent to ${qVal} ${unit}).`
        );
      }

      // Deduct stock immediately to reserve it while quotation is active
      const newStock = currentStock - metrics.convertedQuantity;
      await client.query(
        'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
        [newStock, product_id]
      );

      totalOrderPrice += metrics.lineTotal;
      computedItems.push({
        product_id,
        ordered_quantity: metrics.orderedQuantity,
        ordered_unit: metrics.orderedUnit,
        converted_quantity: metrics.convertedQuantity,
        price_per_unit: metrics.pricePerUnit,
        line_total: metrics.lineTotal,
      });
    }

    // 2. Insert order header with status 'pending_buyer'
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, buyer_id, status, total_price) 
       VALUES ($1, $2, 'pending_buyer', $3) 
       RETURNING *`,
      [session.id, buyer_id, totalOrderPrice]
    );
    const order = orderRes.rows[0];

    // 3. Insert order items
    for (const ci of computedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, ordered_quantity, ordered_unit, converted_quantity, price_per_unit, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          order.id,
          ci.product_id,
          ci.ordered_quantity,
          ci.ordered_unit,
          ci.converted_quantity,
          ci.price_per_unit,
          ci.line_total,
        ]
      );
    }

    // Commit Transaction
    await client.query('COMMIT');
    client.release();

    return NextResponse.json({ success: true, order_id: order.id, total_price: totalOrderPrice });
  } catch (error: any) {
    // Rollback Transaction on error
    await client.query('ROLLBACK');
    client.release();
    console.error('Order creation error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to place order' }, { status: 400 });
  }
}

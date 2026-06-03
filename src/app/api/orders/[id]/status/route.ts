import { NextResponse } from 'next/server';
import { default as pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body; // Can be 'pending_admin' (buyer accept), 'approved' (admin approve), or 'rejected' (buyer/admin decline)

    if (!status || !['pending_admin', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status state target" }, { status: 400 });
    }

    // Begin Transaction
    await client.query('BEGIN');

    // 1. Fetch current order details inside transaction
    const orderRes = await client.query(
      'SELECT id, status, user_id, buyer_id, total_price FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (orderRes.rows.length === 0) {
      throw new Error('Order not found.');
    }

    const order = orderRes.rows[0];

    // 2. Validate role and state transition logic
    if (session.role === 'buyer') {
      // Buyer validation
      if (order.buyer_id !== session.id) {
        throw new Error('Unauthorized: You are not the assigned buyer for this quotation.');
      }
      if (order.status !== 'pending_buyer') {
        throw new Error(`This quote is currently in "${order.status}" status and cannot be modified by you.`);
      }
      if (status !== 'pending_admin' && status !== 'rejected') {
        throw new Error("Invalid action: Buyers can only 'accept' (pending_admin) or 'decline' (rejected) quotations.");
      }
    } else if (session.role === 'admin') {
      // Admin validation
      if (order.status !== 'pending_admin') {
        throw new Error(`Only buyer-accepted quotations in "pending_admin" status can be processed by Admins (current: ${order.status}).`);
      }
      if (status !== 'approved' && status !== 'rejected') {
        throw new Error("Invalid action: Admins can only 'approve' or 'reject' orders.");
      }
    } else {
      throw new Error('Forbidden: Only admins or assigned buyers can update order status.');
    }

    // 3. If rejected, restore product stock levels
    if (status === 'rejected') {
      console.log(`Order rejected. Restoring stock for Order ID: ${id}`);
      // Fetch order items to know what to restore
      const itemsRes = await client.query(
        'SELECT product_id, converted_quantity FROM order_items WHERE order_id = $1',
        [id]
      );

      for (const item of itemsRes.rows) {
        const prodId = item.product_id;
        const restoreQty = parseFloat(item.converted_quantity);

        // Fetch current stock with write lock
        const prodRes = await client.query(
          'SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE',
          [prodId]
        );

        if (prodRes.rows.length > 0) {
          const currentStock = parseFloat(prodRes.rows[0].stock_quantity);
          const newStock = currentStock + restoreQty;
          
          await client.query(
            'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
            [newStock, prodId]
          );
          console.log(`Restored product ${prodId}: +${restoreQty}. New stock: ${newStock}`);
        }
      }
    }

    // 4. Update order status in the database
    await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      [status, id]
    );

    // Commit Transaction
    await client.query('COMMIT');
    client.release();

    return NextResponse.json({ success: true, order_id: id, status });
  } catch (error: any) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Order status transition error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update order status' }, { status: 400 });
  }
}

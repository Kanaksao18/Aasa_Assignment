import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper to resolve params in App Router
type RouteParams = { params: Promise<{ id: string }> };

// PUT: Update a product (Admin only)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { sku, name, description, category, base_price, stock_quantity } = body;

    // Validate fields
    if (!sku || !name || base_price === undefined || stock_quantity === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required product fields' }, { status: 400 });
    }

    const numBasePrice = parseFloat(base_price);
    const numStockQty = parseFloat(stock_quantity);

    if (isNaN(numBasePrice) || numBasePrice < 0) {
      return NextResponse.json({ success: false, error: 'Base price must be a non-negative number' }, { status: 400 });
    }
    if (isNaN(numStockQty) || numStockQty < 0) {
      return NextResponse.json({ success: false, error: 'Stock quantity must be a non-negative number' }, { status: 400 });
    }

    // Check SKU conflicts with other products
    const skuCheck = await query('SELECT id FROM products WHERE sku = $1 AND id <> $2', [sku.trim().toUpperCase(), id]);
    if (skuCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Another product with this SKU already exists' }, { status: 400 });
    }

    // Update product
    const updateRes = await query(`
      UPDATE products
      SET sku = $1, name = $2, description = $3, category = $4, base_price = $5, stock_quantity = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      sku.trim().toUpperCase(),
      name.trim(),
      description ? description.trim() : '',
      category ? category.trim() : 'Uncategorized',
      numBasePrice,
      numStockQty,
      id
    ]);

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: updateRes.rows[0] });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a product (Admin only)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if product is referenced in order_items
    const orderItemsCheck = await query('SELECT count(*) FROM order_items WHERE product_id = $1', [id]);
    const isReferenced = parseInt(orderItemsCheck.rows[0].count) > 0;

    if (isReferenced) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete product: It is referenced in existing quotations/orders. Consider setting its stock to 0 instead.' 
      }, { status: 400 });
    }

    const deleteRes = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    
    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

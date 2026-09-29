/*************************************************************
 * AROMA LAB — Admin Panel: Core + Database
 * File: admin-1.js
 *************************************************************/

const { useState, useEffect, useRef } = React;

// ============================================================
// CONFIG
// ============================================================

const ADMIN_EMAIL = 'sajith.kasp@gmail.com';
const MAIN_SITE_URL = 'https://aromalabsl.lk';
const sb = window.supabaseClient;

// ============================================================
// HELPERS
// ============================================================

function fmtRs(num) {
  const n = Number(num) || 0;
  return 'Rs. ' + n.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

// ============================================================
// AUTH
// ============================================================

async function getSession() {
  try {
    const { data } = await sb.auth.getSession();
    return data.session;
  } catch (e) {
    return null;
  }
}

async function signInAdmin(password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: password
  });
  if (error) throw error;
  return data;
}

async function signOutAdmin() {
  try {
    await sb.auth.signOut();
  } catch (e) { console.error(e); }
}

// ============================================================
// DATABASE — ORDERS
// ============================================================

async function dbGetOrders(status) {
  let query = sb.from('orders').select('*').order('order_date', { ascending: false });
  if (status && status !== 'All') {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function dbGetOrderItems(orderId) {
  const { data, error } = await sb.from('order_items').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data || [];
}

async function dbUpdateOrder(orderId, updates) {
  const { data, error } = await sb.from('orders').update(updates).eq('order_id', orderId).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteOrder(orderId) {
  const { error: itemsErr } = await sb.from('order_items').delete().eq('order_id', orderId);
  if (itemsErr) throw itemsErr;
  const { error: orderErr } = await sb.from('orders').delete().eq('order_id', orderId);
  if (orderErr) throw orderErr;
  return true;
}

// ============================================================
// DATABASE — COMMISSIONS
// ============================================================

async function dbGetCommissions() {
  const { data, error } = await sb.from('commissions').select('*').order('method');
  if (error) throw error;
  return data || [];
}

async function dbUpdateCommission(method, rate, fixedFee, notes) {
  const { data, error } = await sb.from('commissions')
    .update({ rate: Number(rate), fixed_fee: Number(fixedFee) || 0, notes: notes || '', updated_at: new Date().toISOString() })
    .eq('method', method)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// DATABASE — PRODUCTS
// ============================================================

async function dbGetProducts() {
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function dbAddProduct(productData) {
  const { data, error } = await sb.from('products').insert([productData]).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdateProduct(id, updates) {
  const { data, error } = await sb.from('products').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteProduct(id) {
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function dbUpdateProductCost(productId, costData, costTypes) {
  let totalCost = 0;
  const updates = { cost_type: costData.cost_type || 'Breakdown' };
  if (costTypes && costTypes.length > 0) {
    const customCosts = {};
    costTypes.forEach(ct => {
      const key = ct.name.toLowerCase().replace(/\s+/g, '_');
      const value = Number(costData[key]) || 0;
      updates[key] = value;
      customCosts[ct.name] = value;
      totalCost += value;
    });
    updates.custom_costs = customCosts;
  }
  const sellingPrice = Number(costData.selling_price) || 0;
  const profitPerUnit = sellingPrice - totalCost;
  updates.full_cost = totalCost;
  updates.total_cost = totalCost;
  updates.selling_price = sellingPrice;
  updates.profit_per_unit = profitPerUnit;
  const { data, error } = await sb.from('products').update(updates).eq('id', productId).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// DATABASE — OTHER COSTS
// ============================================================

async function dbGetExpenses() {
  const { data, error } = await sb.from('expenses').select('*').order('expense_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function dbGetOtherCosts() {
  const { data, error } = await sb.from('other_costs').select('*').order('cost_date', { ascending: false });
  if (error) return [];
  return data || [];
}

async function dbAddOtherCost(reason, amount, costDate) {
  const { data, error } = await sb.from('other_costs').insert([{
    reason: reason.trim(),
    amount: Number(amount),
    cost_date: costDate || todayStr()
  }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteOtherCost(id) {
  const { error } = await sb.from('other_costs').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — CATEGORIES
// ============================================================

async function dbGetCategories() {
  const { data, error } = await sb.from('categories').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddCategory(name) {
  const { data, error } = await sb.from('categories').insert([{ name: name.trim(), display_order: 999 }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteCategory(id) {
  const { error } = await sb.from('categories').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — PRODUCT TYPES
// ============================================================

async function dbGetProductTypes() {
  const { data, error } = await sb.from('product_types').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddProductType(name) {
  const { data, error } = await sb.from('product_types').insert([{ name: name.trim(), display_order: 999 }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteProductType(id) {
  const { error } = await sb.from('product_types').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — COST TYPES
// ============================================================

async function dbGetCostTypes() {
  const { data, error } = await sb.from('cost_types').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddCostType(name) {
  const { data, error } = await sb.from('cost_types').insert([{ name: name.trim(), display_order: 999 }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteCostType(id) {
  const { error } = await sb.from('cost_types').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — PAYMENT METHODS
// ============================================================

async function dbGetPaymentMethods() {
  const { data, error } = await sb.from('payment_methods').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddPaymentMethod(name) {
  const { data, error } = await sb.from('payment_methods').insert([{ name: name.trim(), display_order: 999 }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeletePaymentMethod(id) {
  const { error } = await sb.from('payment_methods').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — DELIVERY SETTINGS
// ============================================================

async function dbGetDeliverySettings() {
  const { data, error } = await sb.from('delivery_settings').select('*').eq('id', 1).single();
  if (error) return { base_charge: 350, free_delivery_threshold: 3 };
  return data || { base_charge: 350, free_delivery_threshold: 3 };
}

async function dbUpdateDeliverySettings(baseCharge, threshold) {
  const { data, error } = await sb.from('delivery_settings').update({
    base_charge: Number(baseCharge),
    free_delivery_threshold: Number(threshold),
    updated_at: new Date().toISOString()
  }).eq('id', 1).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// DATABASE — SITE SETTINGS
// ============================================================

async function dbGetSiteSettings() {
  const { data, error } = await sb.from('site_settings').select('*').limit(1).single();
  if (error) return null;
  return data;
}

async function dbUpdateSiteSettings(updates) {
  const { data, error } = await sb.from('site_settings').update({
    ...updates,
    updated_at: new Date().toISOString()
  }).eq('id', 1).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// DATABASE — PAGES
// ============================================================

async function dbGetPages() {
  const { data, error } = await sb.from('pages').select('*').order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddPage(title, content) {
  const { data, error } = await sb.from('pages').insert([{ title: title.trim(), content: content || '' }]).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdatePage(id, title, content) {
  const { data, error } = await sb.from('pages').update({ title: title.trim(), content: content || '' }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function dbDeletePage(id) {
  const { error } = await sb.from('pages').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — BOT SETTINGS
// ============================================================

async function dbGetBotSettings() {
  const { data, error } = await sb.from('bot_settings').select('*').eq('id', 1).single();
  if (error) return { system_prompt: '', welcome_message: '' };
  return data || { system_prompt: '', welcome_message: '' };
}

async function dbUpdateBotSettings(systemPrompt, welcomeMessage) {
  const { data, error } = await sb.from('bot_settings').update({
    system_prompt: systemPrompt || '',
    welcome_message: welcomeMessage || '',
    updated_at: new Date().toISOString()
  }).eq('id', 1).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// FILE UPLOAD
// ============================================================

async function uploadImage(file) {
  const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
  const { error } = await sb.storage.from('product-images').upload(fileName, file);
  if (error) throw error;
  const { data: urlData } = sb.storage.from('product-images').getPublicUrl(fileName);
  return urlData.publicUrl;
}

// ============================================================
// COMPLETE ORDER LOGIC
// ============================================================

async function completeOrder(orderId, completionData) {
  const { order_type, payment_method, delivery_charge, discount, commission_override, updated_items } = completionData;

  const existingItems = await dbGetOrderItems(orderId);
  for (const item of existingItems) {
    await sb.from('order_items').delete().eq('id', item.id);
  }

  const products = await dbGetProducts();
  const productMap = {};
  products.forEach(p => { productMap[String(p.name || '').trim().toLowerCase()] = p; });

  let totalAmount = 0;
  let totalCost = 0;
  const itemsSummaryParts = [];

  for (const item of (updated_items || [])) {
    const itemName = String(item.product_name || '').trim();
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price) || 1500;
    const product = productMap[itemName.toLowerCase()];
    const unitCost = product ? (Number(product.total_cost) || Number(product.full_cost) || 0) : 0;
    const totalIncome = unitPrice * qty;
    const totalItemCost = unitCost * qty;

    totalAmount += totalIncome;
    totalCost += totalItemCost;
    itemsSummaryParts.push(itemName + ' x' + qty);

    await sb.from('order_items').insert([{
      order_id: orderId,
      product_name: itemName,
      quantity: qty,
      unit_price: unitPrice,
      unit_cost: unitCost,
      total_income: totalIncome,
      total_cost: totalItemCost,
      profit: totalIncome - totalItemCost
    }]);
  }

  const deliveryCharge = Number(delivery_charge) || 0;
  const discountAmount = Number(discount) || 0;

  let commission = Number(commission_override) || 0;
  if (!commission_override && payment_method) {
    const commissions = await dbGetCommissions();
    const comm = commissions.find(c => String(c.method).toLowerCase() === String(payment_method).toLowerCase());
    if (comm) {
      const netForCommission = totalAmount + deliveryCharge - discountAmount;
      commission = (netForCommission * Number(comm.rate) / 100) + Number(comm.fixed_fee || 0);
    }
  }

  const netTotal = totalAmount + deliveryCharge - discountAmount;
  const netProfit = netTotal - totalCost - commission;
  const profitMargin = netTotal > 0 ? (netProfit / netTotal) * 100 : 0;

  return await dbUpdateOrder(orderId, {
    order_type: order_type || '',
    payment_method: payment_method || '',
    delivery_charge: deliveryCharge,
    discount: discountAmount,
    order_items: itemsSummaryParts.join(', '),
    total_amount: netTotal,
    total_cost: totalCost,
    commission: commission,
    net_profit: netProfit,
    profit_margin: profitMargin,
    status: 'Completed',
    updated_at: new Date().toISOString()
  });
}

async function cancelOrder(orderId) {
  return await dbUpdateOrder(orderId, {
    status: 'Cancelled',
    updated_at: new Date().toISOString()
  });
}
/*************************************************************
 * AROMA LAB — Admin Panel: Login + Layout + Orders
 * File: admin-2.js
 *************************************************************/

// ============================================================
// LOGIN SCREEN
// ============================================================

function LoginScreen({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInAdmin(password);
      onSuccess();
    } catch (err) {
      setError('❌ Wrong password. Try again.');
    }
    setLoading(false);
  }

  return (
    <div className="adm-login-overlay">
      <div className="adm-login-box">
        <div className="adm-login-logo">🔐</div>
        <h1 className="adm-login-title">AROMA LAB</h1>
        <p className="adm-login-subtitle">Admin Panel</p>
        <p className="adm-login-desc">Enter your admin password to continue</p>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            className="adm-login-input"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <div className="adm-login-error">{error}</div>}
          <button type="submit" className="adm-login-btn" disabled={loading}>
            {loading ? 'Checking...' : '🔓 Unlock Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ORDERS LIST
// ============================================================

function OrdersList({ orders, status, onRefresh, showMsg, onSelectOrder }) {
  if (!orders.length) {
    return (
      <div className="adm-empty">
        <p>No {status} orders</p>
      </div>
    );
  }

  return (
    <div className="adm-orders-list">
      {orders.map(order => (
        <div key={order.id} className={'adm-order-card ' + status}>
          <div className="adm-order-header">
            <div>
              <div className="adm-order-id">{order.order_id}</div>
              <div className="adm-order-date">{fmtDateTime(order.order_date)}</div>
            </div>
            <div className={'adm-order-status adm-status-' + status}>
              {order.status}
            </div>
          </div>

          <div className="adm-order-body">
            <div className="adm-order-row">
              <span className="adm-label">Customer:</span>
              <span className="adm-value">{order.customer_name}</span>
            </div>
            <div className="adm-order-row">
              <span className="adm-label">Phone:</span>
              <span className="adm-value">{order.customer_phone || '—'}</span>
            </div>
            <div className="adm-order-row">
              <span className="adm-label">District:</span>
              <span className="adm-value">{order.district || '—'}</span>
            </div>
            <div className="adm-order-row">
              <span className="adm-label">Items:</span>
              <span className="adm-value adm-items">{order.order_items || '—'}</span>
            </div>
            <div className="adm-order-row adm-order-total">
              <span className="adm-label">Total:</span>
              <span className="adm-value adm-amount">{fmtRs(order.total_amount)}</span>
            </div>

            {status === 'completed' && (
              <>
                {Number(order.discount) > 0 && (
                  <div className="adm-order-row">
                    <span className="adm-label">Discount:</span>
                    <span className="adm-value" style={{ color: '#d97706' }}>− {fmtRs(order.discount)}</span>
                  </div>
                )}
                <div className="adm-order-row">
                  <span className="adm-label">Profit:</span>
                  <span className="adm-value adm-profit">{fmtRs(order.net_profit)}</span>
                </div>
                <div className="adm-order-row">
                  <span className="adm-label">Payment:</span>
                  <span className="adm-value">{order.payment_method || '—'}</span>
                </div>
                <div className="adm-order-row">
                  <span className="adm-label">Type:</span>
                  <span className="adm-value">{order.order_type || '—'}</span>
                </div>
              </>
            )}
          </div>

          <div className="adm-order-actions">
            {status === 'pending' && (
              <>
                <button className="adm-btn adm-btn-complete" onClick={() => onSelectOrder(order)}>
                  ✅ Complete
                </button>
                <button className="adm-btn adm-btn-cancel" onClick={async () => {
                  if (!window.confirm('Cancel this order?')) return;
                  try {
                    await cancelOrder(order.order_id);
                    showMsg('❌ Order cancelled');
                    onRefresh();
                  } catch (e) {
                    showMsg('Error: ' + e.message);
                  }
                }}>
                  ❌ Cancel
                </button>
              </>
            )}

            {status === 'completed' && (
              <button className="adm-btn adm-btn-delete" onClick={async () => {
                if (!window.confirm('⚠️ Delete this order permanently?')) return;
                try {
                  await dbDeleteOrder(order.order_id);
                  showMsg('🗑️ Order deleted');
                  onRefresh();
                } catch (e) {
                  showMsg('Error: ' + e.message);
                }
              }}>
                🗑️ Delete Permanently
              </button>
            )}

            {status === 'cancelled' && (
              <button className="adm-btn adm-btn-delete" onClick={async () => {
                if (!window.confirm('⚠️ Delete this order permanently?')) return;
                try {
                  await dbDeleteOrder(order.order_id);
                  showMsg('🗑️ Order deleted');
                  onRefresh();
                } catch (e) {
                  showMsg('Error: ' + e.message);
                }
              }}>
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ORDER COMPLETE MODAL
// ============================================================

function OrderCompleteModal({ order, paymentMethods, onClose, onComplete }) {
  const [orderType, setOrderType] = useState('Deliver');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(order.delivery_charge || 0);
  const [discount, setDiscount] = useState(order.discount || 0);
  const [commission, setCommission] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ product_name: '', quantity: 1 });

  const orderTypes = ['Deliver', 'In-Store'];
  const availablePayments = paymentMethods && paymentMethods.length > 0
    ? paymentMethods.map(p => p.name)
    : ['Cash', 'Card', 'Online', 'KOKO', 'Bank', 'Daraz COD'];

  useEffect(() => {
    async function load() {
      try {
        const its = await dbGetOrderItems(order.order_id);
        setItems(its.map(it => ({
          id: it.id,
          product_name: it.product_name,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 1500,
          unit_cost: Number(it.unit_cost) || 0
        })));
        const prods = await dbGetProducts();
        setProducts(prods);
        if (availablePayments.length > 0) {
          setPaymentMethod(availablePayments[0]);
        }
      } catch (e) { console.error(e); }
    }
    load();
  }, [order.order_id]);

  function updateItemQty(idx, newQty) {
    if (newQty < 1) return;
    setItems(items.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
  }

  function removeItem(idx) {
    if (!window.confirm('Remove this item?')) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function addNewItem() {
    if (!newItem.product_name) {
      alert('Select a product');
      return;
    }
    const product = products.find(p => p.name === newItem.product_name);
    const unitCost = product ? (Number(product.total_cost) || Number(product.full_cost) || 0) : 0;
    const unitPrice = product ? (Number(product.selling_price) || Number(product.price) || 1500) : 1500;

    setItems([...items, {
      id: null,
      product_name: newItem.product_name,
      quantity: Number(newItem.quantity) || 1,
      unit_price: unitPrice,
      unit_cost: unitCost
    }]);

    setNewItem({ product_name: '', quantity: 1 });
    setShowAddItem(false);
  }

  useEffect(() => {
    async function calc() {
      try {
        const comms = await dbGetCommissions();
        const comm = comms.find(c => String(c.method).toLowerCase() === String(paymentMethod).toLowerCase());
        if (comm) {
          const itemsTotal = items.reduce((s, it) => s + (it.unit_price * it.quantity), 0);
          const netForComm = itemsTotal + Number(deliveryCharge) - Number(discount);
          const c = (netForComm * Number(comm.rate) / 100) + Number(comm.fixed_fee || 0);
          setCommission(Math.round(c * 100) / 100);
        } else {
          setCommission(0);
        }
      } catch (e) { console.error(e); }
    }
    calc();
  }, [paymentMethod, items, deliveryCharge, discount]);

  async function handleComplete() {
    if (items.length === 0) {
      setError('Order එකේ items අඩුම එකක්වත් තියෙන්න ඕන');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await completeOrder(order.order_id, {
        order_type: orderType,
        payment_method: paymentMethod,
        delivery_charge: Number(deliveryCharge) || 0,
        discount: Number(discount) || 0,
        commission_override: Number(commission) || 0,
        updated_items: items
      });
      onComplete();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const itemsTotal = items.reduce((s, it) => s + (it.unit_price * it.quantity), 0);
  const totalCost = items.reduce((s, it) => s + (it.unit_cost * it.quantity), 0);
  const deliveryNum = Number(deliveryCharge) || 0;
  const discountNum = Number(discount) || 0;
  const commissionNum = Number(commission) || 0;
  const netTotal = itemsTotal + deliveryNum - discountNum;
  const netProfit = netTotal - totalCost - commissionNum;

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h3>Complete Order — {order.order_id}</h3>
          <button className="adm-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="adm-modal-body">
          <div className="adm-modal-section">
            <div className="adm-modal-customer">
              <p><strong>{order.customer_name}</strong></p>
              <p>{order.customer_phone} • {order.district}</p>
            </div>
          </div>

          <div className="adm-modal-section">
            <label className="adm-modal-label">Order Items</label>
            <div className="adm-items-edit-list">
              {items.length === 0 ? (
                <p className="adm-items-empty">No items — add at least one</p>
              ) : (
                items.map((it, idx) => (
                  <div key={idx} className="adm-item-edit-row">
                    <div className="adm-item-edit-name">
                      <div className="adm-item-edit-title">{it.product_name}</div>
                      <div className="adm-item-edit-price">{fmtRs(it.unit_price)} each</div>
                    </div>
                    <div className="adm-item-edit-qty">
                      <button onClick={() => updateItemQty(idx, it.quantity - 1)}>−</button>
                      <span>{it.quantity}</span>
                      <button onClick={() => updateItemQty(idx, it.quantity + 1)}>+</button>
                    </div>
                    <div className="adm-item-edit-total">{fmtRs(it.unit_price * it.quantity)}</div>
                    <button className="adm-item-edit-remove" onClick={() => removeItem(idx)}>✕</button>
                  </div>
                ))
              )}
            </div>

            {!showAddItem ? (
              <button
                className="adm-add-item-btn"
                onClick={() => setShowAddItem(true)}
                disabled={products.length === 0}
              >
                ➕ Add Item
              </button>
            ) : (
              <div className="adm-add-item-form">
                <select
                  value={newItem.product_name}
                  onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                >
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  placeholder="Qty"
                />
                <button className="adm-btn adm-btn-primary" onClick={addNewItem}>Add</button>
                <button className="adm-btn adm-btn-secondary" onClick={() => { setShowAddItem(false); setNewItem({ product_name: '', quantity: 1 }); }}>Cancel</button>
              </div>
            )}
          </div>

          <div className="adm-modal-section">
            <label className="adm-modal-label">Order Type</label>
            <select className="adm-modal-input" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              {orderTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="adm-modal-section">
            <label className="adm-modal-label">Payment Method</label>
            <select className="adm-modal-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {availablePayments.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="adm-modal-section">
            <label className="adm-modal-label">Delivery Charge (Rs.)</label>
            <input type="number" className="adm-modal-input" value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value)} />
          </div>

          <div className="adm-modal-section">
            <label className="adm-modal-label" style={{ color: '#d97706' }}>🎁 Discount (Rs.)</label>
            <input type="number" className="adm-modal-input" value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0" />
          </div>

          <div className="adm-modal-section">
            <label className="adm-modal-label">Commission (Auto-calculated)</label>
            <input type="number" className="adm-modal-input" value={commission}
              onChange={(e) => setCommission(e.target.value)} />
          </div>

          <div className="adm-modal-section adm-modal-summary">
            <div className="adm-modal-row"><span>Items Total:</span><span>{fmtRs(itemsTotal)}</span></div>
            <div className="adm-modal-row"><span>Delivery:</span><span>+ {fmtRs(deliveryNum)}</span></div>
            {discountNum > 0 && (
              <div className="adm-modal-row" style={{ color: '#d97706' }}><span>Discount:</span><span>− {fmtRs(discountNum)}</span></div>
            )}
            <div className="adm-modal-row" style={{ fontWeight: 600, borderTop: '1px solid #eee', paddingTop: '8px' }}>
              <span>Net Total:</span><span>{fmtRs(netTotal)}</span>
            </div>
            <div className="adm-modal-row"><span>Total Cost:</span><span>− {fmtRs(totalCost)}</span></div>
            <div className="adm-modal-row"><span>Commission:</span><span>− {fmtRs(commissionNum)}</span></div>
            <div className="adm-modal-row adm-modal-profit"><span>Net Profit:</span><span>{fmtRs(netProfit)}</span></div>
          </div>

          {error && <div className="adm-modal-error">❌ {error}</div>}
        </div>

        <div className="adm-modal-footer">
          <button className="adm-btn adm-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-primary" onClick={handleComplete} disabled={loading}>
            {loading ? 'Processing...' : '✅ Confirm Complete'}
          </button>
        </div>
      </div>
    </div>
  );
  }
/*************************************************************
 * AROMA LAB — Admin Panel: PnL + Settings + Content + Main App
 * File: admin-3.js
 *************************************************************/

// ============================================================
// PNL REPORT TAB
// ============================================================

function PnLReportTab({ showMsg }) {
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [otherCosts, setOtherCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: todayStr()
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ords, exps, others] = await Promise.all([
        dbGetOrders('Completed'),
        dbGetExpenses(),
        dbGetOtherCosts()
      ]);
      setOrders(ords);
      setExpenses(exps);
      setOtherCosts(others);
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
    setLoading(false);
  }

  function filterByDate(arr, dateField) {
    if (!dateRange.from || !dateRange.to) return arr;
    return arr.filter(item => {
      const d = item[dateField] ? new Date(item[dateField]).toISOString().split('T')[0] : '';
      return d >= dateRange.from && d <= dateRange.to;
    });
  }

  const filteredOrders = filterByDate(orders, 'order_date');
  const filteredExpenses = filterByDate(expenses, 'expense_date');
  const filteredOtherCosts = filterByDate(otherCosts, 'cost_date');

  const totalIncome = filteredOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const totalCost = filteredOrders.reduce((s, o) => s + (Number(o.total_cost) || 0), 0);
  const totalCommission = filteredOrders.reduce((s, o) => s + (Number(o.commission) || 0), 0);
  const totalDiscount = filteredOrders.reduce((s, o) => s + (Number(o.discount) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (Number(e.total_cost) || 0), 0);
  const totalOtherCosts = filteredOtherCosts.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const netProfit = totalIncome - totalCost - totalCommission - totalExpenses - totalOtherCosts;
  const margin = totalIncome > 0 ? (netProfit / totalIncome * 100) : 0;

  function getDailyData() {
    const map = {};
    filteredOrders.forEach(o => {
      const d = o.order_date ? new Date(o.order_date).toISOString().split('T')[0] : '';
      if (!map[d]) map[d] = { date: d, orders: 0, income: 0, profit: 0 };
      map[d].orders += 1;
      map[d].income += Number(o.total_amount) || 0;
      map[d].profit += Number(o.net_profit) || 0;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }

  function downloadCSV() {
    const data = getDailyData();
    let csv = 'Date,Orders,Income,Profit\n';
    data.forEach(d => {
      csv += d.date + ',' + d.orders + ',' + d.income + ',' + d.profit + '\n';
    });
    csv += '\nTotal,' + filteredOrders.length + ',' + totalIncome + ',' + netProfit + '\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aroma-lab-pnl-' + todayStr() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showMsg('✅ CSV downloaded');
  }

  if (loading) return <div className="adm-loading">Loading...</div>;

  const dailyData = getDailyData();

  return (
    <div className="adm-pnl">
      <h3 className="adm-section-title">Profit & Loss Report</h3>

      <div className="adm-pnl-filters">
        <div className="adm-form-field">
          <label>From</label>
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
        </div>
        <div className="adm-form-field">
          <label>To</label>
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
        </div>
        <button className="adm-btn adm-btn-secondary" onClick={() => {
          const today = todayStr();
          setDateRange({ from: today, to: today });
        }}>Today</button>
        <button className="adm-btn adm-btn-secondary" onClick={() => {
          const d = new Date();
          setDateRange({
            from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
            to: todayStr()
          });
        }}>This Month</button>
        <button className="adm-btn adm-btn-primary" onClick={downloadCSV}>📥 Download CSV</button>
      </div>

      <div className="adm-pnl-summary">
        <div className="adm-pnl-card adm-pnl-income">
          <div className="adm-pnl-label">Net Income</div>
          <div className="adm-pnl-value">{fmtRs(totalIncome)}</div>
        </div>
        <div className="adm-pnl-card adm-pnl-cost">
          <div className="adm-pnl-label">Product Cost</div>
          <div className="adm-pnl-value">{fmtRs(totalCost)}</div>
        </div>
        <div className="adm-pnl-card adm-pnl-comm">
          <div className="adm-pnl-label">Commission</div>
          <div className="adm-pnl-value">{fmtRs(totalCommission)}</div>
        </div>
        {totalDiscount > 0 && (
          <div className="adm-pnl-card">
            <div className="adm-pnl-label">Discounts Given</div>
            <div className="adm-pnl-value" style={{ color: '#d97706' }}>{fmtRs(totalDiscount)}</div>
          </div>
        )}
        {totalExpenses > 0 && (
          <div className="adm-pnl-card adm-pnl-exp">
            <div className="adm-pnl-label">Expenses</div>
            <div className="adm-pnl-value">{fmtRs(totalExpenses)}</div>
          </div>
        )}
        <div className="adm-pnl-card adm-pnl-other">
          <div className="adm-pnl-label">Other Costs</div>
          <div className="adm-pnl-value">{fmtRs(totalOtherCosts)}</div>
        </div>
        <div className="adm-pnl-card adm-pnl-profit">
          <div className="adm-pnl-label">Net Profit</div>
          <div className="adm-pnl-value">{fmtRs(netProfit)}</div>
          <div className="adm-pnl-margin">Margin: {margin.toFixed(1)}%</div>
        </div>
      </div>

      <h4 className="adm-section-title" style={{ marginTop: '30px' }}>Daily Breakdown</h4>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Income</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {dailyData.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No data for this period</td></tr>
            ) : (
              dailyData.map(d => (
                <tr key={d.date}>
                  <td>{fmtDate(d.date)}</td>
                  <td>{d.orders}</td>
                  <td>{fmtRs(d.income)}</td>
                  <td className="adm-profit">{fmtRs(d.profit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// OTHER COSTS TAB
// ============================================================

function OtherCostsTab({ showMsg }) {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ reason: '', amount: '', cost_date: todayStr() });

  useEffect(() => { loadCosts(); }, []);

  async function loadCosts() {
    setLoading(true);
    try {
      const data = await dbGetOtherCosts();
      setCosts(data);
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.reason.trim()) { showMsg('❌ Reason required'); return; }
    if (!form.amount || Number(form.amount) <= 0) { showMsg('❌ Valid amount required'); return; }
    try {
      await dbAddOtherCost(form.reason, form.amount, form.cost_date);
      showMsg('✅ Cost added');
      setForm({ reason: '', amount: '', cost_date: todayStr() });
      await loadCosts();
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  async function handleDelete(id, reason) {
    if (!window.confirm('Delete "' + reason + '"?')) return;
    try {
      await dbDeleteOtherCost(id);
      showMsg('🗑️ Deleted');
      await loadCosts();
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  const total = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  if (loading) return <div className="adm-loading">Loading...</div>;

  return (
    <div className="adm-other-costs-wrap">
      <h3 className="adm-section-title">Other Costs</h3>
      <p className="adm-hint">
        මේවා product costs වලට එකතු වෙන්නේ නෑ. PnL Report එකේ Net Profit එකෙන් කෙලින්ම අඩු වෙනවා.
      </p>

      <div className="adm-other-costs-add-form">
        <div className="adm-form-field">
          <label>Reason</label>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="e.g., Facebook Ads"
          />
        </div>
        <div className="adm-form-field">
          <label>Amount (Rs.)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="adm-form-field">
          <label>Date</label>
          <input
            type="date"
            value={form.cost_date}
            onChange={(e) => setForm({ ...form, cost_date: e.target.value })}
          />
        </div>
        <button className="adm-btn adm-btn-gold" onClick={handleAdd}>+ Add Cost</button>
      </div>

      {costs.length === 0 ? (
        <div className="adm-empty">
          <p>No other costs yet. Add your first one above.</p>
        </div>
      ) : (
        <>
          <div className="adm-other-costs-list">
            {costs.map(c => (
              <div key={c.id} className="adm-other-cost-item">
                <div className="adm-other-cost-info">
                  <div className="adm-other-cost-reason">{c.reason}</div>
                  <div className="adm-other-cost-date">{fmtDate(c.cost_date)}</div>
                </div>
                <div className="adm-other-cost-amount">{fmtRs(c.amount)}</div>
                <button
                  className="adm-btn adm-btn-delete"
                  onClick={() => handleDelete(c.id, c.reason)}
                  style={{ padding: '8px 12px', fontSize: '11px' }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>

          <div className="adm-other-costs-total">
            <div className="adm-other-costs-total-label">Total Other Costs</div>
            <div className="adm-other-costs-total-value">{fmtRs(total)}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// COMMISSIONS TAB
// ============================================================

function CommissionsTab({ showMsg }) {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState({});

  useEffect(() => { loadCommissions(); }, []);

  async function loadCommissions() {
    setLoading(true);
    try {
      const comms = await dbGetCommissions();
      setCommissions(comms);
      const ed = {};
      comms.forEach(c => {
        ed[c.method] = { rate: c.rate, fixed_fee: c.fixed_fee, notes: c.notes };
      });
      setEditData(ed);
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
    setLoading(false);
  }

  async function saveCommission(method) {
    try {
      const d = editData[method];
      await dbUpdateCommission(method, d.rate, d.fixed_fee, d.notes);
      showMsg('✅ ' + method + ' commission updated!');
      await loadCommissions();
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  if (loading) return <div className="adm-loading">Loading...</div>;

  return (
    <div className="adm-commissions">
      <h3 className="adm-section-title">Bank & Payment Commissions</h3>
      <p className="adm-hint">Rates edit කරන්න. ඊළඟ orders වලට auto apply වෙනවා.</p>

      <div className="adm-comm-grid">
        {commissions.map(c => (
          <div key={c.method} className="adm-comm-card">
            <div className="adm-comm-header">
              <span className="adm-comm-badge">{c.method}</span>
            </div>
            <div className="adm-form-field">
              <label>Rate (%)</label>
              <input type="number" step="0.01" value={editData[c.method]?.rate || 0}
                onChange={(e) => setEditData({ ...editData, [c.method]: { ...editData[c.method], rate: e.target.value } })} />
            </div>
            <div className="adm-form-field">
              <label>Fixed Fee (Rs.)</label>
              <input type="number" value={editData[c.method]?.fixed_fee || 0}
                onChange={(e) => setEditData({ ...editData, [c.method]: { ...editData[c.method], fixed_fee: e.target.value } })} />
            </div>
            <div className="adm-form-field">
              <label>Notes</label>
              <input type="text" value={editData[c.method]?.notes || ''}
                onChange={(e) => setEditData({ ...editData, [c.method]: { ...editData[c.method], notes: e.target.value } })} />
            </div>
            <button className="adm-btn adm-btn-primary" onClick={() => saveCommission(c.method)}>💾 Save</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS — PRODUCT COSTS
// ============================================================

function ProductCostsTab({ showMsg, costTypes }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({ cost_type: 'Breakdown', selling_price: 1500 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    const interval = setInterval(() => { loadProducts(true); }, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadProducts(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const prods = await dbGetProducts();
      setProducts(prods);
      setLastRefresh(new Date());
      if (selectedProduct) {
        const updated = prods.find(p => p.id === selectedProduct.id);
        if (updated) setSelectedProduct(updated);
      }
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
    if (!silent) setLoading(false);
    else setRefreshing(false);
  }

  function selectProduct(p) {
    setSelectedProduct(p);
    const costForm = { cost_type: p.cost_type || 'Breakdown', selling_price: p.selling_price || 1500 };
    costTypes.forEach(ct => {
      const key = ct.name.toLowerCase().replace(/\s+/g, '_');
      costForm[key] = p[key] || 0;
    });
    setForm(costForm);
  }

  async function handleSave() {
    if (!selectedProduct) return;
    try {
      await dbUpdateProductCost(selectedProduct.id, form, costTypes);
      showMsg('✅ Product cost updated!');
      await loadProducts(true);
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  let totalCost = 0;
  costTypes.forEach(ct => {
    const key = ct.name.toLowerCase().replace(/\s+/g, '_');
    totalCost += Number(form[key]) || 0;
  });
  const profitPerUnit = (Number(form.selling_price) || 0) - totalCost;

  const productsWithoutCost = products.filter(p => !p.total_cost || Number(p.total_cost) === 0).length;

  if (loading) return <div className="adm-loading">Loading...</div>;

  return (
    <div className="adm-settings-layout">
      <div className="adm-settings-sidebar">
        <div className="adm-settings-header">
          <h4 className="adm-section-title">Products ({products.length})</h4>
          <button className="adm-refresh-btn" onClick={() => loadProducts(true)} disabled={refreshing}>
            {refreshing ? '⏳' : '🔄'}
          </button>
        </div>
        {lastRefresh && (
          <p className="adm-last-refresh">
            Last: {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        )}
        {productsWithoutCost > 0 && (
          <div className="adm-warning-box">
            ⚠️ {productsWithoutCost} product{productsWithoutCost > 1 ? 's' : ''} without cost
          </div>
        )}
        {products.length === 0 ? (
          <div className="adm-empty-small"><p>No products yet</p></div>
        ) : (
          products.map(p => (
            <button
              key={p.id}
              className={'adm-product-btn ' + (selectedProduct && selectedProduct.id === p.id ? 'active' : '')}
              onClick={() => selectProduct(p)}
            >
              <span className="adm-product-name">{p.name}</span>
              <span className="adm-product-cost">
                {p.total_cost > 0 ? 'Cost: ' + fmtRs(p.total_cost) : '⚠️ No cost'}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="adm-settings-main">
        {!selectedProduct ? (
          <div className="adm-empty">
            <p>👈 Select a product to edit costs</p>
          </div>
        ) : (
          <>
            <h3 className="adm-section-title">{selectedProduct.name}</h3>
            <p className="adm-hint">Enter cost breakdown. Costs auto-load from Cost Types tab.</p>

            <div className="adm-form-grid">
              <div className="adm-form-field">
                <label>Cost Type</label>
                <select value={form.cost_type} onChange={(e) => setForm({ ...form, cost_type: e.target.value })}>
                  <option value="Breakdown">Breakdown</option>
                  <option value="Fixed">Fixed</option>
                </select>
              </div>

              {costTypes.map(ct => {
                const key = ct.name.toLowerCase().replace(/\s+/g, '_');
                return (
                  <div key={ct.id} className="adm-form-field">
                    <label>{ct.name} (Rs.)</label>
                    <input
                      type="number"
                      value={form[key] || 0}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                );
              })}

              <div className="adm-form-field">
                <label>Selling Price (Rs.)</label>
                <input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
              </div>
            </div>

            <div className="adm-summary-box">
              <div className="adm-summary-row"><span>Total Cost:</span><span>{fmtRs(totalCost)}</span></div>
              <div className="adm-summary-row"><span>Profit per Unit:</span><span className="adm-profit">{fmtRs(profitPerUnit)}</span></div>
            </div>

            <button className="adm-btn adm-btn-primary" onClick={handleSave}>💾 Save Cost</button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS — SIMPLE LIST MANAGER (Cost Types, Categories, etc.)
// ============================================================

function ListManagerTab({ title, hint, items, onAdd, onDelete, showMsg, placeholder }) {
  const [newName, setNewName] = useState('');

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await onAdd(newName);
      setNewName('');
      showMsg('✅ Added');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm('Delete "' + name + '"?')) return;
    try {
      await onDelete(id);
      showMsg('🗑️ Deleted');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  return (
    <div>
      <h3 className="adm-section-title">{title} ({items.length})</h3>
      {hint && <p className="adm-hint">{hint}</p>}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder={placeholder || 'New name...'}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="adm-input"
          style={{ flex: 1 }}
        />
        <button onClick={handleAdd} className="adm-btn adm-btn-primary">+ Add</button>
      </div>

      <div className="adm-list">
        {items.length === 0 ? (
          <div className="adm-empty-small"><p>No items yet</p></div>
        ) : (
          items.map(item => (
            <div key={item.id} className="adm-list-row">
              <div className="adm-list-info">
                <div className="adm-list-name">{item.name}</div>
              </div>
              <button onClick={() => handleDelete(item.id, item.name)} className="adm-btn adm-btn-delete">
                🗑️ Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS — DELIVERY
// ============================================================

function DeliverySettingsTab({ deliverySettings, setDeliverySettings, showMsg }) {
  const [base, setBase] = useState(deliverySettings.base_charge);
  const [threshold, setThreshold] = useState(deliverySettings.free_delivery_threshold);

  async function handleSave() {
    try {
      await dbUpdateDeliverySettings(base, threshold);
      setDeliverySettings({ base_charge: Number(base), free_delivery_threshold: Number(threshold) });
      showMsg('✅ Delivery settings updated');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  return (
    <div>
      <h3 className="adm-section-title">🚚 Delivery Settings</h3>
      <p className="adm-hint">Delivery charges edit කරන්න. Cart එකට auto apply වෙනවා.</p>

      <div className="adm-form-grid" style={{ maxWidth: '500px' }}>
        <div className="adm-form-field">
          <label>Base Delivery Charge (Rs.)</label>
          <input type="number" value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
        <div className="adm-form-field">
          <label>Free Delivery Threshold (items)</label>
          <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
        ⚠️ {threshold}+ items ගත්තොත් delivery FREE.
      </p>

      <button onClick={handleSave} className="adm-btn adm-btn-primary">💾 Save Delivery Settings</button>
    </div>
  );
}

// ============================================================
// CONTENT — PRODUCTS MANAGER
// ============================================================

function ProductsManager({ showMsg, categories, productTypes, products, setProducts }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', product_type: 'Perfume', tagline: '',
    top: '', heart: '', base: '', image: '', price: 1500, selling_price: 1500, stock: 0
  });
  const [uploading, setUploading] = useState(false);

  function mapProduct(p) {
    return {
      id: p.id, name: p.name,
      for: p.category ? 'FOR ' + p.category.toUpperCase() : '',
      filter: p.category, category: p.category, product_type: p.product_type || 'Perfume',
      tagline: p.description || '', top: p.top_notes || '', heart: p.heart_notes || '', base: p.base_notes || '',
      image: p.image_url || '',
      price: Number(p.selling_price) || Number(p.price) || 1500,
      selling_price: Number(p.selling_price) || Number(p.price) || 1500,
      stock: p.stock || 0, accent: '#B8963E'
    };
  }

  async function handleImageUpload(file, callback) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      callback(url);
      showMsg('✅ Image uploaded!');
    } catch (err) {
      showMsg('❌ Upload error: ' + err.message);
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!newProduct.name || !newProduct.image) {
      showMsg('❌ Name and image required');
      return;
    }
    try {
      const productData = {
        name: newProduct.name,
        category: newProduct.category || (categories[0]?.name || 'Ladies'),
        product_type: newProduct.product_type || 'Perfume',
        description: newProduct.tagline,
        top_notes: newProduct.top,
        heart_notes: newProduct.heart,
        base_notes: newProduct.base,
        image_url: newProduct.image,
        price: String(newProduct.selling_price || 1500),
        selling_price: Number(newProduct.selling_price || 1500),
        stock: Number(newProduct.stock) || 0
      };
      if (editingProduct) {
        await dbUpdateProduct(editingProduct.id, productData);
        showMsg('✅ Product updated!');
      } else {
        await dbAddProduct(productData);
        showMsg('✅ Product added!');
      }
      const fresh = await dbGetProducts();
      setProducts(fresh.map(mapProduct));
      setNewProduct({ name: '', category: '', product_type: 'Perfume', tagline: '', top: '', heart: '', base: '', image: '', price: 1500, selling_price: 1500, stock: 0 });
      setEditingProduct(null);
      setShowForm(false);
    } catch (err) {
      showMsg('❌ Error: ' + err.message);
    }
  }

  function editProduct(p) {
    setNewProduct({
      name: p.name, category: p.category || '', product_type: p.product_type || 'Perfume',
      tagline: p.tagline || '', top: p.top || '', heart: p.heart || '', base: p.base || '',
      image: p.image || '', price: p.selling_price || 1500, selling_price: p.selling_price || 1500, stock: p.stock || 0
    });
    setEditingProduct(p);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await dbDeleteProduct(id);
      const fresh = await dbGetProducts();
      setProducts(fresh.map(mapProduct));
      showMsg('✅ Product deleted');
    } catch (err) {
      showMsg('❌ Error: ' + err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 className="adm-section-title" style={{ margin: 0 }}>Products ({products.length})</h3>
        <button className="adm-btn adm-btn-primary" onClick={() => {
          setShowForm(!showForm);
          setEditingProduct(null);
          setNewProduct({ name: '', category: categories[0]?.name || '', product_type: 'Perfume', tagline: '', top: '', heart: '', base: '', image: '', price: 1500, selling_price: 1500, stock: 0 });
        }}>
          {showForm ? '✕ Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '15px' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h4>
          <div className="adm-form-grid">
            <input type="text" placeholder="Product Name *" value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="adm-input" />
            <select value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="adm-input">
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select value={newProduct.product_type}
              onChange={(e) => setNewProduct({ ...newProduct, product_type: e.target.value })} className="adm-input">
              {productTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <input type="number" placeholder="Price (Rs.)" value={newProduct.selling_price}
              onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })} className="adm-input" />
            <input type="number" placeholder="Stock" value={newProduct.stock}
              onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} className="adm-input" />
            <input type="text" placeholder="Tagline" value={newProduct.tagline}
              onChange={(e) => setNewProduct({ ...newProduct, tagline: e.target.value })} className="adm-input adm-input-full" />
            {newProduct.product_type === 'Perfume' && (
              <>
                <input type="text" placeholder="Top Notes" value={newProduct.top}
                  onChange={(e) => setNewProduct({ ...newProduct, top: e.target.value })} className="adm-input" />
                <input type="text" placeholder="Heart Notes" value={newProduct.heart}
                  onChange={(e) => setNewProduct({ ...newProduct, heart: e.target.value })} className="adm-input" />
                <input type="text" placeholder="Base Notes" value={newProduct.base}
                  onChange={(e) => setNewProduct({ ...newProduct, base: e.target.value })} className="adm-input adm-input-full" />
              </>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label className="adm-upload-label">
              {uploading ? 'Uploading...' : '📤 Upload Product Image *'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(e.target.files[0], (url) => setNewProduct({ ...newProduct, image: url }))} />
            </label>
            {newProduct.image && <img src={newProduct.image} alt="Preview" className="adm-preview-img" />}
          </div>

          <button onClick={handleSave} className="adm-btn adm-btn-primary">
            {editingProduct ? '💾 Update Product' : '+ Add Product'}
          </button>
        </div>
      )}

      <div className="adm-list">
        {products.map(p => (
          <div key={p.id} className="adm-list-row">
            <img src={p.image} alt={p.name} className="adm-list-img" />
            <div className="adm-list-info">
              <div className="adm-list-name">{p.name}</div>
              <div className="adm-list-sub">{p.for} • {fmtRs(p.price)}</div>
            </div>
            <div className="adm-list-actions">
              <button onClick={() => editProduct(p)} className="adm-btn adm-btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>✏️ Edit</button>
              <button onClick={() => handleDelete(p.id)} className="adm-btn adm-btn-delete">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CONTENT — PAGES MANAGER
// ============================================================

function PagesManager({ showMsg, pages, setPages }) {
  const [newPage, setNewPage] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState(null);

  async function handleSave() {
    if (!newPage.title.trim()) { showMsg('❌ Title required'); return; }
    try {
      if (editingId) {
        await dbUpdatePage(editingId, newPage.title, newPage.content);
        showMsg('✅ Page updated');
      } else {
        await dbAddPage(newPage.title, newPage.content);
        showMsg('✅ Page added');
      }
      const fresh = await dbGetPages();
      setPages(fresh);
      setNewPage({ title: '', content: '' });
      setEditingId(null);
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this page?')) return;
    try {
      await dbDeletePage(id);
      const fresh = await dbGetPages();
      setPages(fresh);
      showMsg('🗑️ Deleted');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  return (
    <div>
      <h3 className="adm-section-title">{editingId ? 'Edit Page' : 'Add New Page'}</h3>
      <div className="adm-form-grid">
        <input type="text" placeholder="Page Title *" value={newPage.title}
          onChange={(e) => setNewPage({ ...newPage, title: e.target.value })} className="adm-input adm-input-full" />
        <textarea placeholder="Page Content" value={newPage.content}
          onChange={(e) => setNewPage({ ...newPage, content: e.target.value })}
          className="adm-input adm-input-full" style={{ minHeight: '120px' }}></textarea>
      </div>
      <button onClick={handleSave} className="adm-btn adm-btn-primary">
        {editingId ? '💾 Update Page' : '+ Add Page'}
      </button>
      {editingId && (
        <button onClick={() => { setEditingId(null); setNewPage({ title: '', content: '' }); }}
          className="adm-btn adm-btn-secondary" style={{ marginLeft: '10px' }}>Cancel</button>
      )}

      <h3 className="adm-section-title" style={{ marginTop: '30px' }}>Existing Pages</h3>
      <div className="adm-list">
        {pages.map(p => (
          <div key={p.id} className="adm-list-row">
            <div className="adm-list-info">
              <div className="adm-list-name">{p.title}</div>
            </div>
            <div className="adm-list-actions">
              <button onClick={() => { setEditingId(p.id); setNewPage({ title: p.title, content: p.content || '' }); }}
                className="adm-btn adm-btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>✏️ Edit</button>
              <button onClick={() => handleDelete(p.id)} className="adm-btn adm-btn-delete">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CONTENT — BOT SETTINGS
// ============================================================

function BotSettingsManager({ showMsg }) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await dbGetBotSettings();
        setSystemPrompt(data.system_prompt || '');
        setWelcomeMessage(data.welcome_message || '');
      } catch (e) { console.error(e); }
    }
    load();
  }, []);

  async function handleSave() {
    try {
      await dbUpdateBotSettings(systemPrompt, welcomeMessage);
      showMsg('✅ Chat Bot settings saved');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  return (
    <div>
      <h3 className="adm-section-title">🤖 Chat Bot Settings</h3>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Welcome Message</label>
        <input type="text" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)}
          className="adm-input" placeholder="Hi! How can I help you today?" />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>System Prompt</label>
        <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
          className="adm-input" style={{ minHeight: '250px', fontFamily: 'monospace', fontSize: '12px' }}
          placeholder="You are AROMA Assistant..." />
      </div>
      <button onClick={handleSave} className="adm-btn adm-btn-primary">💾 Save Chat Bot Settings</button>
    </div>
  );
}

// ============================================================
// MAIN ADMIN APP
// ============================================================

function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeGroup, setActiveGroup] = useState('business');
  const [activeTab, setActiveTab] = useState('orders');
  const [message, setMessage] = useState('');

  // Orders
  const [pendingOrders, setPendingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ordersSubTab, setOrdersSubTab] = useState('pending');

  // Dynamic data
  const [costTypes, setCostTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliverySettings, setDeliverySettings] = useState({ base_charge: 350, free_delivery_threshold: 3 });
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [pages, setPages] = useState([]);

  function showMsg(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  }

  // Auth check
  useEffect(() => {
    async function check() {
      const session = await getSession();
      if (session && session.user && session.user.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
      }
      setAuthChecked(true);
    }
    check();
  }, []);

  // Load all data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    loadAllData();
    const channel = sb.channel('adm-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { loadOrders(); })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [isAuthenticated]);

  async function loadAllData() {
    await Promise.all([
      loadOrders(),
      loadCostTypes(),
      loadPaymentMethods(),
      loadDelivery(),
      loadCategories(),
      loadProductTypes(),
      loadProducts(),
      loadPages()
    ]);
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const [pending, completed, cancelled] = await Promise.all([
        dbGetOrders('Pending'),
        dbGetOrders('Completed'),
        dbGetOrders('Cancelled')
      ]);
      setPendingOrders(pending);
      setCompletedOrders(completed);
      setCancelledOrders(cancelled);
    } catch (e) {
      console.error('Orders load error:', e);
    }
    setOrdersLoading(false);
  }

  async function loadCostTypes() {
    const d = await dbGetCostTypes();
    setCostTypes(d);
  }
  async function loadPaymentMethods() {
    const d = await dbGetPaymentMethods();
    setPaymentMethods(d);
  }
  async function loadDelivery() {
    const d = await dbGetDeliverySettings();
    setDeliverySettings(d);
  }
  async function loadCategories() {
    const d = await dbGetCategories();
    setCategories(d);
  }
  async function loadProductTypes() {
    const d = await dbGetProductTypes();
    setProductTypes(d);
  }
  async function loadProducts() {
    const d = await dbGetProducts();
    setProducts(d);
  }
  async function loadPages() {
    const d = await dbGetPages();
    setPages(d);
  }

  async function handleLogout() {
    if (!window.confirm('Log out from admin panel?')) return;
    await signOutAdmin();
    window.location.reload();
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (!authChecked) {
    return <div className="adm-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Business group tabs
  const businessTabs = [
    { id: 'orders', label: '📦 Orders', badge: pendingOrders.length },
    { id: 'pnl', label: '📈 PnL Report' },
    { id: 'other-costs', label: '💸 Other Costs' },
    { id: 'commissions', label: '💳 Commissions' },
    { id: 'product-costs', label: '💰 Product Costs' },
    { id: 'cost-types', label: '🏷️ Cost Types' },
    { id: 'delivery', label: '🚚 Delivery' }
  ];

  // Site content group tabs
  const contentTabs = [
    { id: 'products', label: '📦 Products' },
    { id: 'categories', label: '🏷️ Categories' },
    { id: 'types', label: '🎁 Types' },
    { id: 'payments', label: '💳 Payments' },
    { id: 'pages', label: '📄 Pages' },
    { id: 'bot', label: '🤖 Chat Bot' }
  ];

  const tabs = activeGroup === 'business' ? businessTabs : contentTabs;

  return (
    <div className="adm-app">
      <header className="adm-header">
        <div className="adm-header-left">
          <div className="adm-header-logo">🌸</div>
          <div className="adm-header-text">
            <h1 className="adm-header-title">AROMA LAB Admin</h1>
            <p className="adm-header-sub">Business Management Panel</p>
          </div>
        </div>
        <div className="adm-header-right">
          <a href={MAIN_SITE_URL} target="_blank" rel="noopener" className="adm-view-site-btn">
            🌐 View Site
          </a>
          <button className="adm-logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="adm-groups">
        <button
          className={'adm-group-btn ' + (activeGroup === 'business' ? 'active' : '')}
          onClick={() => { setActiveGroup('business'); setActiveTab('orders'); }}
        >
          📊 Business
        </button>
        <button
          className={'adm-group-btn ' + (activeGroup === 'content' ? 'active' : '')}
          onClick={() => { setActiveGroup('content'); setActiveTab('products'); }}
        >
          🎨 Site Content
        </button>
      </div>

      <div className="adm-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={'adm-tab ' + (activeTab === t.id ? 'active' : '')}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.badge > 0 && <span className="adm-tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {message && <div className="adm-message">{message}</div>}

      <div className="adm-content">
        {activeTab === 'orders' && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                className={'adm-btn ' + (ordersSubTab === 'pending' ? 'adm-btn-primary' : 'adm-btn-secondary')}
                onClick={() => setOrdersSubTab('pending')}
              >
                Pending {pendingOrders.length > 0 && '(' + pendingOrders.length + ')'}
              </button>
              <button
                className={'adm-btn ' + (ordersSubTab === 'completed' ? 'adm-btn-primary' : 'adm-btn-secondary')}
                onClick={() => setOrdersSubTab('completed')}
              >
                Complete {completedOrders.length > 0 && '(' + completedOrders.length + ')'}
              </button>
              <button
                className={'adm-btn ' + (ordersSubTab === 'cancelled' ? 'adm-btn-primary' : 'adm-btn-secondary')}
                onClick={() => setOrdersSubTab('cancelled')}
              >
                Cancelled {cancelledOrders.length > 0 && '(' + cancelledOrders.length + ')'}
              </button>
            </div>

            {ordersLoading ? (
              <div className="adm-loading">Loading orders...</div>
            ) : (
              <>
                {ordersSubTab === 'pending' && (
                  <OrdersList orders={pendingOrders} status="pending" onRefresh={loadOrders} showMsg={showMsg} onSelectOrder={setSelectedOrder} />
                )}
                {ordersSubTab === 'completed' && (
                  <OrdersList orders={completedOrders} status="completed" onRefresh={loadOrders} showMsg={showMsg} onSelectOrder={setSelectedOrder} />
                )}
                {ordersSubTab === 'cancelled' && (
                  <OrdersList orders={cancelledOrders} status="cancelled" onRefresh={loadOrders} showMsg={showMsg} onSelectOrder={setSelectedOrder} />
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'pnl' && <PnLReportTab showMsg={showMsg} />}
        {activeTab === 'other-costs' && <OtherCostsTab showMsg={showMsg} />}
        {activeTab === 'commissions' && <CommissionsTab showMsg={showMsg} />}
        {activeTab === 'product-costs' && <ProductCostsTab showMsg={showMsg} costTypes={costTypes} />}
        {activeTab === 'cost-types' && (
          <ListManagerTab
            title="Cost Types"
            hint="මේවා Product Costs tab එකේ auto-load වෙනවා."
            items={costTypes}
            onAdd={async (name) => { await dbAddCostType(name); await loadCostTypes(); }}
            onDelete={async (id) => { await dbDeleteCostType(id); await loadCostTypes(); }}
            showMsg={showMsg}
            placeholder="New cost type..."
          />
        )}
        {activeTab === 'delivery' && (
          <DeliverySettingsTab
            deliverySettings={deliverySettings}
            setDeliverySettings={setDeliverySettings}
            showMsg={showMsg}
          />
        )}

        {activeTab === 'products' && (
          <ProductsManager showMsg={showMsg} categories={categories} productTypes={productTypes} products={products} setProducts={setProducts} />
        )}
        {activeTab === 'categories' && (
          <ListManagerTab
            title="Categories"
            hint=""
            items={categories}
            onAdd={async (name) => { await dbAddCategory(name); await loadCategories(); }}
            onDelete={async (id) => { await dbDeleteCategory(id); await loadCategories(); }}
            showMsg={showMsg}
            placeholder="New category..."
          />
        )}
        {activeTab === 'types' && (
          <ListManagerTab
            title="Product Types"
            hint=""
            items={productTypes}
            onAdd={async (name) => { await dbAddProductType(name); await loadProductTypes(); }}
            onDelete={async (id) => { await dbDeleteProductType(id); await loadProductTypes(); }}
            showMsg={showMsg}
            placeholder="New product type..."
          />
        )}
        {activeTab === 'payments' && (
          <ListManagerTab
            title="Payment Methods"
            hint=""
            items={paymentMethods}
            onAdd={async (name) => { await dbAddPaymentMethod(name); await loadPaymentMethods(); }}
            onDelete={async (id) => { await dbDeletePaymentMethod(id); await loadPaymentMethods(); }}
            showMsg={showMsg}
            placeholder="New payment method..."
          />
        )}
        {activeTab === 'pages' && (
          <PagesManager showMsg={showMsg} pages={pages} setPages={setPages} />
        )}
        {activeTab === 'bot' && (
          <BotSettingsManager showMsg={showMsg} />
        )}
      </div>

      {selectedOrder && (
        <OrderCompleteModal
          order={selectedOrder}
          paymentMethods={paymentMethods}
          onClose={() => setSelectedOrder(null)}
          onComplete={async () => {
            await loadOrders();
            setSelectedOrder(null);
            showMsg('✅ Order completed!');
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// RENDER
// ============================================================

const root = ReactDOM.createRoot(document.getElementById('admin-root'));
root.render(<AdminApp />);

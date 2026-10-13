/*************************************************************
 * AROMA LAB — Admin Panel: Login + Layout + Orders
 * File: admin-2.js
 * Google Login Only — No Password
 * Domain: admin.aromalabsl.lk
 *************************************************************/

var { useState, useEffect } = React;

// ============================================================
// LOGIN SCREEN — Google Only
// ============================================================

function LoginScreen({ onSuccess }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const result = await checkAdminSession();
      if (result.authenticated) {
        onSuccess();
      } else if (result.error) {
        setError(result.error);
      }
    }
    checkSession();
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('❌ Google login failed. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="adm-login-overlay">
      <div className="adm-login-box">
        <div className="adm-login-logo">🔐</div>
        <h1 className="adm-login-title">AROMA LAB</h1>
        <p className="adm-login-subtitle">Admin Panel</p>
        <p className="adm-login-desc">Sign in with your authorized Google account</p>

        <button
          onClick={handleGoogleLogin}
          className="adm-login-btn"
          disabled={loading}
          style={{
            background: '#fff',
            color: '#0A2E1F',
            border: '2px solid #0A2E1F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '14px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            borderRadius: '10px',
            transition: 'all 0.3s'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Redirecting to Google...' : 'Sign in with Google'}
        </button>

        {error && <div className="adm-login-error" style={{ marginTop: '16px' }}>{error}</div>}

        <p style={{ fontSize: '11px', color: 'rgba(10,46,31,0.4)', marginTop: '20px' }}>
          Only authorized Google accounts can access this panel
        </p>
      </div>
    </div>
  );
}

// ============================================================
// ORDERS LIST
// ============================================================

function OrdersList({ orders, status, onRefresh, showMsg, onSelectOrder }) {
  if (!orders || !orders.length) {
    return (
      <div className="adm-empty">
        <p>No {status} orders</p>
      </div>
    );
  }

  return (
    <div className="adm-orders-list">
      {orders.map(order => (
        <div key={order.id || order.order_id} className={'adm-order-card ' + status}>
          <div className="adm-order-header">
            <div>
              <div className="adm-order-id">{order.order_id || order.id}</div>
              <div className="adm-order-date">{fmtDateTime(order.order_date || order.created_at)}</div>
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
              <span className="adm-value adm-items">{order.order_items || (order.items && order.items.map(it => it.name + ' x' + it.quantity).join(', ')) || '—'}</span>
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
                    await cancelOrder(order.order_id || order.id);
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
                  await dbDeleteOrder(order.order_id || order.id);
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
                  await dbDeleteOrder(order.order_id || order.id);
                  showMsg('🗑️ Order deleted');
                  onRefresh();
                } catch (e) {
                  showMsg('Error: ' + e.message);
                }
              }}>
                🗑️ Delete Permanently
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
  const [orderType, setOrderType] = useState(order.order_type || 'Website');
  const [paymentMethod, setPaymentMethod] = useState(order.payment_method || (paymentMethods[0]?.name || 'COD'));
  const [deliveryCharge, setDeliveryCharge] = useState(order.delivery_charge || 0);
  const [discount, setDiscount] = useState(order.discount || 0);
  const [commission, setCommission] = useState(order.commission || 0);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ product_name: '', quantity: 1 });

  const orderTypes = ['Website', 'Facebook', 'Instagram', 'WhatsApp', 'Direct', 'Other'];
  const availablePayments = paymentMethods && paymentMethods.length ? paymentMethods.map(p => p.name) : ['COD', 'Bank Transfer', 'Card', 'Koko', 'Mintpay'];

  useEffect(() => {
    async function init() {
      try {
        const [rawItems, prods, comms] = await Promise.all([
          dbGetOrderItems(order.order_id || order.id),
          dbGetProducts(),
          dbGetCommissions()
        ]);
        setProducts(prods);
        setCommissions(comms);

        if (rawItems && rawItems.length) {
          setItems(rawItems.map(it => ({
            product_name: it.product_name,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 1500,
            unit_cost: Number(it.unit_cost) || 0
          })));
        } else if (order.order_items) {
          const parsed = parseItemsString(order.order_items, prods);
          setItems(parsed);
        } else {
          setItems([{ product_name: prods[0]?.name || 'Perfume', quantity: 1, unit_price: 1500, unit_cost: 0 }]);
        }
      } catch (e) {
        console.error(e);
      }
    }
    init();
  }, [order]);

  function parseItemsString(str, prods) {
    if (!str) return [];
    const parts = str.split(',').map(s => s.trim());
    const parsed = [];
    parts.forEach(p => {
      const match = p.match(/^(.+?)\s*[xX]\s*(\d+)$/);
      if (match) {
        const name = match[1].trim();
        const qty = Number(match[2]) || 1;
        const prod = prods.find(pr => pr.name.toLowerCase() === name.toLowerCase());
        parsed.push({
          product_name: name,
          quantity: qty,
          unit_price: prod ? Number(prod.selling_price || prod.price) || 1500 : 1500,
          unit_cost: prod ? Number(prod.total_cost || prod.full_cost) || 0 : 0
        });
      }
    });
    return parsed.length ? parsed : [{ product_name: prods[0]?.name || 'Perfume', quantity: 1, unit_price: 1500, unit_cost: 0 }];
  }

  function recalculateCommission(payMethod, total) {
    const comm = commissions.find(c => c.method.toLowerCase() === (payMethod || '').toLowerCase());
    if (comm) {
      const calc = (total * Number(comm.rate) / 100) + Number(comm.fixed_fee || 0);
      setCommission(Math.round(calc * 100) / 100);
    }
  }

  const itemsTotal = items.reduce((s, it) => s + ((Number(it.unit_price) || 0) * (Number(it.quantity) || 1)), 0);
  const deliveryNum = Number(deliveryCharge) || 0;
  const discountNum = Number(discount) || 0;
  const commissionNum = Number(commission) || 0;
  const netTotal = itemsTotal + deliveryNum - discountNum;

  const totalCost = items.reduce((s, it) => {
    const prod = products.find(p => p.name.toLowerCase() === (it.product_name || '').toLowerCase());
    const cost = prod ? (Number(prod.total_cost) || Number(prod.full_cost) || 0) : (Number(it.unit_cost) || 0);
    return s + (cost * (Number(it.quantity) || 1));
  }, 0);

  const netProfit = netTotal - totalCost - commissionNum;

  useEffect(() => {
    recalculateCommission(paymentMethod, netTotal);
  }, [paymentMethod, itemsTotal, deliveryCharge, discount]);

  function updateItemQty(idx, qty) {
    const updated = [...items];
    updated[idx].quantity = Math.max(1, Number(qty) || 1);
    setItems(updated);
  }

  function updateItemPrice(idx, price) {
    const updated = [...items];
    updated[idx].unit_price = Math.max(0, Number(price) || 0);
    setItems(updated);
  }

  function removeItem(idx) {
    if (items.length <= 1) {
      setError('Order must have at least 1 item');
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  }

  function addNewItem() {
    if (!newItem.product_name) { setError('Select a product'); return; }
    const prod = products.find(p => p.name === newItem.product_name);
    setItems([...items, {
      product_name: newItem.product_name,
      quantity: Number(newItem.quantity) || 1,
      unit_price: prod ? Number(prod.selling_price || prod.price) || 1500 : 1500,
      unit_cost: prod ? Number(prod.total_cost || prod.full_cost) || 0 : 0
    }]);
    setShowAddItem(false);
    setNewItem({ product_name: '', quantity: 1 });
    setError('');
  }

  async function handleComplete() {
    if (!items.length) { setError('Order must have at least 1 item'); return; }
    setLoading(true);
    setError('');
    try {
      await completeOrder(order.order_id || order.id, {
        order_type: orderType,
        payment_method: paymentMethod,
        delivery_charge: deliveryNum,
        discount: discountNum,
        commission_override: commissionNum,
        updated_items: items
      });
      onComplete();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal-box">
        <div className="adm-modal-header">
          <div>
            <h3 className="adm-modal-title">Complete Order #{order.order_id || order.id}</h3>
            <p className="adm-modal-sub">{order.customer_name} • {order.customer_phone}</p>
          </div>
          <button className="adm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="adm-modal-body">
          <div className="adm-modal-section">
            <label className="adm-modal-label">Items</label>
            <div className="adm-modal-items-list">
              {items.map((it, idx) => (
                <div key={idx} className="adm-modal-item-row">
                  <span className="adm-modal-item-name">{it.product_name}</span>
                  <div className="adm-modal-item-inputs">
                    <input type="number" min="1" value={it.quantity}
                      onChange={(e) => updateItemQty(idx, e.target.value)}
                      className="adm-modal-input-qty" />
                    <input type="number" value={it.unit_price}
                      onChange={(e) => updateItemPrice(idx, e.target.value)}
                      className="adm-modal-input-price" />
                    <span className="adm-modal-item-total">{fmtRs((Number(it.unit_price) || 0) * (Number(it.quantity) || 1))}</span>
                    <button className="adm-btn-remove-item" onClick={() => removeItem(idx)}>🗑️</button>
                  </div>
                </div>
              ))}
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

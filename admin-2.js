/*************************************************************
 * AROMA LAB — Admin Panel: Login + Layout + Orders
 * File: admin-2.js
 * Google Login Only — No Password
 *************************************************************/

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

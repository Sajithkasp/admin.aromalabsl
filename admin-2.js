/*************************************************************
 * AROMA LAB — Admin Panel: Auth & Order Fulfillment Modules
 * File: admin-2.js
 * Domain: admin.aromalabsl.lk
 *************************************************************/

const { useState } = React;

function LoginScreen({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await signInAdmin(email, password);
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Login failed.');
    }
    setLoading(false);
  }

  return (
    <div className="adm-login-wrap">
      <div className="adm-login-card">
        <div className="adm-login-brand">
          <div className="adm-login-logo">🌸</div>
          <h2>AROMA LAB</h2>
          <p>Haute Parfumerie Business Administration</p>
        </div>
        {errorMsg && <div className="adm-login-error">❌ {errorMsg}</div>}
        <form onSubmit={handleLogin} className="adm-login-form">
          <div className="adm-form-field">
            <label>Admin Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sajith.kasp@gmail.com" required />
          </div>
          <div className="adm-form-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="adm-btn adm-btn-primary adm-btn-block">
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

function OrderCompleteModal({ order, paymentMethods, onClose, onComplete }) {
  const [method, setMethod] = useState(order.payment_method || (paymentMethods[0]?.name || 'Cash on Delivery (COD)'));
  const [totalCost, setTotalCost] = useState(Number(order.total_cost) || 0);
  const [commission, setCommission] = useState(Number(order.commission) || 0);
  const [submitting, setSubmitting] = useState(false);

  function handleMethodChange(newMethod) {
    setMethod(newMethod);
    let rate = 0, fee = 0;
    if (newMethod.includes('COD')) { rate = 2.5; fee = 50; }
    else if (newMethod.includes('Koko')) { rate = 5.5; }
    else if (newMethod.includes('Mintpay')) { rate = 5.0; }
    else if (newMethod.includes('Visa') || newMethod.includes('Mastercard')) { rate = 3.2; fee = 20; }
    setCommission(Math.round(((Number(order.total_amount || 0) * (rate / 100)) + fee) * 100) / 100);
  }

  const netProfit = Number(order.total_amount || 0) - Number(totalCost || 0) - Number(commission || 0);
  const margin = Number(order.total_amount) > 0 ? (netProfit / Number(order.total_amount) * 100) : 0;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await dbUpdateOrderStatus(order.id, 'Completed', {
        payment_method: method,
        total_cost: totalCost,
        commission: commission,
        net_profit: netProfit
      });
      await onComplete();
    } catch (e) {
      alert('Error updating order: ' + e.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="adm-modal-backdrop">
      <div className="adm-modal-box">
        <div className="adm-modal-header">
          <div>
            <span className="adm-modal-badge">ORDER DISPATCH</span>
            <h3>Complete Order #{order.order_number || order.id}</h3>
          </div>
          <button className="adm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-modal-order-summary">
            <div className="adm-summary-line"><span>Customer:</span><strong>{order.customer_name}</strong></div>
            <div className="adm-summary-line"><span>Order Total:</span><strong className="adm-price-highlight">{fmtRs(order.total_amount)}</strong></div>
          </div>
          <div className="adm-form-field">
            <label>Payment Method</label>
            <select value={method} onChange={(e) => handleMethodChange(e.target.value)}>
              {paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
            </select>
          </div>
          <div className="adm-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="adm-form-field">
              <label>Product Cost (COGS)</label>
              <input type="number" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
            </div>
            <div className="adm-form-field">
              <label>Commission Deducted</label>
              <input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
          </div>
          <div className="adm-modal-profit-banner">
            <div>
              <span className="adm-profit-label">Net Profit Realized:</span>
              <div className="adm-profit-value">{fmtRs(netProfit)}</div>
            </div>
            <span className="adm-margin-tag">Margin: {margin.toFixed(1)}%</span>
          </div>
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn adm-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-primary" disabled={submitting} onClick={handleConfirm}>
            {submitting ? 'Updating...' : '✓ Complete & Record Profit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdersList({ orders, status, onRefresh, showMsg, onSelectOrder }) {
  const [expandedId, setExpandedId] = useState(null);

  async function handleCancel(orderId, orderNum) {
    if (!window.confirm(`Cancel order #${orderNum}?`)) return;
    await dbUpdateOrderStatus(orderId, 'Cancelled');
    showMsg('Order marked as Cancelled');
    await onRefresh();
  }

  if (!orders || orders.length === 0) return <div className="adm-empty"><p>No {status} orders found.</p></div>;

  return (
    <div className="adm-orders-container">
      {orders.map(ord => {
        const isExp = expandedId === ord.id;
        return (
          <div key={ord.id} className="adm-order-card">
            <div className="adm-order-summary-row">
              <div>
                <span className="adm-order-badge">#{ord.order_number || ord.id.substring(0, 8)}</span>
                <span className="adm-order-date">{fmtDate(ord.created_at || ord.order_date)}</span>
                <span className="adm-order-method">· {ord.payment_method || 'COD'}</span>
                <div style={{ marginTop: '4px' }}>
                  <strong>{ord.customer_name}</strong> <span style={{ color: '#64748B', fontSize: '12px' }}>{ord.customer_phone}</span>
                </div>
              </div>
              <div className="adm-order-right-action">
                <div style={{ textAlign: 'right' }}>
                  <div className="adm-order-total">{fmtRs(ord.total_amount)}</div>
                </div>
                <div className="adm-order-btns">
                  {status === 'pending' && (
                    <>
                      <button className="adm-btn adm-btn-gold" onClick={() => onSelectOrder(ord)}>✓ Complete</button>
                      <button className="adm-btn adm-btn-delete" onClick={() => handleCancel(ord.id, ord.order_number || ord.id)}>Cancel</button>
                    </>
                  )}
                  <button className="adm-btn adm-btn-icon" onClick={() => setExpandedId(isExp ? null : ord.id)}>
                    {isExp ? '▲' : '▼'}
                  </button>
                </div>
              </div>
            </div>
            {isExp && (
              <div className="adm-order-drawer">
                <div className="adm-drawer-col">
                  <h5>Address:</h5>
                  <p>{ord.customer_address || 'No address'}</p>
                  {ord.notes && <p style={{ color: '#B45309', marginTop: '6px' }}><strong>Note:</strong> {ord.notes}</p>}
                </div>
                <div className="adm-drawer-col">
                  <h5>Items:</h5>
                  {ord.items && ord.items.map((it, i) => (
                    <div key={i} className="adm-drawer-item">
                      <span>{it.name} × {it.quantity}</span>
                      <span>{fmtRs(it.price * it.quantity)}</span>
                    </div>
                  ))}
                  {ord.net_profit !== undefined && (
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '6px' }}>
                      <span>Net Profit: </span><strong className="adm-profit">{fmtRs(ord.net_profit)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
                                                                }

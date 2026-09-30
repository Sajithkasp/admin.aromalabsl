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
// CONTENT — LIFESTYLE MANAGER
// ============================================================

function LifestyleManager({ showMsg }) {
  const [images, setImages] = useState([]);
  const [details, setDetails] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLifestyle(); }, []);

  async function loadLifestyle() {
    setLoading(true);
    try {
      const { data, error } = await window.supabaseClient
        .from('site_settings')
        .select('lifestyle_images, lifestyle_details')
        .eq('id', 1)
        .single();
      
      if (!error && data) {
        setImages(data.lifestyle_images || []);
        setDetails(data.lifestyle_details || []);
      }
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
    setLoading(false);
  }

  async function saveSiteSettings(newImages, newDetails) {
    try {
      const { error } = await window.supabaseClient.from('site_settings').update({
        lifestyle_images: newImages,
        lifestyle_details: newDetails,
        updated_at: new Date().toISOString()
      }).eq('id', 1);
      if (error) throw error;
    } catch (err) {
      throw err;
    }
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `lifestyle-${Date.now()}-${file.name.replace(/\s/g, '-')}`;
      const { error: uploadErr } = await window.supabaseClient.storage
        .from('product-images')
        .upload(fileName, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = window.supabaseClient.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const newUrl = urlData.publicUrl;
      const newImages = [...images, newUrl];
      const newDetail = {
        eyebrow: "NEW COLLECTION",
        title: "New Fragrance,",
        titleAccent: "& elegant.",
        description: "Discover our latest addition.",
        image: newUrl
      };
      const newDetails = [...details, newDetail];

      setImages(newImages);
      setDetails(newDetails);
      await saveSiteSettings(newImages, newDetails);
      showMsg('✅ Image uploaded!');
    } catch (err) {
      showMsg('❌ Upload error: ' + err.message);
    }
    setUploading(false);
  }

  async function handleDelete(index) {
    if (!window.confirm('Delete this Lifestyle Image?')) return;
    try {
      const newImages = images.filter((_, i) => i !== index);
      const newDetails = details.filter((_, i) => i !== index);
      setImages(newImages);
      setDetails(newDetails);
      await saveSiteSettings(newImages, newDetails);
      showMsg('🗑️ Deleted');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  function updateDetail(index, field, value) {
    setDetails(details.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  async function handleSaveDetails() {
    try {
      await saveSiteSettings(images, details);
      showMsg('✅ Lifestyle details saved!');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  if (loading) return <div className="adm-loading">Loading...</div>;

  return (
    <div>
      <h3 className="adm-section-title">📸 Lifestyle Images & Details ({details.length})</h3>
      <p className="adm-hint">මේ images main site එකේ Lifestyle section එකේ පෙන්නනවා.</p>

      <div style={{ marginBottom: '20px' }}>
        <label className="adm-upload-label">
          {uploading ? 'Uploading...' : '📤 Add Lifestyle Image'}
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files[0])} />
        </label>
      </div>

      {details.length === 0 ? (
        <div className="adm-empty"><p>No lifestyle images yet. Upload your first one.</p></div>
      ) : (
        details.map((detail, i) => (
          <div key={i} className="adm-lifestyle-item" 
            style={{ border: '1px solid #eee', borderRadius: '10px', padding: '15px', marginBottom: '15px', background: '#fff' }}>
            <img src={detail.image} alt={'Lifestyle ' + (i + 1)} 
              style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', marginBottom: '10px' }} />
            <div className="adm-form-grid">
              <input type="text" placeholder="Eyebrow" value={detail.eyebrow || ''}
                onChange={(e) => updateDetail(i, 'eyebrow', e.target.value)} 
                className="adm-input adm-input-full" />
              <input type="text" placeholder="Title" value={detail.title || ''}
                onChange={(e) => updateDetail(i, 'title', e.target.value)} 
                className="adm-input" />
              <input type="text" placeholder="Title Accent" value={detail.titleAccent || ''}
                onChange={(e) => updateDetail(i, 'titleAccent', e.target.value)} 
                className="adm-input" />
              <textarea placeholder="Description" value={detail.description || ''}
                onChange={(e) => updateDetail(i, 'description', e.target.value)}
                className="adm-input adm-input-full" 
                style={{ minHeight: '60px' }}></textarea>
            </div>
            <button onClick={() => handleDelete(i)} 
              className="adm-btn adm-btn-delete" 
              style={{ marginTop: '10px' }}>
              🗑️ Delete Image
            </button>
          </div>
        ))
      )}

      {details.length > 0 && (
        <button onClick={handleSaveDetails} 
          className="adm-btn adm-btn-primary" 
          style={{ marginTop: '20px' }}>
          💾 Save Lifestyle Details
        </button>
      )}
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
  { id: 'lifestyle', label: '📸 Lifestyle' },
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
         {activeTab === 'lifestyle' && (
  <LifestyleManager showMsg={showMsg} />
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

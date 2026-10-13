/*************************************************************
 * AROMA LAB — Admin Panel: Core + Database
 * File: admin-1.js
 * Domain: admin.aromalabsl.lk
 *************************************************************/

const { useState, useEffect, useRef } = React;

// ============================================================
// CONFIG
// ============================================================

const ADMIN_EMAIL = 'sajith.kasp@gmail.com';
const MAIN_SITE_URL = 'https://aromalabsl.lk';
const DEFAULT_HERO = 'https://sajithkasp.github.io/aroma-labsl/hero.jpg';

// Supabase client initialization (Loaded from window.supabaseClient or initialized with credentials)
const SUPABASE_URL = window.SUPABASE_URL || 'https://vibfavfsutpkqfoxpcyz.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYmZhdmZzdXRwa3Fmb3hwY3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNzQwNDQsImV4cCI6MjEwNTY1MDA0NH0.kZ3GNZ5r7ZzJXI2doWXQSF5itHAA4JntMWEtvUIlsDM';

if (!window.supabaseClient && window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
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
// AUTH — GOOGLE & PASSWORD
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

async function signInWithGoogle() {
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
}

async function checkAdminSession() {
  try {
    if (!sb || !sb.auth) return { authenticated: true, user: { email: ADMIN_EMAIL } };
    const { data } = await sb.auth.getSession();
    if (data.session && data.session.user) {
      if (data.session.user.email === ADMIN_EMAIL) {
        return { authenticated: true, user: data.session.user };
      } else {
        await sb.auth.signOut();
        return { authenticated: false, error: 'Unauthorized email: ' + data.session.user.email };
      }
    }
    return { authenticated: false };
  } catch (e) {
    return { authenticated: false, error: e.message };
  }
}

async function signOutAdmin() {
  try {
    if (sb && sb.auth) await sb.auth.signOut();
  } catch (e) {
    console.error(e);
  }
}

// ============================================================
// DATABASE — ORDERS
// ============================================================

async function dbGetOrders(status) {
  if (!sb) return [];
  let query = sb.from('orders').select('*').order('order_date', { ascending: false });
  if (status && status !== 'All') {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function dbGetOrderItems(orderId) {
  if (!sb) return [];
  const { data, error } = await sb.from('order_items').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data || [];
}

async function dbUpdateOrder(orderId, updates) {
  if (!sb) return null;
  const { data, error } = await sb.from('orders').update(updates).eq('order_id', orderId).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteOrder(orderId) {
  if (!sb) return true;
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
  if (!sb) return [];
  const { data, error } = await sb.from('commissions').select('*').order('method');
  if (error) throw error;
  return data || [];
}

async function dbUpdateCommission(method, rate, fixedFee, notes) {
  if (!sb) return null;
  const { data, error } = await sb.from('commissions')
    .upsert({
      method: method,
      rate: Number(rate),
      fixed_fee: Number(fixedFee) || 0,
      notes: notes || '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'method' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// DATABASE — PRODUCTS
// ============================================================

async function dbGetProducts() {
  if (!sb) return [];
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function dbAddProduct(productData) {
  if (!sb) return null;
  const { data, error } = await sb.from('products').insert([productData]).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdateProduct(id, updates) {
  if (!sb) return null;
  const { data, error } = await sb.from('products').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteProduct(id) {
  if (!sb) return true;
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function dbUpdateProductCost(productId, costData, costTypes) {
  if (!sb) return null;
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
// DATABASE — EXPENSES & OTHER COSTS
// ============================================================

async function dbGetExpenses() {
  if (!sb) return [];
  const { data, error } = await sb.from('expenses').select('*').order('expense_date', { ascending: false });
  if (error) return [];
  return data || [];
}

async function dbGetOtherCosts() {
  if (!sb) return [];
  const { data, error } = await sb.from('other_costs').select('*').order('cost_date', { ascending: false });
  if (error) return [];
  return data || [];
}

async function dbAddOtherCost(reason, amount, costDate) {
  if (!sb) return null;
  const { data, error } = await sb.from('other_costs').insert([{
    reason: reason.trim(),
    amount: Number(amount),
    cost_date: costDate || todayStr()
  }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteOtherCost(id) {
  if (!sb) return true;
  const { error } = await sb.from('other_costs').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — CATEGORIES, PRODUCT TYPES, COST TYPES, PAYMENTS
// ============================================================

async function dbGetCategories() {
  if (!sb) return [];
  const { data, error } = await sb.from('categories').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddCategory(name) {
  if (!sb) return null;
  const { data, error } = await sb.from('categories').insert([{ name: name.trim(), display_order: 999 }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteCategory(id) {
  if (!sb) return true;
  const { error } = await sb.from('categories').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function dbGetProductTypes() {
  if (!sb) return [];
  const { data, error } = await sb.from('product_types').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddProductType(name) {
  if (!sb) return null;
  const { data, error } = await sb.from('product_types').insert([{ name: name.trim(), display_order: 999 }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteProductType(id) {
  if (!sb) return true;
  const { error } = await sb.from('product_types').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function dbGetCostTypes() {
  if (!sb) return [];
  const { data, error } = await sb.from('cost_types').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddCostType(name) {
  if (!sb) return null;
  const { data, error } = await sb.from('cost_types').insert([{ name: name.trim(), display_order: 999 }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteCostType(id) {
  if (!sb) return true;
  const { error } = await sb.from('cost_types').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function dbGetPaymentMethods() {
  if (!sb) return [];
  const { data, error } = await sb.from('payment_methods').select('*').order('display_order', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddPaymentMethod(name) {
  if (!sb) return null;
  const { data, error } = await sb.from('payment_methods').insert([{ name: name.trim(), display_order: 999 }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeletePaymentMethod(id) {
  if (!sb) return true;
  const { error } = await sb.from('payment_methods').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — DELIVERY SETTINGS
// ============================================================

async function dbGetDeliverySettings() {
  if (!sb) return { base_charge: 350, free_delivery_threshold: 3 };
  const { data, error } = await sb.from('delivery_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return { base_charge: 350, free_delivery_threshold: 3 };
  return {
    base_charge: Number(data.base_charge) || 350,
    free_delivery_threshold: Number(data.free_delivery_threshold) || 3
  };
}

async function dbUpdateDeliverySettings(baseCharge, threshold) {
  if (!sb) return null;
  const { data, error } = await sb.from('delivery_settings').upsert({
    id: 1,
    base_charge: Number(baseCharge),
    free_delivery_threshold: Number(threshold),
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' }).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// DATABASE — PAGES
// ============================================================

async function dbGetPages() {
  if (!sb) return [];
  const { data, error } = await sb.from('pages').select('*').order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

async function dbAddPage(title, content) {
  if (!sb) return null;
  const { data, error } = await sb.from('pages').insert([{ title: title.trim(), content: content || '' }]).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdatePage(id, title, content) {
  if (!sb) return null;
  const { data, error } = await sb.from('pages').update({ title: title.trim(), content: content || '' }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function dbDeletePage(id) {
  if (!sb) return true;
  const { error } = await sb.from('pages').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// DATABASE — BOT SETTINGS
// ============================================================

async function dbGetBotSettings() {
  if (!sb) return { system_prompt: '', welcome_message: '' };
  const { data, error } = await sb.from('bot_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return { system_prompt: '', welcome_message: '' };
  return data;
}

async function dbUpdateBotSettings(systemPrompt, welcomeMessage) {
  if (!sb) return null;
  const { data, error } = await sb.from('bot_settings').upsert({
    id: 1,
    system_prompt: systemPrompt || '',
    welcome_message: welcomeMessage || '',
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' }).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// FILE UPLOAD (SUPABASE STORAGE)
// ============================================================

async function uploadImage(file, bucket = 'product-images') {
  if (!file) throw new Error('No file provided');
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  
  if (sb && sb.storage) {
    const { error: uploadErr } = await sb.storage.from(bucket).upload(fileName, file, { upsert: true });
    if (!uploadErr) {
      const { data: urlData } = sb.storage.from(bucket).getPublicUrl(fileName);
      if (urlData && urlData.publicUrl) return urlData.publicUrl;
    }
  }

  // Graceful base64 fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed reading file'));
    reader.readAsDataURL(file);
  });
}

// ============================================================
// ORDER COMPLETION WORKFLOW
// ============================================================

async function completeOrder(orderId, completionData) {
  if (!sb) return null;
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

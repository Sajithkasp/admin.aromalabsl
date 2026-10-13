/*************************************************************
 * AROMA LAB — Admin Panel: Config, Supabase Client & DB Layer
 * File: admin-1.js
 * Domain: admin.aromalabsl.lk
 *************************************************************/

const ADMIN_EMAIL = 'sajith.kasp@gmail.com';
const MAIN_SITE_URL = 'https://aromalabsl.lk';
const DEFAULT_HERO = 'https://sajithkasp.github.io/aroma-labsl/hero.jpg';

// Supabase Project Keys
const SUPABASE_URL = window.SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || 'https://xyzcompany.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

if (!window.supabaseClient && window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const sb = window.supabaseClient;

// --- AUTHENTICATION ---
async function checkAdminSession() {
  try {
    if (!sb || !sb.auth) return { authenticated: true, user: { email: ADMIN_EMAIL } };
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user && session.user.email === ADMIN_EMAIL) {
      return { authenticated: true, user: session.user };
    }
    return { authenticated: false };
  } catch (e) {
    return { authenticated: false };
  }
}

async function signInAdmin(email, password) {
  if (!sb || !sb.auth) return { user: { email } };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user.email !== ADMIN_EMAIL) {
    await sb.auth.signOut();
    throw new Error('Unauthorized admin access');
  }
  return data;
}

async function signOutAdmin() {
  if (sb && sb.auth) await sb.auth.signOut();
}

// --- UTILITIES ---
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtRs(amount) {
  const num = Number(amount) || 0;
  return 'Rs. ' + num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dStr) {
  if (!dStr) return '-';
  try {
    const d = new Date(dStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dStr;
  }
}

// --- STORAGE & FILE UPLOAD ---
async function uploadImage(file, bucket = 'product-images') {
  if (!file) throw new Error('No file provided');
  const fileName = `hero-${Date.now()}-${file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '')}`;
  
  if (sb && sb.storage) {
    const { error: uploadErr } = await sb.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: '3600', upsert: true });
      
    if (!uploadErr) {
      const { data: urlData } = sb.storage.from(bucket).getPublicUrl(fileName);
      if (urlData && urlData.publicUrl) return urlData.publicUrl;
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed reading file'));
    reader.readAsDataURL(file);
  });
}

// --- DATABASE OPERATIONS ---
async function dbGetOrders(status) {
  if (!sb) return [];
  let query = sb.from('orders').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function dbUpdateOrderStatus(orderId, status, extraData = {}) {
  if (!sb) return;
  const { error } = await sb.from('orders').update({
    status,
    ...extraData,
    updated_at: new Date().toISOString()
  }).eq('id', orderId);
  if (error) throw error;
}

async function dbGetExpenses() {
  if (!sb) return [];
  const { data } = await sb.from('expenses').select('*').order('expense_date', { ascending: false });
  return data || [];
}

async function dbGetOtherCosts() {
  if (!sb) return [];
  const { data } = await sb.from('other_costs').select('*').order('cost_date', { ascending: false });
  return data || [];
}

async function dbAddOtherCost(reason, amount, cost_date) {
  if (!sb) return;
  const { data, error } = await sb.from('other_costs').insert([{
    reason,
    amount: Number(amount),
    cost_date: cost_date || todayStr()
  }]).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteOtherCost(id) {
  if (!sb) return;
  await sb.from('other_costs').delete().eq('id', id);
}

async function dbGetCommissions() {
  if (!sb) return [];
  const { data } = await sb.from('commissions').select('*').order('method');
  return data || [];
}

async function dbUpdateCommission(method, rate, fixed_fee, notes) {
  if (!sb) return;
  const { error } = await sb.from('commissions').upsert({
    method,
    rate: Number(rate),
    fixed_fee: Number(fixed_fee),
    notes: notes || ''
  }, { onConflict: 'method' });
  if (error) throw error;
}

async function dbGetProducts() {
  if (!sb) return [];
  const { data, error } = await sb.from('products').select('*').order('name');
  if (error) throw error;
  return data || [];
}

async function dbAddProduct(productData) {
  if (!sb) return;
  const { data, error } = await sb.from('products').insert([productData]).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdateProduct(id, productData) {
  if (!sb) return;
  const { error } = await sb.from('products').update(productData).eq('id', id);
  if (error) throw error;
}

async function dbDeleteProduct(id) {
  if (!sb) return;
  await sb.from('products').delete().eq('id', id);
}

async function dbUpdateProductCost(productId, form, costTypes) {
  if (!sb) return;
  let total = 0;
  costTypes.forEach(ct => {
    const key = ct.name.toLowerCase().replace(/\s+/g, '_');
    total += Number(form[key]) || 0;
  });
  
  const updateData = {
    cost_type: form.cost_type || 'Breakdown',
    selling_price: Number(form.selling_price) || 0,
    total_cost: form.cost_type === 'Fixed' ? Number(form.total_cost || total) : total,
    ...form
  };
  
  await sb.from('products').update(updateData).eq('id', productId);
}

// Lists (Cost types, Categories, Types, Payments)
async function dbGetCostTypes() { const { data } = await sb.from('cost_types').select('*').order('name'); return data || []; }
async function dbAddCostType(name) { return (await sb.from('cost_types').insert([{ name }]).select().single()).data; }
async function dbDeleteCostType(id) { await sb.from('cost_types').delete().eq('id', id); }

async function dbGetCategories() { const { data } = await sb.from('categories').select('*').order('name'); return data || []; }
async function dbAddCategory(name) { return (await sb.from('categories').insert([{ name }]).select().single()).data; }
async function dbDeleteCategory(id) { await sb.from('categories').delete().eq('id', id); }

async function dbGetProductTypes() { const { data } = await sb.from('product_types').select('*').order('name'); return data || []; }
async function dbAddProductType(name) { return (await sb.from('product_types').insert([{ name }]).select().single()).data; }
async function dbDeleteProductType(id) { await sb.from('product_types').delete().eq('id', id); }

async function dbGetPaymentMethods() { const { data } = await sb.from('payment_methods').select('*').order('name'); return data || []; }
async function dbAddPaymentMethod(name) { return (await sb.from('payment_methods').insert([{ name }]).select().single()).data; }
async function dbDeletePaymentMethod(id) { await sb.from('payment_methods').delete().eq('id', id); }

async function dbGetDeliverySettings() {
  const { data } = await sb.from('site_settings').select('base_delivery_charge, free_delivery_threshold').eq('id', 1).maybeSingle();
  return data ? { base_charge: Number(data.base_delivery_charge) || 350, free_delivery_threshold: Number(data.free_delivery_threshold) || 3 } : { base_charge: 350, free_delivery_threshold: 3 };
}

async function dbUpdateDeliverySettings(base, threshold) {
  await sb.from('site_settings').upsert({ id: 1, base_delivery_charge: Number(base), free_delivery_threshold: Number(threshold), updated_at: new Date().toISOString() }, { onConflict: 'id' });
}

async function dbGetPages() { const { data } = await sb.from('pages').select('*').order('title'); return data || []; }
async function dbAddPage(title, content) { return (await sb.from('pages').insert([{ title, content }]).select().single()).data; }
async function dbUpdatePage(id, title, content) { await sb.from('pages').update({ title, content, updated_at: new Date().toISOString() }).eq('id', id); }
async function dbDeletePage(id) { await sb.from('pages').delete().eq('id', id); }

async function dbGetBotSettings() {
  const { data } = await sb.from('site_settings').select('system_prompt, welcome_message').eq('id', 1).maybeSingle();
  return data || { system_prompt: '', welcome_message: '' };
}
async function dbUpdateBotSettings(system_prompt, welcome_message) {
  await sb.from('site_settings').upsert({ id: 1, system_prompt, welcome_message, updated_at: new Date().toISOString() }, { onConflict: 'id' });
}

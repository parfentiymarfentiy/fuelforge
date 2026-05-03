// admin.js — Admin Panel Logic
import { db, storage } from './firebase-config.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* ===================== DEMO DATA for offline ===================== */
const DEMO_PRODUCTS = [
  { id: 'dp1', name: 'Optimum Gold Whey 2.27kg', category: 'Протеин', price: 1890, oldPrice: 2200, description: 'Классический сывороточный протеин с 24г белка на порцию.', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80', badge: 'hot', rating: 4.9, reviews: 1240, inStock: true, popular: true },
  { id: 'dp2', name: 'Dymatize ISO100 1.36kg', category: 'Протеин', price: 2190, oldPrice: null, description: 'Изолят сыворотки 100% — 25г белка, 0г жира.', image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&q=80', badge: 'new', rating: 4.8, reviews: 856, inStock: true, popular: true },
  { id: 'dp3', name: 'Serious Mass 6.8kg', category: 'Гейнеры', price: 2450, oldPrice: 2800, description: 'Высококалорийный гейнер — 1250 ккал на порцию.', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', badge: 'sale', rating: 4.7, reviews: 632, inStock: true, popular: false },
  { id: 'dp4', name: 'Омега-3 Fish Oil 180 капс.', category: 'Омега-3', price: 380, oldPrice: null, description: 'Высококачественный рыбий жир. 1000 мг EPA+DHA.', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80', badge: null, rating: 4.8, reviews: 929, inStock: true, popular: true },
];
const DEMO_SUBSCRIBERS = [
  { id: 's1', email: 'alex@gmail.com', coupon: 'FITFUEL5', subscribedAt: '2024-11-20T10:30:00Z' },
  { id: 's2', email: 'maria@ukr.net', coupon: 'FITFUEL5', subscribedAt: '2024-11-21T14:15:00Z' },
];

/* ===================== STATE ===================== */
let products = [];
let subscribers = [];
let editingId = null;
let deleteId  = null;
let imageFile = null;
let isFirebase = false;

/* ===================== INIT ===================== */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  await loadData();
  renderDashboard();
  showSection('dashboard');
});

/* ===================== NAVIGATION ===================== */
function initNav() {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', () => {
      const sec = link.dataset.section;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      showSection(sec);
    });
  });
  document.getElementById('btnAddProduct')?.addEventListener('click', () => openProductModal());
  document.getElementById('btnSaveProduct')?.addEventListener('click', saveProduct);
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeProductModal);
  document.getElementById('productModalBackdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProductModal();
  });
  document.getElementById('confirmYes')?.addEventListener('click', confirmDelete);
  document.getElementById('confirmNo')?.addEventListener('click', () => closeConfirm());
  document.getElementById('confirmBackdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeConfirm();
  });
  document.getElementById('productSearch')?.addEventListener('input', filterProducts);
  document.getElementById('productCatFilter')?.addEventListener('change', filterProducts);
  document.getElementById('subsSearch')?.addEventListener('input', filterSubscribers);
}

function showSection(id) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec_' + id)?.classList.add('active');
  const titles = { dashboard: 'Dashboard', products: 'Управление товарами', subscribers: 'Подписчики' };
  document.querySelector('.topbar-title').textContent = titles[id] || 'Админ-панель';
  if (id === 'products')    renderProductsTable();
  if (id === 'subscribers') renderSubscribersTable();
}

/* ===================== FIREBASE ===================== */
async function loadData() {
  try {
    const [prodSnap, subSnap] = await Promise.all([
      getDocs(query(collection(db, 'products'), orderBy('name'))),
      getDocs(collection(db, 'subscribers'))
    ]);
    if (!prodSnap.empty || !subSnap.empty) {
      products    = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      subscribers = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      isFirebase = true;
      // Live updates for products
      onSnapshot(collection(db, 'products'), snap => {
        products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDashboard();
        if (document.getElementById('sec_products')?.classList.contains('active')) renderProductsTable();
      });
      onSnapshot(collection(db, 'subscribers'), snap => {
        subscribers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDashboard();
        if (document.getElementById('sec_subscribers')?.classList.contains('active')) renderSubscribersTable();
      });
    } else throw new Error('empty');
  } catch(e) {
    console.warn('Firebase offline, demo data:', e.message);
    products    = DEMO_PRODUCTS;
    subscribers = DEMO_SUBSCRIBERS;
  }
}

/* ===================== DASHBOARD ===================== */
function renderDashboard() {
  setText('stat_products', products.length);
  setText('stat_subs', subscribers.length);
  const inStock = products.filter(p => p.inStock !== false).length;
  setText('stat_instock', inStock);
  const cats = [...new Set(products.map(p => p.category))].length;
  setText('stat_cats', cats);
  // Recent products table
  const tbody = document.getElementById('recentProductsTbody');
  if (tbody) {
    const recent = [...products].slice(0, 5);
    tbody.innerHTML = recent.map(p => productRow(p)).join('') || '<tr><td colspan="5" style="text-align:center;color:#9CA3AF;padding:32px">Товары не найдены</td></tr>';
  }
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ===================== PRODUCTS TABLE ===================== */
let productFilter = '', productCatFilter = 'all';

function filterProducts() {
  productFilter    = document.getElementById('productSearch')?.value.toLowerCase() || '';
  productCatFilter = document.getElementById('productCatFilter')?.value || 'all';
  renderProductsTable();
}

function renderProductsTable() {
  let list = [...products];
  if (productFilter) list = list.filter(p => p.name.toLowerCase().includes(productFilter) || p.category.toLowerCase().includes(productFilter));
  if (productCatFilter !== 'all') list = list.filter(p => p.category === productCatFilter);
  const tbody = document.getElementById('productsTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state"><div class="empty-state-icon">📦</div><h3>Товары не найдены</h3><p>Попробуйте изменить фильтры или добавьте товар</p></div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => productRow(p, true)).join('');
}

function productRow(p, withActions = false) {
  const catColor = catBadgeClass(p.category);
  const stock = p.inStock !== false
    ? '<span class="in-stock">● В наличии</span>'
    : '<span class="out-stock">● Нет</span>';
  const actions = withActions ? `
    <div class="table-actions">
      <button class="btn-icon-sm edit" onclick="editProduct('${p.id}')" title="Редактировать">✏️</button>
      <button class="btn-icon-sm del" onclick="askDelete('${p.id}')" title="Удалить">🗑</button>
    </div>` : `<span style="font-size:0.85rem;color:#6B7280">${Number(p.price||0).toLocaleString('ru')} грн</span>`;
  return `
    <tr>
      <td><img class="table-img" src="${p.image||''}" alt="${p.name}" onerror="this.src=''"></td>
      <td class="table-name">${p.name}</td>
      <td><span class="cat-badge ${catColor}">${p.category}</span></td>
      <td class="table-price">${Number(p.price||0).toLocaleString('ru')} грн</td>
      <td>${stock}</td>
      ${withActions ? `<td>${actions}</td>` : `<td>${actions}</td>`}
    </tr>`;
}

function catBadgeClass(cat) {
  const map = { 'Протеин': 'badge-green', 'Гейнеры': 'badge-blue', 'Омега-3': 'badge-amber', 'Креатин': 'badge-red', 'BCAA': 'badge-purple', 'Витамины': 'badge-pink' };
  return map[cat] || 'badge-default';
}

/* ===================== PRODUCT MODAL ===================== */
function openProductModal(product = null) {
  editingId = product?.id || null;
  imageFile = null;
  const modal = document.getElementById('productModalBackdrop');
  const title = document.getElementById('modalTitle');
  if (title) title.textContent = product ? 'Редактировать товар' : 'Добавить товар';
  // Fill form
  setValue('fi_name',     product?.name || '');
  setValue('fi_category', product?.category || 'Протеин');
  setValue('fi_price',    product?.price || '');
  setValue('fi_oldPrice', product?.oldPrice || '');
  setValue('fi_desc',     product?.description || '');
  setValue('fi_imageUrl', product?.image || '');
  setValue('fi_badge',    product?.badge || '');
  setValue('fi_rating',   product?.rating || 4.5);
  setValue('fi_reviews',  product?.reviews || 0);
  document.getElementById('fi_inStock').checked  = product?.inStock !== false;
  document.getElementById('fi_popular').checked  = !!product?.popular;
  // Preview
  updateImagePreview(product?.image || '');
  modal?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
window.editProduct = (id) => { openProductModal(products.find(p => p.id === id)); };

function closeProductModal() {
  document.getElementById('productModalBackdrop')?.classList.remove('open');
  document.body.style.overflow = '';
  editingId = null;
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

/* IMAGE UPLOAD */
document.getElementById('fi_imageFile')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  imageFile = file;
  const url = URL.createObjectURL(file);
  updateImagePreview(url);
});

document.getElementById('fi_imageUrl')?.addEventListener('input', (e) => {
  updateImagePreview(e.target.value);
});

function updateImagePreview(src) {
  const wrap = document.getElementById('imagePreviewWrap');
  const prev = document.getElementById('imagePreview');
  if (!wrap || !prev) return;
  if (src) { prev.src = src; wrap.style.display = 'block'; }
  else { wrap.style.display = 'none'; }
}

document.getElementById('removeImageBtn')?.addEventListener('click', () => {
  setValue('fi_imageUrl', '');
  imageFile = null;
  updateImagePreview('');
  const fileInput = document.getElementById('fi_imageFile');
  if (fileInput) fileInput.value = '';
});

/* SAVE */
async function saveProduct() {
  const name     = document.getElementById('fi_name')?.value.trim();
  const category = document.getElementById('fi_category')?.value;
  const price    = parseFloat(document.getElementById('fi_price')?.value);
  const oldPrice = parseFloat(document.getElementById('fi_oldPrice')?.value) || null;
  const desc     = document.getElementById('fi_desc')?.value.trim();
  const badge    = document.getElementById('fi_badge')?.value;
  const rating   = parseFloat(document.getElementById('fi_rating')?.value) || 4.5;
  const reviews  = parseInt(document.getElementById('fi_reviews')?.value) || 0;
  const inStock  = document.getElementById('fi_inStock')?.checked;
  const popular  = document.getElementById('fi_popular')?.checked;
  let imageUrl   = document.getElementById('fi_imageUrl')?.value.trim();

  if (!name) { showAdminToast('Введите название товара', 'error'); return; }
  if (!price || isNaN(price)) { showAdminToast('Введите корректную цену', 'error'); return; }

  const saveBtn = document.getElementById('btnSaveProduct');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Сохранение...'; }

  try {
    // Upload image if file selected
    if (imageFile && isFirebase) {
      const imgRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imgRef, imageFile);
      imageUrl = await getDownloadURL(imgRef);
    }

    const data = { name, category, price, oldPrice, description: desc, image: imageUrl, badge: badge || null, rating, reviews, inStock, popular, updatedAt: new Date().toISOString() };

    if (isFirebase) {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), data);
      } else {
        data.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'products'), data);
      }
    } else {
      // Demo mode — update local
      if (editingId) {
        const idx = products.findIndex(p => p.id === editingId);
        if (idx !== -1) products[idx] = { ...products[idx], ...data };
      } else {
        products.unshift({ id: 'demo_' + Date.now(), ...data });
      }
      renderDashboard();
      renderProductsTable();
    }

    showAdminToast(editingId ? '✅ Товар обновлён!' : '✅ Товар добавлен!', 'success');
    closeProductModal();
  } catch(e) {
    showAdminToast('❌ Ошибка: ' + e.message, 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; }
  }
}

/* ===================== DELETE ===================== */
window.askDelete = (id) => {
  deleteId = id;
  document.getElementById('confirmBackdrop')?.classList.add('open');
};

async function confirmDelete() {
  if (!deleteId) return;
  try {
    if (isFirebase) {
      await deleteDoc(doc(db, 'products', deleteId));
    } else {
      products = products.filter(p => p.id !== deleteId);
      renderDashboard(); renderProductsTable();
    }
    showAdminToast('🗑 Товар удалён', 'success');
  } catch(e) {
    showAdminToast('❌ Ошибка удаления: ' + e.message, 'error');
  }
  closeConfirm();
}

function closeConfirm() {
  document.getElementById('confirmBackdrop')?.classList.remove('open');
  deleteId = null;
}

/* ===================== SUBSCRIBERS ===================== */
let subSearch = '';
function filterSubscribers() {
  subSearch = document.getElementById('subsSearch')?.value.toLowerCase() || '';
  renderSubscribersTable();
}

function renderSubscribersTable() {
  let list = [...subscribers];
  if (subSearch) list = list.filter(s => s.email.toLowerCase().includes(subSearch));
  const tbody = document.getElementById('subsTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">📭</div><h3>Подписчики не найдены</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(s => `
    <tr>
      <td class="sub-email">${s.email}</td>
      <td><span class="sub-coupon">${s.coupon || 'FITFUEL5'}</span></td>
      <td class="sub-date">${formatDate(s.subscribedAt)}</td>
      <td>
        <button class="btn-icon-sm del" onclick="deleteSubscriber('${s.id}')" title="Удалить">🗑</button>
      </td>
    </tr>
  `).join('');
}

window.deleteSubscriber = async (id) => {
  try {
    if (isFirebase) await deleteDoc(doc(db, 'subscribers', id));
    else subscribers = subscribers.filter(s => s.id !== id);
    showAdminToast('Подписчик удалён', 'success');
    renderSubscribersTable(); renderDashboard();
  } catch(e) { showAdminToast('Ошибка: ' + e.message, 'error'); }
};

/* ===================== UTILS ===================== */
function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return iso; }
}

/* ===================== TOAST ===================== */
function showAdminToast(msg, type = 'success') {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.innerHTML = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 3500);
}
window.showAdminToast = showAdminToast;

// app.js — Main Application Logic
import { db } from './firebase-config.js';
import {
  collection, getDocs, addDoc, onSnapshot, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===================== DEMO PRODUCTS (fallback if Firebase not configured) ===================== */
const DEMO_PRODUCTS = [
  { id: 'd1', name: 'Optimum Gold Whey 2.27kg', category: 'Протеин', price: 1890, oldPrice: 2200, description: 'Классический сывороточный протеин с 24г белка на порцию. Вкус шоколадного брауни.', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80', badge: 'hot', rating: 4.9, reviews: 1240, inStock: true, popular: true },
  { id: 'd2', name: 'Dymatize ISO100 1.36kg', category: 'Протеин', price: 2190, oldPrice: null, description: 'Изолят сыворотки 100% — 25г белка, 0г жира, минимум углеводов.', image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&q=80', badge: 'new', rating: 4.8, reviews: 856, inStock: true, popular: true },
  { id: 'd3', name: 'Serious Mass 6.8kg', category: 'Гейнеры', price: 2450, oldPrice: 2800, description: 'Высококалорийный гейнер — 1250 ккал на порцию. Для набора мышечной массы.', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', badge: 'sale', rating: 4.7, reviews: 632, inStock: true, popular: false },
  { id: 'd4', name: 'Optimum BCAA 2:1:1 200г', category: 'BCAA', price: 649, oldPrice: null, description: 'Аминокислоты с разветвлённой цепью в соотношении 2:1:1. Быстрое восстановление.', image: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80', badge: null, rating: 4.6, reviews: 441, inStock: true, popular: false },
  { id: 'd5', name: 'Омега-3 Fish Oil 180 капс.', category: 'Омега-3', price: 380, oldPrice: null, description: 'Высококачественный рыбий жир. 1000 мг EPA+DHA на порцию. Здоровье суставов.', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80', badge: null, rating: 4.8, reviews: 929, inStock: true, popular: true },
  { id: 'd6', name: 'Creatine Monohydrate 500г', category: 'Креатин', price: 420, oldPrice: null, description: 'Чистый моногидрат креатина без добавок. Взрывная сила и выносливость.', image: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=400&q=80', badge: null, rating: 4.9, reviews: 1105, inStock: true, popular: true },
  { id: 'd7', name: 'Vitamin D3 + K2 120 капс.', category: 'Витамины', price: 320, oldPrice: null, description: 'Комплекс D3 с K2 для максимального усвоения. Иммунитет и кости.', image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=80', badge: 'new', rating: 4.7, reviews: 344, inStock: true, popular: false },
  { id: 'd8', name: 'Pre-Workout C4 Sport 60 порц.', category: 'Протеин', price: 890, oldPrice: 1100, description: 'Предтренировочный комплекс с кофеином и бета-аланином. Максимальная энергия.', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', badge: 'hot', rating: 4.6, reviews: 718, inStock: false, popular: true },
  { id: 'd9', name: 'Dymatize Elite Whey 2.27kg', category: 'Протеин', price: 1650, oldPrice: null, description: 'Протеиновый комплекс из сыворотки, казеина и яичного белка. Долгое питание.', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80', badge: null, rating: 4.5, reviews: 289, inStock: true, popular: false },
  { id: 'd10', name: 'BSN True Mass 2.64kg', category: 'Гейнеры', price: 2100, oldPrice: 2400, description: 'Углеводно-протеиновый гейнер с медленными углеводами. Чистый набор массы.', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', badge: 'sale', rating: 4.4, reviews: 178, inStock: true, popular: false },
  { id: 'd11', name: 'NOW BCAA Powder 340г', category: 'BCAA', price: 520, oldPrice: null, description: 'BCAA 2:1:1 в порошке. Растворимый, без ароматизаторов. Чистые аминокислоты.', image: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80', badge: null, rating: 4.6, reviews: 392, inStock: true, popular: false },
  { id: 'd12', name: 'Vitamine C 1000mg 100 табл.', category: 'Витамины', price: 180, oldPrice: null, description: 'Аскорбиновая кислота 1000мг. Антиоксидант, иммунитет, коллаген.', image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=80', badge: null, rating: 4.8, reviews: 1560, inStock: true, popular: true },
];

/* ===================== STATE ===================== */
let allProducts = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem('fitfuel_cart') || '[]');
let currentFilter = 'all';
let currentSort = 'popular';
let isFirebaseConnected = false;

/* ===================== PRELOADER ===================== */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader')?.classList.add('hidden');
  }, 1600);
});

/* ===================== CUSTOM CURSOR ===================== */
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let mouseX = 0, mouseY = 0, curX = 0, curY = 0;

if (cursor && cursorDot) {
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
  });
  const animateCursor = () => {
    curX += (mouseX - curX) * 0.15;
    curY += (mouseY - curY) * 0.15;
    cursor.style.left = curX + 'px';
    cursor.style.top  = curY + 'px';
    requestAnimationFrame(animateCursor);
  };
  animateCursor();
  document.querySelectorAll('a, button, .product-card, .cat-card, .filter-tab').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.style.transform = 'translate(-50%,-50%) scale(1.5)');
    el.addEventListener('mouseleave', () => cursor.style.transform = 'translate(-50%,-50%) scale(1)');
  });
}

/* ===================== HEADER SCROLL ===================== */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', window.scrollY > 20);
});

/* ===================== NAV BURGER ===================== */
const navBurger = document.getElementById('navBurger');
const navLinks  = document.getElementById('navLinks');
navBurger?.addEventListener('click', () => {
  navLinks?.classList.toggle('open');
});
document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => navLinks?.classList.remove('open')));

/* ===================== SEARCH ===================== */
const searchToggle  = document.getElementById('searchToggle');
const searchBar     = document.getElementById('searchBar');
const searchInput   = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchToggle?.addEventListener('click', () => {
  searchBar?.classList.toggle('open');
  if (searchBar?.classList.contains('open')) searchInput?.focus();
});

searchInput?.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults?.classList.remove('visible'); return; }
  const matches = allProducts.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  ).slice(0, 6);
  renderSearchResults(matches);
});

function renderSearchResults(products) {
  if (!searchResults) return;
  if (!products.length) { searchResults.classList.remove('visible'); return; }
  searchResults.innerHTML = products.map(p => `
    <div class="search-result-item" onclick="openModal('${p.id}')">
      <img class="search-result-img" src="${p.image || ''}" alt="${p.name}" onerror="this.style.display='none'">
      <div>
        <div class="search-result-name">${p.name}</div>
        <div class="search-result-price">${p.price} грн</div>
      </div>
    </div>
  `).join('');
  searchResults.classList.add('visible');
}

document.addEventListener('click', (e) => {
  if (!searchBar?.contains(e.target) && e.target !== searchToggle) {
    searchBar?.classList.remove('open');
    searchResults?.classList.remove('visible');
  }
});

/* ===================== PARTICLES ===================== */
function createParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      --size:${size}px; --x:${Math.random()*100}%;
      --duration:${Math.random()*6+4}s; --delay:${Math.random()*4}s;
      --dx:${(Math.random()-0.5)*200}px;
      opacity:${Math.random()*0.5+0.2};
    `;
    container.appendChild(p);
  }
}
createParticles();

/* ===================== COUNTER ANIMATION ===================== */
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const dur = 2000, step = 20;
  let curr = 0;
  const inc = target / (dur / step);
  const timer = setInterval(() => {
    curr = Math.min(curr + inc, target);
    el.textContent = Math.floor(curr).toLocaleString('ru');
    if (curr >= target) clearInterval(timer);
  }, step);
}
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.stat-num').forEach(animateCounter);
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.hero-stats').forEach(el => observer.observe(el));

/* ===================== REVEAL ANIMATIONS ===================== */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 80);
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ===================== CATEGORY CARDS ===================== */
document.querySelectorAll('.cat-card').forEach(card => {
  card.addEventListener('click', () => {
    const cat = card.dataset.cat;
    if (cat) {
      currentFilter = cat;
      renderFilter();
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ===================== FAQ ===================== */
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ===================== CART ===================== */
const cartBtn     = document.getElementById('cartBtn');
const cartClose   = document.getElementById('cartClose');
const cartOverlay = document.getElementById('cartOverlay');
const cartSidebar = document.getElementById('cartSidebar');
const cartCount   = document.getElementById('cartCount');

function openCart()  { cartSidebar?.classList.add('open'); cartOverlay?.classList.add('open'); }
function closeCart() { cartSidebar?.classList.remove('open'); cartOverlay?.classList.remove('open'); }

cartBtn?.addEventListener('click', openCart);
cartClose?.addEventListener('click', closeCart);
cartOverlay?.addEventListener('click', closeCart);

function updateCart() {
  localStorage.setItem('fitfuel_cart', JSON.stringify(cart));
  const total = cart.reduce((s, i) => s + i.qty, 0);
  if (cartCount) {
    cartCount.textContent = total;
    cartCount.classList.toggle('visible', total > 0);
  }
  renderCartItems();
  const footer = document.getElementById('cartFooter');
  const empty  = document.getElementById('cartEmpty');
  if (footer) footer.style.display = cart.length ? 'block' : 'none';
  if (empty) empty.style.display = cart.length ? 'none' : 'block';
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const el = document.getElementById('cartTotalPrice');
  if (el) el.textContent = totalPrice.toLocaleString('ru') + ' грн';
}

function renderCartItems() {
  const el = document.getElementById('cartItems');
  if (!el) return;
  const items = cart.map(item => `
    <div class="cart-item" id="ci_${item.id}">
      <img class="cart-item-img" src="${item.image||''}" alt="${item.name}" onerror="this.src=''">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${(item.price * item.qty).toLocaleString('ru')} грн</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
          <span class="cart-item-delete" onclick="removeFromCart('${item.id}')">🗑</span>
        </div>
      </div>
    </div>
  `).join('');
  el.innerHTML = (cart.length ? '' : '') + items;
}

window.changeQty = (id, delta) => {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  updateCart();
};
window.removeFromCart = (id) => {
  cart = cart.filter(i => i.id !== id);
  updateCart();
};

function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) { existing.qty++; }
  else { cart.push({ ...product, qty: 1 }); }
  updateCart();
  showToast('✅ ' + product.name + ' добавлен в корзину!', 'success');
}

updateCart();

/* ===================== TOAST ===================== */
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
window.showToast = showToast;

/* ===================== PRODUCT MODAL ===================== */
const modalOverlay = document.getElementById('modalOverlay');
const productModal = document.getElementById('productModal');
const modalClose   = document.getElementById('modalClose');
const modalContent = document.getElementById('modalContent');

function openModal(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p || !modalContent) return;
  modalContent.innerHTML = `
    <div class="modal-img-wrap">
      <img class="modal-img" src="${p.image||''}" alt="${p.name}" onerror="this.parentElement.style.background='#f3f4f6'">
    </div>
    <div class="modal-info">
      <div class="modal-category">${p.category}</div>
      <div class="modal-name">${p.name}</div>
      <div class="product-rating">
        ${'★'.repeat(Math.round(p.rating||5))}${'☆'.repeat(5-Math.round(p.rating||5))}
        <span class="rating-count">(${p.reviews||0} отзывов)</span>
      </div>
      <div class="modal-desc">${p.description || ''}</div>
      <div class="modal-price">${Number(p.price).toLocaleString('ru')} грн
        ${p.oldPrice ? `<span style="font-size:1rem;color:#9CA3AF;text-decoration:line-through;margin-left:8px">${Number(p.oldPrice).toLocaleString('ru')} грн</span>` : ''}
      </div>
      ${!p.inStock ? '<div style="color:#EF4444;font-weight:600;font-size:0.9rem">⚠️ Нет в наличии</div>' : ''}
      <div class="modal-actions">
        ${p.inStock ? `<button class="btn btn-primary" onclick="addToCart(${JSON.stringify(p).replace(/"/g,'&quot;')});closeProductModal()">В корзину 🛒</button>` : '<button class="btn btn-outline" disabled>Нет в наличии</button>'}
        <button class="btn btn-outline" onclick="closeProductModal()">Закрыть</button>
      </div>
    </div>
  `;
  modalOverlay?.classList.add('open');
  productModal?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
window.openModal = openModal;

function closeProductModal() {
  modalOverlay?.classList.remove('open');
  productModal?.classList.remove('open');
  document.body.style.overflow = '';
}
window.closeProductModal = closeProductModal;
modalClose?.addEventListener('click', closeProductModal);
modalOverlay?.addEventListener('click', closeProductModal);

/* ===================== PRODUCTS RENDERING ===================== */
function getCatBadgeColor(cat) {
  const map = { 'Протеин': '#22C55E', 'Гейнеры': '#3B82F6', 'Омега-3': '#F59E0B', 'Креатин': '#EF4444', 'BCAA': '#8B5CF6', 'Витамины': '#EC4899' };
  return map[cat] || '#9CA3AF';
}

function renderProduct(p, idx) {
  const stars = '★'.repeat(Math.round(p.rating || 5)) + '☆'.repeat(5 - Math.round(p.rating || 5));
  const badgeHtml = p.badge ? `<div class="product-badge badge-${p.badge}">${p.badge === 'new' ? 'Новинка' : p.badge === 'hot' ? '🔥 Хит' : 'Скидка'}</div>` : '';
  return `
    <div class="product-card" style="animation-delay:${idx * 0.06}s" onclick="openModal('${p.id}')">
      <div class="product-image-wrap">
        <img class="product-img" src="${p.image || ''}" alt="${p.name}" loading="lazy" onerror="this.parentElement.style.background='#f3f4f6';this.style.display='none'">
        ${badgeHtml}
        <button class="product-wishlist" onclick="event.stopPropagation();this.classList.toggle('active');this.textContent=this.classList.contains('active')?'❤️':'🤍'" aria-label="В избранное">🤍</button>
      </div>
      <div class="product-info">
        <div class="product-category" style="color:${getCatBadgeColor(p.category)}">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-rating">
          <span class="star">${stars}</span>
          <span class="rating-count">(${p.reviews || 0})</span>
        </div>
        <div class="product-desc">${(p.description || '').substring(0, 80)}${p.description?.length > 80 ? '...' : ''}</div>
        <div class="product-footer">
          <div>
            <div class="product-price">${Number(p.price).toLocaleString('ru')} грн</div>
            ${p.oldPrice ? `<div class="product-old-price">${Number(p.oldPrice).toLocaleString('ru')} грн</div>` : ''}
          </div>
          ${p.inStock !== false
            ? `<button class="product-add-btn" onclick="event.stopPropagation();addToCart(${JSON.stringify(p).replace(/"/g,'&quot;')})" aria-label="В корзину">+</button>`
            : `<span style="font-size:0.75rem;color:#EF4444;font-weight:600">Нет в наличии</span>`
          }
        </div>
      </div>
    </div>
  `;
}

function renderFilter() {
  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === currentFilter);
  });
  applyFilterAndSort();
}

function applyFilterAndSort() {
  let products = currentFilter === 'all' ? [...allProducts] : allProducts.filter(p => p.category === currentFilter);
  const sort = currentSort;
  if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  else if (sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  else products.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
  filteredProducts = products;
  renderProducts(filteredProducts);
}

function renderProducts(products) {
  const grid    = document.getElementById('productsGrid');
  const loading = document.getElementById('productsLoading');
  const empty   = document.getElementById('catalogEmpty');
  if (!grid) return;
  loading?.remove();
  if (!products.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');
  grid.innerHTML = products.map((p, i) => renderProduct(p, i)).join('');
}

/* ===================== FILTER TABS ===================== */
document.getElementById('filterTabs')?.addEventListener('click', (e) => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  currentFilter = tab.dataset.filter;
  renderFilter();
});

document.getElementById('sortSelect')?.addEventListener('change', (e) => {
  currentSort = e.target.value;
  applyFilterAndSort();
});

/* ===================== FIREBASE DATA ===================== */
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (!snap.empty) {
      allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      isFirebaseConnected = true;
    } else {
      allProducts = DEMO_PRODUCTS;
    }
  } catch (e) {
    console.warn('Firebase недоступен, используются демо-данные:', e.message);
    allProducts = DEMO_PRODUCTS;
  }
  applyFilterAndSort();
}

loadProducts();

/* ===================== NEWSLETTER ===================== */
document.getElementById('newsletterSubmit')?.addEventListener('click', async () => {
  const email = document.getElementById('newsletterEmail')?.value.trim();
  const agreed = document.getElementById('privacyCheck')?.checked;
  if (!email || !email.includes('@')) {
    showToast('❌ Введите корректный email', 'error'); return;
  }
  if (!agreed) {
    showToast('❌ Необходимо согласиться с политикой конфиденциальности', 'error'); return;
  }
  try {
    await addDoc(collection(db, 'subscribers'), {
      email, coupon: 'FITFUEL5', subscribedAt: new Date().toISOString()
    });
  } catch(e) { /* offline mode */ }
  document.getElementById('newsletterFormWrap')?.classList.add('hidden');
  document.getElementById('newsletterSuccess')?.classList.remove('hidden');
  showToast('🎉 Подписка оформлена! Купон отправлен на почту.', 'success');
});

/* ===================== RIPPLE EFFECT ===================== */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.style.position = 'relative'; btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
});

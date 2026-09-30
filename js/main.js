'use strict';

/* ---------- Navigation ---------- */
const navToggle = document.querySelector('#navToggle');
const nav = document.querySelector('#nav');
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') { nav.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false'); }
});

/* ---------- Week 3: async/await + Fetch (DummyJSON) ---------- */
const CATALOGUE_URL = 'https://dummyjson.com/products?limit=6&select=title,price,category,thumbnail';
const catalogueEl = document.querySelector('#catalogue-body');
const CATEGORY_MAP = { groceries: 'Groceries', laptops: 'Electronics', smartphones: 'Electronics', furniture: 'Furniture' };

const showLoading = () => { catalogueEl.innerHTML = '<p class="loading"><span class="spinner"></span> Loading catalogue…</p>'; };
const showError = (message) => {
  catalogueEl.innerHTML = `<p>${message}</p><button class="retry" id="retry">Try again</button>`;
  document.querySelector('#retry').addEventListener('click', loadCatalogue);
};

async function loadCatalogue() {
  showLoading();
  try {
    const res = await fetch(CATALOGUE_URL);
    if (!res.ok) throw new Error(`Server replied ${res.status}`);
    const { products } = await res.json();                       // destructuring
    catalogueEl.innerHTML = `<ul class="products">${products.map(({ id, title, price, category, thumbnail }) => `
      <li class="product">
        <img src="${thumbnail}" alt="" loading="lazy" width="72" height="72">
        <div><h3>${title}</h3><p>${category}, USD ${price}</p>
        <button class="use" data-id="${id}">Start stock entry</button></div>
      </li>`).join('')}</ul>`;
    catalogueEl.querySelectorAll('.use').forEach((btn) => btn.addEventListener('click', () => {
      const item = products.find((p) => p.id === Number(btn.dataset.id));
      prefillForm(item);
    }));
  } catch (err) {
    showError('The catalogue could not be loaded. Check your internet connection and try again.');
    console.error(err);
  }
}

function prefillForm({ title, category }) {
  form.elements.itemName.value = title;
  form.elements.category.value = CATEGORY_MAP[category] ?? 'Other';
  Object.keys(rules).forEach((n) => { document.querySelector(`#${n}-error`).textContent = ''; form.elements[n].classList.remove('invalid'); });
  document.querySelector('#add').scrollIntoView();
  form.elements.quantity.focus();
}

/* ---------- Week 4: validated form ---------- */
const form = document.querySelector('#itemForm');
const statusEl = document.querySelector('#formStatus');
const notes = form.elements.notes;
const notesCount = document.querySelector('#notesCount');

const wholeNumber = (v, label, max) => {
  if (v === '') return `Enter the ${label}.`;
  if (!/^\d+$/.test(v)) return `${label[0].toUpperCase() + label.slice(1)} must be a whole number, 0 or more.`;
  return Number(v) > max ? `${label[0].toUpperCase() + label.slice(1)} cannot be more than ${max.toLocaleString()}.` : '';
};

const rules = {
  itemName: (v) => !v ? 'Enter the item name.' : v.length < 2 ? 'Item name must be at least 2 characters.' : '',
  category: (v) => v ? '' : 'Choose a category.',
  location: (v) => v ? '' : 'Choose a storage location.',
  quantity: (v) => wholeNumber(v, 'quantity', 100000),
  unitPrice: (v) => v === '' ? 'Enter the unit price.'
    : !(Number(v) > 0) ? 'Unit price must be greater than 0.'
    : Number(v) > 100000000 ? 'Unit price looks too high. Check the amount.' : '',
  reorderLevel: (v) => wholeNumber(v, 'reorder level', 10000),
  supplierEmail: (v) => !v ? 'Enter the supplier email.'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Enter a valid email such as orders@supplier.co.ug.' : '',
  supplierPhone: (v) => !v ? 'Enter the supplier phone number.'
    : !/^(\+256|0)7\d{8}$/.test(v.replace(/\s/g, '')) ? 'Use a Uganda mobile number like 0772123456 or +256772123456.' : '',
  notes: (v) => v.length > 200 ? 'Keep notes under 200 characters.' : ''
};

function validateField(name) {
  const control = form.elements[name];
  const message = rules[name](control.value.trim());
  document.querySelector(`#${name}-error`).textContent = message;
  control.classList.toggle('invalid', Boolean(message));
  control.setAttribute('aria-invalid', String(Boolean(message)));
  return !message;
}

Object.keys(rules).forEach((name) => {
  const el = form.elements[name];
  el.addEventListener('blur', () => validateField(name));
  el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { if (el.classList.contains('invalid')) validateField(name); });
});
notes.addEventListener('input', () => { notesCount.textContent = notes.value.length; });

form.addEventListener('submit', (e) => {
  e.preventDefault();                                            // stop native submit
  statusEl.textContent = '';
  const results = Object.keys(rules).map(validateField);
  if (results.includes(false)) { form.querySelector('.invalid')?.focus(); return; }   // invalid: stop
  const item = {
    id: Date.now(),
    ...Object.fromEntries(Object.keys(rules).map((n) => [n, form.elements[n].value.trim()])),
    quantity: Number(form.elements.quantity.value),
    unitPrice: Number(form.elements.unitPrice.value),
    reorderLevel: Number(form.elements.reorderLevel.value)
  };
  items = [item, ...items];
  saveItems();
  render();
  form.reset();
  notesCount.textContent = '0';
  statusEl.textContent = `${item.itemName} added to stock.`;
});

/* ---------- Stock list: DOM rendering, search, filter, adjust, delete ---------- */
const STORE_KEY = 'stockroom-items';
const tbody = document.querySelector('#stockBody');
const searchEl = document.querySelector('#search');
let filter = 'All';
let items = [];
try { items = JSON.parse(localStorage.getItem(STORE_KEY)) ?? []; } catch { items = []; }
const saveItems = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch { /* storage unavailable */ } };

const statusOf = ({ quantity, reorderLevel }) => quantity === 0 ? 'out' : quantity <= reorderLevel ? 'low' : 'ok';
const fmt = (n) => Math.round(n).toLocaleString('en-UG');

function updateStats() {
  document.querySelector('#statItems').textContent = items.length;
  document.querySelector('#statUnits').textContent = fmt(items.reduce((s, i) => s + i.quantity, 0));
  document.querySelector('#statValue').textContent = fmt(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  document.querySelector('#statLow').textContent = items.filter((i) => statusOf(i) !== 'ok').length;
  document.querySelector('#itemTotal').textContent = items.length;
}

function cell(text, small) {
  const td = document.createElement('td');
  td.textContent = text;
  if (small) { const s = document.createElement('small'); s.textContent = small; td.append(s); }
  return td;
}

function render() {
  updateStats();
  const term = searchEl.value.trim().toLowerCase();
  const shown = items.filter((i) => i.itemName.toLowerCase().includes(term)
    && (filter === 'All' || (filter === 'Low' && statusOf(i) !== 'ok') || (filter === 'Out' && statusOf(i) === 'out')));
  tbody.replaceChildren();
  if (!shown.length) {
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 6; td.className = 'empty';
    td.textContent = items.length ? 'No items match your search or filter.' : 'No stock yet. Use the form above to add your first item.';
    tr.append(td); tbody.append(tr); return;
  }
  shown.forEach((item) => {
    const { id, itemName, category, location, quantity, unitPrice, reorderLevel } = item;
    const st = statusOf(item);
    const tr = document.createElement('tr');
    tr.className = `s-${st}`;
    tr.append(cell(itemName, category), cell(location));

    const level = document.createElement('td'); level.className = 'level';
    const tag = document.createElement('span'); tag.className = 'tag';
    tag.textContent = `${quantity} units, ${st === 'out' ? 'out of stock' : st === 'low' ? 'low stock' : 'in stock'}`;
    const track = document.createElement('div'); track.className = 'bar-track';
    const fill = document.createElement('div'); fill.className = 'bar-fill';
    fill.style.width = `${Math.min(100, (quantity / Math.max(reorderLevel * 3, 1)) * 100)}%`;
    track.append(fill); level.append(tag, track);

    const adj = document.createElement('td');
    const group = document.createElement('div'); group.className = 'adj';
    [['−', -1, 'Remove one unit'], ['+', 1, 'Add one unit']].forEach(([label, step, aria]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', `${aria} of ${itemName}`);
      b.addEventListener('click', () => { item.quantity = Math.max(0, item.quantity + step); saveItems(); render(); });
      group.append(b);
    });
    adj.append(group);

    const act = document.createElement('td');
    const del = document.createElement('button');
    del.className = 'del'; del.type = 'button'; del.textContent = 'Delete';
    del.addEventListener('click', () => { items = items.filter((i) => i.id !== id); saveItems(); render(); });
    act.append(del);

    tr.append(level, cell(fmt(quantity * unitPrice)), adj, act);
    tbody.append(tr);
  });
}

searchEl.addEventListener('input', render);
document.querySelector('#filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  filter = chip.dataset.filter;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
  render();
});

render();
loadCatalogue();

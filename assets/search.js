
let searchIndex = [];
let activeFilter = 'todos';

function getBase() {
  const depth = (window.location.pathname.match(/\//g) || []).length - 1;
  return depth > 1 ? '../'.repeat(depth - 1) : '';
}

async function loadIndex() {
  try {
    const res = await fetch(getBase() + 'search_index.json');
    searchIndex = await res.json();
  } catch(e) { console.warn('No se pudo cargar el índice.', e); }
}

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ');
}

function highlight(text, query) {
  if (!query) return text;
  normalize(query).split(/\s+/).filter(Boolean).forEach(term => {
    const re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
    text = text.replace(re, '<mark>$1</mark>');
  });
  return text;
}

function doSearch(query) {
  if (!query || query.trim().length < 2) return [];
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return searchIndex.filter(item => {
    if (activeFilter !== 'todos' && item.tipo !== activeFilter) return false;
    const h = normalize(item.texto_busqueda || '');
    return terms.every(t => h.includes(t));
  });
}

const TIPO_LABELS = { persona:'Persona', documento:'Documento', lugar:'Lugar', evento:'Evento' };

function renderResults(results, query) {
  const container = document.getElementById('results');
  const header    = document.getElementById('results-header');
  if (!container) return;
  if (!query || query.trim().length < 2) { header.textContent=''; container.innerHTML=''; return; }
  header.textContent = results.length ? results.length + ' resultado' + (results.length!==1?'s':'') : '';
  if (!results.length) { container.innerHTML='<p class="no-results">Sin resultados para "'+query+'".</p>'; return; }
  container.innerHTML = results.map(item => `
    <a class="result-item" href="${item.url}">
      <div class="result-type">${TIPO_LABELS[item.tipo]||item.tipo}</div>
      <div class="result-body">
        <div class="result-titulo">${highlight(item.titulo, query)}</div>
        <div class="result-meta">${highlight(item.meta||'', query)}</div>
      </div>
    </a>`).join('');
}

function goSearch(query) {
  window.location.href = getBase() + 'buscar.html?q=' + encodeURIComponent(query);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadIndex();
  const input   = document.getElementById('search-input');
  const filters = document.querySelectorAll('.filter-btn');
  if (!input) return;

  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || '';
  if (q) { input.value = q; renderResults(doSearch(q), q); }

  input.addEventListener('input', () => renderResults(doSearch(input.value), input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') goSearch(input.value);
  });
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderResults(doSearch(input.value), input.value);
    });
  });
});

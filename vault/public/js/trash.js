const $ = (id) => document.getElementById(id);

const sidebar = $('sidebar'), sidebarOverlay = $('sidebarOverlay'), menuToggle = $('menuToggle');
if (menuToggle) menuToggle.addEventListener('click', () => { sidebar.classList.add('open'); sidebarOverlay.classList.add('show'); });
if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('show'); });

let toastTimer = null;
function showToast(msg, isError) {
  const t = $('toast'); t.textContent = msg;
  t.style.color = isError ? '#fca5a5' : '';
  t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

let ctxTarget = null;
const ctxMenu = $('ctxMenu');
function openCtxMenu(e, el) {
  ctxTarget = el;
  ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
  ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 160) + 'px';
  ctxMenu.classList.add('show');
}
document.querySelectorAll('.item').forEach(el => {
  const moreBtn = el.querySelector('.more');
  if (moreBtn) moreBtn.addEventListener('click', (e) => { e.stopPropagation(); openCtxMenu(e, el); });
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); openCtxMenu(e, el); });
});
document.addEventListener('click', (e) => { if (!e.target.closest('.ctx-menu') && !e.target.closest('.more')) ctxMenu.classList.remove('show'); });

if (ctxMenu) ctxMenu.addEventListener('click', async (e) => {
  const btn = e.target.closest('button'); if (!btn || !ctxTarget) return;
  const act = btn.dataset.act;
  const type = ctxTarget.dataset.type, id = ctxTarget.dataset.id, name = ctxTarget.dataset.name;
  ctxMenu.classList.remove('show');

  if (act === 'restore') {
    const r = await fetch('/api/restore', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ type, id }) });
    if (r.ok) { showToast('↩️ "' + name + '" restauré'); ctxTarget.remove(); }
    else showToast('Erreur', true);
  } else if (act === 'delete-permanent') {
    if (!confirm('Supprimer définitivement "' + name + '" ? Cette action est irréversible.')) return;
    const r = await fetch('/api/delete-permanent', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ type, id }) });
    if (r.ok) { showToast('🗑️ Supprimé définitivement'); ctxTarget.remove(); }
    else showToast('Erreur', true);
  }
});

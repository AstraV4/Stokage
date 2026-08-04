const $ = (id) => document.getElementById(id);

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg, isError) {
  const t = $('toast'); t.textContent = msg;
  t.style.borderColor = isError ? 'rgba(239,68,68,.4)' : '';
  t.style.color = isError ? '#fca5a5' : '';
  t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Menu "Nouveau" ---------- */
const newBtn = $('newBtn'), newMenu = $('newMenu');
if (newBtn) {
  newBtn.addEventListener('click', (e) => { e.stopPropagation(); newMenu.classList.toggle('show'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.new-btn')) newMenu.classList.remove('show'); });
}
const currentFolderId = () => { const v = $('content').dataset.folder; return v ? parseInt(v, 10) : null; };

/* ---------- Nouveau dossier ---------- */
const menuNewFolder = $('menuNewFolder');
if (menuNewFolder) menuNewFolder.addEventListener('click', async () => {
  newMenu.classList.remove('show');
  const name = prompt('Nom du nouveau dossier :');
  if (!name || !name.trim()) return;
  try {
    const r = await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name: name.trim(), parent_id: currentFolderId() || '' }) });
    const data = await r.json();
    if (!r.ok) return showToast(data.error || 'Erreur', true);
    location.reload();
  } catch (e) { showToast('Erreur réseau', true); }
});

/* ---------- Import de fichier (bouton) ---------- */
const menuUploadFile = $('menuUploadFile'), fileInput = $('fileInput');
if (menuUploadFile) menuUploadFile.addEventListener('click', () => { newMenu.classList.remove('show'); fileInput.click(); });
if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files[0]) uploadFile(fileInput.files[0]); fileInput.value = ''; });

/* ---------- Upload reel, avec barre de progression ---------- */
function uploadFile(file) {
  const toastEl = $('uploadToast'), nameEl = $('utName'), fillEl = $('utFill');
  toastEl.hidden = false; nameEl.textContent = 'Envoi de "' + file.name + '"...'; fillEl.style.width = '0%';

  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder_id', currentFolderId() || '');

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) fillEl.style.width = Math.round((e.loaded / e.total) * 100) + '%';
  });
  xhr.addEventListener('load', () => {
    toastEl.hidden = true;
    if (xhr.status >= 200 && xhr.status < 300) {
      showToast('✅ "' + file.name + '" importé');
      location.reload();
    } else {
      try { const data = JSON.parse(xhr.responseText); showToast(data.message || data.error || 'Échec de l\'import', true); }
      catch (e) { showToast('Échec de l\'import', true); }
    }
  });
  xhr.addEventListener('error', () => { toastEl.hidden = true; showToast('Erreur réseau pendant l\'envoi', true); });
  xhr.send(fd);
}

/* ---------- Glisser-deposer ---------- */
let dragCounter = 0;
const dropzone = $('dropzone');
if (dropzone) {
  window.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; dropzone.classList.add('show'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', () => { dragCounter--; if (dragCounter <= 0) { dragCounter = 0; dropzone.classList.remove('show'); } });
  window.addEventListener('drop', (e) => {
    e.preventDefault(); dragCounter = 0; dropzone.classList.remove('show');
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) uploadFile(files[i]);
  });
}

/* ---------- Navigation (fil d'Ariane) ---------- */
document.querySelectorAll('#breadcrumb span[data-folder]').forEach(el => {
  el.addEventListener('click', () => { const id = el.dataset.folder; location.href = id ? '/folder/' + id : '/'; });
});

/* ---------- Menu contextuel ---------- */
let ctxTarget = null;
const ctxMenu = $('ctxMenu');
function openCtxMenu(e, el) {
  ctxTarget = el;
  ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
  ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 220) + 'px';
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

  if (act === 'download') {
    if (type === 'folder') return showToast('Le téléchargement de dossier complet arrive bientôt', true);
    window.location.href = '/api/download/' + id;
  } else if (act === 'share') {
    openShareModal(type, id, name);
  } else if (act === 'rename') {
    const newName = prompt('Nouveau nom :', name);
    if (!newName || !newName.trim() || newName === name) return;
    const r = await fetch('/api/rename', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ type, id, name: newName.trim() }) });
    if (r.ok) location.reload(); else showToast('Erreur lors du renommage', true);
  } else if (act === 'trash') {
    const r = await fetch('/api/trash', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ type, id }) });
    if (r.ok) { showToast('🗑️ "' + name + '" déplacé dans la corbeille'); ctxTarget.remove(); }
    else showToast('Erreur', true);
  }
});

/* ---------- Modale de partage ---------- */
const shareOverlay = $('shareOverlay');
async function openShareModal(type, id, name) {
  $('shareFileName').textContent = name;
  $('shareLink').value = 'Génération du lien...';
  shareOverlay.classList.add('show');
  shareOverlay.dataset.type = type; shareOverlay.dataset.id = id;
  try {
    const r = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ type, id }) });
    const data = await r.json();
    if (!r.ok) { $('shareLink').value = ''; showToast(data.error || 'Erreur', true); return; }
    $('shareLink').value = location.origin + '/s/' + data.token;
    shareOverlay.dataset.token = data.token;
  } catch (e) { showToast('Erreur réseau', true); }
}
if ($('closeShareModal')) $('closeShareModal').addEventListener('click', () => shareOverlay.classList.remove('show'));
if ($('copyLinkBtn')) $('copyLinkBtn').addEventListener('click', () => {
  const input = $('shareLink'); input.select(); navigator.clipboard.writeText(input.value).catch(() => {});
  showToast('✅ Lien copié dans le presse-papiers');
});
if ($('revokeShareBtn')) $('revokeShareBtn').addEventListener('click', async () => {
  const token = shareOverlay.dataset.token; if (!token) return;
  await fetch('/api/share/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }) });
  showToast('Lien révoqué');
  shareOverlay.classList.remove('show');
});
if ($('shareUserBtn')) $('shareUserBtn').addEventListener('click', async () => {
  const input = $('shareUsernameInput');
  const username = input.value.trim(); if (!username) return;
  const type = shareOverlay.dataset.type, id = shareOverlay.dataset.id;
  try {
    const r = await fetch('/api/share/user', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ type, id, username }) });
    const data = await r.json();
    if (!r.ok) return showToast(data.error || 'Erreur', true);
    showToast(data.already ? 'Déjà partagé avec @' + data.username : '✅ Partagé avec @' + data.username);
    input.value = '';
  } catch (e) { showToast('Erreur réseau', true); }
});

/* ---------- Recherche (remplace la grille par les vrais resultats, meme dans d'autres dossiers) ---------- */
const searchInput = $('searchInput');
const grid = $('grid');
const originalGridHTML = grid ? grid.innerHTML : '';
let searchTimer = null;
function iconFor(mime) { return mime && mime.startsWith('image/') ? '🖼️' : (mime && mime.startsWith('video/') ? '🎬' : '📄'); }
function exitSearch() { if (grid) grid.innerHTML = originalGridHTML; attachItemHandlers(); }
function attachItemHandlers() {
  document.querySelectorAll('.item[data-type="folder"]').forEach(el => {
    el.onclick = (e) => { if (e.target.closest('.more')) return; location.href = '/folder/' + el.dataset.id; };
  });
  document.querySelectorAll('.item').forEach(el => {
    const moreBtn = el.querySelector('.more');
    if (moreBtn) moreBtn.onclick = (e) => { e.stopPropagation(); openCtxMenu(e, el); };
    el.oncontextmenu = (e) => { e.preventDefault(); openCtxMenu(e, el); };
  });
}
if (searchInput) searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (!q) { exitSearch(); return; }
  searchTimer = setTimeout(async () => {
    try {
      const r = await fetch('/api/search?q=' + encodeURIComponent(q));
      const data = await r.json();
      if (!grid) return;
      if (!data.folders.length && !data.files.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div style="font-size:2rem;margin-bottom:8px">🔍</div>Aucun résultat pour "' + q.replace(/</g,'') + '"</div>';
        return;
      }
      grid.innerHTML =
        data.folders.map(f => `<div class="item" data-type="folder" data-id="${f.id}" data-name="${f.name}">
          <div class="thumb" style="background:rgba(59,130,246,.12)">📁</div><div class="name">${f.name}</div><div class="meta">Dossier</div>
          <button class="more" type="button">⋮</button></div>`).join('') +
        data.files.map(f => `<div class="item" data-type="file" data-id="${f.id}" data-name="${f.name}">
          <div class="thumb">${iconFor(f.mime)}</div><div class="name">${f.name}</div><div class="meta">${(f.size/1024/1024).toFixed(2)} Mo</div>
          <button class="more" type="button">⋮</button></div>`).join('');
      attachItemHandlers();
    } catch (e) {}
  }, 300);
});

/* ---------- Activation initiale des gestionnaires (dossiers, menu contextuel) ---------- */
attachItemHandlers();

/* ---------- PWA : installation possible sur telephone ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

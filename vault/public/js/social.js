const sidebar = document.getElementById('sidebar'), sidebarOverlay = document.getElementById('sidebarOverlay'), menuToggle = document.getElementById('menuToggle');
if (menuToggle) menuToggle.addEventListener('click', () => { sidebar.classList.add('open'); sidebarOverlay.classList.add('show'); });
if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('show'); });

/* ---------- Notifications ---------- */
(function () {
  const bell = document.getElementById('notifBell');
  if (!bell) return;
  const panel = document.getElementById('notifPanel');
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');

  const ICON_BY_TYPE = { friend_request: '👤', share: '📎', message: '💬' };
  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'à l\'instant';
    if (s < 3600) return Math.floor(s / 60) + ' min';
    if (s < 86400) return Math.floor(s / 3600) + ' h';
    return Math.floor(s / 86400) + ' j';
  }
  function textFor(n) {
    const name = n.data.username ? '@' + n.data.username : n.actor_name;
    if (n.type === 'friend_request') return `<b>${name}</b> t'a envoyé une demande d'ami`;
    if (n.type === 'share') return `<b>${name}</b> t'a partagé "${n.data.name || 'un élément'}"`;
    if (n.type === 'message') return `<b>${name}</b> ${n.data.group ? 'dans ' + n.data.group + ' : ' : ''}${n.data.preview || 'vous a écrit'}`;
    return `<b>${name}</b>`;
  }
  function linkFor(n) {
    if (n.type === 'friend_request') return '/friends';
    if (n.type === 'message') return n.data.group ? '/groups' : ('/chat/friend/' + n.actor_id);
    if (n.type === 'share') return '/shared-with-me';
    return '#';
  }

  async function loadNotifications() {
    try {
      const r = await fetch('/api/notifications');
      const data = await r.json();
      if (data.unread > 0) { badge.hidden = false; badge.textContent = data.unread > 9 ? '9+' : data.unread; }
      else { badge.hidden = true; }
      if (!data.notifications.length) { list.innerHTML = '<div class="notif-empty">Rien de nouveau pour l\'instant</div>'; return; }
      list.innerHTML = data.notifications.map(n => `
        <a class="notif-item ${n.read_at ? '' : 'unread'}" href="${linkFor(n)}">
          <div class="ni-av" style="${n.actor_avatar ? `background-image:url(/api/avatar/${n.actor_id});` : ''}">${n.actor_avatar ? '' : (ICON_BY_TYPE[n.type] || '🔔')}</div>
          <div class="ni-txt">${textFor(n)}<div class="ni-time">${timeAgo(n.created_at)}</div></div>
        </a>`).join('');
    } catch (e) {}
  }

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) {
      loadNotifications();
      fetch('/api/notifications/read', { method: 'POST' }).then(() => { badge.hidden = true; });
    }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBell')) panel.classList.remove('show'); });

  loadNotifications();
  setInterval(loadNotifications, 20000);
})();

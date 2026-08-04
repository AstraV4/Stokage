const sidebar = document.getElementById('sidebar'), sidebarOverlay = document.getElementById('sidebarOverlay'), menuToggle = document.getElementById('menuToggle');
if (menuToggle) menuToggle.addEventListener('click', () => { sidebar.classList.add('open'); sidebarOverlay.classList.add('show'); });
if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('show'); });

/* ============================================================
   ForensiTriage — App Shell
   Auth Guard · Sidebar · Topbar · Theme · Mobile Nav
   ============================================================ */

/* ── Bootstrap ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Seed demo data first
  seedDemoData();

  // Apply persisted theme
  const savedTheme = localStorage.getItem('ft_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // If this is an authenticated page, guard and build shell
  if (document.querySelector('.app-layout')) {
    if (!Auth.requireAuth()) return;
    buildShell();
  }
});

/* ── Build Authenticated Shell ──────────────────────────────── */
function buildShell() {
  const user = Auth.currentUser();
  if (!user) return;

  // Populate sidebar user info
  const avatarEl   = document.getElementById('sidebar-avatar');
  const nameEl     = document.getElementById('sidebar-user-name');
  const roleEl     = document.getElementById('sidebar-user-role');

  if (avatarEl) avatarEl.textContent = getInitials(user.name);
  if (nameEl)   nameEl.textContent   = user.name;
  if (roleEl)   roleEl.textContent   = user.role === 'investigator' ? 'Investigator' : 'User';

  // Mark active nav item
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPage = href.split('/').pop().split('?')[0];
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });

  // Theme toggle button
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    updateThemeIcon(themeBtn);
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Logout buttons
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  });

  // Mobile menu
  const menuBtn  = document.getElementById('mobile-menu-btn');
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener('click', () => toggleMobileMenu(sidebar, overlay));
    overlay.addEventListener('click', () => closeMobileMenu(sidebar, overlay));
  }

  // Hide investigator-only elements for normal users
  if (!Auth.isInvestigator()) {
    document.querySelectorAll('[data-role="investigator"]').forEach(el => {
      el.style.display = 'none';
    });
  }
}

/* ── Theme ──────────────────────────────────────────────────── */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ft_theme', next);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) updateThemeIcon(btn);
}

function updateThemeIcon(btn) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = isDark
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
}

/* ── Mobile Nav ─────────────────────────────────────────────── */
function toggleMobileMenu(sidebar, overlay) {
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) closeMobileMenu(sidebar, overlay);
  else        openMobileMenu(sidebar, overlay);
}
function openMobileMenu(sidebar, overlay) {
  sidebar.classList.add('open');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeMobileMenu(sidebar, overlay) {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

/* ── Helpers ────────────────────────────────────────────────── */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── Shared Sidebar HTML (injected by each page) ────────────── */
window.SIDEBAR_HTML = `
<div class="sidebar-logo">
  <div class="sidebar-logo-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  </div>
  <div class="sidebar-logo-text">
    <div class="sidebar-logo-name">ForensiTriage</div>
    <div class="sidebar-logo-sub">Evidence Platform</div>
  </div>
</div>
<nav class="sidebar-nav" aria-label="Main navigation">
  <div class="sidebar-section-label">Workspace</div>
  <a href="dashboard.html">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    Dashboard
  </a>
  <a href="cases.html">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
    Cases
  </a>
  <a href="reports.html">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    Reports
  </a>
  <div class="sidebar-section-label" style="margin-top:8px">Account</div>
  <a href="profile.html">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    Profile
  </a>
  <a href="#" data-action="logout">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    Sign Out
  </a>
</nav>
<div class="sidebar-footer">
  <div class="sidebar-user">
    <div class="sidebar-avatar" id="sidebar-avatar">?</div>
    <div class="sidebar-user-info">
      <div class="sidebar-user-name" id="sidebar-user-name">Loading…</div>
      <div class="sidebar-user-role" id="sidebar-user-role">—</div>
    </div>
  </div>
</div>
`;

window.TOPBAR_HTML = `
<button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
</button>
<div class="topbar-breadcrumb" id="topbar-breadcrumb"></div>
<div class="topbar-actions">
  <button class="topbar-btn" id="theme-toggle-btn" title="Toggle theme" aria-label="Toggle theme">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  </button>
</div>
`;

/* ── Inject Shell into Page ─────────────────────────────────── */
window.injectShell = function(breadcrumbs = []) {
  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl) sidebarEl.innerHTML = SIDEBAR_HTML;

  const topbarEl = document.querySelector('.topbar');
  if (topbarEl) topbarEl.innerHTML = TOPBAR_HTML;

  // Render breadcrumbs
  if (breadcrumbs.length > 0) {
    const bcEl = document.getElementById('topbar-breadcrumb');
    if (bcEl) {
      const parts = breadcrumbs.map((b, i) => {
        if (i === breadcrumbs.length - 1) {
          return `<span class="crumb-current">${escHtml(b.label)}</span>`;
        }
        return `<a class="crumb" href="${b.href || '#'}">${escHtml(b.label)}</a>`;
      });
      bcEl.innerHTML = parts.join('<span class="crumb-sep"> / </span>');
    }
  }
};

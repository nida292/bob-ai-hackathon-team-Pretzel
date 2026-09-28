/* ============================================================
   ForensiTriage — Profile Page Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  injectShell([{ label: 'Profile' }]);
  renderProfile();
});

function renderProfile() {
  const user   = Auth.currentUser();
  const cases  = CasesDB.all().filter(c => c.createdBy === user.id);
  const allEv  = EvidenceDB.all().filter(e => e.createdBy === user.id);
  const layout = document.getElementById('profile-layout');

  const initials = getInitials(user.name);
  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';

  layout.innerHTML = `
    <!-- Profile Sidebar -->
    <div>
      <div class="profile-sidebar-card">
        <div class="profile-avatar-large">${escHtml(initials)}</div>
        <div class="profile-name">${escHtml(user.name)}</div>
        <div class="profile-role-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
            ${user.role === 'investigator'
              ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
              : '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'}
          </svg>
          ${user.role === 'investigator' ? 'Investigator' : 'User'}
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--space-5)">${escHtml(user.email)}</div>
        <div class="profile-stat-row">
          <div class="profile-stat">
            <div class="profile-stat-value">${cases.length}</div>
            <div class="profile-stat-label">Cases Created</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">${allEv.length}</div>
            <div class="profile-stat-label">Evidence Added</div>
          </div>
        </div>
        <div style="padding-top:var(--space-4);margin-top:var(--space-4);border-top:1px solid var(--border)">
          <div style="font-size:12px;color:var(--text-muted)">Member since ${DateUtils.format(user.createdAt)}</div>
        </div>
      </div>
    </div>

    <!-- Main Settings -->
    <div style="display:flex;flex-direction:column;gap:var(--space-6)">

      <!-- Account Info -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Account Information</div>
          <button class="btn btn-secondary btn-sm" id="edit-profile-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Full Name</span>
            <span class="info-value">${escHtml(user.name)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email Address</span>
            <span class="info-value">${escHtml(user.email)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Role</span>
            <span class="info-value">${user.role === 'investigator' ? 'Investigator' : 'User'}</span>
          </div>
          <div class="info-row" style="margin-bottom:0">
            <span class="info-label">Account Created</span>
            <span class="info-value">${DateUtils.format(user.createdAt)}</span>
          </div>
        </div>
      </div>

      <!-- Preferences -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Preferences</div>
        </div>
        <div class="card-body">
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Dark Mode</div>
              <div class="settings-row-desc">Toggle between light and dark theme. Preference is saved automatically.</div>
            </div>
            <label class="toggle-switch" title="Toggle dark mode">
              <input type="checkbox" id="dark-mode-toggle" ${isDark ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Permissions -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Permissions</div>
        </div>
        <div class="card-body">
          ${renderPermissions(user)}
        </div>
      </div>

      <!-- Activity History -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Activity</div>
          <span class="text-xs text-muted">Last 20 actions</span>
        </div>
        <div class="card-body" id="profile-activity" style="padding:0">
          ${renderActivityList()}
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="danger-zone">
        <div class="danger-zone-title">Danger Zone</div>
        <div class="danger-zone-desc">Sign out of your ForensiTriage account. You will need to sign in again to access the platform.</div>
        <button class="btn btn-danger btn-sm" id="profile-logout-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>

    </div>
  `;

  bindProfileEvents(user);
}

function renderPermissions(user) {
  const isInv = user.role === 'investigator';
  const perms = [
    { label: 'View cases and evidence',       granted: true },
    { label: 'Create new cases',              granted: true },
    { label: 'Edit case details',             granted: isInv },
    { label: 'Delete cases',                  granted: isInv },
    { label: 'Add evidence to cases',         granted: isInv },
    { label: 'Edit evidence details',         granted: isInv },
    { label: 'Delete evidence',               granted: isInv },
    { label: 'Set / change evidence priority',granted: isInv },
    { label: 'Upload and remove attachments', granted: isInv },
    { label: 'Generate FSL reports',          granted: isInv },
  ];

  return perms.map(p => `
    <div class="settings-row">
      <div class="settings-row-label">${escHtml(p.label)}</div>
      <span class="badge ${p.granted ? 'badge-active' : 'badge-closed'}">
        ${p.granted ? 'Allowed' : 'Restricted'}
      </span>
    </div>`).join('');
}

function renderActivityList() {
  const user = Auth.currentUser();
  const log  = ActivityLog.get(20).filter(a => a.userId === user.id);

  if (log.length === 0) {
    return `<div class="text-sm text-muted" style="padding:var(--space-5)">No activity recorded for your account.</div>`;
  }

  return `<div class="activity-feed" style="padding:0 var(--space-5)">
    ${log.map(entry => `
      <div class="activity-item">
        <div class="activity-dot ${ActivityLog.dotColor(entry.action)}"></div>
        <div class="activity-content">
          <div class="activity-text">${escHtml(entry.action)}: ${escHtml(entry.detail)}</div>
          <div class="activity-time">${DateUtils.formatFull(entry.timestamp)}</div>
        </div>
      </div>`).join('')}
  </div>`;
}

function bindProfileEvents(user) {
  // Dark mode toggle
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) toggle.addEventListener('change', () => {
    const next = toggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ft_theme', next);
    // Update theme icon in topbar if exists
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn && typeof updateThemeIcon === 'function') updateThemeIcon(themeBtn);
  });

  // Logout
  const logoutBtn = document.getElementById('profile-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    Modal.confirm({
      title: 'Sign Out',
      confirmText: 'Sign Out',
      confirmClass: 'btn-danger',
      body: '<p class="text-sm">Are you sure you want to sign out of ForensiTriage?</p>',
      onConfirm: () => Auth.logout(),
    });
  });

  // Edit profile
  const editBtn = document.getElementById('edit-profile-btn');
  if (editBtn) editBtn.addEventListener('click', () => showEditProfileModal(user));
}

function showEditProfileModal(user) {
  Modal.show({
    title: 'Edit Profile',
    confirmText: 'Save Changes',
    body: `
      <div class="form-group">
        <label class="form-label form-label-req">Full Name</label>
        <input type="text" id="ep-name" class="input" value="${escHtml(user.name)}" maxlength="80" />
      </div>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" id="ep-email" class="input" value="${escHtml(user.email)}" autocomplete="email" />
        <p class="form-hint">Changing your email will require you to sign in again.</p>
      </div>
      <hr class="divider" />
      <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-4)">Change Password (optional)</div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input type="password" id="ep-password" class="input" placeholder="Leave blank to keep current" autocomplete="new-password" />
        <p class="form-hint">Minimum 6 characters.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm New Password</label>
        <input type="password" id="ep-confirm" class="input" placeholder="Repeat new password" autocomplete="new-password" />
      </div>
      <div id="ep-error" class="alert alert-danger hidden" style="margin-top:8px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span id="ep-error-msg"></span>
      </div>
    `,
    onConfirm: () => submitEditProfile(user),
  });
}

function submitEditProfile(user) {
  const name     = document.getElementById('ep-name')?.value.trim();
  const email    = document.getElementById('ep-email')?.value.trim().toLowerCase();
  const password = document.getElementById('ep-password')?.value;
  const confirm  = document.getElementById('ep-confirm')?.value;

  const showErr = (msg) => {
    const el = document.getElementById('ep-error');
    if (el) { el.classList.remove('hidden'); document.getElementById('ep-error-msg').textContent = msg; }
  };

  if (!name || name.length < 2) { showErr('Name must be at least 2 characters.'); return; }
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { showErr('Please enter a valid email.'); return; }
  if (password && password.length < 6) { showErr('Password must be at least 6 characters.'); return; }
  if (password && password !== confirm) { showErr('Passwords do not match.'); return; }

  // Check email uniqueness
  const existing = UsersDB.findByEmail(email);
  if (existing && existing.id !== user.id) { showErr('This email is already in use by another account.'); return; }

  const updated = { ...user, name, email };
  if (password) updated.password = password;
  UsersDB.save(updated);

  ActivityLog.add('Profile Updated', `${name} updated their profile`);
  Toast.success('Profile updated successfully.', 'Profile Saved');
  renderProfile();
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ============================================================
   ForensiTriage — Authentication
   Login · Signup · Logout · Session · Role Checks
   ============================================================ */

const SESSION_KEY = 'ft_session';

window.Auth = {
  /* ── Session ──────────────────────────────────────────────── */
  currentUser() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (!s || !s.userId) return null;
      return UsersDB.find(s.userId) || null;
    } catch { return null; }
  },

  isLoggedIn() {
    return !!this.currentUser();
  },

  isInvestigator() {
    const u = this.currentUser();
    return u && u.role === 'investigator';
  },

  /* ── Login ────────────────────────────────────────────────── */
  login(email, password) {
    const user = UsersDB.findByEmail(email);
    if (!user) return { ok: false, error: 'No account found with that email address.' };
    if (user.password !== password) return { ok: false, error: 'Incorrect password.' };

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId: user.id,
      loginAt: DateUtils.isoNow(),
    }));
    ActivityLog.add('Login', `${user.name} (${user.email}) signed in`);
    return { ok: true, user };
  },

  /* ── Signup ───────────────────────────────────────────────── */
  signup(data) {
    const { name, email, password, confirmPassword, role } = data;

    if (!name || name.trim().length < 2)
      return { ok: false, error: 'Full name must be at least 2 characters.' };
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email))
      return { ok: false, error: 'Please enter a valid email address.' };
    if (!password || password.length < 6)
      return { ok: false, error: 'Password must be at least 6 characters.' };
    if (password !== confirmPassword)
      return { ok: false, error: 'Passwords do not match.' };
    if (UsersDB.findByEmail(email))
      return { ok: false, error: 'An account with this email already exists.' };

    const allowedRoles = ['user', 'investigator'];
    const userRole = allowedRoles.includes(role) ? role : 'user';

    const user = UsersDB.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: userRole,
    });

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId: user.id,
      loginAt: DateUtils.isoNow(),
    }));
    ActivityLog.add('Account Created', `${user.name} (${user.email}) registered`);
    return { ok: true, user };
  },

  /* ── Logout ───────────────────────────────────────────────── */
  logout() {
    const user = this.currentUser();
    if (user) ActivityLog.add('Logout', `${user.name} signed out`);
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  },

  /* ── Guards ───────────────────────────────────────────────── */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  requireInvestigator() {
    if (!this.isInvestigator()) {
      Toast.error('This action requires Investigator access.', 'Permission Denied');
      return false;
    }
    return true;
  },
};

/* ── Login Page Init ────────────────────────────────────────── */
window.initLoginPage = function () {
  // If already logged in, redirect
  if (Auth.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form       = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passInput  = document.getElementById('login-password');
  const errorEl    = document.getElementById('login-error');
  const submitBtn  = document.getElementById('login-submit');

  // Demo account quick-fill
  document.querySelectorAll('.auth-demo-account').forEach(btn => {
    btn.addEventListener('click', () => {
      emailInput.value = btn.dataset.email;
      passInput.value  = btn.dataset.pass;
      clearError();
    });
  });

  // Password toggle
  initPasswordToggles();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();
    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!email)    { showError('Please enter your email address.'); return; }
    if (!password) { showError('Please enter your password.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    setTimeout(() => {
      const result = Auth.login(email, password);
      if (result.ok) {
        window.location.href = 'dashboard.html';
      } else {
        showError(result.error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }, 400);
  });

  function showError(msg) {
    const span = errorEl.querySelector('span');
    if (span) span.textContent = msg; else errorEl.childNodes[errorEl.childNodes.length-1].textContent = msg;
    errorEl.classList.remove('hidden');
  }
  function clearError() {
    const span = errorEl.querySelector('span');
    if (span) span.textContent = '';
    errorEl.classList.add('hidden');
  }
};

/* ── Signup Page Init ───────────────────────────────────────── */
window.initSignupPage = function () {
  if (Auth.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form    = document.getElementById('signup-form');
  const errorEl = document.getElementById('signup-error');
  const submitBtn = document.getElementById('signup-submit');

  initPasswordToggles();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const data = {
      name:            document.getElementById('signup-name').value.trim(),
      email:           document.getElementById('signup-email').value.trim(),
      password:        document.getElementById('signup-password').value,
      confirmPassword: document.getElementById('signup-confirm').value,
      role:            document.getElementById('signup-role').value,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    setTimeout(() => {
      const result = Auth.signup(data);
      if (result.ok) {
        window.location.href = 'dashboard.html';
      } else {
        showError(result.error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    }, 400);
  });

  function showError(msg) {
    const span = errorEl.querySelector('span');
    if (span) span.textContent = msg; else errorEl.childNodes[errorEl.childNodes.length-1].textContent = msg;
    errorEl.classList.remove('hidden');
  }
  function clearError() {
    const span = errorEl.querySelector('span');
    if (span) span.textContent = '';
    errorEl.classList.add('hidden');
  }
};

/* ── Password Toggle Helper ─────────────────────────────────── */
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-toggle').querySelector('.input');
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.innerHTML = isText
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    });
  });
}

/* ============================================================
   ForensiTriage — Utilities
   Toast · Modal · Date · Priority Badges · Activity Logger
   ============================================================ */

/* ── Toast System ───────────────────────────────────────────── */
(function () {
  const ICONS = {
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };

  function getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  window.Toast = {
    show(message, type = 'info', title = '', duration = 4000) {
      const container = getContainer();
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        ${ICONS[type] || ICONS.info}
        <div class="toast-content">
          ${title ? `<div class="toast-title">${title}</div>` : ''}
          <div class="toast-msg">${message}</div>
        </div>
        <button class="toast-dismiss" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      toast.querySelector('.toast-dismiss').addEventListener('click', () => removeToast(toast));
      container.appendChild(toast);
      if (duration > 0) setTimeout(() => removeToast(toast), duration);
      return toast;
    },
    info   (msg, title='') { return this.show(msg, 'info',    title); },
    success(msg, title='') { return this.show(msg, 'success', title); },
    warning(msg, title='') { return this.show(msg, 'warning', title); },
    error  (msg, title='') { return this.show(msg, 'error',   title); },
  };

  function removeToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400);
  }
})();

/* ── Modal System ───────────────────────────────────────────── */
window.Modal = {
  /**
   * Show a modal dialog.
   * @param {Object} opts
   *   title, body (HTML string), size ('', 'lg'), footer (HTML), onConfirm, confirmText, confirmClass, onCancel
   */
  show(opts = {}) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const size = opts.size === 'lg' ? 'modal-lg' : '';
    const confirmClass = opts.confirmClass || 'btn-primary';
    const confirmText = opts.confirmText || 'Confirm';
    const cancelText  = opts.cancelText  || 'Cancel';

    const footerHtml = opts.footer !== undefined ? opts.footer : `
      <button class="btn btn-secondary modal-cancel-btn">${cancelText}</button>
      <button class="btn ${confirmClass} modal-confirm-btn">${confirmText}</button>
    `;

    backdrop.innerHTML = `
      <div class="modal ${size}">
        <div class="modal-header">
          <h2 class="modal-title">${opts.title || ''}</h2>
          <button class="modal-close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${opts.body || ''}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    const close = () => {
      backdrop.remove();
      document.body.style.overflow = '';
    };

    backdrop.querySelector('.modal-close').addEventListener('click', () => {
      close();
      if (opts.onCancel) opts.onCancel();
    });

    const cancelBtn = backdrop.querySelector('.modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      close();
      if (opts.onCancel) opts.onCancel();
    });

    const confirmBtn = backdrop.querySelector('.modal-confirm-btn');
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
      if (opts.onConfirm) opts.onConfirm();
      close();
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        close();
        if (opts.onCancel) opts.onCancel();
      }
    });

    // Trap ESC
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        close();
        if (opts.onCancel) opts.onCancel();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Focus first focusable element
    setTimeout(() => {
      const focusable = backdrop.querySelector('input, select, textarea, button:not(.modal-close)');
      if (focusable) focusable.focus();
    }, 50);

    return { close, backdrop };
  },

  confirm(opts = {}) {
    return new Promise((resolve) => {
      Modal.show({
        ...opts,
        onConfirm: () => resolve(true),
        onCancel:  () => resolve(false),
      });
    });
  },
};

/* ── Date Formatting ────────────────────────────────────────── */
window.DateUtils = {
  format(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  },
  formatFull(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  },
  formatRelative(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours   = Math.floor(minutes / 60);
    const days    = Math.floor(hours / 24);
    if (seconds < 60)  return 'just now';
    if (minutes < 60)  return `${minutes}m ago`;
    if (hours < 24)    return `${hours}h ago`;
    if (days < 7)      return `${days}d ago`;
    return DateUtils.format(dateStr);
  },
  isoNow() {
    return new Date().toISOString();
  },
};

/* ── Priority Utilities ─────────────────────────────────────── */
window.PriorityUtils = {
  levels: ['Critical', 'High', 'Medium', 'Low', 'Unassigned'],
  colors: {
    Critical:   '#DC2626',
    High:       '#D97706',
    Medium:     '#2563EB',
    Low:        '#16A34A',
    Unassigned: '#64748B',
  },
  badge(priority) {
    const p = priority || 'Unassigned';
    const cls = p.toLowerCase();
    return `<span class="badge badge-${cls} badge-dot">${p}</span>`;
  },
  dot(priority) {
    const p = priority || 'Unassigned';
    const cls = p.toLowerCase();
    return `<span class="priority-dot ${cls}"></span>`;
  },
  color(priority) {
    return this.colors[priority] || this.colors.Unassigned;
  },
  sort(evidenceArray) {
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3, Unassigned: 4 };
    return [...evidenceArray].sort((a, b) => {
      const ao = order[a.priority] ?? 4;
      const bo = order[b.priority] ?? 4;
      return ao - bo;
    });
  },
};

/* ── Activity Logger ────────────────────────────────────────── */
window.ActivityLog = {
  KEY: 'ft_activity',
  MAX: 200,

  add(action, detail = '', meta = {}) {
    const user = Auth ? Auth.currentUser() : null;
    const entry = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      action,
      detail,
      meta,
      user: user ? user.name : 'Unknown',
      userId: user ? user.id : null,
      timestamp: DateUtils.isoNow(),
    };
    const log = this.get();
    log.unshift(entry);
    if (log.length > this.MAX) log.splice(this.MAX);
    localStorage.setItem(this.KEY, JSON.stringify(log));
    return entry;
  },

  get(limit = 50) {
    try {
      const all = JSON.parse(localStorage.getItem(this.KEY) || '[]');
      return all.slice(0, limit);
    } catch { return []; }
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  dotColor(action) {
    if (/delete|remove/i.test(action)) return 'dot-red';
    if (/create|add/i.test(action))    return 'dot-green';
    if (/priority|update|edit/i.test(action)) return 'dot-amber';
    if (/login|logout/i.test(action))  return 'dot-gray';
    return '';
  },
};

/* ── URL Params Helper ──────────────────────────────────────── */
window.URLParams = {
  get(key) {
    return new URLSearchParams(window.location.search).get(key);
  },
};

/* ── Escape HTML ────────────────────────────────────────────── */
window.escHtml = function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/* ── Generate ID ────────────────────────────────────────────── */
window.genId = function(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

/* ── Debounce ───────────────────────────────────────────────── */
window.debounce = function(fn, delay = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

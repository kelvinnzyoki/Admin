// ================================
// CONFIGURATION
// ================================
const CONFIG = {
  API_BASE_URL: 'https://api.cctamcc.site',
  
  // Enable debug mode to see detailed logs
  DEBUG_MODE: true,
  
  // Auto-refresh interval (milliseconds)
  REFRESH_INTERVAL: 30000 // 30 seconds
};

// ================================
// API HELPER
// ================================
const API = {
  baseURL: CONFIG.API_BASE_URL,
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    if (CONFIG.DEBUG_MODE) {
      console.log(`🔵 API Request: ${options.method || 'GET'} ${url}`);
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // CRITICAL: Must send cookies
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (CONFIG.DEBUG_MODE) {
        console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        showNotification('Please log in first', 'error');
        setTimeout(() => {
          window.location.href = '/login.html'; // Adjust to your login page
        }, 2000);
        throw new Error('Unauthenticated - please log in');
      }
      
      if (response.status === 403) {
        showNotification('Admin access required. Contact administrator.', 'error');
        throw new Error('Forbidden - admin access required');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          // Not JSON, use status text
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (CONFIG.DEBUG_MODE) {
        console.log('Response Data:', data);
      }
      
      return data;
      
    } catch (err) {
      console.error('❌ API Error:', err);
      
      // Check if it's a network error
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        showNotification(
          `Cannot connect to server at ${this.baseURL}. Check if server is running.`,
          'error'
        );
      } else if (!err.message.includes('Unauthenticated') && !err.message.includes('Forbidden')) {
        showNotification(err.message, 'error');
      }
      
      throw err;
    }
  },
  
  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
      window.location.href = '/login.html';
    } catch (err) {
      console.error('Logout error:', err);
      // Force redirect anyway
      window.location.href = '/login.html';
    }
  }
};

// ================================
// NOTIFICATION SYSTEM
// ================================
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existing = document.querySelectorAll('.notification');
  existing.forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#38bdf8'};
    color: white;
    border-radius: 8px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// ================================
// LOAD DASHBOARD STATS
// ================================
async function loadStats() {
  if (CONFIG.DEBUG_MODE) console.log('📊 Loading stats...');
  
  try {
    const stats = await API.request('/admin/stats');
    
    document.getElementById('total-users').textContent = stats.total_users?.toLocaleString() || '0';
    document.getElementById('total-recovery').textContent = stats.total_recovery?.toLocaleString() || '0';
    document.getElementById('total-audits').textContent = stats.total_audits?.toLocaleString() || '0';
    
    if (CONFIG.DEBUG_MODE) console.log('✅ Stats loaded successfully');
  } catch (err) {
    console.error('Failed to load stats:', err);
    document.getElementById('total-users').textContent = '--';
    document.getElementById('total-recovery').textContent = '--';
    document.getElementById('total-audits').textContent = '--';
  }
}

// ================================
// LOAD AUDIT LOGS
// ================================
async function loadAudits() {
  if (CONFIG.DEBUG_MODE) console.log('📋 Loading audits...');
  
  try {
    const audits = await API.request('/admin/audits');
    const tbody = document.querySelector('#audit-table tbody');
    tbody.innerHTML = '';

    if (!audits || audits.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">No audit logs found</td></tr>';
      return;
    }

    audits.forEach(audit => {
      const tr = document.createElement('tr');
      
      const victoryPreview = audit.victory ? 
        audit.victory.substring(0, 50) + (audit.victory.length > 50 ? '...' : '') : 
        '<em style="color: var(--text-muted);">No data</em>';
      
      const defeatPreview = audit.defeat ? 
        audit.defeat.substring(0, 50) + (audit.defeat.length > 50 ? '...' : '') : 
        '<em style="color: var(--text-muted);">No data</em>';

      tr.innerHTML = `
        <td>
          <div style="font-weight: 500;">${audit.username || 'User'}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">ID: ${audit.user_id}</div>
        </td>
        <td>${victoryPreview}</td>
        <td>${defeatPreview}</td>
        <td>${new Date(audit.updated_at).toLocaleString()}</td>
        <td>
          <button class="btn btn-danger" onclick="deleteAudit(${audit.user_id})">
            Delete
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    if (CONFIG.DEBUG_MODE) console.log(` Loaded ${audits.length} audits`);
  } catch (err) {
    console.error('Failed to load audits:', err);
    const tbody = document.querySelector('#audit-table tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">Error loading audits. Check console.</td></tr>';
  }
}

// ================================
// DELETE AUDIT
// ================================
async function deleteAudit(userId) {
  if (!confirm('Are you sure you want to delete this audit? This action cannot be undone.')) return;
  
  try {
    await API.request(`/admin/audit/${userId}`, { method: 'DELETE' });
    showNotification('Audit deleted successfully', 'success');
    loadAudits();
  } catch (err) {
    console.error('Failed to delete audit:', err);
  }
}

// ================================
// LOAD USERS (MODERATION)
// ================================
async function loadUsers() {
  if (CONFIG.DEBUG_MODE) console.log('👥 Loading users...');
  
  try {
    const users = await API.request('/admin/users');
    const container = document.getElementById('moderation-list');
    
    if (!container) {
      console.error('moderation-list element not found');
      return;
    }
    
    container.innerHTML = '';

    if (!users || users.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); padding: 20px; text-align: center;">No users found</p>';
      return;
    }

    users.forEach(user => {
      const box = document.createElement('div');
      box.className = 'moderation-box';
      
      const lastActive = user.last_active ? 
        `Last active: ${new Date(user.last_active).toLocaleString()}` : 
        'Never active';
      
      box.innerHTML = `
        <div>
          <div style="font-weight: 500; margin-bottom: 4px;">
            ${user.username}
            ${user.role === 'admin' ? '<span class="badge success">Admin</span>' : ''}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${user.email} • Score: ${user.total_score} • Posts: ${user.post_count}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
            ${lastActive}
          </div>
        </div>
        <div>
          ${user.role !== 'admin' ? 
            `<button class="btn btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">Delete</button>` : 
            '<span style="color: var(--text-muted); font-size: 0.8rem;">Protected</span>'
          }
        </div>
      `;
      container.appendChild(box);
    });
    
    if (CONFIG.DEBUG_MODE) console.log(`✅ Loaded ${users.length} users`);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

// ================================
// DELETE USER
// ================================
async function deleteUser(userId, username) {
  if (!confirm(`Are you sure you want to delete user "${username}"? This will permanently delete all their data.`)) return;
  
  try {
    await API.request(`/admin/user/${userId}`, { method: 'DELETE' });
    showNotification(`User "${username}" deleted successfully`, 'success');
    loadUsers();
    loadStats();
  } catch (err) {
    console.error('Failed to delete user:', err);
  }
}

// ================================
// LOAD RECENT ACTIVITIES
// ================================
async function loadActivities() {
  if (CONFIG.DEBUG_MODE) console.log('🔔 Loading activities...');
  
  const container = document.getElementById('activity-feed');
  if (!container) return;
  
  try {
    const activities = await API.request('/admin/activities?limit=20');
    
    container.innerHTML = '';

    if (!activities || activities.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); padding: 20px; text-align: center;">No recent activities</p>';
      return;
    }

    activities.forEach(activity => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      
      const icon = getActivityIcon(activity.action);
      const description = getActivityDescription(activity);
      
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 1.2rem;">${icon}</div>
          <div style="flex: 1;">
            <div style="font-size: 0.85rem;">
              <strong>${activity.username || 'System'}</strong> ${description}
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
              ${new Date(activity.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
    
    if (CONFIG.DEBUG_MODE) console.log(`✅ Loaded ${activities.length} activities`);
  } catch (err) {
    console.error('Failed to load activities:', err);
    container.innerHTML = '<p style="color: #ef4444; padding: 20px; text-align: center;">Error loading activities</p>';
  }
}

// ================================
// ACTIVITY HELPERS
// ================================
function getActivityIcon(action) {
  const icons = {
    'user_signup': '👤',
    'user_login': '🔑',
    'recovery_log_updated': '💤',
    'arena_post_created': '📝',
    'audit_updated': '📊',
    'pushups_score_updated': '💪',
    'situps_score_updated': '🏃',
    'squats_score_updated': '🦵',
    'steps_score_updated': '👟',
    'addictions_score_updated': '🎯',
    'admin_audit_deleted': '🗑️',
    'admin_user_deleted': '⚠️',
    'verification_email_sent': '📧'
  };
  return icons[action] || '📌';
}

function getActivityDescription(activity) {
  const descriptions = {
    'user_signup': 'signed up',
    'user_login': 'logged in',
    'recovery_log_updated': 'updated recovery log',
    'arena_post_created': 'posted to arena',
    'audit_updated': 'updated audit',
    'pushups_score_updated': 'logged pushups',
    'situps_score_updated': 'logged situps',
    'squats_score_updated': 'logged squats',
    'steps_score_updated': 'logged steps',
    'addictions_score_updated': 'updated addiction score',
    'admin_audit_deleted': 'deleted an audit',
    'admin_user_deleted': 'deleted a user',
    'verification_email_sent': 'verification email sent'
  };
  return descriptions[activity.action] || activity.action.replace(/_/g, ' ');
}

// ================================
// AUTO-REFRESH
// ================================
let refreshInterval;

function startAutoRefresh() {
  console.log(` Auto-refresh enabled (every ${CONFIG.REFRESH_INTERVAL / 1000}s)`);
  
  refreshInterval = setInterval(() => {
    if (CONFIG.DEBUG_MODE) console.log('🔄 Auto-refreshing...');
    loadStats();
    loadActivities();
  }, CONFIG.REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    console.log('Auto-refresh stopped');
  }
}

// ================================
// INITIALIZE
// ================================
window.addEventListener('DOMContentLoaded', () => {
  console.log('TAM Admin Dashboard Initializing...');
  console.log(`API Base URL: ${CONFIG.API_BASE_URL}`);
  console.log(` Debug Mode: ${CONFIG.DEBUG_MODE}`);
  
  // Check if we have the necessary elements
  const requiredElements = ['total-users', 'total-recovery', 'total-audits', 'audit-table'];
  const missing = requiredElements.filter(id => !document.getElementById(id));
  
  if (missing.length > 0) {
    console.error('❌ Missing required elements:', missing);
    showNotification('Dashboard initialization error. Check console.', 'error');
    return;
  }
  
  // Load initial data
  loadStats();
  loadAudits();
  
  // Start auto-refresh
  startAutoRefresh();
  
  console.log(' Admin Dashboard Initialized');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .activity-item {
    padding: 12px;
    border-bottom: 1px solid var(--border-soft);
    transition: background 0.2s;
  }
  
  .activity-item:hover {
    background: rgba(255,255,255,0.02);
  }
  
  .activity-item:last-child {
    border-bottom: none;
  }
`;
document.head.appendChild(style);
    

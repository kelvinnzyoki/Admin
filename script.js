// ================================
// API HELPER
// ================================
const API = {
  baseURL: 'https://api.cctamcc.site', // Update to your server URL
  
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }
      
      return await response.json();
    } catch (err) {
      console.error('API Error:', err);
      showNotification(err.message, 'error');
      throw err;
    }
  },
  
  async logout() {
    await this.request('/logout', { method: 'POST' });
    window.location.href = '/login.html';
  }
};

// ================================
// NOTIFICATION SYSTEM
// ================================
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'error' ? 'var(--danger)' : 'var(--success)'};
    color: white;
    border-radius: 8px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ================================
// LOAD DASHBOARD STATS
// ================================
async function loadStats() {
  try {
    const stats = await API.request('/admin/stats');
    
    document.getElementById('total-users').textContent = stats.total_users.toLocaleString();
    document.getElementById('total-recovery').textContent = stats.total_recovery.toLocaleString();
    document.getElementById('total-audits').textContent = stats.total_audits.toLocaleString();
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// ================================
// LOAD AUDIT LOGS
// ================================
async function loadAudits() {
  try {
    const audits = await API.request('/admin/audits');
    const tbody = document.querySelector('#audit-table tbody');
    tbody.innerHTML = '';

    if (audits.length === 0) {
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
  } catch (err) {
    console.error('Failed to load audits:', err);
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
  try {
    const users = await API.request('/admin/users');
    const container = document.getElementById('moderation-list');
    container.innerHTML = '';

    if (users.length === 0) {
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
    loadStats(); // Refresh stats
  } catch (err) {
    console.error('Failed to delete user:', err);
  }
}

// ================================
// LOAD RECENT ACTIVITIES
// ================================
async function loadActivities() {
  try {
    const activities = await API.request('/admin/activities?limit=20');
    const container = document.getElementById('activity-feed');
    
    if (!container) return; // Only load if activity feed element exists
    
    container.innerHTML = '';

    if (activities.length === 0) {
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
  } catch (err) {
    console.error('Failed to load activities:', err);
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
  return descriptions[activity.action] || activity.action;
}

// ================================
// ACTIVITY STATS CHART
// ================================
async function loadActivityStats() {
  try {
    const stats = await API.request('/admin/activity-stats');
    const container = document.getElementById('activity-stats-chart');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    stats.slice(0, 10).forEach(stat => {
      const bar = document.createElement('div');
      bar.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        margin-bottom: 8px;
        background: rgba(255,255,255,0.03);
        border-radius: 6px;
      `;
      
      const maxCount = Math.max(...stats.map(s => s.count));
      const percentage = (stat.count / maxCount) * 100;
      
      bar.innerHTML = `
        <div style="flex: 1;">
          <div style="font-size: 0.8rem; margin-bottom: 4px;">${stat.action.replace(/_/g, ' ')}</div>
          <div style="background: var(--bg-main); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="background: var(--accent); height: 100%; width: ${percentage}%;"></div>
          </div>
        </div>
        <div style="margin-left: 15px; font-weight: bold; color: var(--accent);">
          ${stat.count}
        </div>
      `;
      
      container.appendChild(bar);
    });
  } catch (err) {
    console.error('Failed to load activity stats:', err);
  }
}

// ================================
// USER GROWTH CHART
// ================================
async function loadUserGrowth() {
  try {
    const growth = await API.request('/admin/user-growth');
    const container = document.getElementById('user-growth-chart');
    
    if (!container) return;
    
    const maxSignups = Math.max(...growth.map(g => parseInt(g.signups)));
    
    container.innerHTML = '';
    
    growth.forEach(day => {
      const bar = document.createElement('div');
      const height = (parseInt(day.signups) / maxSignups) * 100;
      
      bar.style.cssText = `
        display: inline-block;
        width: ${100 / growth.length}%;
        vertical-align: bottom;
        padding: 0 2px;
      `;
      
      bar.innerHTML = `
        <div style="
          background: var(--accent);
          height: ${height}px;
          min-height: 2px;
          border-radius: 3px 3px 0 0;
          position: relative;
          cursor: pointer;
        " title="${new Date(day.date).toLocaleDateString()}: ${day.signups} signups">
        </div>
        <div style="font-size: 0.6rem; color: var(--text-muted); text-align: center; margin-top: 4px;">
          ${new Date(day.date).getDate()}
        </div>
      `;
      
      container.appendChild(bar);
    });
  } catch (err) {
    console.error('Failed to load user growth:', err);
  }
}

// ================================
// AUTO-REFRESH
// ================================
let refreshInterval;

function startAutoRefresh() {
  // Refresh stats every 30 seconds
  refreshInterval = setInterval(() => {
    loadStats();
    loadActivities();
  }, 30000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
}

// ================================
// NAVIGATION
// ================================
function showSection(section) {
  // Hide all sections
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  
  // Show selected section
  const sectionEl = document.getElementById(`${section}-section`);
  if (sectionEl) {
    sectionEl.style.display = 'block';
  }
  
  // Update active nav
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  event?.target?.classList.add('active');
  
  // Load section data
  switch(section) {
    case 'dashboard':
      loadStats();
      loadAudits();
      loadActivities();
      break;
    case 'users':
      loadUsers();
      break;
    case 'analytics':
      loadActivityStats();
      loadUserGrowth();
      break;
  }
}

// ================================
// INITIALIZE
// ================================
window.addEventListener('DOMContentLoaded', () => {
  // Load initial data
  loadStats();
  loadAudits();
  
  // Start auto-refresh
  startAutoRefresh();
  
  console.log('✅ Admin Dashboard Initialized');
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
  

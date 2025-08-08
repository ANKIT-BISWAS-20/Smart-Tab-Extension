// Popup JavaScript
class TabManagerPopup {
  constructor() {
    this.init();
  }

  async init() {
    await this.updateStats();
    await this.loadSessions();
    await this.loadTimeStats();
    this.bindEvents();
  }

  async updateStats() {
    try {
      const tabs = await chrome.tabs.query({});
      const groups = await chrome.tabGroups.query({});
      
      document.getElementById('tabCount').textContent = tabs.length;
      document.getElementById('groupCount').textContent = groups.length;
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  async loadTimeStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getTimeStats' });
      if (response.success && response.data) {
        const { today } = response.data;
        
        // Update time display
        document.getElementById('todayTime').textContent = this.formatTime(today.totalTime);
        document.getElementById('productiveTime').textContent = this.formatTime(today.productive);
        document.getElementById('neutralTime').textContent = this.formatTime(today.neutral);
        document.getElementById('distractingTime').textContent = this.formatTime(today.distracting);
      }
    } catch (error) {
      console.error('Error loading time stats:', error);
    }
  }

  formatTime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  async loadSessions() {
    try {
      const result = await chrome.storage.local.get(['savedSessions']);
      const sessions = result.savedSessions || [];
      
      const sessionsList = document.getElementById('sessionsList');
      sessionsList.innerHTML = '';
      
      if (sessions.length === 0) {
        sessionsList.innerHTML = '<div style="opacity: 0.6; font-style: italic;">No saved sessions</div>';
        return;
      }
      
      sessions.forEach((session, index) => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-item';
        
        // Create session content
        const sessionContent = document.createElement('div');
        sessionContent.className = 'session-content';
        sessionContent.innerHTML = `
          <div class="session-name">${session.name}</div>
          <div class="session-info">${session.tabs.length} tabs • ${new Date(session.timestamp).toLocaleDateString()}</div>
        `;
        sessionContent.addEventListener('click', () => this.restoreSession(session));
        
        // Create session actions
        const sessionActions = document.createElement('div');
        sessionActions.className = 'session-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-session-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete Session';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent session restore
          this.deleteSession(index);
        });
        
        sessionActions.appendChild(deleteBtn);
        
        sessionDiv.appendChild(sessionContent);
        sessionDiv.appendChild(sessionActions);
        sessionsList.appendChild(sessionDiv);
      });
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  bindEvents() {
    document.getElementById('autoGroup').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'autoGroupTabs' });
      window.close();
    });

    document.getElementById('closeDuplicates').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'closeDuplicates' });
      window.close();
    });

    document.getElementById('suspendUnused').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'suspendUnused' });
      window.close();
    });

    document.getElementById('saveSession').addEventListener('click', () => {
      this.saveCurrentSession();
    });

    document.getElementById('focusMode').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'toggleFocusMode' });
      window.close();
    });

    document.getElementById('timeStats').addEventListener('click', () => {
      this.showTimeAnalytics();
    });

    document.getElementById('categorySettings').addEventListener('click', async () => {
      try {
        console.log('Category Settings button clicked');
        const response = await chrome.runtime.sendMessage({ action: 'openCategorySettings' });
        console.log('Response:', response);
        if (response.success) {
          window.close();
        } else {
          console.error('Failed to open category settings:', response.error);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    // Floating button event listeners (only if elements exist)
    const quickRefreshBtn = document.getElementById('quickRefresh');
    if (quickRefreshBtn) {
      quickRefreshBtn.addEventListener('click', async () => {
        await this.updateStats();
        await this.loadTimeStats();
        await this.loadSessions();
        this.showNotification('Data refreshed!', 'success');
      });
    }

    const quickAnalyticsBtn = document.getElementById('quickAnalytics');
    if (quickAnalyticsBtn) {
      quickAnalyticsBtn.addEventListener('click', () => {
        this.showTimeAnalytics();
      });
    }
  }

  async saveCurrentSession() {
    try {
      const tabs = await chrome.tabs.query({});
      const sessionName = `Session ${new Date().toLocaleString()}`;
      
      const session = {
        name: sessionName,
        timestamp: Date.now(),
        tabs: tabs.map(tab => ({
          url: tab.url,
          title: tab.title,
          pinned: tab.pinned
        }))
      };
      
      const result = await chrome.storage.local.get(['savedSessions']);
      const sessions = result.savedSessions || [];
      sessions.unshift(session);
      
      // Keep only last 10 sessions
      if (sessions.length > 10) {
        sessions.splice(10);
      }
      
      await chrome.storage.local.set({ savedSessions: sessions });
      await this.loadSessions();
      
      // Show feedback
      const btn = document.getElementById('saveSession');
      const originalText = btn.textContent;
      btn.textContent = '✅ Saved!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  async restoreSession(session) {
    try {
      // Create new window with session tabs
      const window = await chrome.windows.create({ focused: true });
      
      for (const tab of session.tabs) {
        await chrome.tabs.create({
          windowId: window.id,
          url: tab.url,
          pinned: tab.pinned
        });
      }
      
      // Close the initial blank tab
      const tabs = await chrome.tabs.query({ windowId: window.id });
      if (tabs.length > session.tabs.length) {
        await chrome.tabs.remove(tabs[0].id);
      }
      
      window.close();
    } catch (error) {
      console.error('Error restoring session:', error);
    }
  }

  async deleteSession(sessionIndex) {
    try {
      // Show confirmation dialog
      const confirmed = await this.showConfirmDialog(
        'Delete Session',
        'Are you sure you want to delete this session? This action cannot be undone.',
        'Delete',
        'Cancel'
      );
      
      if (!confirmed) {
        return;
      }
      
      // Get current sessions
      const result = await chrome.storage.local.get(['savedSessions']);
      const sessions = result.savedSessions || [];
      
      // Remove the session at the specified index
      sessions.splice(sessionIndex, 1);
      
      // Save updated sessions
      await chrome.storage.local.set({ savedSessions: sessions });
      
      // Reload the sessions display
      await this.loadSessions();
      
      // Show success notification
      this.showNotification('Session deleted successfully!', 'success');
      
    } catch (error) {
      console.error('Error deleting session:', error);
      this.showNotification('Failed to delete session', 'error');
    }
  }

  async showConfirmDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      // Create dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #2d2d2d;
        border: 1px solid #404040;
        border-radius: 12px;
        padding: 20px;
        max-width: 320px;
        width: 90%;
        color: white;
        font-family: 'Google Sans', sans-serif;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      `;
      
      dialog.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #FF5722;">${title}</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.9; line-height: 1.4;">${message}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="confirmBtn" style="
            background: #FF5722;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.3s ease;
          ">${confirmText}</button>
          <button id="cancelBtn" style="
            background: #404040;
            color: white;
            border: 1px solid #555555;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
          ">${cancelText}</button>
        </div>
      `;
      
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Add event listeners
      document.getElementById('confirmBtn').addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(true);
      });
      
      document.getElementById('cancelBtn').addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
          resolve(false);
        }
      });
      
      // Close on Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          document.body.removeChild(overlay);
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      padding: 8px 12px;
      border-radius: 6px;
      color: white;
      font-family: 'Google Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      transform: translateX(100%);
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#FF5722' : '#2196F3'};
      max-width: 200px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  async showTimeAnalytics() {
    try {
      // Create a new tab with detailed analytics
      await chrome.tabs.create({
        url: chrome.runtime.getURL('analytics.html')
      });
      window.close();
    } catch (error) {
      console.error('Error showing time analytics:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TabManagerPopup();
});

// Content Script for Smart Tab Manager Pro
class TabContentManager {
  constructor() {
    this.init();
  }

  init() {
    this.trackPageActivity();
    this.injectProductivityIndicator();
    this.setupKeyboardShortcuts();
  }

  // Normalize domain to handle www and other variations consistently
  normalizeDomain(hostname) {
    if (!hostname) return '';
    
    // Remove www prefix
    let normalized = hostname.toLowerCase().replace(/^www\./, '');
    
    // Handle other common prefixes if needed
    normalized = normalized.replace(/^m\./, ''); // mobile prefixes
    
    return normalized;
  }

  trackPageActivity() {
    // Track time spent on page for productivity metrics
    let startTime = Date.now();
    let isActive = true;

    // Track when page becomes active/inactive
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (isActive) {
          this.recordTimeSpent(Date.now() - startTime);
          isActive = false;
        }
      } else {
        startTime = Date.now();
        isActive = true;
      }
    });

    // Track when leaving page
    window.addEventListener('beforeunload', () => {
      if (isActive) {
        this.recordTimeSpent(Date.now() - startTime);
      }
    });

    // Track scrolling and clicking as activity indicators
    let lastActivity = Date.now();
    ['scroll', 'click', 'keypress', 'mousemove'].forEach(event => {
      document.addEventListener(event, () => {
        lastActivity = Date.now();
      }, { passive: true });
    });

    // Check for inactivity every 30 seconds
    setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > 5 * 60 * 1000) { // 5 minutes inactive
        this.markAsInactive();
      }
    }, 30000);
  }

  recordTimeSpent(timeMs) {
    const timeSpent = Math.floor(timeMs / 1000); // Convert to seconds
    chrome.runtime.sendMessage({
      action: 'recordTimeSpent',
      data: {
        url: window.location.href,
        domain: this.normalizeDomain(window.location.hostname),
        title: document.title,
        timeSpent: timeSpent,
        timestamp: Date.now()
      }
    });
  }

  markAsInactive() {
    chrome.runtime.sendMessage({
      action: 'markInactive',
      data: {
        url: window.location.href,
        timestamp: Date.now()
      }
    });
  }

  injectProductivityIndicator() {
    // Only inject on non-Chrome pages
    if (window.location.protocol === 'chrome-extension:' || 
        window.location.protocol === 'chrome:') {
      return;
    }

    const indicator = document.createElement('div');
    indicator.id = 'smart-tab-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: linear-gradient(45deg, #4CAF50, #2196F3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      z-index: 10000;
      cursor: pointer;
      opacity: 0.9;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    // Use lightning bolt emoji like in analytics page
    indicator.textContent = '⚡';
    indicator.title = 'Smart Tabs by Ankit Biswas - Click for quick actions';
    
    indicator.addEventListener('mouseenter', () => {
      indicator.style.transform = 'translateY(-3px) scale(1.05)';
      indicator.style.opacity = '1';
      indicator.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.4)';
    });
    
    indicator.addEventListener('mouseleave', () => {
      indicator.style.transform = 'translateY(0) scale(1)';
      indicator.style.opacity = '0.9';
      indicator.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    });

    indicator.addEventListener('mousedown', () => {
      indicator.style.transform = 'translateY(-1px) scale(0.98)';
    });

    indicator.addEventListener('mouseup', () => {
      indicator.style.transform = 'translateY(-3px) scale(1.05)';
    });
    
    indicator.addEventListener('click', () => {
      this.showQuickActions();
      // Add rotation effect like analytics page
      const isMenuOpen = document.getElementById('smart-tab-quick-actions') !== null;
      indicator.style.transform = isMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)';
    });
    
    document.body.appendChild(indicator);
  }

  showQuickActions() {
    // Remove existing quick actions if any
    const existing = document.getElementById('smart-tab-quick-actions');
    if (existing) {
      existing.remove();
      return;
    }

    const quickActions = document.createElement('div');
    quickActions.id = 'smart-tab-quick-actions';
    quickActions.style.cssText = `
      position: fixed;
      top: 90px;
      right: 20px;
      background: rgba(45, 45, 45, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 10001;
      min-width: 220px;
      overflow: hidden;
      backdrop-filter: blur(20px);
      animation: slideInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Add brand header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      background: linear-gradient(45deg, #4CAF50, #2196F3);
      color: white;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    `;
    header.textContent = 'Smart Tabs Quick Actions';
    quickActions.appendChild(header);

    const actions = [
      { icon: '🎯', text: 'Auto Group Tabs', action: 'autoGroupTabs', color: '#4CAF50' },
      { icon: '🗑️', text: 'Close Duplicates', action: 'closeDuplicates', color: '#FF5722' },
      { icon: '💤', text: 'Suspend Unused', action: 'suspendUnused', color: '#FFC107' },
      { icon: '💾', text: 'Save Session', action: 'saveSession', color: '#2196F3' },
      { icon: '🎭', text: 'Focus Mode', action: 'toggleFocusMode', color: '#9C27B0' },
      { icon: '📊', text: 'View Analytics', action: 'openAnalytics', color: '#00BCD4' }
    ];

    actions.forEach((action, index) => {
      const actionDiv = document.createElement('div');
      actionDiv.style.cssText = `
        padding: 14px 16px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        border-bottom: ${index < actions.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'};
        position: relative;
        overflow: hidden;
      `;
      
      // Create icon container
      const iconContainer = document.createElement('div');
      iconContainer.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: ${action.color}20;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: 1px solid ${action.color}40;
      `;
      iconContainer.textContent = action.icon;
      
      const textSpan = document.createElement('span');
      textSpan.textContent = action.text;
      textSpan.style.flex = '1';
      
      actionDiv.appendChild(iconContainer);
      actionDiv.appendChild(textSpan);
      
      actionDiv.addEventListener('mouseenter', () => {
        actionDiv.style.background = 'rgba(255, 255, 255, 0.1)';
        actionDiv.style.transform = 'translateX(-2px)';
        iconContainer.style.background = `${action.color}30`;
        iconContainer.style.borderColor = `${action.color}60`;
      });
      
      actionDiv.addEventListener('mouseleave', () => {
        actionDiv.style.background = 'transparent';
        actionDiv.style.transform = 'translateX(0)';
        iconContainer.style.background = `${action.color}20`;
        iconContainer.style.borderColor = `${action.color}40`;
      });
      
      actionDiv.addEventListener('click', () => {
        // Add click animation
        actionDiv.style.transform = 'scale(0.98)';
        setTimeout(() => {
          if (action.action === 'openAnalytics') {
            // Special handling for analytics
            chrome.runtime.sendMessage({ action: 'openAnalytics' });
          } else {
            chrome.runtime.sendMessage({ action: action.action });
          }
          quickActions.remove();
        }, 100);
      });
      
      quickActions.appendChild(actionDiv);
    });

    // Add enhanced CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes fadeOut {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.95);
        }
      }
      
      /* Ensure proper stacking and visibility */
      #smart-tab-indicator {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      
      #smart-tab-quick-actions {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
    `;
    
    // Remove existing style to avoid duplicates
    const existingStyle = document.getElementById('smart-tab-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.id = 'smart-tab-styles';
    document.head.appendChild(style);

    document.body.appendChild(quickActions);

    // Enhanced close functionality
    const closeMenu = (e) => {
      if (!quickActions.contains(e.target) && e.target.id !== 'smart-tab-indicator') {
        quickActions.style.animation = 'fadeOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        // Reset button rotation
        const indicator = document.getElementById('smart-tab-indicator');
        if (indicator) {
          indicator.style.transform = 'rotate(0deg)';
        }
        setTimeout(() => {
          if (quickActions.parentNode) {
            quickActions.remove();
          }
        }, 200);
        document.removeEventListener('click', closeMenu);
      }
    };

    // Close when clicking outside (with slight delay to prevent immediate closure)
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Reset button rotation
        const indicator = document.getElementById('smart-tab-indicator');
        if (indicator) {
          indicator.style.transform = 'rotate(0deg)';
        }
        closeMenu(e);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+H to hide/show tab indicator
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        const indicator = document.getElementById('smart-tab-indicator');
        if (indicator) {
          indicator.style.display = indicator.style.display === 'none' ? 'flex' : 'none';
        }
      }
      
      // Ctrl+Shift+Q for quick actions
      if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
        e.preventDefault();
        this.showQuickActions();
      }
    });
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TabContentManager();
  });
} else {
  new TabContentManager();
}

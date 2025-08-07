// Analytics page JavaScript
class TimeAnalytics {
  constructor() {
    this.data = null;
    this.init();
  }

  async init() {
    // First try to get data from URL parameters (if passed)
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam) {
      try {
        this.data = JSON.parse(decodeURIComponent(dataParam));
        this.updateDisplay();
        return;
      } catch (error) {
        console.log('Failed to parse URL data, trying runtime message...');
      }
    }
    
    // Fallback to runtime message
    await this.loadData();
    this.updateDisplay();
  }

  async loadData() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getTimeStats' });
      if (response.success && response.data) {
        this.data = response.data;
      } else {
        this.data = {
          today: { totalTime: 0, productive: 0, neutral: 0, distracting: 0 },
          topDomains: [],
          weekStats: [],
          totalDomains: 0
        };
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      this.data = {
        today: { totalTime: 0, productive: 0, neutral: 0, distracting: 0 },
        topDomains: [],
        weekStats: [],
        totalDomains: 0
      };
    }
  }

  updateDisplay() {
    this.updateTodayStats();
    this.updateWeeklyChart();
    this.updateTodayBreakdown();
    this.updateTopSitesToday();
    this.updateSitesTable();
  }

  updateTodayStats() {
    const { today } = this.data;
    const total = today.totalTime;
    
    document.getElementById('totalToday').textContent = this.formatTime(total);
    document.getElementById('productiveToday').textContent = this.formatTime(today.productive);
    document.getElementById('neutralToday').textContent = this.formatTime(today.neutral);
    document.getElementById('distractingToday').textContent = this.formatTime(today.distracting);
    
    // Calculate percentages
    if (total > 0) {
      document.getElementById('productivePercent').textContent = 
        `${Math.round((today.productive / total) * 100)}% of total time`;
      document.getElementById('neutralPercent').textContent = 
        `${Math.round((today.neutral / total) * 100)}% of total time`;
      document.getElementById('distractingPercent').textContent = 
        `${Math.round((today.distracting / total) * 100)}% of total time`;
    }
  }

  updateWeeklyChart() {
    const weeklyChart = document.getElementById('weeklyChart');
    weeklyChart.innerHTML = '';
    
    if (!this.data.weekStats || this.data.weekStats.length === 0) {
      weeklyChart.innerHTML = '<div style="text-align: center; opacity: 0.6;">No weekly data available</div>';
      return;
    }
    
    const maxTime = Math.max(...this.data.weekStats.map(day => day.totalTime));
    
    this.data.weekStats.forEach(day => {
      const dayBar = document.createElement('div');
      dayBar.className = 'day-bar';
      
      const barContainer = document.createElement('div');
      barContainer.className = 'bar-container';
      
      const total = day.totalTime;
      const maxHeight = 150;
      
      if (total > 0) {
        // Calculate heights for each category
        const productiveHeight = (day.productive / maxTime) * maxHeight;
        const neutralHeight = (day.neutral / maxTime) * maxHeight;
        const distractingHeight = (day.distracting / maxTime) * maxHeight;
        
        // Create segments
        if (day.distracting > 0) {
          const segment = document.createElement('div');
          segment.className = 'bar-segment distracting';
          segment.style.height = `${distractingHeight}px`;
          segment.title = `Distracting: ${this.formatTime(day.distracting)}`;
          barContainer.appendChild(segment);
        }
        
        if (day.neutral > 0) {
          const segment = document.createElement('div');
          segment.className = 'bar-segment neutral';
          segment.style.height = `${neutralHeight}px`;
          segment.title = `Neutral: ${this.formatTime(day.neutral)}`;
          barContainer.appendChild(segment);
        }
        
        if (day.productive > 0) {
          const segment = document.createElement('div');
          segment.className = 'bar-segment productive';
          segment.style.height = `${productiveHeight}px`;
          segment.title = `Productive: ${this.formatTime(day.productive)}`;
          barContainer.appendChild(segment);
        }
      }
      
      const dayLabel = document.createElement('div');
      dayLabel.className = 'day-label';
      dayLabel.textContent = day.day;
      
      dayBar.appendChild(barContainer);
      dayBar.appendChild(dayLabel);
      weeklyChart.appendChild(dayBar);
    });
  }

  updateTodayBreakdown() {
    const breakdown = document.getElementById('todayBreakdown');
    const { today } = this.data;
    const total = today.totalTime;
    
    if (total === 0) {
      breakdown.innerHTML = '<div style="text-align: center; opacity: 0.6;">No data for today</div>';
      return;
    }
    
    const categories = [
      { name: 'Productive', time: today.productive, color: '#4CAF50' },
      { name: 'Neutral', time: today.neutral, color: '#FFC107' },
      { name: 'Distracting', time: today.distracting, color: '#FF5722' }
    ];
    
    breakdown.innerHTML = '';
    
    categories.forEach(category => {
      if (category.time > 0) {
        const percent = Math.round((category.time / total) * 100);
        const item = document.createElement('div');
        item.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        `;
        
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${category.color};"></div>
            <span>${category.name}</span>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600;">${this.formatTime(category.time)}</div>
            <div style="font-size: 12px; opacity: 0.7;">${percent}%</div>
          </div>
        `;
        
        breakdown.appendChild(item);
      }
    });
  }

  updateTopSitesToday() {
    const topSitesToday = document.getElementById('topSitesToday');
    topSitesToday.innerHTML = '';
    
    if (!this.data.topDomains || this.data.topDomains.length === 0) {
      topSitesToday.innerHTML = '<div style="text-align: center; opacity: 0.6; grid-column: 1/-1;">No data for today</div>';
      return;
    }
    
    // Show top 6 sites for today
    const topSites = this.data.topDomains
      .filter(site => site.todayTime > 0)
      .sort((a, b) => b.todayTime - a.todayTime)
      .slice(0, 6);
    
    if (topSites.length === 0) {
      topSitesToday.innerHTML = '<div style="text-align: center; opacity: 0.6; grid-column: 1/-1;">No activity today</div>';
      return;
    }
    
    topSites.forEach(site => {
      const siteCard = document.createElement('div');
      siteCard.className = 'site-card';
      
      siteCard.innerHTML = `
        <div class="site-card-header">
          <div class="site-domain">${site.domain}</div>
          <div class="site-time">${this.formatTime(site.todayTime)}</div>
        </div>
        <div class="site-category-badge ${site.category}">
          ${site.category}
        </div>
      `;
      
      topSitesToday.appendChild(siteCard);
    });
  }

  updateSitesTable() {
    const tbody = document.getElementById('sitesTableBody');
    tbody.innerHTML = '';
    
    if (!this.data.topDomains || this.data.topDomains.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; opacity: 0.6;">No website data available</td></tr>';
      return;
    }
    
    this.data.topDomains.forEach(site => {
      const row = document.createElement('tr');
      
      const categoryColor = {
        productive: '#4CAF50',
        neutral: '#FFC107',
        distracting: '#FF5722'
      }[site.category];
      
      row.innerHTML = `
        <td>
          <div style="font-weight: 500;">${site.domain}</div>
        </td>
        <td>
          <span style="color: ${categoryColor}; font-weight: 500;">
            ${site.category.charAt(0).toUpperCase() + site.category.slice(1)}
          </span>
        </td>
        <td>${this.formatTime(site.todayTime)}</td>
        <td>${this.formatTime(site.totalTime)}</td>
        <td>${site.visitCount}</td>
      `;
      
      tbody.appendChild(row);
    });
  }

  formatTime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

// Global functions for buttons
async function exportData() {
  try {
    console.log('Starting data export...');
    
    let dataToExport = null;
    
    // Try to get data from the analytics instance first
    if (window.timeAnalyticsInstance && window.timeAnalyticsInstance.data) {
      dataToExport = window.timeAnalyticsInstance.data;
      console.log('Using cached data from analytics instance');
    } else {
      // Try to get fresh data from background script
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getTimeStats' });
        if (response && response.success && response.data) {
          dataToExport = response.data;
          console.log('Got fresh data from background script');
        }
      } catch (runtimeError) {
        console.log('Runtime message failed:', runtimeError);
        // Try storage API as fallback
        try {
          const result = await chrome.storage.local.get(['timeTracking', 'dailyStats']);
          if (result.timeTracking || result.dailyStats) {
            dataToExport = {
              today: { totalTime: 0, productive: 0, neutral: 0, distracting: 0 },
              topDomains: [],
              weekStats: [],
              totalDomains: 0,
              rawData: result
            };
            console.log('Using storage API data');
          }
        } catch (storageError) {
          console.log('Storage API also failed:', storageError);
        }
      }
    }
    
    if (dataToExport) {
      // Create a comprehensive export with additional metadata
      const exportData = {
        exportDate: new Date().toISOString(),
        extensionName: 'Smart Tabs',
        version: '1.0.0',
        author: 'Ankit Biswas',
        ...dataToExport
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-tabs-data-${new Date().toISOString().split('T')[0]}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 100);
      
      // Show success message
      showExportSuccess();
    } else {
      throw new Error('No data available to export');
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    showExportError(error.message);
  }
}

function showExportSuccess() {
  // Create a temporary success message
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  successDiv.textContent = '✅ Data exported successfully!';
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    document.body.removeChild(successDiv);
  }, 3000);
}

function showExportError(message) {
  // Create a temporary error message
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #FF5722;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  errorDiv.textContent = `❌ Export failed: ${message}`;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    document.body.removeChild(errorDiv);
  }, 5000);
}

async function resetData() {
  // Create a custom confirmation dialog
  const confirmed = await showCustomConfirm(
    'Reset All Data', 
    'Are you sure you want to reset all time tracking data? This action cannot be undone.',
    'Reset',
    'Cancel'
  );
  
  if (confirmed) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'resetTimeStats' });
      if (response && response.success) {
        showResetSuccess();
        setTimeout(() => {
          location.reload();
        }, 2000);
      } else {
        throw new Error('Reset operation failed');
      }
    } catch (error) {
      console.error('Error resetting data:', error);
      showResetError(error.message);
    }
  }
}

function showCustomConfirm(title, message, confirmText, cancelText) {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #2d2d2d;
      border: 1px solid #404040;
      border-radius: 15px;
      padding: 30px;
      max-width: 400px;
      text-align: center;
      color: white;
    `;
    
    modal.innerHTML = `
      <h3 style="margin-bottom: 15px; color: #FF5722;">${title}</h3>
      <p style="margin-bottom: 25px; opacity: 0.9; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="confirmBtn" style="
          background: #FF5722;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        ">${confirmText}</button>
        <button id="cancelBtn" style="
          background: #404040;
          color: white;
          border: 1px solid #555555;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        ">${cancelText}</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('confirmBtn').onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };
    
    document.getElementById('cancelBtn').onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };
    
    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    };
  });
}

function showResetSuccess() {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  successDiv.textContent = '✅ All data reset successfully! Reloading...';
  document.body.appendChild(successDiv);
}

function showResetError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #FF5722;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  errorDiv.textContent = `❌ Reset failed: ${message}`;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    document.body.removeChild(errorDiv);
  }, 5000);
}

// Debug function to test export functionality
async function debugExport() {
  try {
    console.log('=== DEBUG EXPORT START ===');
    
    // Test if chrome APIs are available
    console.log('chrome available:', typeof chrome !== 'undefined');
    console.log('chrome.runtime available:', typeof chrome !== 'undefined' && !!chrome.runtime);
    console.log('chrome.storage available:', typeof chrome !== 'undefined' && !!chrome.storage);
    
    // Check if we have cached data
    if (window.timeAnalyticsInstance && window.timeAnalyticsInstance.data) {
      console.log('✅ Cached data available:', Object.keys(window.timeAnalyticsInstance.data));
    } else {
      console.log('❌ No cached data available');
    }
    
    // Test chrome.runtime.sendMessage
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        console.log('Testing runtime message...');
        const response = await chrome.runtime.sendMessage({ action: 'getTimeStats' });
        console.log('Runtime response:', response);
      } catch (error) {
        console.log('Runtime message failed:', error);
      }
    }
    
    // Test chrome.storage.local
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        console.log('Testing storage access...');
        const result = await chrome.storage.local.get(['timeTracking', 'dailyStats']);
        console.log('Storage data available:', !!result.timeTracking || !!result.dailyStats);
      } catch (error) {
        console.log('Storage access failed:', error);
      }
    }
    
    // Test blob creation
    const testData = { test: 'data', timestamp: Date.now() };
    const blob = new Blob([JSON.stringify(testData)], { type: 'application/json' });
    console.log('Blob created successfully:', blob.size, 'bytes');
    
    // Test URL creation
    const url = URL.createObjectURL(blob);
    console.log('URL created:', url);
    URL.revokeObjectURL(url);
    
    console.log('=== DEBUG EXPORT END ===');
    
    // Show results
    showDebugResults();
  } catch (error) {
    console.error('❌ Debug error:', error);
    alert(`❌ Debug failed: ${error.message}`);
  }
}

function showDebugResults() {
  const hasChrome = typeof chrome !== 'undefined';
  const hasRuntime = hasChrome && !!chrome.runtime;
  const hasStorage = hasChrome && !!chrome.storage;
  const hasCachedData = window.timeAnalyticsInstance && window.timeAnalyticsInstance.data;
  
  const debugInfo = `
Debug Results:
✅ Chrome API: ${hasChrome ? 'Available' : 'Not Available'}
✅ Runtime API: ${hasRuntime ? 'Available' : 'Not Available'}  
✅ Storage API: ${hasStorage ? 'Available' : 'Not Available'}
✅ Cached Data: ${hasCachedData ? 'Available' : 'Not Available'}

${hasCachedData || hasStorage || hasRuntime ? 
  '✅ Export should work with available methods' : 
  '❌ No data access methods available'}
  `;
  
  alert(debugInfo);
}

// Simple export function that copies data to clipboard
async function exportDataSimple() {
  try {
    let dataToExport = null;
    
    // Get data from analytics instance
    if (window.timeAnalyticsInstance && window.timeAnalyticsInstance.data) {
      dataToExport = window.timeAnalyticsInstance.data;
    }
    
    if (dataToExport) {
      const exportData = {
        exportDate: new Date().toISOString(),
        extensionName: 'Smart Tabs',
        version: '1.0.0',
        author: 'Ankit Biswas',
        ...dataToExport
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      
      // Try to copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(dataStr);
        showCopySuccess();
      } else {
        // Fallback: show data in a text area for manual copying
        showDataModal(dataStr);
      }
    } else {
      throw new Error('No data available to export');
    }
  } catch (error) {
    console.error('Error copying data:', error);
    showExportError(`Copy failed: ${error.message}`);
  }
}

function showCopySuccess() {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  successDiv.textContent = '✅ Data copied to clipboard!';
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    if (document.body.contains(successDiv)) {
      document.body.removeChild(successDiv);
    }
  }, 3000);
}

function showDataModal(dataStr) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  `;
  
  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #2d2d2d;
    border: 1px solid #404040;
    border-radius: 15px;
    padding: 30px;
    max-width: 600px;
    max-height: 70vh;
    color: white;
    overflow: auto;
  `;
  
  modal.innerHTML = `
    <h3 style="margin-bottom: 15px;">Export Data</h3>
    <p style="margin-bottom: 15px; opacity: 0.8;">Copy the data below and save it to a file:</p>
    <textarea style="
      width: 100%;
      height: 300px;
      background: #1a1a1a;
      color: white;
      border: 1px solid #404040;
      border-radius: 8px;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      resize: vertical;
    " readonly>${dataStr}</textarea>
    <div style="margin-top: 15px; text-align: center;">
      <button onclick="this.closest('.modal-overlay').remove()" style="
        background: #404040;
        color: white;
        border: 1px solid #555555;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
      ">Close</button>
    </div>
  `;
  
  overlay.className = 'modal-overlay';
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Select all text in textarea
  const textarea = modal.querySelector('textarea');
  textarea.focus();
  textarea.select();
  
  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };
}

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.timeAnalyticsInstance = new TimeAnalytics();
  
  // Add event listeners for buttons
  const backBtn = document.getElementById('backBtn');
  const exportBtn = document.getElementById('exportBtn');
  const copyBtn = document.getElementById('copyBtn');
  const debugBtn = document.getElementById('debugBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.close();
    });
  }
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }
  
  if (copyBtn) {
    copyBtn.addEventListener('click', exportDataSimple);
  }
  
  if (debugBtn) {
    debugBtn.addEventListener('click', debugExport);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetData);
  }
  
  // Floating button and menu functionality
  const floatingBtn = document.getElementById('floatingBtn');
  const floatingMenu = document.getElementById('floatingMenu');
  const quickExportBtn = document.getElementById('quickExportBtn');
  const focusModeBtn = document.getElementById('focusModeBtn');
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  const backToPopupBtn = document.getElementById('backToPopupBtn');
  
  let isMenuOpen = false;
  
  if (floatingBtn) {
    floatingBtn.addEventListener('click', () => {
      isMenuOpen = !isMenuOpen;
      floatingMenu.classList.toggle('active', isMenuOpen);
      floatingBtn.style.transform = isMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)';
    });
  }
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!floatingBtn.contains(e.target) && !floatingMenu.contains(e.target)) {
      isMenuOpen = false;
      floatingMenu.classList.remove('active');
      floatingBtn.style.transform = 'rotate(0deg)';
    }
  });
  
  // Floating menu actions
  if (quickExportBtn) {
    quickExportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      exportDataSimple();
      isMenuOpen = false;
      floatingMenu.classList.remove('active');
      floatingBtn.style.transform = 'rotate(0deg)';
    });
  }
  
  if (focusModeBtn) {
    focusModeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await chrome.runtime.sendMessage({ action: 'toggleFocusMode' });
        showNotification('Focus mode toggled!', 'success');
      } catch (error) {
        showNotification('Failed to toggle focus mode', 'error');
      }
      isMenuOpen = false;
      floatingMenu.classList.remove('active');
      floatingBtn.style.transform = 'rotate(0deg)';
    });
  }
  
  if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.timeAnalyticsInstance.loadData();
      window.timeAnalyticsInstance.updateDisplay();
      showNotification('Data refreshed!', 'success');
      isMenuOpen = false;
      floatingMenu.classList.remove('active');
      floatingBtn.style.transform = 'rotate(0deg)';
    });
  }
  
  if (backToPopupBtn) {
    backToPopupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.close();
    });
  }
});

// Notification function for floating menu actions
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-family: 'Google Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    transform: translateX(100%);
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#FF5722' : '#2196F3'};
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
  }, 3000);
}

// Background Service Worker
class SmartTabManager {
  constructor() {
    this.focusMode = false;
    this.hiddenTabs = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.initializeStorage();
    this.migrateDomainData(); // Normalize existing domain data
    this.startProductivityTracking();
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

  // Migrate existing data to use normalized domains
  async migrateDomainData() {
    try {
      const result = await chrome.storage.local.get(['timeTracking', 'domainCategories']);
      let timeTracking = result.timeTracking || {};
      let domainCategories = result.domainCategories || {};
      let hasChanges = false;

      // Migrate timeTracking data
      const normalizedTimeTracking = {};
      for (const [domain, data] of Object.entries(timeTracking)) {
        const normalizedDomain = this.normalizeDomain(domain);
        
        if (normalizedDomain !== domain) {
          hasChanges = true;
          console.log(`Migrating domain: ${domain} -> ${normalizedDomain}`);
        }
        
        if (normalizedTimeTracking[normalizedDomain]) {
          // Merge data for domains that normalize to the same value
          normalizedTimeTracking[normalizedDomain].totalTime += data.totalTime || 0;
          normalizedTimeTracking[normalizedDomain].visitCount += data.visitCount || 0;
          normalizedTimeTracking[normalizedDomain].lastVisit = Math.max(
            normalizedTimeTracking[normalizedDomain].lastVisit || 0,
            data.lastVisit || 0
          );
          
          // Merge URLs
          if (data.urls) {
            normalizedTimeTracking[normalizedDomain].urls = {
              ...normalizedTimeTracking[normalizedDomain].urls,
              ...data.urls
            };
          }
        } else {
          normalizedTimeTracking[normalizedDomain] = { ...data };
        }
      }

      // Migrate domainCategories data
      const normalizedCategories = {};
      for (const [domain, category] of Object.entries(domainCategories)) {
        const normalizedDomain = this.normalizeDomain(domain);
        
        if (normalizedDomain !== domain) {
          hasChanges = true;
          console.log(`Migrating category: ${domain} -> ${normalizedDomain} (${category})`);
        }
        
        // Keep the most recent categorization if there are conflicts
        if (!normalizedCategories[normalizedDomain] || normalizedDomain !== domain) {
          normalizedCategories[normalizedDomain] = category;
        }
      }

      if (hasChanges) {
        console.log('Saving migrated domain data...');
        await chrome.storage.local.set({
          timeTracking: normalizedTimeTracking,
          domainCategories: normalizedCategories
        });
        console.log('Domain migration completed');
      }
    } catch (error) {
      console.error('Error migrating domain data:', error);
    }
  }

  bindEvents() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Listen for keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });

    // Track tab activity for productivity metrics
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.trackTabActivity(activeInfo.tabId);
    });

    // Auto-group new tabs
    chrome.tabs.onCreated.addListener((tab) => {
      setTimeout(() => this.autoGroupNewTab(tab), 1000);
    });
  }

  async initializeStorage() {
    const result = await chrome.storage.local.get(['productivity', 'tabActivity', 'timeTracking', 'dailyStats', 'domainCategories']);
    if (!result.productivity) {
      await chrome.storage.local.set({ productivity: 75 });
    }
    if (!result.tabActivity) {
      await chrome.storage.local.set({ tabActivity: {} });
    }
    if (!result.timeTracking) {
      await chrome.storage.local.set({ timeTracking: {} });
    }
    if (!result.dailyStats) {
      await chrome.storage.local.set({ dailyStats: {} });
    }
    if (!result.domainCategories) {
      await chrome.storage.local.set({ domainCategories: {} });
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'autoGroupTabs':
          await this.autoGroupAllTabs();
          sendResponse({ success: true });
          break;
        case 'closeDuplicates':
          await this.closeDuplicateTabs();
          sendResponse({ success: true });
          break;
        case 'suspendUnused':
          await this.suspendUnusedTabs();
          sendResponse({ success: true });
          break;
        case 'toggleFocusMode':
          await this.toggleFocusMode();
          sendResponse({ success: true });
          break;
        case 'saveSession':
          await this.quickSaveSession();
          sendResponse({ success: true });
          break;
        case 'recordTimeSpent':
          await this.recordTimeSpent(request.data);
          sendResponse({ success: true });
          break;
        case 'getTimeStats':
          const stats = await this.getTimeStats();
          sendResponse({ success: true, data: stats });
          break;
        case 'resetTimeStats':
          await this.resetTimeStats();
          sendResponse({ success: true });
          break;
        case 'openAnalytics':
          chrome.tabs.create({
            url: chrome.runtime.getURL('analytics.html')
          });
          sendResponse({ success: true });
          break;
        case 'openCategorySettings':
          console.log('Opening category settings page...');
          try {
            const tab = await chrome.tabs.create({
              url: chrome.runtime.getURL('category-settings.html')
            });
            console.log('Category settings tab created:', tab.id);
            sendResponse({ success: true });
          } catch (error) {
            console.error('Error opening category settings:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'reanalyzeFromCategories':
          await this.reanalyzeFromCategories(request.data);
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleCommand(command) {
    switch (command) {
      case 'toggle-focus-mode':
        await this.toggleFocusMode();
        break;
      case 'save-session':
        await this.quickSaveSession();
        break;
      case 'auto-group-tabs':
        await this.autoGroupAllTabs();
        break;
    }
  }

  async autoGroupAllTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const groups = {};

      // Group tabs by domain
      for (const tab of tabs) {
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          continue;
        }

        try {
          const url = new URL(tab.url);
          const domain = this.normalizeDomain(url.hostname);
          
          if (!groups[domain]) {
            groups[domain] = [];
          }
          groups[domain].push(tab.id);
        } catch (error) {
          console.error('Error parsing URL:', tab.url);
        }
      }

      // Create groups for domains with multiple tabs
      for (const [domain, tabIds] of Object.entries(groups)) {
        if (tabIds.length > 1) {
          const groupId = await chrome.tabs.group({ tabIds });
          await chrome.tabGroups.update(groupId, {
            title: this.getDomainDisplayName(domain),
            color: this.getGroupColor(domain)
          });
        }
      }

      this.showNotification('Tabs auto-grouped by domain!');
    } catch (error) {
      console.error('Error auto-grouping tabs:', error);
    }
  }

  async closeDuplicateTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const urlMap = new Map();
      const duplicates = [];

      for (const tab of tabs) {
        if (urlMap.has(tab.url)) {
          duplicates.push(tab.id);
        } else {
          urlMap.set(tab.url, tab.id);
        }
      }

      if (duplicates.length > 0) {
        await chrome.tabs.remove(duplicates);
        this.showNotification(`Closed ${duplicates.length} duplicate tabs!`);
      } else {
        this.showNotification('No duplicate tabs found!');
      }
    } catch (error) {
      console.error('Error closing duplicates:', error);
    }
  }

  async suspendUnusedTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const activeTabId = (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id;
      const result = await chrome.storage.local.get(['tabActivity']);
      const tabActivity = result.tabActivity || {};
      
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      let suspendedCount = 0;

      for (const tab of tabs) {
        if (tab.id === activeTabId || tab.pinned) continue;
        
        const lastActivity = tabActivity[tab.id] || 0;
        if (now - lastActivity > oneHour) {
          // Instead of actually suspending, we'll just reload the tab to free memory
          chrome.tabs.reload(tab.id);
          suspendedCount++;
        }
      }

      this.showNotification(`Refreshed ${suspendedCount} unused tabs!`);
    } catch (error) {
      console.error('Error suspending tabs:', error);
    }
  }

  async toggleFocusMode() {
    try {
      this.focusMode = !this.focusMode;
      
      if (this.focusMode) {
        const tabs = await chrome.tabs.query({});
        const activeTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
        
        this.hiddenTabs = tabs.filter(tab => 
          tab.id !== activeTab.id && 
          !tab.pinned &&
          !tab.url.startsWith('chrome://')
        );
        
        // Move non-essential tabs to a new window (hidden)
        if (this.hiddenTabs.length > 0) {
          const hiddenWindow = await chrome.windows.create({
            focused: false,
            state: 'minimized'
          });
          
          await chrome.tabs.move(
            this.hiddenTabs.map(tab => tab.id),
            { windowId: hiddenWindow.id, index: -1 }
          );
        }
        
        this.showNotification('Focus Mode: ON - Distractions hidden!');
      } else {
        // Restore hidden tabs
        if (this.hiddenTabs.length > 0) {
          const currentWindow = await chrome.windows.getCurrent();
          await chrome.tabs.move(
            this.hiddenTabs.map(tab => tab.id),
            { windowId: currentWindow.id, index: -1 }
          );
        }
        
        this.hiddenTabs = [];
        this.showNotification('Focus Mode: OFF - All tabs restored!');
      }
    } catch (error) {
      console.error('Error toggling focus mode:', error);
    }
  }

  async quickSaveSession() {
    try {
      const tabs = await chrome.tabs.query({});
      const sessionName = `Quick Save ${new Date().toLocaleTimeString()}`;
      
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
      
      if (sessions.length > 10) {
        sessions.splice(10);
      }
      
      await chrome.storage.local.set({ savedSessions: sessions });
      this.showNotification('Session saved successfully!');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  async trackTabActivity(tabId) {
    const result = await chrome.storage.local.get(['tabActivity']);
    const tabActivity = result.tabActivity || {};
    tabActivity[tabId] = Date.now();
    await chrome.storage.local.set({ tabActivity });
  }

  async recordTimeSpent(data) {
    try {
      const { url, domain, title, timeSpent, timestamp } = data;
      const today = new Date().toDateString();
      
      // Get current time tracking data
      const result = await chrome.storage.local.get(['timeTracking', 'dailyStats']);
      const timeTracking = result.timeTracking || {};
      const dailyStats = result.dailyStats || {};
      
      // Initialize domain tracking if not exists
      if (!timeTracking[domain]) {
        timeTracking[domain] = {
          totalTime: 0,
          visitCount: 0,
          lastVisit: timestamp,
          category: await this.categorizeWebsite(domain),
          urls: {}
        };
      }
      
      // Update domain stats
      timeTracking[domain].totalTime += timeSpent;
      timeTracking[domain].visitCount += 1;
      timeTracking[domain].lastVisit = timestamp;
      
      // Track specific URL
      if (!timeTracking[domain].urls[url]) {
        timeTracking[domain].urls[url] = {
          title: title,
          totalTime: 0,
          visitCount: 0
        };
      }
      timeTracking[domain].urls[url].totalTime += timeSpent;
      timeTracking[domain].urls[url].visitCount += 1;
      
      // Update daily stats
      if (!dailyStats[today]) {
        dailyStats[today] = {
          totalTime: 0,
          domains: {},
          productive: 0,
          neutral: 0,
          distracting: 0
        };
      }
      
      dailyStats[today].totalTime += timeSpent;
      if (!dailyStats[today].domains[domain]) {
        dailyStats[today].domains[domain] = 0;
      }
      dailyStats[today].domains[domain] += timeSpent;
      
      // Categorize time
      const category = timeTracking[domain].category;
      dailyStats[today][category] += timeSpent;
      
      // Save updated data
      await chrome.storage.local.set({ timeTracking, dailyStats });
      
      // Clean old data (keep last 30 days)
      await this.cleanOldTimeData(dailyStats);
    } catch (error) {
      console.error('Error recording time spent:', error);
    }
  }

  async getTimeStats() {
    try {
      const result = await chrome.storage.local.get(['timeTracking', 'dailyStats']);
      const timeTracking = result.timeTracking || {};
      const dailyStats = result.dailyStats || {};
      
      const today = new Date().toDateString();
      const todayStats = dailyStats[today] || { totalTime: 0, productive: 0, neutral: 0, distracting: 0 };
      
      // Get top domains for today
      const topDomains = Object.entries(timeTracking)
        .sort(([,a], [,b]) => b.totalTime - a.totalTime)
        .slice(0, 10)
        .map(([domain, data]) => ({
          domain,
          totalTime: data.totalTime,
          todayTime: dailyStats[today]?.domains[domain] || 0,
          category: data.category,
          visitCount: data.visitCount
        }));
      
      // Calculate weekly stats
      const weekStats = this.getWeeklyStats(dailyStats);
      
      return {
        today: todayStats,
        topDomains,
        weekStats,
        totalDomains: Object.keys(timeTracking).length
      };
    } catch (error) {
      console.error('Error getting time stats:', error);
      return null;
    }
  }

  async categorizeWebsite(domain) {
    try {
      // Normalize the domain first
      const normalizedDomain = this.normalizeDomain(domain);
      
      // First check if domain has been manually categorized
      const result = await chrome.storage.local.get(['domainCategories']);
      const domainCategories = result.domainCategories || {};
      
      if (domainCategories[normalizedDomain]) {
        return domainCategories[normalizedDomain];
      }
      
      // Fallback to keyword-based categorization
      const productiveKeywords = [
        'github', 'stackoverflow', 'dev.to', 'medium', 'docs.', 'documentation',
        'learn', 'tutorial', 'course', 'education', 'wiki', 'research'
      ];
      
      const distractingKeywords = [
        'facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'netflix',
        'reddit', 'gaming', 'entertainment', 'social', 'news', 'sport'
      ];
      
      const domainLower = normalizedDomain.toLowerCase();
      
      if (productiveKeywords.some(keyword => domainLower.includes(keyword))) {
        return 'productive';
      }
      
      if (distractingKeywords.some(keyword => domainLower.includes(keyword))) {
        return 'distracting';
      }
      
      return 'neutral';
    } catch (error) {
      console.error('Error categorizing website:', error);
      return 'neutral';
    }
  }

  getWeeklyStats(dailyStats) {
    const today = new Date();
    const weeklyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      const dayStats = dailyStats[dateStr] || { totalTime: 0, productive: 0, neutral: 0, distracting: 0 };
      weeklyData.push({
        date: dateStr,
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        ...dayStats
      });
    }
    
    return weeklyData;
  }

  async cleanOldTimeData(dailyStats) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const updatedStats = {};
    for (const [dateStr, stats] of Object.entries(dailyStats)) {
      const date = new Date(dateStr);
      if (date >= thirtyDaysAgo) {
        updatedStats[dateStr] = stats;
      }
    }
    
    await chrome.storage.local.set({ dailyStats: updatedStats });
  }

  async resetTimeStats() {
    await chrome.storage.local.set({ 
      timeTracking: {}, 
      dailyStats: {} 
    });
  }

  async reanalyzeFromCategories(domainCategories) {
    try {
      console.log('Reanalyzing categories for domains:', Object.keys(domainCategories));
      
      const result = await chrome.storage.local.get(['timeTracking', 'dailyStats', 'domainCategories']);
      const timeTracking = result.timeTracking || {};
      const dailyStats = result.dailyStats || {};
      
      // First, save the new domain categories
      await chrome.storage.local.set({ domainCategories: domainCategories });
      
      // Update categories for all tracked domains
      for (const [domain, data] of Object.entries(timeTracking)) {
        const newCategory = domainCategories[domain] || await this.categorizeWebsite(domain);
        console.log(`Updating ${domain} from ${data.category} to ${newCategory}`);
        timeTracking[domain].category = newCategory;
      }
      
      // Also create entries for newly categorized domains that might not have time tracking yet
      for (const [domain, category] of Object.entries(domainCategories)) {
        if (!timeTracking[domain]) {
          console.log(`Creating new tracking entry for ${domain} as ${category}`);
          timeTracking[domain] = {
            totalTime: 0,
            visitCount: 0,
            lastVisit: Date.now(),
            category: category,
            urls: {}
          };
        }
      }
      
      // Recalculate daily stats
      for (const [date, dayStats] of Object.entries(dailyStats)) {
        const newDayStats = {
          totalTime: dayStats.totalTime,
          domains: dayStats.domains || {},
          productive: 0,
          neutral: 0,
          distracting: 0
        };
        
        // Recalculate category totals for this day
        for (const [domain, timeSpent] of Object.entries(dayStats.domains || {})) {
          if (timeTracking[domain]) {
            const category = timeTracking[domain].category;
            newDayStats[category] += timeSpent;
          }
        }
        
        dailyStats[date] = newDayStats;
      }
      
      // Save updated data
      await chrome.storage.local.set({ timeTracking, dailyStats });
      
      console.log('Reanalysis complete. Updated tracking data for', Object.keys(timeTracking).length, 'domains');
      
      // Notify analytics pages
      this.notifyAnalyticsUpdate();
    } catch (error) {
      console.error('Error reanalyzing from categories:', error);
      throw error;
    }
  }

  notifyAnalyticsUpdate() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('analytics.html') || tab.url.includes('category-settings.html'))) {
          chrome.tabs.sendMessage(tab.id, { action: 'dataUpdated' }).catch(() => {
            // Page might not have content script, ignore error
          });
        }
      });
    });
  }

  async autoGroupNewTab(tab) {
    try {
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        return;
      }

      const url = new URL(tab.url);
      const domain = this.normalizeDomain(url.hostname);
      
      // Find existing group for this domain
      const groups = await chrome.tabGroups.query({});
      const existingGroup = groups.find(group => 
        group.title && group.title.toLowerCase() === this.getDomainDisplayName(domain).toLowerCase()
      );
      
      if (existingGroup) {
        await chrome.tabs.group({ tabIds: [tab.id], groupId: existingGroup.id });
      }
    } catch (error) {
      console.error('Error auto-grouping new tab:', error);
    }
  }

  startProductivityTracking() {
    setInterval(async () => {
      try {
        const tabs = await chrome.tabs.query({});
        const result = await chrome.storage.local.get(['tabActivity']);
        const tabActivity = result.tabActivity || {};
        
        const now = Date.now();
        const activeRecentTabs = Object.values(tabActivity).filter(time => 
          now - time < 30 * 60 * 1000 // Active in last 30 minutes
        ).length;
        
        const productivity = Math.min(100, Math.max(0, 
          100 - (tabs.length - activeRecentTabs) * 2
        ));
        
        await chrome.storage.local.set({ productivity });
      } catch (error) {
        console.error('Error tracking productivity:', error);
      }
    }, 5 * 60 * 1000); // Update every 5 minutes
  }

  getDomainDisplayName(domain) {
    const displayNames = {
      
    };
    
    return displayNames[domain] || domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  getGroupColor(domain) {
    const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
    const hash = domain.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  showNotification(message) {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Smart Tabs',
        message: message
      });
    }
  }
}

// Initialize the extension
new SmartTabManager();

// Category Settings with Drag & Drop
class CategoryManager {
  constructor() {
    console.log('CategoryManager constructor called');
    this.domains = [];
    this.categories = {
      productive: [],
      neutral: [],
      distracting: []
    };
    this.domainCategories = {};
    this.filteredDomains = [];
    this.init();
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

  // Get favicon URL for a domain
  getFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }

  // Get domain title/name from a well-known domain or format it nicely
  getDomainTitle(domain) {
    const wellKnownDomains = {
      'google.com': 'Google',
      'youtube.com': 'YouTube',
      'facebook.com': 'Facebook',
      'twitter.com': 'Twitter (X)',
      'instagram.com': 'Instagram',
      'linkedin.com': 'LinkedIn',
      'github.com': 'GitHub',
      'stackoverflow.com': 'Stack Overflow',
      'reddit.com': 'Reddit',
      'wikipedia.org': 'Wikipedia',
      'amazon.com': 'Amazon',
      'netflix.com': 'Netflix',
      'spotify.com': 'Spotify',
      'microsoft.com': 'Microsoft',
      'apple.com': 'Apple',
      'medium.com': 'Medium',
      'dev.to': 'DEV Community',
      'codepen.io': 'CodePen',
      'dribbble.com': 'Dribbble',
      'behance.net': 'Behance',
      'figma.com': 'Figma',
      'notion.so': 'Notion',
      'slack.com': 'Slack',
      'discord.com': 'Discord',
      'zoom.us': 'Zoom',
      'teams.microsoft.com': 'Microsoft Teams',
      'gmail.com': 'Gmail',
      'outlook.com': 'Outlook',
      'drive.google.com': 'Google Drive',
      'dropbox.com': 'Dropbox',
      'twitch.tv': 'Twitch',
      'tiktok.com': 'TikTok',
      'pinterest.com': 'Pinterest',
      'snapchat.com': 'Snapchat',
      'whatsapp.com': 'WhatsApp'
    };

    if (wellKnownDomains[domain]) {
      return wellKnownDomains[domain];
    }

    // Format domain name nicely (capitalize first letter, remove .com/.org etc)
    let title = domain.split('.')[0];
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Get domain favicon letter fallback
  getDomainFallbackIcon(domain) {
    return domain.charAt(0).toUpperCase();
  }

  async init() {
    console.log('CategoryManager init called');
    try {
      await this.loadExistingCategories();
      this.bindEvents();
      this.setupDragAndDrop();
      
      // Auto-load browsing history on initialization
      await this.loadBrowsingHistory();
      
      console.log('CategoryManager initialized successfully');
    } catch (error) {
      console.error('Error during CategoryManager init:', error);
    }
  }

  async loadExistingCategories() {
    try {
      const result = await chrome.storage.local.get(['domainCategories']);
      this.domainCategories = result.domainCategories || {};
    } catch (error) {
      console.error('Error loading existing categories:', error);
    }
  }

  bindEvents() {
    // Control buttons
    document.getElementById('loadHistoryBtn').addEventListener('click', () => {
      this.loadBrowsingHistory();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.showResetConfirmation();
    });

    document.getElementById('backBtn').addEventListener('click', () => {
      window.close();
    });

    // Modal events
    document.getElementById('confirmReset').addEventListener('click', () => {
      this.hideResetConfirmation();
      this.resetCategories();
    });

    document.getElementById('cancelReset').addEventListener('click', () => {
      this.hideResetConfirmation();
    });

    // Close modal when clicking overlay
    document.getElementById('confirmModal').addEventListener('click', (e) => {
      if (e.target.id === 'confirmModal') {
        this.hideResetConfirmation();
      }
    });

    // Search and filter
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filterDomains(e.target.value);
    });

    document.getElementById('sortSelect').addEventListener('change', (e) => {
      this.sortDomains(e.target.value);
    });

    document.getElementById('periodSelect').addEventListener('change', () => {
      this.loadBrowsingHistory();
    });
  }

  async loadBrowsingHistory() {
    try {
      console.log('Loading browsing history...');
      this.showLoading();
      
      // Check if we're in a valid extension context
      if (typeof chrome === 'undefined') {
        throw new Error('Chrome APIs not available - please run as extension');
      }
      
      // Check if history permission is available
      if (!chrome.history) {
        throw new Error('History API not available - please check permissions');
      }
      
      const periodDays = parseInt(document.getElementById('periodSelect').value);
      const startTime = Date.now() - (periodDays * 24 * 60 * 60 * 1000);
      
      console.log('Searching history from:', new Date(startTime));
      console.log('Period days:', periodDays);
      
      // Show initial feedback
      this.showNotification('Loading browsing history...', 'info');
      
      // Get browsing history
      const historyItems = await chrome.history.search({
        text: '',
        startTime: startTime,
        maxResults: 10000
      });

      console.log('Found history items:', historyItems.length);

      if (historyItems.length === 0) {
        throw new Error('No browsing history found for the selected time period');
      }

      // Process domains
      const domainData = {};
      let processedCount = 0;
      let skippedCount = 0;
      
      for (const item of historyItems) {
        try {
          const url = new URL(item.url);
          const domain = this.normalizeDomain(url.hostname);
          
          // Skip chrome:// and extension URLs
          if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
            skippedCount++;
            continue;
          }
          
          // Skip empty domains
          if (!domain || domain.length < 2) {
            skippedCount++;
            continue;
          }
          
          if (!domainData[domain]) {
            domainData[domain] = {
              domain,
              visits: 0,
              totalTime: 0,
              lastVisit: 0,
              urls: []
            };
          }
          
          domainData[domain].visits += item.visitCount || 1;
          domainData[domain].lastVisit = Math.max(domainData[domain].lastVisit, item.lastVisitTime || 0);
          domainData[domain].urls.push(item.url);
          processedCount++;
        } catch (error) {
          // Skip invalid URLs
          skippedCount++;
          continue;
        }
      }

      console.log('Processed domains:', Object.keys(domainData).length);
      console.log('Processed URLs:', processedCount);
      console.log('Skipped URLs:', skippedCount);

      if (Object.keys(domainData).length === 0) {
        throw new Error('No valid domains found in browsing history');
      }

      // Convert to array and add time estimates
      this.domains = Object.values(domainData).map(domain => {
        // Estimate time spent based on visits (rough calculation)
        domain.totalTime = domain.visits * 120; // Assume 2 minutes per visit
        
        // Determine category
        domain.category = this.getDomainCategory(domain.domain);
        
        return domain;
      });

      // Filter out domains with very low activity
      const beforeFilter = this.domains.length;
      this.domains = this.domains.filter(domain => domain.visits >= 2);
      const afterFilter = this.domains.length;

      console.log('Final domains after filtering:', afterFilter, '(filtered out', beforeFilter - afterFilter, 'low-activity domains)');

      if (this.domains.length === 0) {
        throw new Error('No domains with sufficient activity found (minimum 2 visits required)');
      }

      this.categorizeDomainsInitially();
      this.renderDomains();
      this.updateStats();
      
      this.showNotification(`Successfully loaded ${this.domains.length} domains from browsing history!`, 'success');
      
    } catch (error) {
      console.error('Error loading browsing history:', error);
      this.showNotification('Error loading browsing history: ' + error.message, 'error');
      
      // Provide fallback with sample data
      console.log('Loading sample data as fallback...');
      this.loadSampleData();
    }
  }

  loadSampleData() {
    console.log('Loading sample data...');
    this.domains = [
      { domain: 'github.com', visits: 25, totalTime: 3000, category: 'productive', lastVisit: Date.now() },
      { domain: 'stackoverflow.com', visits: 15, totalTime: 1800, category: 'productive', lastVisit: Date.now() },
      { domain: 'youtube.com', visits: 30, totalTime: 3600, category: 'distracting', lastVisit: Date.now() },
      { domain: 'facebook.com', visits: 20, totalTime: 2400, category: 'distracting', lastVisit: Date.now() },
      { domain: 'google.com', visits: 40, totalTime: 1200, category: 'neutral', lastVisit: Date.now() },
      { domain: 'medium.com', visits: 10, totalTime: 1200, category: 'productive', lastVisit: Date.now() }
    ];
    
    this.categorizeDomainsInitially();
    this.renderDomains();
    this.updateStats();
    
    this.showNotification('Loaded sample data for demonstration', 'success');
  }

  getDomainCategory(domain) {
    // Check if domain is already categorized
    if (this.domainCategories[domain]) {
      return this.domainCategories[domain];
    }

    // Default categorization logic
    const domainLower = domain.toLowerCase();
    
    const productiveKeywords = [
      'github', 'stackoverflow', 'dev.to', 'medium', 'docs', 'documentation',
      'learn', 'tutorial', 'course', 'education', 'wiki', 'research', 'office',
      'drive.google', 'gmail', 'outlook', 'teams', 'slack', 'notion', 'trello'
    ];
    
    const distractingKeywords = [
      'facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'netflix',
      'reddit', 'gaming', 'entertainment', 'social', 'news', 'sport', 'twitch',
      'discord', 'whatsapp', 'telegram', 'snapchat', 'pinterest'
    ];
    
    if (productiveKeywords.some(keyword => domainLower.includes(keyword))) {
      return 'productive';
    }
    
    if (distractingKeywords.some(keyword => domainLower.includes(keyword))) {
      return 'distracting';
    }
    
    return 'neutral';
  }

  categorizeDomainsInitially() {
    this.categories = {
      productive: [],
      neutral: [],
      distracting: []
    };

    this.domains.forEach(domain => {
      this.categories[domain.category].push(domain);
    });
  }

  setupDragAndDrop() {
    // Make domain items draggable
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('domain-item')) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.domain);
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('domain-item')) {
        e.target.classList.remove('dragging');
      }
    });

    // Setup drop zones
    document.querySelectorAll('.category-column').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        column.classList.add('drag-over');
      });

      column.addEventListener('dragleave', (e) => {
        if (!column.contains(e.relatedTarget)) {
          column.classList.remove('drag-over');
        }
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        
        const domainName = e.dataTransfer.getData('text/plain');
        const newCategory = column.dataset.category;
        
        this.moveDomain(domainName, newCategory);
      });
    });
  }

  moveDomain(domainName, newCategory) {
    console.log(`Moving ${domainName} to ${newCategory}`);
    
    // Find and move domain between categories
    let domain = null;
    let oldCategory = null;
    
    for (const category in this.categories) {
      const index = this.categories[category].findIndex(d => d.domain === domainName);
      if (index !== -1) {
        domain = this.categories[category].splice(index, 1)[0];
        oldCategory = category;
        break;
      }
    }
    
    if (domain) {
      domain.category = newCategory;
      this.categories[newCategory].push(domain);
      this.domainCategories[domainName] = newCategory;
      
      this.renderDomains();
      this.updateStats();
      this.showNotification(`${domainName} moved from ${oldCategory} to ${newCategory}`);
      
      // Auto-save the changes
      this.autoSaveCategories();
    }
  }

  async autoSaveCategories() {
    try {
      console.log('Auto-saving categories...', this.domainCategories);
      
      // Save domain categories
      await chrome.storage.local.set({ domainCategories: this.domainCategories });
      
      // Trigger reanalysis in background script
      await chrome.runtime.sendMessage({ action: 'reanalyzeFromCategories', data: this.domainCategories });
      
      console.log('Auto-save completed');
    } catch (error) {
      console.error('Error auto-saving categories:', error);
    }
  }

  renderDomains() {
    this.filteredDomains = [...this.domains];
    this.applySorting();
    this.applyFiltering();
    
    for (const category in this.categories) {
      this.renderCategoryDomains(category);
    }
  }

  renderCategoryDomains(category) {
    const container = document.getElementById(`${category}List`);
    const domainsInCategory = this.filteredDomains.filter(d => d.category === category);
    
    if (domainsInCategory.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${this.getCategoryIcon(category)}</div>
          <div>No domains in this category</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = domainsInCategory.map(domain => `
      <div class="domain-item ${category}" 
           draggable="true" 
           data-domain="${domain.domain}">
        <div class="domain-favicon">
          <img src="${this.getFaviconUrl(domain.domain)}" 
               alt="${domain.domain}" 
               onerror="this.style.display='none'; this.parentNode.textContent='${this.getDomainFallbackIcon(domain.domain)}';">
        </div>
        <div class="domain-content">
          <div class="domain-name">${domain.domain}</div>
          <div class="domain-title">${this.getDomainTitle(domain.domain)}</div>
          <div class="domain-info">
            <span class="domain-visits">${domain.visits} visits</span>
            <span class="domain-time">${this.formatTime(domain.totalTime)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  getCategoryIcon(category) {
    const icons = {
      productive: '✅',
      neutral: '⚪',
      distracting: '❌'
    };
    return icons[category] || '⚪';
  }

  applySorting() {
    const sortBy = document.getElementById('sortSelect').value;
    
    this.filteredDomains.sort((a, b) => {
      switch (sortBy) {
        case 'visits':
          return b.visits - a.visits;
        case 'time':
          return b.totalTime - a.totalTime;
        case 'alphabetical':
          return a.domain.localeCompare(b.domain);
        case 'recent':
          return b.lastVisit - a.lastVisit;
        default:
          return 0;
      }
    });
  }

  applyFiltering() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
      this.filteredDomains = this.filteredDomains.filter(domain => 
        domain.domain.toLowerCase().includes(searchTerm)
      );
    }
  }

  filterDomains(searchTerm) {
    this.renderDomains();
  }

  sortDomains(sortBy) {
    this.renderDomains();
  }

  updateStats() {
    document.getElementById('totalDomains').textContent = this.domains.length;
    document.getElementById('productiveCount').textContent = this.categories.productive.length;
    document.getElementById('neutralCount').textContent = this.categories.neutral.length;
    document.getElementById('distractingCount').textContent = this.categories.distracting.length;
  }

  resetCategories() {
    this.domainCategories = {};
    this.domains.forEach(domain => {
      domain.category = this.getDomainCategory(domain.domain);
    });
    this.categorizeDomainsInitially();
    this.renderDomains();
    this.updateStats();
    this.autoSaveCategories();
    this.showNotification('Categories reset to defaults successfully!');
  }

  showResetConfirmation() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('show');
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }

  hideResetConfirmation() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    
    // Restore body scrolling
    document.body.style.overflow = '';
  }

  showLoading() {
    document.querySelectorAll('.domain-list').forEach(list => {
      list.innerHTML = '<div class="loading">Loading domains...</div>';
    });
  }

  showNotification(message, type = 'success') {
    console.log('Showing notification:', message, type);
    const notification = document.getElementById('notification');
    
    if (!notification) {
      console.error('Notification element not found!');
      return;
    }
    
    // Clear any existing timeout
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    
    // Reset classes
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Force reflow to ensure the element is ready
    notification.offsetHeight;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 4 seconds
    this.notificationTimeout = setTimeout(() => {
      notification.classList.remove('show');
    }, 4000);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing CategoryManager...');
  try {
    new CategoryManager();
  } catch (error) {
    console.error('Error creating CategoryManager:', error);
  }
});

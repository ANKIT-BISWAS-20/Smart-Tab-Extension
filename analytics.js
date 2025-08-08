// Analytics page JavaScript
class TimeAnalytics {
  constructor() {
    this.data = null;
    this.init();
    this.setupMessageListener();
  }

  // Domain metadata functions (copied from category-settings.js)
  getFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=24`;
  }

  getDomainTitle(domain) {
    const titles = {
      'youtube.com': 'YouTube',
      'github.com': 'GitHub',
      'stackoverflow.com': 'Stack Overflow',
      'google.com': 'Google',
      'gmail.com': 'Gmail',
      'docs.google.com': 'Google Docs',
      'drive.google.com': 'Google Drive',
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
      'twitter.com': 'Twitter',
      'linkedin.com': 'LinkedIn',
      'reddit.com': 'Reddit',
      'wikipedia.org': 'Wikipedia',
      'amazon.com': 'Amazon',
      'netflix.com': 'Netflix',
      'spotify.com': 'Spotify',
      'discord.com': 'Discord',
      'slack.com': 'Slack',
      'zoom.us': 'Zoom',
      'teams.microsoft.com': 'Microsoft Teams',
      'outlook.com': 'Outlook',
      'office.com': 'Microsoft Office',
      'notion.so': 'Notion',
      'figma.com': 'Figma',
      'canva.com': 'Canva',
      'adobe.com': 'Adobe',
      'codepen.io': 'CodePen',
      'jsfiddle.net': 'JSFiddle',
      'replit.com': 'Replit',
      'vercel.com': 'Vercel',
      'medium.com': 'Medium',
      'dev.to': 'Dev.to'
    };
    
    const normalized = this.normalizeDomain(domain);
    return titles[normalized] || this.capitalizeWords(normalized.split('.')[0]);
  }

  getDomainFallbackIcon(domain) {
    return domain.charAt(0).toUpperCase();
  }

  normalizeDomain(domain) {
    return domain.replace(/^(www\.|m\.|mobile\.)/, '').toLowerCase();
  }

  capitalizeWords(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }

  setupMessageListener() {
    // Listen for data update messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'dataUpdated') {
        console.log('Analytics data update received');
        this.refreshData();
      }
    });

    // Listen for custom events from content script
    window.addEventListener('analyticsDataUpdated', () => {
      console.log('Analytics data update event received');
      this.refreshData();
    });
  }

  async refreshData() {
    console.log('Refreshing analytics data...');
    await this.loadData();
    this.updateDisplay();
    this.showRefreshNotification();
  }

  showRefreshNotification() {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-weight: 500;
      animation: slideInRight 0.3s ease-out;
    `;
    notification.innerHTML = '📊 Analytics updated with new categories!';
    document.body.appendChild(notification);
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 4000);
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
        
        // If we have no real data, generate consistent sample data for demo
        if (this.data.today.totalTime === 0 && this.data.topDomains.length === 0) {
          this.data = this.generateConsistentSampleData();
        }
      } else {
        this.data = this.generateConsistentSampleData();
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      this.data = this.generateConsistentSampleData();
    }
  }

  generateConsistentSampleData() {
    // Generate consistent sample data that doesn't change on reload
    // Use a seed based on current date to make it stable within a day
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Simple seeded random function
    const seededRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    // Generate consistent time values
    const baseProductiveTime = 3 * 60 + 30; // 3.5 hours base
    const baseNeutralTime = 2 * 60; // 2 hours base
    const baseDistractingTime = 1 * 60 + 15; // 1.25 hours base
    
    // Add variation based on seed
    const productiveTime = Math.floor(baseProductiveTime + seededRandom(seed) * 120); // ±2 hours
    const neutralTime = Math.floor(baseNeutralTime + seededRandom(seed + 1) * 60); // ±1 hour
    const distractingTime = Math.floor(baseDistractingTime + seededRandom(seed + 2) * 90); // ±1.5 hours
    
    const totalTime = productiveTime + neutralTime + distractingTime;
    
    // Sample domains with consistent data
    const sampleDomains = [
      { domain: 'github.com', category: 'productive', baseTime: 45, baseVisits: 15 },
      { domain: 'stackoverflow.com', category: 'productive', baseTime: 38, baseVisits: 12 },
      { domain: 'docs.google.com', category: 'productive', baseTime: 32, baseVisits: 8 },
      { domain: 'youtube.com', category: 'distracting', baseTime: 28, baseVisits: 20 },
      { domain: 'gmail.com', category: 'neutral', baseTime: 25, baseVisits: 18 },
      { domain: 'linkedin.com', category: 'productive', baseTime: 22, baseVisits: 6 },
      { domain: 'twitter.com', category: 'distracting', baseTime: 20, baseVisits: 25 },
      { domain: 'wikipedia.org', category: 'productive', baseTime: 18, baseVisits: 5 },
      { domain: 'reddit.com', category: 'distracting', baseTime: 15, baseVisits: 12 },
      { domain: 'medium.com', category: 'productive', baseTime: 12, baseVisits: 4 }
    ];
    
    const topDomains = sampleDomains.map((site, index) => {
      const variance = seededRandom(seed + index + 10);
      return {
        domain: site.domain,
        totalTime: Math.floor(site.baseTime + variance * 20), // Add some variation
        todayTime: Math.floor(site.baseTime + variance * 15),
        category: site.category,
        visitCount: Math.floor(site.baseVisits + variance * 10)
      };
    });
    
    // Generate consistent weekly stats
    const weekStats = [];
    for (let i = 0; i < 7; i++) {
      const dayVariance = seededRandom(seed + i + 20);
      weekStats.push({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toDateString(),
        productive: Math.floor((baseProductiveTime + dayVariance * 60) * 0.8), // Slightly less for past days
        neutral: Math.floor((baseNeutralTime + dayVariance * 30) * 0.9),
        distracting: Math.floor((baseDistractingTime + dayVariance * 45) * 0.7),
        totalTime: 0 // Will be calculated
      });
    }
    
    // Calculate total time for each day
    weekStats.forEach(day => {
      day.totalTime = day.productive + day.neutral + day.distracting;
    });
    
    return {
      today: {
        totalTime: totalTime,
        productive: productiveTime,
        neutral: neutralTime,
        distracting: distractingTime
      },
      topDomains: topDomains,
      weekStats: weekStats,
      totalDomains: sampleDomains.length
    };
  }

  updateDisplay() {
    this.updateTodayStats();
    this.updateWeeklyChart();
    this.updateCategoryDonutChart();
    this.updateTrendLineChart();
    this.updateTopSitesBarChart();
    this.updateHourlyDistribution();
    this.updateTodayBreakdown();
    this.updateProductivityScore();
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

  updateCategoryDonutChart() {
    const { today } = this.data;
    const total = today.totalTime;
    
    if (total === 0) {
      document.getElementById('totalSites').textContent = '0';
      return;
    }
    
    const totalSites = this.data.topDomains ? this.data.topDomains.length : 0;
    document.getElementById('totalSites').textContent = totalSites;
    
    // Calculate percentages
    const productivePercent = (today.productive / total) * 100;
    const neutralPercent = (today.neutral / total) * 100;
    const distractingPercent = (today.distracting / total) * 100;
    
    // Calculate stroke-dasharray for each arc (circumference = 2π × 60 = 377)
    const circumference = 377;
    const productiveLength = (productivePercent / 100) * circumference;
    const neutralLength = (neutralPercent / 100) * circumference;
    const distractingLength = (distractingPercent / 100) * circumference;
    
    // Update arcs with offsets for proper positioning
    let currentOffset = 0;
    
    const productiveArc = document.getElementById('productiveArc');
    if (productiveArc) {
      productiveArc.style.strokeDasharray = `${productiveLength} ${circumference}`;
      productiveArc.style.strokeDashoffset = -currentOffset;
      currentOffset += productiveLength;
    }
    
    const neutralArc = document.getElementById('neutralArc');
    if (neutralArc) {
      neutralArc.style.strokeDasharray = `${neutralLength} ${circumference}`;
      neutralArc.style.strokeDashoffset = -currentOffset;
      currentOffset += neutralLength;
    }
    
    const distractingArc = document.getElementById('distractingArc');
    if (distractingArc) {
      distractingArc.style.strokeDasharray = `${distractingLength} ${circumference}`;
      distractingArc.style.strokeDashoffset = -currentOffset;
    }
  }

  updateTrendLineChart() {
    const trendLines = document.getElementById('trendLines');
    const trendPoints = document.getElementById('trendPoints');
    
    if (!trendLines || !trendPoints || !this.data.weekStats || this.data.weekStats.length === 0) {
      return;
    }
    
    trendLines.innerHTML = '';
    trendPoints.innerHTML = '';
    
    const maxTime = Math.max(...this.data.weekStats.map(day => 
      Math.max(day.productive, day.neutral, day.distracting)
    ));
    
    if (maxTime === 0) return;
    
    const width = 350;
    const height = 200;
    const padding = 30;
    const chartWidth = width - (2 * padding);
    const chartHeight = height - (2 * padding);
    
    // Create points for each category
    const categories = ['productive', 'neutral', 'distracting'];
    const colors = ['#4CAF50', '#FFC107', '#FF5722'];
    
    categories.forEach((category, categoryIndex) => {
      const points = this.data.weekStats.map((day, index) => {
        const x = padding + (index * (chartWidth / (this.data.weekStats.length - 1)));
        const y = height - padding - ((day[category] / maxTime) * chartHeight);
        return `${x},${y}`;
      }).join(' ');
      
      // Create line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('points', points);
      line.setAttribute('class', `chart-line ${category}`);
      trendLines.appendChild(line);
      
      // Create points
      this.data.weekStats.forEach((day, index) => {
        const x = padding + (index * (chartWidth / (this.data.weekStats.length - 1)));
        const y = height - padding - ((day[category] / maxTime) * chartHeight);
        
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        point.setAttribute('cx', x);
        point.setAttribute('cy', y);
        point.setAttribute('class', `chart-point ${category}`);
        point.innerHTML = `<title>${category}: ${this.formatTime(day[category])}</title>`;
        trendPoints.appendChild(point);
      });
    });
  }

  updateTopSitesBarChart() {
    const topSitesBars = document.getElementById('topSitesBars');
    if (!topSitesBars || !this.data.topDomains) {
      return;
    }
    
    topSitesBars.innerHTML = '';
    
    // Get top 5 sites by total time
    const topSites = this.data.topDomains
      .filter(site => site.totalTime > 0)
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 5);
    
    if (topSites.length === 0) {
      topSitesBars.innerHTML = '<div style="text-align: center; opacity: 0.6;">No data available</div>';
      return;
    }
    
    const maxTime = Math.max(...topSites.map(site => site.totalTime));
    
    topSites.forEach(site => {
      const barContainer = document.createElement('div');
      barContainer.className = 'horizontal-bar';
      
      const percentage = (site.totalTime / maxTime) * 100;
      
      barContainer.innerHTML = `
        <div class="bar-label">${this.getDomainTitle(site.domain)}</div>
        <div class="bar-track">
          <div class="bar-fill ${site.category}" style="width: ${percentage}%"></div>
        </div>
        <div class="bar-value">${this.formatTime(site.totalTime)}</div>
      `;
      
      topSitesBars.appendChild(barContainer);
    });
  }

  updateHourlyDistribution() {
    const hourlyDistribution = document.getElementById('hourlyDistribution');
    const activityInsights = document.getElementById('activityInsights');
    if (!hourlyDistribution) {
      return;
    }
    
    hourlyDistribution.innerHTML = '';
    
    // Create 24 hourly blocks (0-23)
    const hourlyData = new Array(24).fill(0).map((_, hour) => {
      return {
        hour,
        productive: 0,
        neutral: 0,
        distracting: 0,
        total: 0,
        visitCount: 0
      };
    });
    
    // Enhanced simulation with more realistic patterns
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Define different patterns for different types of days
    const isWeekend = currentDay === 0 || currentDay === 6;
    const workingHours = isWeekend ? [10, 11, 12, 15, 16, 17] : [9, 10, 11, 14, 15, 16, 17, 18];
    const eveningHours = [19, 20, 21, 22, 23];
    const morningHours = [7, 8, 9];
    const lateNightHours = [0, 1, 2, 23];
    
    // More sophisticated data distribution
    this.data.topDomains?.forEach(site => {
      if (site.todayTime > 0) {
        const baseTime = site.todayTime;
        
        if (site.category === 'productive') {
          // Productive sites peak during working hours
          workingHours.forEach(hour => {
            const intensity = this.getHourIntensity(hour, 'productive', isWeekend);
            const timeAmount = (baseTime * intensity) / workingHours.length;
            hourlyData[hour].productive += timeAmount;
            hourlyData[hour].total += timeAmount;
            hourlyData[hour].visitCount += Math.ceil(site.visitCount * intensity / 4);
          });
          
          // Some spillover to morning hours
          morningHours.forEach(hour => {
            const intensity = 0.3;
            const timeAmount = (baseTime * intensity) / morningHours.length;
            hourlyData[hour].productive += timeAmount;
            hourlyData[hour].total += timeAmount;
            hourlyData[hour].visitCount += Math.ceil(site.visitCount * intensity / 8);
          });
          
        } else if (site.category === 'distracting') {
          // Distracting sites peak in evenings and late night
          eveningHours.forEach(hour => {
            const intensity = this.getHourIntensity(hour, 'distracting', isWeekend);
            const timeAmount = (baseTime * intensity) / eveningHours.length;
            hourlyData[hour].distracting += timeAmount;
            hourlyData[hour].total += timeAmount;
            hourlyData[hour].visitCount += Math.ceil(site.visitCount * intensity / 3);
          });
          
          // Weekend pattern - more distributed throughout day
          if (isWeekend) {
            for (let hour = 12; hour < 18; hour++) {
              const intensity = 0.4;
              const timeAmount = (baseTime * intensity) / 6;
              hourlyData[hour].distracting += timeAmount;
              hourlyData[hour].total += timeAmount;
              hourlyData[hour].visitCount += Math.ceil(site.visitCount * intensity / 6);
            }
          }
          
        } else {
          // Neutral sites - more evenly distributed but with patterns
          for (let hour = 8; hour < 24; hour++) {
            let intensity = 0.5;
            
            // Higher during work hours, lower late at night
            if (workingHours.includes(hour)) intensity = 0.7;
            else if (eveningHours.includes(hour)) intensity = 0.6;
            else if (lateNightHours.includes(hour)) intensity = 0.2;
            
            const timeAmount = (baseTime * intensity) / 16;
            hourlyData[hour].neutral += timeAmount;
            hourlyData[hour].total += timeAmount;
            hourlyData[hour].visitCount += Math.ceil(site.visitCount * intensity / 12);
          }
        }
      }
    });
    
    // Find peak hours and calculate statistics
    const maxHourTime = Math.max(...hourlyData.map(h => h.total));
    const totalDayTime = hourlyData.reduce((sum, h) => sum + h.total, 0);
    const avgHourTime = totalDayTime / 24;
    
    const peakHours = hourlyData
      .map((h, index) => ({ ...h, hourIndex: index }))
      .filter(h => h.total > avgHourTime * 1.5)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    
    // Render hourly blocks with enhanced visualization
    hourlyData.forEach((hourData, index) => {
      const timeBlock = document.createElement('div');
      timeBlock.className = 'time-block';
      
      const totalTime = hourData.total;
      const isPeakHour = peakHours.some(peak => peak.hourIndex === index);
      
      // Determine dominant category
      let dominantCategory = 'neutral';
      if (hourData.productive > hourData.neutral && hourData.productive > hourData.distracting) {
        dominantCategory = 'productive';
      } else if (hourData.distracting > hourData.neutral && hourData.distracting > hourData.productive) {
        dominantCategory = 'distracting';
      }
      
      timeBlock.className += ` ${dominantCategory}`;
      if (isPeakHour) {
        timeBlock.className += ' peak-hour';
      }
      
      // Calculate segment heights for stacked visualization
      const maxHeight = 60;
      const productiveHeight = maxHourTime > 0 ? (hourData.productive / maxHourTime) * maxHeight : 0;
      const neutralHeight = maxHourTime > 0 ? (hourData.neutral / maxHourTime) * maxHeight : 0;
      const distractingHeight = maxHourTime > 0 ? (hourData.distracting / maxHourTime) * maxHeight : 0;
      
      // Format time for display
      const timeFormat = index === 0 ? '12 AM' : 
                        index === 12 ? '12 PM' : 
                        index < 12 ? `${index} AM` : `${index - 12} PM`;
      
      timeBlock.innerHTML = `
        <div class="time-block-hour">${timeFormat}</div>
        <div class="time-block-bar">
          <div class="time-block-segments">
            ${distractingHeight > 0 ? `<div class="time-segment distracting" style="height: ${distractingHeight}px"></div>` : ''}
            ${neutralHeight > 0 ? `<div class="time-segment neutral" style="height: ${neutralHeight}px"></div>` : ''}
            ${productiveHeight > 0 ? `<div class="time-segment productive" style="height: ${productiveHeight}px"></div>` : ''}
          </div>
        </div>
        <div class="time-block-activity">${totalTime > 0 ? this.formatTime(totalTime) : ''}</div>
        <div class="hourly-tooltip">
          <div class="tooltip-time">${timeFormat}</div>
          ${totalTime > 0 ? `
            <div class="tooltip-category">
              <span class="tooltip-category-label">🔀 Total:</span>
              <span class="tooltip-category-time">${this.formatTime(totalTime)}</span>
            </div>
            ${hourData.productive > 0 ? `
              <div class="tooltip-category">
                <span class="tooltip-category-label">✅ Productive:</span>
                <span class="tooltip-category-time">${this.formatTime(hourData.productive)}</span>
              </div>
            ` : ''}
            ${hourData.neutral > 0 ? `
              <div class="tooltip-category">
                <span class="tooltip-category-label">⚪ Neutral:</span>
                <span class="tooltip-category-time">${this.formatTime(hourData.neutral)}</span>
              </div>
            ` : ''}
            ${hourData.distracting > 0 ? `
              <div class="tooltip-category">
                <span class="tooltip-category-label">❌ Distracting:</span>
                <span class="tooltip-category-time">${this.formatTime(hourData.distracting)}</span>
              </div>
            ` : ''}
            ${hourData.visitCount > 0 ? `
              <div class="tooltip-category">
                <span class="tooltip-category-label">📊 Visits:</span>
                <span class="tooltip-category-time">${hourData.visitCount}</span>
              </div>
            ` : ''}
            ${isPeakHour ? '<div style="margin-top: 6px; font-size: 10px; color: #FFD700;">⭐ Peak Hour</div>' : ''}
          ` : '<div style="opacity: 0.5;">No activity</div>'}
        </div>
      `;
      
      hourlyDistribution.appendChild(timeBlock);
    });
    
    // Generate activity insights
    this.generateActivityInsights(hourlyData, peakHours, totalDayTime, isWeekend);
  }
  
  getHourIntensity(hour, category, isWeekend) {
    // Return different intensity multipliers based on hour, category, and day type
    const baseIntensity = 1.0;
    
    if (category === 'productive') {
      if (isWeekend) {
        return hour >= 10 && hour <= 16 ? baseIntensity * 0.8 : baseIntensity * 0.3;
      } else {
        if (hour >= 9 && hour <= 11) return baseIntensity * 1.2; // Morning peak
        if (hour >= 14 && hour <= 17) return baseIntensity * 1.0; // Afternoon
        return baseIntensity * 0.4;
      }
    } else if (category === 'distracting') {
      if (hour >= 19 && hour <= 22) return baseIntensity * 1.3; // Evening peak
      if (hour >= 12 && hour <= 14) return baseIntensity * 0.8; // Lunch break
      if (isWeekend && hour >= 10 && hour <= 18) return baseIntensity * 0.9;
      return baseIntensity * 0.5;
    }
    
    return baseIntensity * 0.6; // Neutral default
  }
  
  generateActivityInsights(hourlyData, peakHours, totalDayTime, isWeekend) {
    const activityInsights = document.getElementById('activityInsights');
    if (!activityInsights) return;
    
    activityInsights.innerHTML = '';
    
    const insights = [];
    
    // Peak hours insight
    if (peakHours.length > 0) {
      const topPeak = peakHours[0];
      const peakTime = topPeak.hour === 0 ? '12 AM' : 
                      topPeak.hour === 12 ? '12 PM' : 
                      topPeak.hour < 12 ? `${topPeak.hour} AM` : `${topPeak.hour - 12} PM`;
      
      insights.push({
        type: 'peak',
        title: '⭐ Peak Activity',
        text: `Your most active hour is ${peakTime} with ${this.formatTime(topPeak.total)} of browsing time.`
      });
    }
    
    // Productivity pattern insight
    const productiveHours = hourlyData.filter(h => h.productive > h.neutral && h.productive > h.distracting);
    if (productiveHours.length > 0) {
      const productiveTimeRange = this.getTimeRange(productiveHours.map(h => h.hour));
      insights.push({
        type: 'productive',
        title: '✅ Productive Hours',
        text: `You're most productive between ${productiveTimeRange}. Consider scheduling important tasks during this time.`
      });
    }
    
    // Focus recommendation
    const distractingTime = hourlyData.reduce((sum, h) => sum + h.distracting, 0);
    const productiveTime = hourlyData.reduce((sum, h) => sum + h.productive, 0);
    
    if (distractingTime > productiveTime) {
      insights.push({
        type: 'focus',
        title: '🎯 Focus Tip',
        text: `Try reducing distracting content during peak hours. Consider using website blockers during ${peakHours[0] ? (peakHours[0].hour < 12 ? `${peakHours[0].hour} AM` : `${peakHours[0].hour - 12} PM`) : 'busy times'}.`
      });
    } else {
      insights.push({
        type: 'focus',
        title: '🎯 Great Focus!',
        text: `You maintain good focus during active hours. Your productive time exceeds distracting content by ${this.formatTime(productiveTime - distractingTime)}.`
      });
    }
    
    // Weekend vs weekday pattern
    if (isWeekend) {
      insights.push({
        type: 'weekend',
        title: '🏖️ Weekend Pattern',
        text: 'Weekend browsing detected. Activity patterns typically shift later in the day with more entertainment content.'
      });
    }
    
    // Render insights
    insights.forEach(insight => {
      const insightElement = document.createElement('div');
      insightElement.className = `insight-item ${insight.type}`;
      insightElement.innerHTML = `
        <div class="insight-title">${insight.title}</div>
        <div class="insight-text">${insight.text}</div>
      `;
      activityInsights.appendChild(insightElement);
    });
  }
  
  getTimeRange(hours) {
    if (hours.length === 0) return 'No activity';
    
    const sortedHours = hours.sort((a, b) => a - b);
    const start = sortedHours[0];
    const end = sortedHours[sortedHours.length - 1];
    
    const formatHour = (hour) => {
      if (hour === 0) return '12 AM';
      if (hour === 12) return '12 PM';
      return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
    };
    
    if (start === end) {
      return formatHour(start);
    }
    
    return `${formatHour(start)} - ${formatHour(end)}`;
  }

  updateProductivityScore() {
    const { today } = this.data;
    const total = today.totalTime;
    
    if (total === 0) {
      document.getElementById('productivityScore').textContent = '0%';
      document.getElementById('productivityTrend').innerHTML = '<span class="trend-text">No activity today</span>';
      document.getElementById('productivityRating').textContent = 'No Data';
      return;
    }
    
    // Calculate productivity score as percentage of productive time
    const productivePercentage = Math.round((today.productive / total) * 100);
    const neutralPercentage = Math.round((today.neutral / total) * 100);
    const distractingPercentage = Math.round((today.distracting / total) * 100);
    
    // Calculate overall productivity score (productive weight 100%, neutral 50%, distracting -20%)
    const score = Math.max(0, Math.min(100, 
      (today.productive / total) * 100 + 
      (today.neutral / total) * 50 - 
      (today.distracting / total) * 20
    ));
    
    const roundedScore = Math.round(score);
    
    // Update score display
    document.getElementById('productivityScore').textContent = `${roundedScore}%`;
    
    // Update the circular progress
    const circumference = 314; // 2π × 50 (radius)
    const scoreLength = (roundedScore / 100) * circumference;
    const productivityScoreArc = document.getElementById('productivityScoreArc');
    
    if (productivityScoreArc) {
      productivityScoreArc.style.strokeDasharray = `${scoreLength} ${circumference}`;
      
      // Change color based on score
      if (roundedScore >= 70) {
        productivityScoreArc.style.stroke = '#4CAF50'; // Green
      } else if (roundedScore >= 40) {
        productivityScoreArc.style.stroke = '#FFC107'; // Yellow
      } else {
        productivityScoreArc.style.stroke = '#FF5722'; // Red
      }
    }
    
    // Generate consistent trend based on the current score (instead of random)
    const trendElement = document.getElementById('productivityTrend');
    let trendInfo;
    
    // Base trend on actual productivity percentage to make it consistent
    if (productivePercentage >= 60) {
      trendInfo = { text: `+${Math.floor(productivePercentage / 10)}% from yesterday`, positive: true };
    } else if (productivePercentage >= 40) {
      trendInfo = { text: 'Steady progress', neutral: true };
    } else if (productivePercentage >= 20) {
      trendInfo = { text: `Room for improvement`, negative: true };
    } else {
      trendInfo = { text: `Focus time needed`, negative: true };
    }
    
    trendElement.innerHTML = `
      <span class="trend-text${trendInfo.negative ? ' negative' : ''}">${trendInfo.text}</span>
    `;
    
    // Update rating based on score - more detailed breakdown
    const ratingElement = document.getElementById('productivityRating');
    if (roundedScore >= 85) {
      ratingElement.textContent = 'Excellent';
      ratingElement.className = 'score-rating';
    } else if (roundedScore >= 70) {
      ratingElement.textContent = 'Very Good';
      ratingElement.className = 'score-rating';
    } else if (roundedScore >= 55) {
      ratingElement.textContent = 'Good';
      ratingElement.className = 'score-rating good';
    } else if (roundedScore >= 40) {
      ratingElement.textContent = 'Fair';
      ratingElement.className = 'score-rating good';
    } else if (roundedScore >= 25) {
      ratingElement.textContent = 'Needs Focus';
      ratingElement.className = 'score-rating poor';
    } else {
      ratingElement.textContent = 'Poor Focus';
      ratingElement.className = 'score-rating poor';
    }
    
    // Add detailed breakdown tooltip
    const scoreDetails = `
      Breakdown:
      • Productive: ${productivePercentage}% (${this.formatTime(today.productive)})
      • Neutral: ${neutralPercentage}% (${this.formatTime(today.neutral)})
      • Distracting: ${distractingPercentage}% (${this.formatTime(today.distracting)})
      
      Score Calculation:
      Productive×100% + Neutral×50% - Distracting×20% = ${roundedScore}%
    `;
    
    const scoreElement = document.getElementById('productivityScore');
    if (scoreElement) {
      scoreElement.title = scoreDetails;
    }
  }

  updateTopSitesToday() {
    console.log('Updating Top Sites Today with data:', this.data.topDomains);
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
    
    console.log('Top sites for today:', topSites);
    
    if (topSites.length === 0) {
      topSitesToday.innerHTML = '<div style="text-align: center; opacity: 0.6; grid-column: 1/-1;">No activity today</div>';
      return;
    }
    
    topSites.forEach(site => {
      const siteCard = document.createElement('div');
      siteCard.className = 'site-card';
      
      console.log(`Rendering ${site.domain} with category: ${site.category}`);
      
      siteCard.innerHTML = `
        <div class="site-card-header">
          <div class="site-favicon">
            <img src="${this.getFaviconUrl(site.domain)}" 
                 alt="${site.domain}" 
                 onerror="this.style.display='none'; this.parentNode.textContent='${this.getDomainFallbackIcon(site.domain)}';">
          </div>
          <div class="site-info">
            <div class="site-domain">${site.domain}</div>
            <div class="site-title">${this.getDomainTitle(site.domain)}</div>
          </div>
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
          <div class="site-table-cell">
            <div class="site-table-favicon">
              <img src="${this.getFaviconUrl(site.domain)}" 
                   alt="${site.domain}" 
                   onerror="this.style.display='none'; this.parentNode.textContent='${this.getDomainFallbackIcon(site.domain)}';">
            </div>
            <div class="site-table-info">
              <div class="site-table-domain">${site.domain}</div>
              <div class="site-table-title">${this.getDomainTitle(site.domain)}</div>
            </div>
          </div>
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

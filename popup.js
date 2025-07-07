document.addEventListener('DOMContentLoaded', () => {
  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggle');
  const pageElements = document.querySelectorAll('.page');
  const navItems = document.querySelectorAll('.sidebar-nav ul li');

  sidebarToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetPage = item.getAttribute('data-page');
      pageElements.forEach((page) => {
        page.style.display = page.id === targetPage ? 'block' : 'none';
      });
      navItems.forEach((nav) => {
        nav.classList.toggle('active', nav === item);
        nav.setAttribute('aria-pressed', nav === item ? 'true' : 'false');
      });
    });
  });

  // Elements
  const protectionStatusEl = document.getElementById('protection-status');
  const statusDescriptionEl = document.getElementById('statusDescription');
  const statusIconEl = document.getElementById('status-icon');
  // const modelToggleEl = document.getElementById('modelToggle'); // Removed as per request
  const modelLevelEl = document.getElementById('modelLevel');
  const analyzeForm = document.getElementById('analyze-form');
  const analyzeUrlInput = document.getElementById('analyze-url');
  const analysisResultsEl = document.getElementById('analysisResults');
  const threatsListEl = document.getElementById('threatsList');
  const historyFilterEl = document.getElementById('historyFilter');
  const historyListEl = document.getElementById('historyList');
  const profileForm = document.getElementById('profileForm');
  const toastContainer = document.getElementById('toastContainer');

  // Whitelist elements
  const whitelistForm = document.getElementById('whitelistForm');
  const whitelistInput = document.getElementById('whitelistInput');
  const whitelistList = document.getElementById('whitelistList');

  // Load settings from storage
  function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
      const defaultSettings = {
        enableRealTimeScanning: true,
        modelLevel: 'standard',
        notificationPreference: 'all',
      };
      const settings = Object.assign({}, defaultSettings, result.settings || {});
      modelToggleEl.checked = settings.enableRealTimeScanning;
      modelLevelEl.value = settings.modelLevel || 'standard';
      updateProtectionStatus(settings.enableRealTimeScanning);
    });
  }

  // Save settings to storage
  function saveSettings(settings) {
    chrome.storage.local.set({ settings });
  }

  // Update protection status UI
  function updateProtectionStatus(enabled) {
    if (enabled) {
      protectionStatusEl.textContent = 'Protection Active';
      statusDescriptionEl.textContent = 'Real-time scanning enabled';
      statusIconEl.classList.add('safe');
      statusIconEl.classList.remove('alert');
    } else {
      protectionStatusEl.textContent = 'Protection Disabled';
      statusDescriptionEl.textContent = 'Real-time scanning disabled';
      statusIconEl.classList.add('alert');
      statusIconEl.classList.remove('safe');
    }
  }

  // Toast notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate__animated animate__fadeInDown`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.replace('animate__fadeInDown', 'animate__fadeOutUp');
      toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  }

  // Load recent threats
  function loadRecentThreats() {
    chrome.storage.local.get(['threatLog'], (result) => {
      const threatLog = result.threatLog || [];
      threatsListEl.innerHTML = '';
      if (threatLog.length === 0) {
        threatsListEl.textContent = 'No threats detected yet.';
        return;
      }
      const recentThreats = threatLog.slice(-5).reverse();
      recentThreats.forEach((threat) => {
        const threatEl = document.createElement('div');
        threatEl.className = `threat-item ${threat.analysis.threatLevel}`;
        // Format: Website name, time:timePM/AM (no seconds), Level:
        const hostname = new URL(threat.url).hostname;
        const date = new Date(threat.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        threatEl.textContent = `${hostname}, time: ${timeStr}\nLevel: ${threat.analysis.threatLevel}`;
        threatsListEl.appendChild(threatEl);
      });
    });
  }

  // Load browsing history
  function loadHistory(filter = 'all') {
    chrome.storage.local.get(['historyLog'], (result) => {
      const historyLog = result.historyLog || [];
      historyListEl.innerHTML = '';
      let filtered = historyLog;
      if (filter !== 'all') {
        filtered = historyLog.filter((entry) => entry.threatLevel === filter);
      }
      if (filtered.length === 0) {
        historyListEl.textContent = 'No history entries.';
        return;
      }
      filtered.forEach((entry) => {
        const entryEl = document.createElement('div');
        entryEl.className = `history-entry ${entry.threatLevel}`;
        // Format: Website name, time:timePM/AM (no seconds), Level:
        const hostname = new URL(entry.url).hostname;
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        entryEl.textContent = `${hostname}, time: ${timeStr}\nLevel: ${entry.threatLevel}`;
        historyListEl.appendChild(entryEl);
      });
    });
  }

  // Load profile data
  function loadProfile() {
    chrome.storage.local.get(['profile'], (result) => {
      const profile = result.profile || {};
      profileForm.userName.value = profile.name || '';
      profileForm.userEmail.value = profile.email || '';
      profileForm.userNotifications.value = profile.notificationPreference || 'all';
      profileForm.protectionLevel.value = profile.protectionLevel || 'standard';
    });
  }

  // Save profile data
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const profile = {
      name: profileForm.userName.value.trim(),
      email: profileForm.userEmail.value.trim(),
      notificationPreference: profileForm.userNotifications.value,
      protectionLevel: profileForm.protectionLevel.value,
    };
    chrome.storage.local.set({ profile }, () => {
      showToast('Profile saved successfully', 'success');
    });
  });


  // Handle model level change
  modelLevelEl.addEventListener('change', () => {
    const level = modelLevelEl.value;
    chrome.storage.local.get(['settings'], (result) => {
      const settings = Object.assign({}, result.settings || {});
      settings.modelLevel = level;
      saveSettings(settings);
      chrome.runtime.sendMessage({ action: 'changeModelLevel', level });
      showToast(`Model level set to ${level}`, 'info');
    });
  });

  // Analyze URL form submission
  analyzeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = analyzeUrlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL to analyze', 'error');
      return;
    }
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;
    if (!urlPattern.test(url)) {
      showToast('Please enter a valid URL', 'error');
      return;
    }
    analysisResultsEl.style.display = 'block';
    analysisResultsEl.textContent = 'Analyzing...';
    try {
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        analysisResultsEl.textContent = 'Error: ' + (errorData.error || 'Failed to analyze URL');
        showToast('Failed to analyze URL', 'error');
        return;
      }
      const data = await response.json();
      let resultHtml = `<p><strong>Threat Level:</strong> ${data.threatLevel}</p>`;
      resultHtml += `<p><strong>Confidence:</strong> ${(data.confidence * 100).toFixed(2)}%</p>`;
      if (data.reasons && data.reasons.length > 0) {
        resultHtml += `<p><strong>Reasons:</strong> ${data.reasons.join(', ')}</p>`;
      }
      analysisResultsEl.innerHTML = resultHtml;
      if (data.threatLevel === 'safe') {
        showToast('Link is safe to visit', 'success');
      } else {
        showToast('Warning: Suspicious or dangerous link detected!', 'error');
      }
    } catch (err) {
      analysisResultsEl.textContent = 'Error: ' + err.message;
      showToast('Error analyzing URL', 'error');
    }
  });

  // Debounced real-time analysis of input URL
  let debounceTimeout = null;
  analyzeUrlInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    const url = analyzeUrlInput.value.trim();
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;
    if (!urlPattern.test(url)) {
      analysisResultsEl.style.display = 'none';
      return;
    }
    debounceTimeout = setTimeout(async () => {
      analysisResultsEl.style.display = 'block';
      analysisResultsEl.textContent = 'Analyzing...';
      try {
        const response = await fetch('http://127.0.0.1:5000/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          analysisResultsEl.textContent = 'Error: ' + (errorData.error || 'Failed to analyze URL');
          showToast('Failed to analyze URL', 'error');
          return;
        }
        const data = await response.json();
        let resultHtml = `<p><strong>Threat Level:</strong> ${data.threatLevel}</p>`;
        resultHtml += `<p><strong>Confidence:</strong> ${(data.confidence * 100).toFixed(2)}%</p>`;
        if (data.reasons && data.reasons.length > 0) {
          resultHtml += `<p><strong>Reasons:</strong> ${data.reasons.join(', ')}</p>`;
        }
        analysisResultsEl.innerHTML = resultHtml;
        if (data.threatLevel === 'safe') {
          showToast('Link is safe to visit', 'success');
        } else {
          showToast('Warning: Suspicious or dangerous link detected!', 'error');
        }
      } catch (err) {
        analysisResultsEl.textContent = 'Error: ' + err.message;
        showToast('Error analyzing URL', 'error');
      }
    }, 1000);
  });

  // History filter change
  historyFilterEl.addEventListener('change', () => {
    loadHistory(historyFilterEl.value);
  });

  // Continuous monitoring and blocking handled by background.js
  // Listen for messages from background to show toast notifications and update history dynamically
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'linkAnalysisResult') {
      if (message.threatLevel === 'safe') {
        showToast('Link is safe to visit', 'success');
      } else {
        showToast('Warning: Suspicious or dangerous link detected!', 'error');
      }
    } else if (message.action === 'newHistoryEntry') {
      // Add new history entry dynamically
      const entry = message.entry;
      if (!entry) return;
      const entryEl = document.createElement('div');
      entryEl.className = `history-entry ${entry.analysis.threatLevel}`;
      const hostname = new URL(entry.url).hostname;
      const date = new Date(entry.timestamp);
      // Format date with date and time (hour:minute AM/PM), no seconds
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      entryEl.textContent = `${hostname}, ${dateStr} ${timeStr}`;
      // Prepend new entry to history list
      if (historyListEl.firstChild) {
        historyListEl.insertBefore(entryEl, historyListEl.firstChild);
      } else {
        historyListEl.appendChild(entryEl);
      }
    }
  });

  // Initial load
  loadSettings();
  loadRecentThreats();
  loadHistory();
  loadProfile();

  // Whitelist management functions

  // Load whitelist from storage and display
  function loadWhitelist() {
    chrome.storage.local.get(['whitelist'], (result) => {
      const whitelist = result.whitelist || [];
      whitelistList.innerHTML = '';
      if (whitelist.length === 0) {
        whitelistList.textContent = 'No domains in whitelist.';
        return;
      }
      whitelist.forEach((domain) => {
        const domainEl = document.createElement('div');
        domainEl.className = 'whitelist-item';
        domainEl.textContent = domain;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'remove-btn';
        removeBtn.addEventListener('click', () => {
          removeFromWhitelist(domain);
        });
        domainEl.appendChild(removeBtn);
        whitelistList.appendChild(domainEl);
      });
    });
  }

  // Add domain to whitelist
  whitelistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const domain = whitelistInput.value.trim().toLowerCase();
    if (!domain) {
      showToast('Please enter a domain to add', 'error');
      return;
    }
    chrome.storage.local.get(['whitelist'], (result) => {
      const whitelist = result.whitelist || [];
      if (whitelist.includes(domain)) {
        showToast('Domain already in whitelist', 'info');
        return;
      }
      whitelist.push(domain);
      chrome.storage.local.set({ whitelist }, () => {
        showToast(`Added ${domain} to whitelist`, 'success');
        whitelistInput.value = '';
        loadWhitelist();
        chrome.runtime.sendMessage({ action: 'updateWhitelist', whitelist });
      });
    });
  });

  // Remove domain from whitelist
  function removeFromWhitelist(domain) {
    chrome.storage.local.get(['whitelist'], (result) => {
      let whitelist = result.whitelist || [];
      whitelist = whitelist.filter((d) => d !== domain);
      chrome.storage.local.set({ whitelist }, () => {
        showToast(`Removed ${domain} from whitelist`, 'success');
        loadWhitelist();
        chrome.runtime.sendMessage({ action: 'updateWhitelist', whitelist });
      });
    });
  }

  // Initial load of whitelist
  loadWhitelist();

  // Load settings from storage
  function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
      const defaultSettings = {
        enableRealTimeScanning: true,
        modelLevel: 'standard',
        notificationPreference: 'all',
      };
      const settings = Object.assign({}, defaultSettings, result.settings || {});
      modelToggleEl.checked = settings.enableRealTimeScanning;
      modelLevelEl.value = settings.modelLevel || 'standard';
      updateProtectionStatus(settings.enableRealTimeScanning);
    });
  }

  // Save settings to storage
  function saveSettings(settings) {
    chrome.storage.local.set({ settings });
  }

  // Update protection status UI
  function updateProtectionStatus(enabled) {
    if (enabled) {
      protectionStatusEl.textContent = 'Protection Active';
      statusDescriptionEl.textContent = 'Real-time scanning enabled';
      statusIconEl.classList.add('safe');
      statusIconEl.classList.remove('alert');
    } else {
      protectionStatusEl.textContent = 'Protection Disabled';
      statusDescriptionEl.textContent = 'Real-time scanning disabled';
      statusIconEl.classList.add('alert');
      statusIconEl.classList.remove('safe');
    }
  }

  // Toast notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate__animated animate__fadeInDown`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.replace('animate__fadeInDown', 'animate__fadeOutUp');
      toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  }
});

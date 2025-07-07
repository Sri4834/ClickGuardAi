// Background service worker for ClickGuard.AI Chrome Extension
// Intercepts link clicks and performs AI-based link analysis (stub)
// Blocks or allows navigation based on AI analysis result

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: 'settings',
  WHITELIST: 'whitelist',
  THREAT_LOG: 'threatLog',
};

// Default settings
const defaultSettings = {
  enableRealTimeScanning: true,
  blockDangerousLinks: true,
  warnOnSuspicious: true,
  checkDigitalSignatures: true,
};

// Helper: Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
      resolve(Object.assign({}, defaultSettings, result[STORAGE_KEYS.SETTINGS]));
    });
  });
}

// Helper: Load whitelist from storage
async function loadWhitelist() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.WHITELIST], (result) => {
      resolve(result[STORAGE_KEYS.WHITELIST] || []);
    });
  });
}

// Helper: Save threat log entry
async function saveThreatLogEntry(entry) {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.THREAT_LOG], (result) => {
      const log = result[STORAGE_KEYS.THREAT_LOG] || [];
      log.push(entry);
      chrome.storage.local.set({ [STORAGE_KEYS.THREAT_LOG]: log }, () => resolve());
    });
  });
}

// AI-based link analysis calling backend Flask API
async function analyzeUrlWithAI(url) {
  try {
    // Include modelLevel in request body to backend if needed
    const response = await fetch('http://127.0.0.1:5000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, modelLevel })
    });
    if (!response.ok) {
      console.error('AI analysis API error:', response.statusText);
      return { threatLevel: 'safe', reasons: [] };
    }
    const data = await response.json();
    return {
      threatLevel: data.threatLevel || 'safe',
      reasons: data.reasons || []
    };
  } catch (e) {
    console.error('Error during AI analysis:', e);
    return { threatLevel: 'safe', reasons: [] };
  }
}

// Check if URL is whitelisted
function isUrlWhitelisted(url, whitelist) {
  try {
    const urlObj = new URL(url);
    return whitelist.some((domain) => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// Store current blocking rules IDs
let currentRuleIds = new Set();

// Function to update declarativeNetRequest rules
async function updateBlockingRules(url, block) {
  const ruleId = urlToRuleId(url);

  if (block) {
    if (!currentRuleIds.has(ruleId)) {
      const rule = {
        id: ruleId,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: url, resourceTypes: ['main_frame'] },
      };
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: [rule],
          removeRuleIds: [],
        });
        currentRuleIds.add(ruleId);
      } catch (e) {
        console.error('Failed to add blocking rule:', e);
      }
    }
  } else {
    if (currentRuleIds.has(ruleId)) {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: [],
          removeRuleIds: [ruleId],
        });
        currentRuleIds.delete(ruleId);
      } catch (e) {
        console.error('Failed to remove blocking rule:', e);
      }
    }
  }
}

// Helper to generate a numeric rule ID from URL string
function urlToRuleId(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Function to handle URL analysis and update rules
async function handleUrl(url) {
  if (!extensionEnabled) {
    return;
  }

  const whitelist = await loadWhitelist();
  if (isUrlWhitelisted(url, whitelist)) {
    return;
  }

  const analysis = await analyzeUrlWithAI(url);

  // Log the threat
  const logEntry = {
    url,
    timestamp: Date.now(),
    analysis,
  };
  await saveThreatLogEntry(logEntry);

  // Notify popup about new history entry
  chrome.runtime.sendMessage({ action: 'newHistoryEntry', entry: logEntry });

  if (analysis.threatLevel === 'dangerous' && defaultSettings.blockDangerousLinks) {
    await updateBlockingRules(url, true);
    chrome.action.setIcon({ path: 'icons/danger48.png' });
    chrome.action.setTitle({ title: 'ClickGuard.AI: Dangerous link blocked' });
    // Send message to popup for UI blocking
    chrome.runtime.sendMessage({ action: 'blockUrl', url });
  } else {
    await updateBlockingRules(url, false);
    if (analysis.threatLevel === 'suspicious' && defaultSettings.warnOnSuspicious) {
      chrome.action.setIcon({ path: 'icons/warning48.png' });
      chrome.action.setTitle({ title: 'ClickGuard.AI: Suspicious link detected' });
    } else {
      chrome.action.setIcon({ path: 'icons/icon48.png' });
      chrome.action.setTitle({ title: 'ClickGuard.AI: Safe link' });
    }

    // Show Chrome notification based on threat level
    if (analysis.threatLevel === 'safe') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'ClickGuard.AI',
        message: 'Website verified as safe by ClickGuard!',
        priority: 0,
      });
    } else if (analysis.threatLevel === 'dangerous') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/danger48.png',
        title: 'ClickGuard.AI Warning',
        message: 'Dangerous link blocked by ClickGuard!',
        priority: 2,
      });
    } else if (analysis.threatLevel === 'suspicious') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/warning48.png',
        title: 'ClickGuard.AI Warning',
        message: 'Suspicious link detected by ClickGuard!',
        priority: 1,
      });
    }
  }
}

// Current scanning enabled flag
let scanningEnabled = true;

// Listen to storage changes to update scanningEnabled flag
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    const newSettings = changes.settings.newValue || {};
    scanningEnabled = newSettings.enableRealTimeScanning !== false;
  }
});

// Listen to tabs updates to analyze URLs
let lastAnalyzedUrl = null;
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && scanningEnabled) {
    if (tab.url !== lastAnalyzedUrl) {
      lastAnalyzedUrl = tab.url;
      handleUrl(tab.url);
    }
  }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateWhitelist') {
    // Update whitelist in storage
    chrome.storage.local.set({ whitelist: message.whitelist });
  }
  if (message.action === 'blockUrl') {
    // Could implement UI blocking logic here if needed
  }
  if (message.action === 'toggleAIModel') {
    scanningEnabled = !!message.enabled;
  }
  if (message.action === 'changeModelLevel') {
    // Update model level setting if needed
    // For now, just log or store it; actual model behavior adjustment depends on backend implementation
    chrome.storage.local.set({ modelLevel: message.level });
  }
});

// Initialize scanningEnabled from storage on startup
chrome.storage.local.get(['settings'], (result) => {
  const settings = result.settings || {};
  scanningEnabled = settings.enableRealTimeScanning !== false;
});

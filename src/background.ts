// Background script for YouTube Karaoke Extension
console.log('YouTube Karaoke Extension background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  // Initialize storage
  chrome.storage.local.set({
    playlists: [],
    settings: {
      panelWidth: 300,
      theme: 'light'
    }
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
  case 'getPlaylists':
    chrome.storage.local.get(['playlists'], (result) => {
      sendResponse({ playlists: result.playlists || [] });
    });
    return true; // Keep message channel open for async response
    
  case 'savePlaylist':
    chrome.storage.local.set({ playlists: request.playlists }, () => {
      sendResponse({ success: true });
    });
    return true;
    
  case 'togglePanel':
    // Send message to content script to toggle panel
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' });
      }
    });
    sendResponse({ success: true });
    return true;
    
  default:
    console.log('Unknown action:', request.action);
    sendResponse({ success: false });
    return true;
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Inject content script if needed
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(() => {
      // Ignore errors for restricted pages
    });
  }
});

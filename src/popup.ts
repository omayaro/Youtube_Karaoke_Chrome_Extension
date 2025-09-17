// Popup script for YouTube Karaoke Extension
console.log('YouTube Karaoke Extension popup script loaded');

document.addEventListener('DOMContentLoaded', () => {
  const togglePanelBtn = document.getElementById('toggle-panel-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const playlistCount = document.getElementById('playlist-count');
  
  // Load initial data
  loadPlaylistCount();
  
  // Toggle panel button
  togglePanelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Disable button temporarily to prevent double-click
    if (togglePanelBtn) {
      (togglePanelBtn as HTMLButtonElement).disabled = true;
      (togglePanelBtn as HTMLButtonElement).textContent = 'Opening...';
    }
    
    chrome.runtime.sendMessage({ action: 'togglePanel' }, (response) => {
      // Always re-enable button after a short delay
      setTimeout(() => {
        if (togglePanelBtn) {
          (togglePanelBtn as HTMLButtonElement).disabled = false;
          (togglePanelBtn as HTMLButtonElement).textContent = 'Toggle Panel';
        }
      }, 500);
      
      if (response && response.success) {
        window.close();
      }
    });
  });
  
  // Settings button
  settingsBtn?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Load playlist count
  function loadPlaylistCount(): void {
    chrome.runtime.sendMessage({ action: 'getPlaylists' }, (response) => {
      if (response && response.playlists) {
        const count = response.playlists.length;
        if (playlistCount) {
          playlistCount.textContent = count.toString();
        }
      }
    });
  }
  
  // Update playlist count when storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.playlists) {
      const count = changes.playlists.newValue?.length || 0;
      if (playlistCount) {
        playlistCount.textContent = count.toString();
      }
    }
  });
});

// Content script for YouTube Karaoke Extension
import { PlaylistManager, PlaylistItem } from './contentPlaylist';
import { SearchManager, SearchResult } from './contentSearchResult';

console.log('YouTube Karaoke Extension content script loaded');

// Check if content script already loaded to prevent duplicates
if ((window as unknown as { youtubeKaraokeLoaded?: boolean }).youtubeKaraokeLoaded) {
  console.log('YouTube Karaoke content script already loaded, skipping...');
  // Exit early to prevent duplicate execution
  throw new Error('Content script already loaded');
}
(window as unknown as { youtubeKaraokeLoaded: boolean }).youtubeKaraokeLoaded = true;

// Global state
let panel: HTMLElement | null = null;
let isPanelVisible = false;
let messageListenerAdded = false;

// Initialize managers
const playlistManager = new PlaylistManager(null);
const searchManager = new SearchManager(null);

// Create the split panel
function createPanel(): HTMLElement {
  const panelDiv = document.createElement('div');
  panelDiv.id = 'youtube-karaoke-panel';
  panelDiv.innerHTML = `
    <div class="panel-header">
      <div class="header-content">
        <h3>🎤 YouTube Karaoke</h3>
        <div class="playlist-count">
          <span id="playlist-count">0</span>
          <span class="label">videos</span>
        </div>
      </div>
      <div class="header-actions">
        <button id="help-btn" class="help-btn" title="Keyboard Shortcuts">⌨️</button>
        <button id="close-panel" class="close-btn" title="Close Panel">&times;</button>
      </div>
    </div>
    <div class="panel-content">
      <div class="playlist-section">
        <div class="section-header">
          <h4>📋 My Playlist</h4>
          <div class="playlist-controls">
            <button id="clear-playlist" class="control-btn" title="Clear All">🗑️</button>
            <button id="shuffle-playlist" class="control-btn" title="Shuffle">🔀</button>
          </div>
        </div>
        <div id="playlist-items" class="playlist-items">
          <div class="empty-state">
            <div class="empty-icon">🎵</div>
            <p class="empty-message">No videos in playlist</p>
            <p class="empty-hint">Search and add videos below</p>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="search-section">
        <div class="section-header">
          <h4>🔍 Search YouTube</h4>
          <div class="search-status" id="search-status"></div>
        </div>
        <div class="search-controls">
          <div class="search-input-container">
            <input type="text" id="search-input" placeholder="Search for songs, artists, or videos..." />
            <button id="search-btn" class="search-btn">
              <span class="search-icon">🔍</span>
              <span class="search-text">Search</span>
            </button>
            <button id="advanced-filters-btn" class="advanced-filters-btn" title="Advanced Filters">
              <span class="filter-icon">⚙️</span>
            </button>
          </div>
          <div class="search-filters">
            <select id="search-filter" class="filter-select">
              <option value="relevance">Most Relevant</option>
              <option value="date">Most Recent</option>
              <option value="rating">Highest Rated</option>
              <option value="viewCount">Most Viewed</option>
            </select>
          </div>
        </div>
        <div id="advanced-filters" class="advanced-filters-panel" style="display: none;">
          <div class="filters-header">
            <h4>Advanced Search Filters</h4>
            <button id="close-filters-btn" class="close-filters-btn">×</button>
          </div>
          <div class="filters-content">
            <div class="filter-group">
              <label>Content Type:</label>
              <div class="filter-options">
                <label class="filter-option">
                  <input type="radio" name="content-type" value="videos" checked>
                  <span>Videos</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="content-type" value="playlists">
                  <span>Playlists</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="content-type" value="channels">
                  <span>Channels</span>
                </label>
              </div>
            </div>
            <div class="filter-group">
              <label>Duration:</label>
              <div class="filter-options">
                <label class="filter-option">
                  <input type="radio" name="duration" value="any" checked>
                  <span>Any</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="duration" value="short">
                  <span>Short (< 4 min)</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="duration" value="medium">
                  <span>Medium (4-20 min)</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="duration" value="long">
                  <span>Long (> 20 min)</span>
                </label>
              </div>
            </div>
            <div class="filter-group">
              <label>Upload Date:</label>
              <div class="filter-options">
                <label class="filter-option">
                  <input type="radio" name="upload-date" value="any" checked>
                  <span>Any time</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="upload-date" value="today">
                  <span>Today</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="upload-date" value="week">
                  <span>This week</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="upload-date" value="month">
                  <span>This month</span>
                </label>
                <label class="filter-option">
                  <input type="radio" name="upload-date" value="year">
                  <span>This year</span>
                </label>
              </div>
            </div>
            <div class="filter-group">
              <label>Additional Filters:</label>
              <div class="filter-options">
                <label class="filter-option">
                  <input type="checkbox" name="has-captions" id="has-captions">
                  <span>Has captions</span>
                </label>
                <label class="filter-option">
                  <input type="checkbox" name="is-hd" id="is-hd">
                  <span>HD quality</span>
                </label>
                <label class="filter-option">
                  <input type="checkbox" name="is-live" id="is-live">
                  <span>Live videos</span>
                </label>
              </div>
            </div>
            <div class="filter-actions">
              <button id="apply-filters-btn" class="apply-filters-btn">Apply Filters</button>
              <button id="clear-filters-btn" class="clear-filters-btn">Clear All</button>
            </div>
          </div>
        </div>
        <div id="search-results" class="search-results">
          <div class="empty-state">
            <div class="empty-icon">🎤</div>
            <p class="empty-message">Enter a search term to find videos</p>
            <p class="empty-hint">Try searching for your favorite songs!</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  return panelDiv;
}

// Inject panel into page
function injectPanel(): void {
  if (panel) return;
  
  // Check if panel already exists in DOM
  const existingPanel = document.getElementById('youtube-karaoke-panel');
  if (existingPanel) {
    panel = existingPanel as HTMLElement;
    return;
  }
  
  panel = createPanel();
  document.body.appendChild(panel);
  
  // Update manager references
  playlistManager.setPanel(panel);
  searchManager.setPanel(panel);
  
  // Set up cross-references for panel tracking
  playlistManager.setSearchManager(searchManager);
  
  // Add event listeners
  setupEventListeners();
  
  // Load existing playlists
  loadPlaylists();
  
  // Load existing search results
  searchManager.loadSearchResults();
  
  // Make sure panel stays visible on YouTube pages
  if (window.location.hostname.includes('youtube.com')) {
    // Adjust panel for YouTube page
    if (panel) {
      panel.style.zIndex = '999999';
      panel.style.position = 'fixed';
      panel.style.top = '0';
      panel.style.left = '0';
      panel.style.height = '100vh';
      panel.style.width = '400px';
    }
    
    // Force content shifting immediately
    adjustYouTubeLayout();
    
    // Adjust YouTube layout after a delay to ensure elements are loaded
    setTimeout(() => {
      adjustYouTubeLayout();
    }, 1000);
    
    // Also adjust on window resize
    window.addEventListener('resize', adjustYouTubeLayout);
  }
}

// Setup event listeners
function setupEventListeners(): void {
  if (!panel) return;
  
  // Close panel button
  const closeBtn = panel.querySelector('#close-panel');
  closeBtn?.addEventListener('click', () => {
    togglePanel();
  });
  
  // Help button
  const helpBtn = panel.querySelector('#help-btn');
  helpBtn?.addEventListener('click', () => {
    showKeyboardShortcuts();
  });
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Search functionality
  const searchBtn = panel.querySelector('#search-btn');
  const searchInput = panel.querySelector('#search-input') as HTMLInputElement;
  const searchFilter = panel.querySelector('#search-filter') as HTMLSelectElement;
  
  searchBtn?.addEventListener('click', () => {
    console.log('Search button clicked, focusing search panel');
    // Focus the search input to ensure search panel is active
    if (searchInput) {
      searchInput.focus();
    }
    searchManager.performSearch(searchInput?.value || '', searchFilter?.value || 'relevance');
  });
  
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchManager.performSearch(searchInput.value, searchFilter?.value || 'relevance');
    }
  });
  
  // Playlist controls
  const clearPlaylistBtn = panel.querySelector('#clear-playlist');
  const shufflePlaylistBtn = panel.querySelector('#shuffle-playlist');
  
  clearPlaylistBtn?.addEventListener('click', () => {
    playlistManager.clearPlaylist();
  });
  
  shufflePlaylistBtn?.addEventListener('click', () => {
    playlistManager.shufflePlaylist();
  });
  
  // Advanced filters functionality
  const advancedFiltersBtn = panel.querySelector('#advanced-filters-btn');
  const closeFiltersBtn = panel.querySelector('#close-filters-btn');
  const applyFiltersBtn = panel.querySelector('#apply-filters-btn');
  const clearFiltersBtn = panel.querySelector('#clear-filters-btn');
  const advancedFiltersPanel = panel.querySelector('#advanced-filters');
  
  // Toggle advanced filters panel
  advancedFiltersBtn?.addEventListener('click', () => {
    if (advancedFiltersPanel) {
      const panel = advancedFiltersPanel as HTMLElement;
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });
  
  closeFiltersBtn?.addEventListener('click', () => {
    if (advancedFiltersPanel) {
      const panel = advancedFiltersPanel as HTMLElement;
      panel.style.display = 'none';
    }
  });
  
  // Apply filters
  applyFiltersBtn?.addEventListener('click', () => {
    const filters = searchManager.getAdvancedFilters();
    searchManager.performSearch(searchInput?.value || '', searchFilter?.value || 'relevance');
    if (advancedFiltersPanel) {
      const panel = advancedFiltersPanel as HTMLElement;
      panel.style.display = 'none';
    }
  });
  
  // Clear all filters
  clearFiltersBtn?.addEventListener('click', () => {
    searchManager.clearAdvancedFilters();
  });

  // Listen for add to playlist events
  document.addEventListener('addToPlaylist', (e: any) => {
    const { searchItem } = e.detail;
    playlistManager.addToPlaylist(searchItem);
  });
}

// Toggle panel visibility
function togglePanel(): void {
  console.log('togglePanel called, panel exists:', !!panel, 'isPanelVisible:', isPanelVisible);
  
  if (!panel) {
    console.log('Creating new panel...');
    injectPanel();
    isPanelVisible = true;
    // Ensure panel is visible after creation
    if (panel) {
      (panel as HTMLElement).style.display = 'block';
    }
    // Shift main content to the right
    shiftMainContent(true);
  } else {
    // Toggle visibility
    isPanelVisible = !isPanelVisible;
    console.log('Toggling panel visibility to:', isPanelVisible);
    
    if (isPanelVisible) {
      console.log('Panel becoming visible, loading search results');
      panel.style.display = 'block';
      shiftMainContent(true);
      // Check if current YouTube video is in playlist
      checkCurrentYouTubeVideo();
      // Load search results when panel becomes visible
      searchManager.loadSearchResults();
    } else {
      console.log('Panel becoming hidden');
      panel.style.display = 'none';
      shiftMainContent(false);
    }
  }
}

// Load playlists from storage
function loadPlaylists(): void {
  chrome.runtime.sendMessage({ action: 'getPlaylists' }, (response) => {
    if (response && response.playlists) {
      playlistManager.setPlaylists(response.playlists);
      playlistManager.displayPlaylist();
    }
  });
}

// Check if current YouTube video is in playlist
function checkCurrentYouTubeVideo(): void {
  if (!isPanelVisible || !panel) return;
  
  // Extract video ID from current YouTube URL
  const currentUrl = window.location.href;
  const videoIdMatch = currentUrl.match(/[?&]v=([^&]+)/);
  
  if (videoIdMatch && videoIdMatch[1]) {
    const videoId = videoIdMatch[1];
    playlistManager.setCurrentPlayingVideo(videoId);
    playlistManager.updatePlaylistHighlighting();
  }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when panel is visible
    if (!isPanelVisible || !panel) return;
    
    // Debug all key presses
    if (e.ctrlKey || e.metaKey) {
      console.log('Ctrl/Cmd key pressed:', e.key, 'Panel visible:', isPanelVisible, 'Panel exists:', !!panel);
    }
    
    // Ctrl/Cmd + 1 - Focus search input
    if ((e.ctrlKey || e.metaKey) && e.key === '1') {
      console.log('Ctrl+1 pressed, focusing search panel');
      e.preventDefault();
      searchManager.focusSearchPanel();
      console.log('Search panel focused, lastFocusedPanel should be set to search');
      return;
    }
    
    // Ctrl/Cmd + 2 - Focus playlist panel
    if ((e.ctrlKey || e.metaKey) && e.key === '2') {
      console.log('Ctrl+2 pressed, focusing playlist panel');
      e.preventDefault();
      playlistManager.focusPlaylistPanel();
      return;
    }
    
    // Escape - Close panel
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePanel();
      return;
    }
    
    // Enter - Perform search (when search input is focused)
    if (e.key === 'Enter') {
      const searchInput = panel.querySelector('#search-input') as HTMLInputElement;
      if (searchInput && document.activeElement === searchInput) {
        e.preventDefault();
        const searchBtn = panel.querySelector('#search-btn') as HTMLButtonElement;
        if (searchBtn) {
          searchBtn.click();
        }
      }
      // If not in search input, let the other Enter handler take care of it
      return;
    }
    
    // Space - No longer used for extension actions (switched to Enter key)
    if (e.key === ' ') {
      // Allow normal spacebar behavior (YouTube play/pause, typing spaces, etc.)
      return;
    }
    
    // Arrow Up/Down - Handled by high-priority listener above
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // This is handled by the high-priority listener to prevent YouTube volume control
      return;
    }
    
    // Ctrl + Arrow Up/Down - Reorder playlist items
    if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInputFocused()) {
      e.preventDefault();
      const activePanel = searchManager.getActivePanel();
      if (activePanel === 'playlist') {
        playlistManager.reorderPlaylistItem(e.key === 'ArrowUp' ? -1 : 1);
      }
      return;
    }
    
    // Delete - Remove selected playlist item (when not in input field)
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused()) {
      e.preventDefault();
      const activePanel = searchManager.getActivePanel();
      if (activePanel === 'playlist') {
        playlistManager.removeSelectedPlaylistItem();
      }
      return;
    }
  });

  // Add Enter key handler for adding to playlist (YouTube doesn't use Enter for video controls)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && isPanelVisible && panel) {
      console.log('Enter key pressed in extension panel');
      const searchInput = panel?.querySelector('#search-input') as HTMLInputElement;
      const isSearchInputFocused = searchInput && document.activeElement === searchInput;
      
      // If search input is focused, perform search (existing behavior)
      if (isSearchInputFocused) {
        console.log('Search input focused, performing search');
        return; // Let the existing search handler take care of this
      }
      
      // If not in search input, handle our Enter key logic
      console.log('Handling Enter key for extension actions');
      const activePanel = searchManager.getActivePanel();
      if (activePanel === 'search') {
        console.log('Adding selected search item to playlist');
        // Prevent the search from being triggered
        e.preventDefault();
        e.stopPropagation();
        searchManager.addSelectedSearchItem();
      } else if (activePanel === 'playlist') {
        console.log('Playing selected playlist item');
        // Prevent any other Enter key behavior
        e.preventDefault();
        e.stopPropagation();
        playlistManager.playSelectedPlaylistItem();
      }
    }
  });

  // Add high-priority arrow key handler to prevent YouTube volume control
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && isPanelVisible && panel) {
      console.log('Arrow key pressed, panel visible:', isPanelVisible);
      const searchInput = panel?.querySelector('#search-input') as HTMLInputElement;
      const isSearchInputFocused = searchInput && document.activeElement === searchInput;
      
      // Always prevent YouTube's volume control when panel is visible
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Handle our arrow key logic
      if (isSearchInputFocused && e.key === 'ArrowDown') {
        console.log('Search input focused, navigating to first result');
        searchManager.navigateSearchResults(1);
        return;
      }
      
      if (isSearchInputFocused && e.key === 'ArrowUp') {
        console.log('Search input focused, staying in search box');
        return;
      }
      
      // Handle navigation in active panel
      const activePanel = searchManager.getActivePanel();
      console.log('Arrow key navigation, active panel:', activePanel);
      
      if (activePanel === 'search') {
        console.log('Navigating search results');
        searchManager.navigateSearchResults(e.key === 'ArrowUp' ? -1 : 1);
      } else if (activePanel === 'playlist') {
        console.log('Navigating playlist');
        playlistManager.navigatePlaylist(e.key === 'ArrowUp' ? -1 : 1);
      }
    }
  }, true); // Use capture phase to run before YouTube's listeners
}

// Check if any input field is focused
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  return (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    (activeElement as HTMLElement).contentEditable === 'true'
  );
}

// Show keyboard shortcuts modal
function showKeyboardShortcuts(): void {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'shortcuts-modal';
  modal.innerHTML = `
    <div class="shortcuts-content">
      <div class="shortcuts-header">
        <h3>⌨️ Keyboard Shortcuts</h3>
        <button class="close-modal" title="Close">&times;</button>
      </div>
      <div class="shortcuts-list">
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd + 1</kbd>
          <span>Focus search input</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl/Cmd + 2</kbd>
          <span>Focus playlist panel</span>
        </div>
        <div class="shortcut-item">
          <kbd>Escape</kbd>
          <span>Close panel</span>
        </div>
        <div class="shortcut-item">
          <kbd>Enter</kbd>
          <span>Perform search (when search focused) / Add to playlist (when item selected)</span>
        </div>
        <div class="shortcut-item">
          <kbd>↑/↓</kbd>
          <span>Navigate playlist items</span>
        </div>
        <div class="shortcut-item">
          <kbd>Delete/Backspace</kbd>
          <span>Remove selected playlist item</span>
        </div>
      </div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(modal);
  
  // Close modal handlers
  const closeModal = modal.querySelector('.close-modal');
  closeModal?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  // Close on Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Shift main content when panel is toggled
function shiftMainContent(panelVisible: boolean): void {
  const panelWidth = 400; // Same as panel width
  
  // Add CSS for main content shifting
  if (!document.getElementById('youtube-karaoke-main-content-style')) {
    const style = document.createElement('style');
    style.id = 'youtube-karaoke-main-content-style';
    style.textContent = `
      body {
        transition: margin-left 0.3s ease-out, transform 0.3s ease-out;
      }
      
      body.youtube-karaoke-panel-open {
        margin-left: ${panelWidth}px;
      }
      
      /* Ensure the panel doesn't affect the shifted content */
      #youtube-karaoke-panel {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 10000 !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Toggle the class on body
  if (panelVisible) {
    document.body.classList.add('youtube-karaoke-panel-open');
  } else {
    document.body.classList.remove('youtube-karaoke-panel-open');
    // Reset YouTube layout when panel is closed
    resetYouTubeLayout();
  }
}

// Force YouTube layout to shift right
function adjustYouTubeLayout(): void {
  // Force body to shift right
  document.body.style.marginLeft = '400px';
  document.body.style.transition = 'margin-left 0.3s ease';
  
  // Force page-manager to shift right
  const pageManager = document.getElementById('page-manager');
  if (pageManager) {
    pageManager.style.marginLeft = '400px';
    pageManager.style.width = 'calc(100% - 400px)';
    pageManager.style.transition = 'margin-left 0.3s ease';
  }
  
  // Force primary content to shift right
  const primary = document.getElementById('primary');
  if (primary) {
    primary.style.marginLeft = '0';
    primary.style.width = '100%';
    primary.style.maxWidth = '1200px';
  }
  
  // Force contents to shift right
  const contents = document.getElementById('contents');
  if (contents) {
    contents.style.marginLeft = '0';
    contents.style.width = '100%';
    contents.style.maxWidth = '1200px';
  }
  
  // Keep secondary content visible
  const secondary = document.getElementById('secondary');
  if (secondary) {
    secondary.style.display = 'block';
    secondary.style.position = 'relative';
    secondary.style.width = '300px';
    secondary.style.marginLeft = '20px';
  }
  
  // Force video player positioning
  const moviePlayer = document.getElementById('movie_player');
  if (moviePlayer) {
    moviePlayer.style.margin = '0 auto';
    moviePlayer.style.display = 'block';
  }
  
  console.log('YouTube layout forced to shift right');
}

// Reset YouTube layout when panel is closed
function resetYouTubeLayout(): void {
  // Force remove all our custom styles
  const customStyle = document.getElementById('youtube-karaoke-main-content-style');
  if (customStyle) {
    customStyle.remove();
  }
  
  // Reset body completely
  document.body.style.marginLeft = '';
  document.body.style.margin = '';
  document.body.style.transition = '';
  
  // Remove our custom class
  document.body.classList.remove('youtube-karaoke-panel-open');
  
  // Reset all YouTube elements to their default state
  const pageManager = document.getElementById('page-manager');
  if (pageManager) {
    pageManager.style.marginLeft = '';
    pageManager.style.width = '';
    pageManager.style.transition = '';
    pageManager.style.display = '';
    pageManager.style.justifyContent = '';
    pageManager.style.alignItems = '';
  }
  
  const primary = document.getElementById('primary');
  if (primary) {
    primary.style.marginLeft = '';
    primary.style.marginRight = '';
    primary.style.maxWidth = '';
    primary.style.width = '';
    primary.style.flex = '';
  }
  
  const contents = document.getElementById('contents');
  if (contents) {
    contents.style.marginLeft = '';
    contents.style.marginRight = '';
    contents.style.maxWidth = '';
    contents.style.width = '';
    contents.style.display = '';
    contents.style.justifyContent = '';
  }
  
  const secondary = document.getElementById('secondary');
  if (secondary) {
    secondary.style.position = '';
    secondary.style.right = '';
    secondary.style.top = '';
    secondary.style.width = '';
    secondary.style.height = '';
    secondary.style.overflowY = '';
    secondary.style.background = '';
    secondary.style.marginLeft = '';
    secondary.style.display = '';
  }
  
  const moviePlayer = document.getElementById('movie_player');
  if (moviePlayer) {
    moviePlayer.style.margin = '';
    moviePlayer.style.display = '';
  }
  
  // Force a reflow to ensure changes take effect
  document.body.offsetHeight;
  
  console.log('YouTube layout completely reset to original state');
}

// Prevent duplicate message listeners
if (!messageListenerAdded) {
  messageListenerAdded = true;
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    if (request.action === 'togglePanel') {
      console.log('Toggling panel...');
      togglePanel();
      // Send response back to background script
      sendResponse({ success: true });
    }
    // Return true to indicate we will send a response asynchronously
    return true;
  });
}

// Initialize panel on page load
// Auto-inject panel on YouTube pages
if (window.location.hostname.includes('youtube.com')) {
  // Check if panel already exists to prevent duplicates
  if (!document.getElementById('youtube-karaoke-panel')) {
    setTimeout(() => {
      injectPanel();
      if (panel) {
        panel.style.display = 'block';
        isPanelVisible = true;
        shiftMainContent(true);
        // Check current video after panel is loaded
        setTimeout(() => {
          checkCurrentYouTubeVideo();
        }, 500);
      }
    }, 1000); // Wait for YouTube to load
  } else {
    // Panel already exists, just check current video
    setTimeout(() => {
      checkCurrentYouTubeVideo();
    }, 1000);
  }
}

// Content script for YouTube Karaoke Extension
console.log('YouTube Karaoke Extension content script loaded');

// Check if content script already loaded to prevent duplicates
if ((window as unknown as { youtubeKaraokeLoaded?: boolean }).youtubeKaraokeLoaded) {
  console.log('YouTube Karaoke content script already loaded, skipping...');
  // Exit early to prevent duplicate execution
  throw new Error('Content script already loaded');
}
(window as unknown as { youtubeKaraokeLoaded: boolean }).youtubeKaraokeLoaded = true;

// Check if panel already exists
let panel: HTMLElement | null = null;
let isPanelVisible = false;
let playlists: PlaylistItem[] = [];
let searchResults: SearchResult[] = [];
let messageListenerAdded = false;
let currentPlayingVideoId: string | null = null;

// Type definitions
interface PlaylistItem {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  addedAt: number;
}

interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  description?: string;
}

interface AdvancedFilters {
  contentType?: string;
  duration?: string;
  uploadDate?: string;
  hasCaptions?: boolean;
  isHd?: boolean;
  isLive?: boolean;
}

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
  
  // Add event listeners
  setupEventListeners();
  
  // Load existing playlists
  loadPlaylists();
  
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
    performSearch(searchInput?.value || '', searchFilter?.value || 'relevance');
  });
  
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value, searchFilter?.value || 'relevance');
    }
  });
  
  // Playlist controls
  const clearPlaylistBtn = panel.querySelector('#clear-playlist');
  const shufflePlaylistBtn = panel.querySelector('#shuffle-playlist');
  
  clearPlaylistBtn?.addEventListener('click', () => {
    clearPlaylist();
  });
  
  shufflePlaylistBtn?.addEventListener('click', () => {
    shufflePlaylist();
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
    const filters = getAdvancedFilters();
    performSearchWithFilters(searchInput?.value || '', searchFilter?.value || 'relevance', filters);
    if (advancedFiltersPanel) {
      const panel = advancedFiltersPanel as HTMLElement;
      panel.style.display = 'none';
    }
  });
  
  // Clear all filters
  clearFiltersBtn?.addEventListener('click', () => {
    clearAdvancedFilters();
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
      panel.style.display = 'block';
      shiftMainContent(true);
      // Check if current YouTube video is in playlist
      checkCurrentYouTubeVideo();
    } else {
      panel.style.display = 'none';
      shiftMainContent(false);
    }
  }
}

// Load playlists from storage
function loadPlaylists(): void {
  chrome.runtime.sendMessage({ action: 'getPlaylists' }, (response) => {
    if (response && response.playlists) {
      playlists = response.playlists; // Update global playlists array
      displayPlaylist(playlists);
    }
  });
}

// Display playlist items
function displayPlaylist(playlistsToDisplay?: PlaylistItem[]): void {
  const playlistContainer = panel?.querySelector('#playlist-items');
  const playlistCount = panel?.querySelector('#playlist-count');
  if (!playlistContainer) return;
  
  // Use global playlists array if no parameter provided
  const playlistsToShow = playlistsToDisplay || playlists;
  
  // Update count
  if (playlistCount) {
    playlistCount.textContent = playlistsToShow.length.toString();
  }
  
  if (playlistsToShow.length === 0) {
    playlistContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎵</div>
        <p class="empty-message">No videos in playlist</p>
        <p class="empty-hint">Search and add videos below</p>
      </div>
    `;
    return;
  }
  
  playlistContainer.innerHTML = playlistsToShow.map((item, index) => `
    <div class="playlist-item" data-index="${index}" data-video-id="${item.videoId}">
      <div class="item-thumbnail">
        <img src="${item.thumbnail}" alt="${item.title}" class="thumbnail" />
        <div class="play-overlay">
          <button class="play-btn" data-url="${item.videoId}" title="Play Video">
            <span class="play-icon">▶️</span>
          </button>
        </div>
      </div>
      <div class="item-info">
        <h5 class="item-title" title="${item.title}">${item.title}</h5>
        <p class="item-channel">${item.channel}</p>
        ${item.duration ? `<span class="item-duration">${item.duration}</span>` : ''}
      </div>
      <div class="item-actions">
        <button class="remove-btn" data-index="${index}" title="Remove from Playlist">
          <span class="remove-icon">🗑️</span>
        </button>
        <button class="move-up-btn" data-index="${index}" title="Move Up" ${index === 0 ? 'disabled' : ''}>
          <span class="move-icon">⬆️</span>
        </button>
        <button class="move-down-btn" data-index="${index}" title="Move Down" ${index === playlists.length - 1 ? 'disabled' : ''}>
          <span class="move-icon">⬇️</span>
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners for playlist items
  setupPlaylistEventListeners();
  
  // Update highlighting for currently playing video
  updatePlaylistHighlighting();
}

// Setup playlist item event listeners
function setupPlaylistEventListeners(): void {
  const playBtns = panel?.querySelectorAll('.play-btn');
  const removeBtns = panel?.querySelectorAll('.remove-btn');
  const moveUpBtns = panel?.querySelectorAll('.move-up-btn');
  const moveDownBtns = panel?.querySelectorAll('.move-down-btn');
  
  playBtns?.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = (e.target as HTMLElement).closest('.play-btn') as HTMLElement;
      const videoId = target?.dataset.url;
      if (videoId) {
        playVideo(videoId);
      }
    });
  });
  
  removeBtns?.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = (e.target as HTMLElement).closest('.remove-btn') as HTMLElement;
      const index = parseInt(target?.dataset.index || '0');
      removeFromPlaylist(index);
    });
  });
  
  moveUpBtns?.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = (e.target as HTMLElement).closest('.move-up-btn') as HTMLElement;
      const index = parseInt(target?.dataset.index || '0');
      movePlaylistItem(index, index - 1);
    });
  });
  
  moveDownBtns?.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = (e.target as HTMLElement).closest('.move-down-btn') as HTMLElement;
      const index = parseInt(target?.dataset.index || '0');
      movePlaylistItem(index, index + 1);
    });
  });
}

// Play video by navigating to YouTube while keeping panel visible
function playVideo(videoId: string): void {
  // Update current playing video
  currentPlayingVideoId = videoId;
  
  // Update playlist highlighting
  updatePlaylistHighlighting();
  
  // Navigate to YouTube
  window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Show notification
  showNotification('Opening YouTube video...', 'info');
}

// Update playlist highlighting for currently playing video
function updatePlaylistHighlighting(): void {
  if (!panel) return;
  
  // Remove all playing highlights
  const playingItems = panel.querySelectorAll('.playlist-item.playing');
  playingItems.forEach(item => item.classList.remove('playing'));
  
  // Add playing highlight to current video
  if (currentPlayingVideoId) {
    const currentItem = panel.querySelector(`[data-video-id="${currentPlayingVideoId}"]`);
    
    if (currentItem) {
      currentItem.classList.add('playing');
    }
  }
}

// Check if current YouTube video is in playlist
function checkCurrentYouTubeVideo(): void {
  if (!isPanelVisible || !panel) return;
  
  // Extract video ID from current YouTube URL
  const currentUrl = window.location.href;
  const videoIdMatch = currentUrl.match(/[?&]v=([^&]+)/);
  
  if (videoIdMatch && videoIdMatch[1]) {
    const videoId = videoIdMatch[1];
    
    // Check if this video is in our playlist
    const playlistItem = playlists.find(item => item.videoId === videoId);
    
    if (playlistItem) {
      currentPlayingVideoId = videoId;
      updatePlaylistHighlighting();
    }
  }
}

// Perform YouTube search using YouTube Data API v3
async function performSearch(query: string, order: string = 'relevance'): Promise<void> {
  if (!query.trim()) return;
  
  const resultsContainer = panel?.querySelector('#search-results');
  const statusContainer = panel?.querySelector('#search-status');
  if (!resultsContainer) return;
  
  // Show loading state
  resultsContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Searching YouTube...</p>
    </div>
  `;
  
  if (statusContainer) {
    statusContainer.textContent = 'Searching...';
  }
  
  try {
    // Use real YouTube search using logged-in user session
    const realResults = await performRealYouTubeSearch(query, order);
    searchResults = realResults;
    displaySearchResults(realResults);
    
    if (statusContainer) {
      statusContainer.textContent = `Found ${realResults.length} results`;
    }
  } catch (error) {
    console.error('Search error:', error);
    resultsContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <p class="error-message">Search failed. Please try again.</p>
        <button class="retry-btn" onclick="performSearch('${query}', '${order}')">Retry</button>
      </div>
    `;
    
    if (statusContainer) {
      statusContainer.textContent = 'Search failed';
    }
  }
}


// Perform real YouTube search using logged-in user session
async function performRealYouTubeSearch(query: string, order: string): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    // Create a hidden iframe to perform the search
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    
    // Build search URL with filters
    let searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    // Add order parameter
    if (order === 'date') {
      searchUrl += '&sp=EgIIAQ%253D%253D'; // Sort by upload date
    } else if (order === 'rating') {
      searchUrl += '&sp=EgIIAw%253D%253D'; // Sort by rating
    } else if (order === 'viewCount') {
      searchUrl += '&sp=EgIIBA%253D%253D'; // Sort by view count
    }
    
    iframe.src = searchUrl;
    
    // Handle iframe load
    iframe.onload = () => {
      try {
        // Wait for YouTube to load
        setTimeout(() => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
              throw new Error('Cannot access iframe content - CORS blocked');
            }
            
            // Extract search results from YouTube's DOM
            const results = extractSearchResultsFromDOM(iframeDoc, query);
            
            // Clean up
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
            
            resolve(results);
          } catch (error) {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
            reject(error);
          }
        }, 3000); // Wait 3 seconds for YouTube to load
      } catch (error) {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        reject(error);
      }
    };
    
    iframe.onerror = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      reject(new Error('Failed to load YouTube search'));
    };
    
    // Add iframe to page
    document.body.appendChild(iframe);
  });
}

// Extract search results from YouTube's DOM
function extractSearchResultsFromDOM(doc: Document, query: string): SearchResult[] {
  const results: SearchResult[] = [];
  
  try {
    // Look for video elements in YouTube's search results
    const videoElements = doc.querySelectorAll('ytd-video-renderer');
    
    videoElements.forEach((element, index) => {
      if (index >= 10) return; // Limit to 10 results
      
      try {
        // Extract video information
        const titleElement = element.querySelector('#video-title');
        const channelElement = element.querySelector('#channel-name a');
        const thumbnailElement = element.querySelector('#thumbnail img');
        const durationElement = element.querySelector('#overlays #text');
        const linkElement = element.querySelector('#video-title');
        
        if (titleElement && linkElement) {
          const title = titleElement.textContent?.trim() || 'Unknown Title';
          const channel = channelElement?.textContent?.trim() || 'Unknown Channel';
          const thumbnail = thumbnailElement?.getAttribute('src') || '';
          const duration = durationElement?.textContent?.trim() || '';
          const href = linkElement.getAttribute('href') || '';
          
          // Extract video ID from href
          const videoIdMatch = href.match(/[?&]v=([^&]+)/);
          const videoId = videoIdMatch ? videoIdMatch[1] : `video_${Date.now()}_${index}`;
          
          results.push({
            videoId: videoId || `video_${Date.now()}_${index}`,
            title,
            channel,
            thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            duration: duration || undefined,
            description: `Search result for: ${query}`
          });
        }
      } catch (error) {
        console.warn('Error extracting video info:', error);
      }
    });
    
  } catch (error) {
    console.error('Error extracting search results:', error);
  }
  
  // If no results found, return mock data as fallback
  if (results.length === 0) {
    console.log('No results found, using fallback data');
    return [
      {
        videoId: 'dQw4w9WgXcQ',
        title: `${query} - Karaoke Version`,
        channel: 'Karaoke Channel',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        duration: '3:32',
        description: 'Fallback result - YouTube search not accessible'
      }
    ];
  }
  
  return results;
}

// Get advanced filters from the UI
function getAdvancedFilters(): AdvancedFilters {
  if (!panel) return {};
  
  const contentType = panel.querySelector('input[name="content-type"]:checked') as HTMLInputElement;
  const duration = panel.querySelector('input[name="duration"]:checked') as HTMLInputElement;
  const uploadDate = panel.querySelector('input[name="upload-date"]:checked') as HTMLInputElement;
  const hasCaptions = panel.querySelector('input[name="has-captions"]') as HTMLInputElement;
  const isHd = panel.querySelector('input[name="is-hd"]') as HTMLInputElement;
  const isLive = panel.querySelector('input[name="is-live"]') as HTMLInputElement;
  
  return {
    contentType: contentType?.value || 'videos',
    duration: duration?.value || 'any',
    uploadDate: uploadDate?.value || 'any',
    hasCaptions: hasCaptions?.checked || false,
    isHd: isHd?.checked || false,
    isLive: isLive?.checked || false
  };
}

// Clear all advanced filters
function clearAdvancedFilters(): void {
  if (!panel) return;
  
  // Reset radio buttons to default
  const contentTypeVideos = panel.querySelector('input[name="content-type"][value="videos"]') as HTMLInputElement;
  const durationAny = panel.querySelector('input[name="duration"][value="any"]') as HTMLInputElement;
  const uploadDateAny = panel.querySelector('input[name="upload-date"][value="any"]') as HTMLInputElement;
  
  if (contentTypeVideos) contentTypeVideos.checked = true;
  if (durationAny) durationAny.checked = true;
  if (uploadDateAny) uploadDateAny.checked = true;
  
  // Uncheck checkboxes
  const checkboxes = panel.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
}

// Perform search with advanced filters
async function performSearchWithFilters(query: string, order: string, filters: AdvancedFilters): Promise<void> {
  if (!query.trim()) return;
  
  const resultsContainer = panel?.querySelector('#search-results');
  const statusContainer = panel?.querySelector('#search-status');
  if (!resultsContainer) return;
  
  // Show loading state
  resultsContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Searching with filters...</p>
    </div>
  `;
  
  if (statusContainer) {
    statusContainer.textContent = 'Searching with filters...';
  }
  
  try {
    // Use real YouTube search with filters
    const realResults = await performRealYouTubeSearchWithFilters(query, order, filters);
    searchResults = realResults;
    displaySearchResults(realResults);
    
    if (statusContainer) {
      statusContainer.textContent = `Found ${realResults.length} results`;
    }
  } catch (error) {
    console.error('Search error:', error);
    resultsContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <p class="error-message">Search failed. Please try again.</p>
        <button class="retry-btn" onclick="performSearchWithFilters('${query}', '${order}', ${JSON.stringify(filters)})">Retry</button>
      </div>
    `;
    
    if (statusContainer) {
      statusContainer.textContent = 'Search failed';
    }
  }
}

// Perform real YouTube search with advanced filters
async function performRealYouTubeSearchWithFilters(query: string, order: string, filters: AdvancedFilters): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    // Create a hidden iframe to perform the search
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    
    // Build search URL with filters
    let searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    // Add order parameter
    if (order === 'date') {
      searchUrl += '&sp=EgIIAQ%253D%253D'; // Sort by upload date
    } else if (order === 'rating') {
      searchUrl += '&sp=EgIIAw%253D%253D'; // Sort by rating
    } else if (order === 'viewCount') {
      searchUrl += '&sp=EgIIBA%253D%253D'; // Sort by view count
    }
    
    // Add content type filter
    if (filters.contentType === 'playlists') {
      searchUrl += '&sp=EgIQAw%253D%253D'; // Playlists only
    } else if (filters.contentType === 'channels') {
      searchUrl += '&sp=EgIQAg%253D%253D'; // Channels only
    } else {
      searchUrl += '&sp=EgIQAQ%253D%253D'; // Videos only
    }
    
    // Add duration filter
    if (filters.duration === 'short') {
      searchUrl += '&sp=EgIYAQ%253D%253D'; // Short videos
    } else if (filters.duration === 'medium') {
      searchUrl += '&sp=EgIYAw%253D%253D'; // Medium videos
    } else if (filters.duration === 'long') {
      searchUrl += '&sp=EgIYBA%253D%253D'; // Long videos
    }
    
    // Add upload date filter
    if (filters.uploadDate === 'today') {
      searchUrl += '&sp=EgIIAQ%253D%253D'; // Today
    } else if (filters.uploadDate === 'week') {
      searchUrl += '&sp=EgIIAw%253D%253D'; // This week
    } else if (filters.uploadDate === 'month') {
      searchUrl += '&sp=EgIIBA%253D%253D'; // This month
    } else if (filters.uploadDate === 'year') {
      searchUrl += '&sp=EgIIBQ%253D%253D'; // This year
    }
    
    // Add additional filters
    if (filters.hasCaptions) {
      searchUrl += '&sp=EgIoAQ%253D%253D'; // Has captions
    }
    
    if (filters.isHd) {
      searchUrl += '&sp=EgJYAQ%253D%253D'; // HD quality
    }
    
    if (filters.isLive) {
      searchUrl += '&sp=EgJAAQ%253D%253D'; // Live videos
    }
    
    console.log('Search URL with filters:', searchUrl);
    
    iframe.src = searchUrl;
    
    // Handle iframe load
    iframe.onload = () => {
      try {
        // Wait for YouTube to load
        setTimeout(() => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
              throw new Error('Cannot access iframe content - CORS blocked');
            }
            
            // Extract search results from YouTube's DOM
            const results = extractSearchResultsFromDOM(iframeDoc, query);
            
            // Apply client-side filtering for additional filters
            const filteredResults = applyClientSideFilters(results, filters);
            
            // Clean up
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
            
            resolve(filteredResults);
          } catch (error) {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
            reject(error);
          }
        }, 3000); // Wait 3 seconds for YouTube to load
      } catch (error) {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        reject(error);
      }
    };
    
    iframe.onerror = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      reject(new Error('Failed to load YouTube search'));
    };
    
    // Add iframe to page
    document.body.appendChild(iframe);
  });
}

// Apply client-side filters to search results
function applyClientSideFilters(results: SearchResult[], filters: AdvancedFilters): SearchResult[] {
  return results.filter(result => {
    // Duration filtering (if we can parse duration)
    if (filters.duration !== 'any' && result.duration) {
      const duration = parseDuration(result.duration);
      if (duration > 0) {
        if (filters.duration === 'short' && duration >= 240) return false; // 4 minutes
        if (filters.duration === 'medium' && (duration < 240 || duration > 1200)) return false; // 4-20 minutes
        if (filters.duration === 'long' && duration <= 1200) return false; // >20 minutes
      }
    }
    
    // Additional filters would go here if we had more data
    // For now, we'll rely on YouTube's server-side filtering
    
    return true;
  });
}

// Parse duration string to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/(\d+):(\d+)/);
  if (match && match[1] && match[2]) {
    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    return minutes * 60 + seconds;
  }
  return 0;
}

// Display search results
function displaySearchResults(results: SearchResult[]): void {
  const resultsContainer = panel?.querySelector('#search-results');
  if (!resultsContainer) return;
  
  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p class="empty-message">No results found</p>
        <p class="empty-hint">Try a different search term</p>
      </div>
    `;
    return;
  }
  
  resultsContainer.innerHTML = results.map((item, index) => `
    <div class="search-item" data-index="${index}">
      <div class="item-thumbnail">
        <img src="${item.thumbnail}" alt="${item.title}" class="thumbnail" />
        <div class="duration-badge">${item.duration || ''}</div>
      </div>
      <div class="item-info">
        <h5 class="item-title" title="${item.title}">${item.title}</h5>
        <p class="item-channel">${item.channel}</p>
        ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
      </div>
      <div class="item-actions">
        <button class="add-btn" data-index="${index}" title="Add to Playlist">
          <span class="add-icon">➕</span>
          <span class="add-text">Add</span>
        </button>
        <button class="preview-btn" data-url="${item.videoId}" title="Preview">
          <span class="preview-icon">👁️</span>
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners for search items
  setupSearchEventListeners();
}

// Setup search item event listeners
function setupSearchEventListeners(): void {
  const addBtns = panel?.querySelectorAll('.add-btn');
  const previewBtns = panel?.querySelectorAll('.preview-btn');
  
  addBtns?.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = (e.target as HTMLElement).closest('.add-btn') as HTMLElement;
      const index = parseInt(target?.dataset.index || '0');
      addToPlaylist(index);
    });
  });
  
  previewBtns?.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = (e.target as HTMLElement).closest('.preview-btn') as HTMLElement;
      const videoId = target?.dataset.url;
      if (videoId) {
        playVideo(videoId);
      }
    });
  });
}

// Add video to playlist
function addToPlaylist(searchIndex: number): void {
  if (searchIndex < 0 || searchIndex >= searchResults.length) return;
  
  const searchItem = searchResults[searchIndex];
  if (!searchItem) return;
  
  const playlistItem: PlaylistItem = {
    videoId: searchItem.videoId,
    title: searchItem.title,
    channel: searchItem.channel,
    thumbnail: searchItem.thumbnail,
    duration: searchItem.duration,
    addedAt: Date.now()
  };
  
  // Check if already in playlist
  const exists = playlists.some(item => item.videoId === playlistItem.videoId);
  if (exists) {
    showNotification('Video already in playlist!', 'warning');
    return;
  }
  
  playlists.push(playlistItem);
  savePlaylist();
  displayPlaylist(playlists);
  showNotification('Added to playlist!', 'success');
}

// Remove video from playlist
function removeFromPlaylist(index: number): void {
  if (index < 0 || index >= playlists.length) return;
  
  playlists.splice(index, 1);
  savePlaylist();
  displayPlaylist(playlists);
  showNotification('Removed from playlist', 'info');
}

// Move playlist item
function movePlaylistItem(fromIndex: number, toIndex: number): void {
  if (fromIndex < 0 || fromIndex >= playlists.length || 
      toIndex < 0 || toIndex >= playlists.length) return;
  
  const item = playlists.splice(fromIndex, 1)[0];
  if (item) {
    playlists.splice(toIndex, 0, item);
    savePlaylist();
    displayPlaylist(playlists);
  }
}

// Clear entire playlist
function clearPlaylist(): void {
  if (playlists.length === 0) return;
  
  if (confirm('Are you sure you want to clear the entire playlist?')) {
    playlists = [];
    savePlaylist();
    displayPlaylist(playlists);
    showNotification('Playlist cleared', 'info');
  }
}

// Shuffle playlist
function shufflePlaylist(): void {
  if (playlists.length <= 1) return;
  
  for (let i = playlists.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = playlists[i];
    if (temp && playlists[j]) {
      playlists[i] = playlists[j];
      playlists[j] = temp;
    }
  }
  
  savePlaylist();
  displayPlaylist(playlists);
  showNotification('Playlist shuffled!', 'success');
}

// Save playlist to storage
function savePlaylist(): void {
  chrome.runtime.sendMessage({ 
    action: 'savePlaylist', 
    playlists: playlists 
  }, (response) => {
    if (response && response.success) {
      console.log('Playlist saved successfully');
    }
  });
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

// Setup keyboard shortcuts
function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when panel is visible
    if (!isPanelVisible || !panel) return;
    
    // Ctrl/Cmd + K - Focus search input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = panel.querySelector('#search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
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
      return;
    }
    
    // Space - Play/pause current video (when not in input field)
    if (e.key === ' ' && !isInputFocused()) {
      e.preventDefault();
      const firstPlayBtn = panel.querySelector('.play-btn') as HTMLButtonElement;
      if (firstPlayBtn) {
        firstPlayBtn.click();
      }
      return;
    }
    
    // Arrow Up/Down - Navigate playlist items (when not in input field)
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInputFocused()) {
      e.preventDefault();
      navigatePlaylist(e.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    
    // Delete - Remove selected playlist item (when not in input field)
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused()) {
      e.preventDefault();
      removeSelectedPlaylistItem();
      return;
    }
  });
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

// Navigate playlist items
function navigatePlaylist(direction: number): void {
  const playlistItems = panel?.querySelectorAll('.playlist-item');
  if (!playlistItems || playlistItems.length === 0) return;
  
  // Find currently selected item
  let selectedIndex = -1;
  playlistItems.forEach((item, index) => {
    if (item.classList.contains('selected')) {
      selectedIndex = index;
    }
  });
  
  // Calculate new index
  let newIndex = selectedIndex + direction;
  if (newIndex < 0) newIndex = playlistItems.length - 1;
  if (newIndex >= playlistItems.length) newIndex = 0;
  
  // Remove previous selection
  playlistItems.forEach(item => item.classList.remove('selected'));
  
  // Add selection to new item
  const newItem = playlistItems[newIndex];
  if (newItem) {
    newItem.classList.add('selected');
    newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Remove selected playlist item
function removeSelectedPlaylistItem(): void {
  const selectedItem = panel?.querySelector('.playlist-item.selected');
  if (!selectedItem) return;
  
  const index = parseInt(selectedItem.getAttribute('data-index') || '0');
  removeFromPlaylist(index);
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
          <kbd>Ctrl/Cmd + K</kbd>
          <span>Focus search input</span>
        </div>
        <div class="shortcut-item">
          <kbd>Escape</kbd>
          <span>Close panel</span>
        </div>
        <div class="shortcut-item">
          <kbd>Enter</kbd>
          <span>Perform search (when search focused)</span>
        </div>
        <div class="shortcut-item">
          <kbd>Space</kbd>
          <span>Play/pause current video</span>
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

// Show notification
function showNotification(message: string, type: 'success' | 'warning' | 'error' | 'info'): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Add to panel if it exists
  if (panel) {
    panel.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
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

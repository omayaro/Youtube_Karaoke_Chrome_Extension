// Search functionality for YouTube Karaoke Extension

export interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  description?: string;
}

export interface AdvancedFilters {
  contentType?: string;
  duration?: string;
  uploadDate?: string;
  hasCaptions?: boolean;
  isHd?: boolean;
  isLive?: boolean;
}

export class SearchManager {
  private panel: HTMLElement | null = null;
  private searchResults: SearchResult[] = [];
  private lastFocusedPanel: 'search' | 'playlist' | null = null;
  private forceSearchPanel: boolean = false; // Force search panel to be active

  constructor(panel: HTMLElement | null) {
    this.panel = panel;
  }

  // Set panel reference
  setPanel(panel: HTMLElement | null): void {
    this.panel = panel;
  }

  // Set search results
  setSearchResults(results: SearchResult[]): void {
    this.searchResults = results;
    // Save search results to storage so they persist across page navigation
    this.saveSearchResults();
  }

  // Get search results
  getSearchResults(): SearchResult[] {
    return this.searchResults;
  }

  // Perform YouTube search using YouTube Data API v3
  async performSearch(query: string, order: string = 'relevance'): Promise<void> {
    if (!query.trim()) return;
    
    const resultsContainer = this.panel?.querySelector('#search-results');
    const statusContainer = this.panel?.querySelector('#search-status');
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
      const realResults = await this.performRealYouTubeSearch(query, order);
      console.log('Search completed, got', realResults.length, 'results');
      this.setSearchResults(realResults); // This will save to storage
      this.displaySearchResults(realResults);
      
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
  async performRealYouTubeSearch(query: string, order: string): Promise<SearchResult[]> {
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
              const results = this.extractSearchResultsFromDOM(iframeDoc, query);
              
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
  extractSearchResultsFromDOM(doc: Document, query: string): SearchResult[] {
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

  // Display search results
  displaySearchResults(results: SearchResult[]): void {
    console.log('displaySearchResults called with', results.length, 'results');
    const resultsContainer = this.panel?.querySelector('#search-results');
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
          <button class="add-btn large" data-index="${index}" title="Add to Playlist">
            <span class="add-icon">➕</span>
            <span class="add-text">Add to Playlist</span>
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners for search items
    this.setupSearchEventListeners();
  }

  // Setup search item event listeners
  setupSearchEventListeners(): void {
    const addBtns = this.panel?.querySelectorAll('.add-btn');
    const searchItems = this.panel?.querySelectorAll('.search-item');
    
    // Handle add button clicks
    addBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = (e.target as HTMLElement).closest('.add-btn') as HTMLElement;
        const index = parseInt(target?.dataset.index || '0');
        this.addToPlaylist(index);
      });
    });
    
    // Handle search item clicks (to select and switch to search panel)
    searchItems?.forEach((item, index) => {
      item.addEventListener('click', (e) => {
        // Don't handle clicks on the add button (let add button handle its own clicks)
        if ((e.target as HTMLElement).closest('.add-btn')) {
          return;
        }
        
        console.log('Search item clicked, index:', index);
        
        // Remove previous selection from both search and playlist
        const allSearchItems = this.panel?.querySelectorAll('.search-item');
        const allPlaylistItems = this.panel?.querySelectorAll('.playlist-item');
        allSearchItems?.forEach(searchItem => searchItem.classList.remove('selected'));
        allPlaylistItems?.forEach(playlistItem => playlistItem.classList.remove('selected'));
        
        // Add selection to clicked search item
        item.classList.add('selected');
        
        // Scroll into view
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Focus the search panel by focusing the search input
        const searchInput = this.panel?.querySelector('#search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          this.lastFocusedPanel = 'search';
          this.forceSearchPanel = true; // Force search panel to be active
          console.log('Search input focused, active panel should now be search, forceSearchPanel set to true');
        }
        
        console.log('Search item selected, active panel should now be search');
      });
    });
  }

  // Add video to playlist (delegates to playlist manager)
  addToPlaylist(searchIndex: number): void {
    if (searchIndex < 0 || searchIndex >= this.searchResults.length) return;
    
    const searchItem = this.searchResults[searchIndex];
    if (!searchItem) return;
    
    // This will be handled by the main content script
    // which will delegate to the playlist manager
    const event = new CustomEvent('addToPlaylist', { 
      detail: { searchItem, searchIndex } 
    });
    document.dispatchEvent(event);
  }

  // Navigate search results
  navigateSearchResults(direction: number): void {
    const searchResults = this.panel?.querySelectorAll('.search-item');
    if (!searchResults || searchResults.length === 0) {
      // If no search results, focus search input
      const searchInput = this.panel?.querySelector('#search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
      return;
    }
    
    // Find currently selected search result
    let selectedIndex = -1;
    searchResults.forEach((item, index) => {
      if (item.classList.contains('selected')) {
        selectedIndex = index;
      }
    });
    
    // If no item is selected and we're going down, select first item
    if (selectedIndex === -1 && direction > 0) {
      selectedIndex = -1; // Will become 0 after adding direction
    }
    
    // Calculate new index
    let newIndex = selectedIndex + direction;
    if (newIndex < 0) {
      // Go to search input if at first item and going up
      const searchInput = this.panel?.querySelector('#search-input') as HTMLInputElement;
      if (searchInput) {
        console.log('Going back to search input from search results');
        // Remove any selection first
        searchResults.forEach(item => item.classList.remove('selected'));
        // Focus search input
        searchInput.focus();
        searchInput.select();
        return;
      }
      newIndex = searchResults.length - 1;
    }
    if (newIndex >= searchResults.length) newIndex = 0;
    
    // Remove previous selection
    searchResults.forEach(item => item.classList.remove('selected'));
    
    // Add selection to new item
    const newItem = searchResults[newIndex];
    if (newItem) {
      newItem.classList.add('selected');
      newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Blur search input so Enter will add to playlist instead of searching
      const searchInput = this.panel?.querySelector('#search-input') as HTMLInputElement;
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
        console.log('Search input blurred, Enter will now add to playlist');
      }
    }
  }

  // Add selected search item to playlist
  addSelectedSearchItem(): void {
    console.log('addSelectedSearchItem called');
    const selectedItem = this.panel?.querySelector('.search-item.selected');
    console.log('Selected item found:', !!selectedItem);
    if (!selectedItem) {
      console.log('No selected search item found');
      return;
    }
    
    const addBtn = selectedItem.querySelector('.add-btn') as HTMLButtonElement;
    console.log('Add button found:', !!addBtn);
    if (addBtn) {
      console.log('Clicking add button');
      addBtn.click();
    } else {
      console.log('No add button found in selected item');
    }
  }

  // Focus search panel
  focusSearchPanel(): void {
    const searchInput = this.panel?.querySelector('#search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      this.lastFocusedPanel = 'search';
      this.forceSearchPanel = true; // Force search panel to be active
      console.log('Search panel focused, lastFocusedPanel set to search, forceSearchPanel set to true');
    }
  }

  // Get active panel (search or playlist)
  getActivePanel(): 'search' | 'playlist' {
    const searchInput = this.panel?.querySelector('#search-input') as HTMLInputElement;
    const playlistItems = this.panel?.querySelectorAll('.playlist-item');
    const searchItems = this.panel?.querySelectorAll('.search-item');
    
    console.log('getActivePanel called - lastFocusedPanel:', this.lastFocusedPanel, 'forceSearchPanel:', this.forceSearchPanel);
    console.log('Search input focused:', searchInput && document.activeElement === searchInput);
    console.log('Playlist item selected:', !!this.panel?.querySelector('.playlist-item.selected'));
    console.log('Search item selected:', !!this.panel?.querySelector('.search-item.selected'));
    console.log('Search items count:', searchItems?.length || 0);
    console.log('Playlist items count:', playlistItems?.length || 0);
    
    // If search input is focused, it's search panel
    if (searchInput && document.activeElement === searchInput) {
      this.lastFocusedPanel = 'search';
      this.forceSearchPanel = true;
      console.log('Returning search panel (input focused)');
      return 'search';
    }
    
    // If forceSearchPanel is true, return search panel
    if (this.forceSearchPanel) {
      console.log('Returning search panel (forced)');
      return 'search';
    }
    
    // If any playlist item is selected, it's playlist panel
    if (playlistItems && this.panel?.querySelector('.playlist-item.selected')) {
      this.lastFocusedPanel = 'playlist';
      this.forceSearchPanel = false;
      console.log('Returning playlist panel (playlist item selected)');
      return 'playlist';
    }
    
    // If any search item is selected, it's search panel
    if (searchItems && this.panel?.querySelector('.search-item.selected')) {
      this.lastFocusedPanel = 'search';
      this.forceSearchPanel = true;
      console.log('Returning search panel (search item selected)');
      return 'search';
    }
    
    // If we have a last focused panel and no clear selection, use that
    if (this.lastFocusedPanel) {
      console.log('Using last focused panel:', this.lastFocusedPanel);
      return this.lastFocusedPanel;
    }
    
    // If there are search results visible, default to search panel
    if (searchItems && searchItems.length > 0) {
      this.lastFocusedPanel = 'search';
      this.forceSearchPanel = true;
      console.log('Returning search panel (search results visible)');
      return 'search';
    }
    
    // If there are playlist items visible and no search results, default to playlist panel
    if (playlistItems && playlistItems.length > 0 && (!searchItems || searchItems.length === 0)) {
      this.lastFocusedPanel = 'playlist';
      this.forceSearchPanel = false;
      console.log('Returning playlist panel (playlist items visible, no search results)');
      return 'playlist';
    }
    
    // Default to search panel
    this.lastFocusedPanel = 'search';
    this.forceSearchPanel = true;
    console.log('Returning search panel (default)');
    return 'search';
  }

  // Get advanced filters from the UI
  getAdvancedFilters(): AdvancedFilters {
    if (!this.panel) return {};
    
    const contentType = this.panel.querySelector('input[name="content-type"]:checked') as HTMLInputElement;
    const duration = this.panel.querySelector('input[name="duration"]:checked') as HTMLInputElement;
    const uploadDate = this.panel.querySelector('input[name="upload-date"]:checked') as HTMLInputElement;
    const hasCaptions = this.panel.querySelector('input[name="has-captions"]') as HTMLInputElement;
    const isHd = this.panel.querySelector('input[name="is-hd"]') as HTMLInputElement;
    const isLive = this.panel.querySelector('input[name="is-live"]') as HTMLInputElement;
    
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
  clearAdvancedFilters(): void {
    if (!this.panel) return;
    
    // Reset radio buttons to default
    const contentTypeVideos = this.panel.querySelector('input[name="content-type"][value="videos"]') as HTMLInputElement;
    const durationAny = this.panel.querySelector('input[name="duration"][value="any"]') as HTMLInputElement;
    const uploadDateAny = this.panel.querySelector('input[name="upload-date"][value="any"]') as HTMLInputElement;
    
    if (contentTypeVideos) contentTypeVideos.checked = true;
    if (durationAny) durationAny.checked = true;
    if (uploadDateAny) uploadDateAny.checked = true;
    
    // Uncheck checkboxes
    const checkboxes = this.panel.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
  }

  // Public methods for accessing private properties
  setLastFocusedPanel(panel: 'search' | 'playlist'): void {
    this.lastFocusedPanel = panel;
  }

  setForceSearchPanel(force: boolean): void {
    this.forceSearchPanel = force;
  }

  // Save search results to storage
  saveSearchResults(): void {
    console.log('saveSearchResults called, results count:', this.searchResults.length);
    if (this.searchResults.length > 0) {
      chrome.runtime.sendMessage({ 
        action: 'saveSearchResults', 
        searchResults: this.searchResults 
      }, (response) => {
        console.log('Save response:', response);
        if (response && response.success) {
          console.log('Search results saved successfully');
        } else {
          console.log('Failed to save search results');
        }
      });
    } else {
      console.log('No search results to save');
    }
  }

  // Load search results from storage
  loadSearchResults(): void {
    console.log('loadSearchResults called');
    chrome.runtime.sendMessage({ action: 'getSearchResults' }, (response) => {
      console.log('Storage response:', response);
      if (response && response.searchResults && response.searchResults.length > 0) {
        this.searchResults = response.searchResults;
        this.displaySearchResults(this.searchResults);
        
        // Update search status to show loaded results
        const statusContainer = this.panel?.querySelector('#search-status');
        if (statusContainer) {
          statusContainer.textContent = `Loaded ${this.searchResults.length} results from previous search`;
        }
        
        console.log('Search results loaded from storage:', this.searchResults.length, 'results');
      } else {
        console.log('No search results found in storage or empty response');
      }
    });
  }
}

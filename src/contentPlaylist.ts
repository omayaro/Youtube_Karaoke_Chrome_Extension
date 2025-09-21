// Playlist management functionality for YouTube Karaoke Extension

export interface PlaylistItem {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  addedAt: number;
}

export class PlaylistManager {
  private panel: HTMLElement | null = null;
  private playlists: PlaylistItem[] = [];
  private currentPlayingVideoId: string | null = null;
  private searchManager: any = null; // Reference to search manager for panel tracking

  constructor(panel: HTMLElement | null) {
    this.panel = panel;
  }

  // Set panel reference
  setPanel(panel: HTMLElement | null): void {
    this.panel = panel;
  }

  // Set search manager reference for panel tracking
  setSearchManager(searchManager: any): void {
    this.searchManager = searchManager;
  }

  // Set playlists data
  setPlaylists(playlists: PlaylistItem[]): void {
    this.playlists = playlists;
  }

  // Get playlists data
  getPlaylists(): PlaylistItem[] {
    return this.playlists;
  }

  // Set current playing video
  setCurrentPlayingVideo(videoId: string | null): void {
    this.currentPlayingVideoId = videoId;
  }

  // Display playlist items
  displayPlaylist(playlistsToDisplay?: PlaylistItem[]): void {
    const playlistContainer = this.panel?.querySelector('#playlist-items');
    const playlistCount = this.panel?.querySelector('#playlist-count');
    if (!playlistContainer) return;
    
    // Use provided playlists or current playlists
    const playlistsToShow = playlistsToDisplay || this.playlists;
    
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
          <button class="move-down-btn" data-index="${index}" title="Move Down" ${index === this.playlists.length - 1 ? 'disabled' : ''}>
            <span class="move-icon">⬇️</span>
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners for playlist items
    this.setupPlaylistEventListeners();
    
    // Update highlighting for currently playing video
    this.updatePlaylistHighlighting();
  }

  // Setup playlist item event listeners
  setupPlaylistEventListeners(): void {
    const playBtns = this.panel?.querySelectorAll('.play-btn');
    const removeBtns = this.panel?.querySelectorAll('.remove-btn');
    const moveUpBtns = this.panel?.querySelectorAll('.move-up-btn');
    const moveDownBtns = this.panel?.querySelectorAll('.move-down-btn');
    const playlistItems = this.panel?.querySelectorAll('.playlist-item');
    
    playBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = (e.target as HTMLElement).closest('.play-btn') as HTMLElement;
        const videoId = target?.dataset.url;
        if (videoId) {
          this.playVideo(videoId);
        }
      });
    });
    
    removeBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = (e.target as HTMLElement).closest('.remove-btn') as HTMLElement;
        const index = parseInt(target?.dataset.index || '0');
        this.removeFromPlaylist(index);
      });
    });
    
    moveUpBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = (e.target as HTMLElement).closest('.move-up-btn') as HTMLElement;
        const index = parseInt(target?.dataset.index || '0');
        this.movePlaylistItem(index, index - 1);
      });
    });
    
    moveDownBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = (e.target as HTMLElement).closest('.move-down-btn') as HTMLElement;
        const index = parseInt(target?.dataset.index || '0');
        this.movePlaylistItem(index, index + 1);
      });
    });
    
    // Handle playlist item clicks (to select and switch to playlist panel)
    playlistItems?.forEach((item, index) => {
      item.addEventListener('click', (e) => {
        // Don't handle clicks on buttons (let buttons handle their own clicks)
        if ((e.target as HTMLElement).closest('.play-btn, .remove-btn, .move-up-btn, .move-down-btn')) {
          return;
        }
        
        console.log('Playlist item clicked, index:', index);
        
        // Remove previous selection from both search and playlist
        const allSearchItems = this.panel?.querySelectorAll('.search-item');
        const allPlaylistItems = this.panel?.querySelectorAll('.playlist-item');
        allSearchItems?.forEach(searchItem => searchItem.classList.remove('selected'));
        allPlaylistItems?.forEach(playlistItem => playlistItem.classList.remove('selected'));
        
        // Add selection to clicked playlist item
        item.classList.add('selected');
        
        // Scroll into view
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Focus the playlist panel by blurring any focused input
        const searchInput = this.panel?.querySelector('#search-input') as HTMLInputElement;
        if (searchInput && document.activeElement === searchInput) {
          searchInput.blur();
          console.log('Search input blurred, active panel should now be playlist');
        }
        
        // Set last focused panel to playlist
        if (this.searchManager) {
          this.searchManager.lastFocusedPanel = 'playlist';
          this.searchManager.forceSearchPanel = false; // Clear force search panel flag
          console.log('Playlist item clicked, lastFocusedPanel set to playlist, forceSearchPanel set to false');
        }
        
        console.log('Playlist item selected, active panel should now be playlist');
      });
    });
  }

  // Play video by navigating to YouTube while keeping panel visible
  playVideo(videoId: string): void {
    // Update current playing video
    this.currentPlayingVideoId = videoId;
    
    // Update playlist highlighting
    this.updatePlaylistHighlighting();
    
    // Navigate to YouTube
    window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Show notification
    this.showNotification('Opening YouTube video...', 'info');
  }

  // Update playlist highlighting for currently playing video
  updatePlaylistHighlighting(): void {
    if (!this.panel) return;
    
    // Remove all playing highlights
    const playingItems = this.panel.querySelectorAll('.playlist-item.playing');
    playingItems.forEach(item => item.classList.remove('playing'));
    
    // Add playing highlight to current video
    if (this.currentPlayingVideoId) {
      const currentItem = this.panel.querySelector(`[data-video-id="${this.currentPlayingVideoId}"]`);
      
      if (currentItem) {
        currentItem.classList.add('playing');
      }
    }
  }

  // Add video to playlist
  addToPlaylist(searchItem: any): void {
    const playlistItem: PlaylistItem = {
      videoId: searchItem.videoId,
      title: searchItem.title,
      channel: searchItem.channel,
      thumbnail: searchItem.thumbnail,
      duration: searchItem.duration,
      addedAt: Date.now()
    };
    
    // Check if already in playlist
    const exists = this.playlists.some(item => item.videoId === playlistItem.videoId);
    if (exists) {
      this.showNotification('Video already in playlist!', 'warning');
      return;
    }
    
    this.playlists.push(playlistItem);
    this.savePlaylist();
    this.displayPlaylist(this.playlists);
    this.showNotification('Added to playlist!', 'success');
  }

  // Remove video from playlist
  removeFromPlaylist(index: number): void {
    if (index < 0 || index >= this.playlists.length) return;
    
    this.playlists.splice(index, 1);
    this.savePlaylist();
    this.displayPlaylist(this.playlists);
    this.showNotification('Removed from playlist', 'info');
  }

  // Move playlist item
  movePlaylistItem(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.playlists.length || 
        toIndex < 0 || toIndex >= this.playlists.length) return;
    
    const item = this.playlists.splice(fromIndex, 1)[0];
    if (item) {
      this.playlists.splice(toIndex, 0, item);
      this.savePlaylist();
      this.displayPlaylist(this.playlists);
    }
  }

  // Clear entire playlist
  clearPlaylist(): void {
    if (this.playlists.length === 0) return;
    
    if (confirm('Are you sure you want to clear the entire playlist?')) {
      this.playlists = [];
      this.savePlaylist();
      this.displayPlaylist(this.playlists);
      this.showNotification('Playlist cleared', 'info');
    }
  }

  // Shuffle playlist
  shufflePlaylist(): void {
    if (this.playlists.length <= 1) return;
    
    for (let i = this.playlists.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.playlists[i];
      if (temp && this.playlists[j]) {
        this.playlists[i] = this.playlists[j];
        this.playlists[j] = temp;
      }
    }
    
    this.savePlaylist();
    this.displayPlaylist(this.playlists);
    this.showNotification('Playlist shuffled!', 'success');
  }

  // Save playlist to storage
  savePlaylist(): void {
    chrome.runtime.sendMessage({ 
      action: 'savePlaylist', 
      playlists: this.playlists 
    }, (response) => {
      if (response && response.success) {
        console.log('Playlist saved successfully');
      }
    });
  }

  // Navigate playlist items
  navigatePlaylist(direction: number): void {
    const playlistItems = this.panel?.querySelectorAll('.playlist-item');
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

  // Focus playlist panel
  focusPlaylistPanel(): void {
    console.log('focusPlaylistPanel called');
    const playlistItems = this.panel?.querySelectorAll('.playlist-item');
    console.log('Playlist items found:', playlistItems?.length || 0);
    
    // Set last focused panel to playlist
    if (this.searchManager) {
      this.searchManager.lastFocusedPanel = 'playlist';
      this.searchManager.forceSearchPanel = false; // Clear force search panel flag
      console.log('Playlist panel focused, lastFocusedPanel set to playlist, forceSearchPanel set to false');
    }
    
    if (playlistItems && playlistItems.length > 0) {
      // Select first item or currently playing item
      let targetIndex = 0;
      if (this.currentPlayingVideoId) {
        console.log('Current playing video ID:', this.currentPlayingVideoId);
        playlistItems.forEach((item, index) => {
          if (item.getAttribute('data-video-id') === this.currentPlayingVideoId) {
            targetIndex = index;
            console.log('Found currently playing item at index:', index);
          }
        });
      }
      
      // Remove previous selection
      playlistItems.forEach(item => item.classList.remove('selected'));
      
      // Add selection to target item
      const targetItem = playlistItems[targetIndex];
      console.log('Target item index:', targetIndex, 'Target item found:', !!targetItem);
      if (targetItem) {
        targetItem.classList.add('selected');
        targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        console.log('Playlist item selected and scrolled into view');
      }
    } else {
      console.log('No playlist items found, cannot focus playlist panel');
    }
  }

  // Play selected playlist item
  playSelectedPlaylistItem(): void {
    const selectedItem = this.panel?.querySelector('.playlist-item.selected');
    if (!selectedItem) return;
    
    const playBtn = selectedItem.querySelector('.play-btn') as HTMLButtonElement;
    if (playBtn) {
      playBtn.click();
    }
  }

  // Reorder playlist item
  reorderPlaylistItem(direction: number): void {
    const selectedItem = this.panel?.querySelector('.playlist-item.selected');
    if (!selectedItem) return;
    
    const currentIndex = parseInt(selectedItem.getAttribute('data-index') || '0');
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < this.playlists.length) {
      this.movePlaylistItem(currentIndex, newIndex);
    }
  }

  // Remove selected playlist item
  removeSelectedPlaylistItem(): void {
    const selectedItem = this.panel?.querySelector('.playlist-item.selected');
    if (!selectedItem) return;
    
    const index = parseInt(selectedItem.getAttribute('data-index') || '0');
    this.removeFromPlaylist(index);
  }

  // Show notification
  private showNotification(message: string, type: 'success' | 'warning' | 'error' | 'info'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to panel if it exists
    if (this.panel) {
      this.panel.appendChild(notification);
      
      // Remove after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
  }
}

class PopupController {
  constructor() {
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateStatus();
    this.updateFavoriteButton();
  }
  
  async loadSettings() {
    const result = await chrome.storage.sync.get([
      'favoriteProjects',
      'audioEnabled'
    ]);
    
    this.settings = {
      favoriteProjects: result.favoriteProjects || [],
      audioEnabled: result.audioEnabled !== false
    };
  }
  
  setupEventListeners() {
    // Settings icon
    const settingsIcon = document.getElementById('settingsIcon');
    settingsIcon.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    
    // Audio toggle
    const audioToggle = document.getElementById('audioToggle');
    audioToggle.addEventListener('click', () => {
      this.toggleAudio();
    });
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener(() => {
      this.loadSettings().then(() => {
        this.updateFavoriteButton();
        this.updateToggle();
      });
    });
  }
  
  async toggleAudio() {
    const newState = !this.settings.audioEnabled;
    await chrome.storage.sync.set({ audioEnabled: newState });
    this.settings.audioEnabled = newState;
    this.updateToggle();
  }
  
  updateToggle() {
    const toggle = document.getElementById('audioToggle');
    if (this.settings.audioEnabled) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }
  
  async updateStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    
    try {
      // Check if we have any bolt.new tabs open (not just active one)
      const boltTabs = await chrome.tabs.query({url: 'https://bolt.new/*'});
      
      if (boltTabs.length > 0) {
        statusIndicator.className = 'status-indicator status-monitoring';
        statusText.textContent = `Monitoring ${boltTabs.length} project${boltTabs.length > 1 ? 's' : ''}`;
        statusDot.style.backgroundColor = '#10B981';
      } else {
        statusIndicator.className = 'status-indicator status-idle';
        statusText.textContent = 'No bolt.new tabs open';
        statusDot.style.backgroundColor = '#6B7280';
      }
    } catch (error) {
      statusIndicator.className = 'status-indicator status-idle';
      statusText.textContent = 'Status unknown';
      statusDot.style.backgroundColor = '#EF4444';
    }
  }
  
  updateFavoriteButton() {
    const container = document.getElementById('favoriteContainer');
    
    if (this.settings.favoriteProjects.length > 0) {
      container.innerHTML = '';
      
      this.settings.favoriteProjects.forEach((project, index) => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'favorite-project';
        
        const button = document.createElement('button');
        button.className = 'favorite-button';
        button.textContent = project.name || `Project ${index + 1}`;
        button.onclick = () => {
          chrome.tabs.create({ url: project.url });
          window.close();
        };
        
        projectDiv.appendChild(button);
        container.appendChild(projectDiv);
      });
    } else {
      container.innerHTML = '<div class="no-favorite">No favorite projects set</div>';
    }
    
    // Update toggle state
    this.updateToggle();
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
} else {
  new PopupController();
}
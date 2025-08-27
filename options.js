class OptionsController {
  constructor() {
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    await this.loadCustomSounds();
    this.populateForm();
    this.setupEventListeners();
  }
  
  async loadSettings() {
    const result = await chrome.storage.sync.get([
      'successSound',
      'errorSound',
      'favoriteProjects',
      'audioEnabled',
      'volume'
    ]);
    
    this.settings = {
      successSound: result.successSound || 'sounds/success1.mp3',
      errorSound: result.errorSound || 'sounds/error1.mp3',
      favoriteProjects: result.favoriteProjects || [],
      audioEnabled: result.audioEnabled !== false,
      volume: result.volume || 0.7
    };
  }
  
  populateForm() {
    // Audio settings
    document.getElementById('audioEnabled').checked = this.settings.audioEnabled;
    document.getElementById('successSound').value = this.settings.successSound;
    document.getElementById('errorSound').value = this.settings.errorSound;
    document.getElementById('volume').value = this.settings.volume;
    document.getElementById('volumeValue').textContent = Math.round(this.settings.volume * 100) + '%';
    
    // Favorite projects
    this.updateFavoritesList();
  }
  
  setupEventListeners() {
    // Volume slider
    const volumeSlider = document.getElementById('volume');
    const volumeValue = document.getElementById('volumeValue');
    
    volumeSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      volumeValue.textContent = Math.round(value * 100) + '%';
    });
    
    // Test buttons
    document.getElementById('testSuccess').addEventListener('click', () => {
      this.testSound('success');
    });
    
    document.getElementById('testError').addEventListener('click', () => {
      this.testSound('error');
    });
    
    // Custom file uploads
    document.getElementById('customSuccessUpload').addEventListener('change', (e) => {
      this.handleFileUpload(e, 'success');
    });
    
    document.getElementById('customErrorUpload').addEventListener('change', (e) => {
      this.handleFileUpload(e, 'error');
    });
    
    // Save button
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Add project button
    document.getElementById('addProject').addEventListener('click', () => {
      this.addProject();
    });
    
    // Auto-save on change
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        setTimeout(() => this.saveSettings(), 500);
      });
    });
  }
  
  updateFavoritesList() {
    const container = document.getElementById('favoritesContainer');
    container.innerHTML = '';
    
    this.settings.favoriteProjects.forEach((project, index) => {
      const projectDiv = document.createElement('div');
      projectDiv.className = 'favorite-item';
      
      projectDiv.innerHTML = `
        <div class="favorite-item-content">
          <input type="text" class="form-input project-name" value="${project.name || ''}" placeholder="Project name">
          <input type="url" class="form-input project-url" value="${project.url || ''}" placeholder="https://bolt.new/your-project">
        </div>
        <div class="project-actions">
          <button class="save-project-button" title="Save this project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17,21 17,13 7,13 7,21"></polyline>
              <polyline points="7,3 7,8 15,8"></polyline>
            </svg>
          </button>
          <button class="remove-button">×</button>
        </div>
      `;
      
      // Add event listener for remove button
      const removeButton = projectDiv.querySelector('.remove-button');
      removeButton.addEventListener('click', () => {
        this.removeProject(index);
      });
      
      // Add event listener for save button
      const saveButton = projectDiv.querySelector('.save-project-button');
      saveButton.addEventListener('click', () => {
        this.saveSettings();
      });
      
      container.appendChild(projectDiv);
    });
    
    if (this.settings.favoriteProjects.length === 0) {
      container.innerHTML = '<div class="no-projects">No favorite projects yet. Click "Add Project" to get started.</div>';
    }
  }
  
  addProject() {
    this.settings.favoriteProjects.push({ name: '', url: '' });
    this.updateFavoritesList();
  }
  
  removeProject(index) {
    this.settings.favoriteProjects.splice(index, 1);
    this.updateFavoritesList();
    this.saveSettings();
  }
  
  async testSound(type) {
    const soundFile = type === 'success' ? 
      document.getElementById('successSound').value : 
      document.getElementById('errorSound').value;
    
    const volume = parseFloat(document.getElementById('volume').value);
    
    try {
      let audioUrl;
      
      if (soundFile.startsWith('custom_')) {
        // Load custom sound from storage
        const customSound = await chrome.storage.local.get(soundFile);
        audioUrl = customSound[soundFile].data;
      } else {
        // Use built-in sound
        audioUrl = chrome.runtime.getURL(soundFile);
      }
      
      const audio = new Audio(audioUrl);
      audio.volume = volume;
      await audio.play();
    } catch (error) {
      console.warn('Failed to play test sound:', error);
      this.showFeedback('Failed to play test sound', false);
    }
  }
  
  async saveSettings() {
    const settings = {
      audioEnabled: document.getElementById('audioEnabled').checked,
      successSound: document.getElementById('successSound').value,
      errorSound: document.getElementById('errorSound').value,
      volume: parseFloat(document.getElementById('volume').value),
      favoriteProjects: this.collectFavoriteProjects()
    };
    
    try {
      await chrome.storage.sync.set(settings);
      this.settings = settings;
      this.showFeedback('Settings saved successfully!', true);
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showFeedback('Failed to save settings', false);
    }
  }
  
  collectFavoriteProjects() {
    const projects = [];
    const projectItems = document.querySelectorAll('.favorite-item');
    
    projectItems.forEach(item => {
      const nameInput = item.querySelector('.project-name');
      const urlInput = item.querySelector('.project-url');
      
      if (nameInput && urlInput && urlInput.value.trim()) {
        projects.push({
          name: nameInput.value.trim() || 'Unnamed Project',
          url: urlInput.value.trim()
        });
      }
    });
    
    return projects;
  }
  
  showFeedback(message, isSuccess) {
    const feedback = document.getElementById('saveFeedback');
    feedback.textContent = message;
    feedback.className = `save-feedback ${isSuccess ? 'success' : 'error'}`;
    
    setTimeout(() => {
      feedback.style.opacity = '0';
    }, 3000);
  }
  
  async handleFileUpload(event, soundType) {
    const file = event.target.files[0];
    const infoElement = document.getElementById(`${soundType}UploadInfo`);
    const selectElement = document.getElementById(`${soundType}Sound`);
    
    if (!file) return;
    
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(file.type)) {
      infoElement.textContent = 'Please select an MP3, WAV, or OGG file';
      infoElement.className = 'upload-info error';
      return;
    }
    
    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      infoElement.textContent = 'File too large. Please select a file under 1MB';
      infoElement.className = 'upload-info error';
      return;
    }
    
    try {
      // Convert file to data URL for storage
      const dataUrl = await this.fileToDataUrl(file);
      const customKey = `custom_${soundType}_${Date.now()}`;
      
      // Store the custom sound
      await chrome.storage.local.set({
        [customKey]: {
          name: file.name,
          data: dataUrl,
          type: file.type,
          size: file.size
        }
      });
      
      // Add option to select dropdown
      const option = document.createElement('option');
      option.value = customKey;
      option.textContent = `${file.name} (Custom)`;
      option.className = 'custom-sound-option';
      selectElement.appendChild(option);
      
      // Select the new custom sound
      selectElement.value = customKey;
      
      // Update info
      infoElement.textContent = `✓ Uploaded: ${file.name} (${this.formatFileSize(file.size)})`;
      infoElement.className = 'upload-info success';
      
      // Save settings
      this.saveSettings();
      
    } catch (error) {
      console.error('File upload error:', error);
      infoElement.textContent = 'Upload failed. Please try again.';
      infoElement.className = 'upload-info error';
    }
  }
  
  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }
  
  async loadCustomSounds() {
    // Load custom sounds from storage and add them to dropdowns
    const storage = await chrome.storage.local.get();
    
    Object.keys(storage).forEach(key => {
      if (key.startsWith('custom_success_')) {
        this.addCustomSoundOption('successSound', key, storage[key].name);
      } else if (key.startsWith('custom_error_')) {
        this.addCustomSoundOption('errorSound', key, storage[key].name);
      }
    });
    
    // Update custom sound lists
    this.updateCustomSoundsList();
  }
  
  addCustomSoundOption(selectId, key, fileName) {
    const select = document.getElementById(selectId);
    
    // Check if option already exists
    if (select.querySelector(`option[value="${key}"]`)) return;
    
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${fileName} (Custom)`;
    option.className = 'custom-sound-option';
    select.appendChild(option);
  }
  
  async updateCustomSoundsList() {
    const storage = await chrome.storage.local.get();
    
    // Update success sounds list
    const successList = document.getElementById('customSuccessList');
    successList.innerHTML = '';
    
    // Update error sounds list
    const errorList = document.getElementById('customErrorList');
    errorList.innerHTML = '';
    
    Object.keys(storage).forEach(key => {
      if (key.startsWith('custom_success_')) {
        this.addCustomSoundToList(successList, key, storage[key].name, 'success');
      } else if (key.startsWith('custom_error_')) {
        this.addCustomSoundToList(errorList, key, storage[key].name, 'error');
      }
    });
  }
  
  addCustomSoundToList(container, key, fileName, type) {
    const item = document.createElement('div');
    item.className = 'custom-sound-item';
    
    item.innerHTML = `
      <span class="custom-sound-name">${fileName}</span>
      <button class="remove-custom-sound" data-key="${key}" data-type="${type}">×</button>
    `;
    
    container.appendChild(item);
    
    // Add event listener after appending to DOM
    const removeButton = item.querySelector('.remove-custom-sound');
    removeButton.addEventListener('click', (e) => {
      e.preventDefault();
      const key = e.target.getAttribute('data-key');
      const type = e.target.getAttribute('data-type');
      this.removeCustomSound(key, type);
    });
  }
  
  async removeCustomSound(key, type) {
    try {
      // Remove from storage
      await chrome.storage.local.remove(key);
      
      // Remove from dropdown
      const selectId = type === 'success' ? 'successSound' : 'errorSound';
      const select = document.getElementById(selectId);
      const option = select.querySelector(`option[value="${key}"]`);
      if (option) {
        // If this was the selected option, switch to default
        if (select.value === key) {
          select.value = type === 'success' ? 'sounds/success1.mp3' : 'sounds/error1.mp3';
        }
        option.remove();
      }
      
      // Update the custom sounds list
      this.updateCustomSoundsList();
      
      // Save settings to update the selected sound if needed
      this.saveSettings();
      
      this.showFeedback('Custom sound removed successfully!', true);
      
    } catch (error) {
      console.error('Failed to remove custom sound:', error);
      this.showFeedback('Failed to remove custom sound', false);
    }
  }
}

// Make controller globally accessible for remove buttons
let optionsController;

// Initialize options page when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    optionsController = new OptionsController();
  });
} else {
  optionsController = new OptionsController();
}
// Background service worker for the extension

let offscreenDocument = null;

chrome.runtime.onInstalled.addListener(() => {
  // Set default values on installation
  chrome.storage.sync.set({
    successSound: 'sounds/success1.mp3',
    errorSound: 'sounds/error1.mp3',
    favoriteProjects: [],
    audioEnabled: true,
    volume: 0.7
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'playSound') {
    console.log('🎵 Background: Received playSound message for', message.soundType);
    console.log('🎵 Background: Settings:', message.settings);
    playAudioInBackground(message.soundType, message.settings);
    sendResponse({success: true});
  }
  return true; // Keep message channel open for async response
});

async function playAudioInBackground(soundType, settings) {
  console.log('🎵 Background: playAudioInBackground called', {soundType, audioEnabled: settings.audioEnabled});
  
  if (!settings.audioEnabled) return;
  
  try {
    // Create offscreen document if it doesn't exist
    if (!offscreenDocument) {
      console.log('🎵 Background: Creating offscreen document...');
      await createOffscreenDocument();
    }
    
    const soundFile = soundType === 'success' ? 
      settings.successSound : 
      settings.errorSound;
    
    let audioData = null;
    
    // Check if it's a custom sound
    if (soundFile.startsWith('custom_')) {
      const customSound = await chrome.storage.local.get(soundFile);
      audioData = customSound[soundFile]?.data;
    }
    
    console.log('🎵 Background: Sending to offscreen:', soundFile);
    
    // Send message to offscreen document to play audio
    await chrome.runtime.sendMessage({
      action: 'playAudio',
      soundFile: soundFile,
      audioData: audioData,
      volume: settings.volume
    });
    
    console.log('🎵 Background: Message sent to offscreen successfully');
    
  } catch (error) {
    console.error('🎵 Background: Failed to play background audio:', error);
  }
}

async function createOffscreenDocument() {
  try {
    console.log('🎵 Background: Attempting to create offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play notification sounds when tasks complete'
    });
    offscreenDocument = true;
    console.log('🎵 Background: Offscreen document created successfully');
  } catch (error) {
    if (error.message.includes('Only a single offscreen')) {
      console.log('🎵 Background: Offscreen document already exists');
      offscreenDocument = true;
    } else {
      console.error('🎵 Background: Failed to create offscreen document:', error);
    }
  }
}
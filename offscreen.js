// Offscreen document for playing audio in background

let currentAudio = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'playAudio') {
    console.log('🎶 Offscreen: Received playAudio message', message.soundFile);
    playAudio(message.soundFile, message.volume, message.audioData);
    sendResponse({success: true});
  }
  return true;
});

function playAudio(soundFile, volume, audioData) {
  console.log('🎶 Offscreen: playAudio called with', {soundFile, volume, hasCustomData: !!audioData});
  
  try {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    let audioUrl;
    
    if (audioData) {
      // Use custom audio data
      audioUrl = audioData;
    } else {
      // Use built-in sound file
      audioUrl = chrome.runtime.getURL(soundFile);
    }
    
    console.log('🎶 Offscreen: Audio URL:', audioUrl);
    
    currentAudio = new Audio(audioUrl);
    currentAudio.volume = volume || 0.7;
    
    console.log('🎶 Offscreen: Audio object created, attempting to play...');
    
    // Play the audio
    const playPromise = currentAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('🎶 Offscreen: Audio played successfully!');
      }).catch(error => {
        console.error('🎶 Offscreen: Failed to play audio:', error);
      });
    }
    
  } catch (error) {
    console.error('🎶 Offscreen: Audio setup error:', error);
  }
}
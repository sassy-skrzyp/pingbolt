// Content script to monitor bolt.new pages

class BoltMonitor {
  constructor() {
    this.isMonitoring = false;
    this.lastMessageCount = 0;
    this.settings = {};
    this.isDefaultPage = false;
    
    this.init();
  }
  
  async init() {
    // Check if this is the default bolt.new page
    this.checkIfDefaultPage();
    
    // Load settings
    await this.loadSettings();
    
    // Start monitoring
    this.startMonitoring();
    
    // Listen for settings changes
    chrome.storage.onChanged.addListener(() => {
      this.loadSettings();
    });
  }
  
  checkIfDefaultPage() {
    const url = window.location.href;
    
    // Project page patterns (these should have sounds enabled)
    const isProjectPage = url.includes('/~/') || 
                          url.includes('/edit/') ||
                          url.includes('/project/');
    
    // Default page patterns
    const isDefaultPage = url === 'https://bolt.new/' || 
                         url === 'https://bolt.new' ||
                         url.match(/^https:\/\/bolt\.new\/?(\?.*)?$/);
    
    if (isProjectPage) {
      this.isDefaultPage = false;
    } else if (isDefaultPage) {
      this.isDefaultPage = true;
    } else {
      this.isDefaultPage = false; // Enable sounds by default for unknown pages
    }
    
    console.log('🔊 Bolt Monitor: Page check -', url, 'isDefaultPage:', this.isDefaultPage);
  }
  
  async loadSettings() {
    const result = await chrome.storage.sync.get([
      'successSound',
      'errorSound', 
      'favoriteProjects',
      'volume',
      'audioEnabled'
    ]);
    
    this.settings = {
      successSound: result.successSound || 'sounds/success1.mp3',
      errorSound: result.errorSound || 'sounds/error1.mp3',
      favoriteProjects: result.favoriteProjects || [],
      volume: result.volume || 0.7,
      audioEnabled: result.audioEnabled !== false
    };
    
    console.log('🔊 Bolt Monitor: Settings loaded:', this.settings);
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor for new messages being added to the chat
    this.observeNewMessages();
    
    // Also check periodically
    this.periodicCheck();
  }
  
  observeNewMessages() {
    const observer = new MutationObserver((mutations) => {
      // Check if new content was added that might be a message
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain substantial text
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent?.trim();
              if (text && text.length > 50) {
                shouldCheck = true;
                break;
              }
            }
          }
        }
      }
      
      if (shouldCheck) {
        // Small delay to let the DOM settle
        setTimeout(() => this.checkForNewMessages(), 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  periodicCheck() {
    setInterval(() => {
      this.checkForNewMessages();
    }, 3000);
  }
  
  checkForNewMessages() {
    if (this.isDefaultPage) return;
    
    try {
      // Find all potential messages
      const messages = this.findAllMessages();
      
      console.log('🔊 Bolt Monitor: Found', messages.length, 'total messages');
      
      // Check if we have new messages since last check
      if (messages.length > this.lastMessageCount) {
        console.log('🔊 Bolt Monitor: New messages detected!', this.lastMessageCount, '→', messages.length);
        
        // Check the most recent messages for completion patterns
        const recentMessages = messages.slice(-3); // Check last 3 messages
        
        console.log('🔊 Bolt Monitor: Checking', recentMessages.length, 'recent messages for completion patterns...');
        
        for (const message of recentMessages) {
          console.log('🔊 Bolt Monitor: Analyzing message text:', message.text.substring(0, 200) + '...');
          
          // Check for errors first - if both error and success patterns exist, treat as error
          if (this.isErrorMessage(message.text)) {
            console.log('🔊 Bolt Monitor: ❌ ERROR DETECTED in message:', message.text.substring(0, 100) + '...');
            this.handleStateChange('error');
            break;
          } else if (this.isCompletionMessage(message.text)) {
            console.log('🔊 Bolt Monitor: ✅ COMPLETION DETECTED in message:', message.text.substring(0, 100) + '...');
            this.handleStateChange('success');
            break;
          } else {
            console.log('🔊 Bolt Monitor: ❌ No error or completion pattern found in this message');
          }
        }
        
        this.lastMessageCount = messages.length;
      }
      
    } catch (error) {
      console.error('🔊 Bolt Monitor: Error checking messages:', error);
    }
  }
  
  findAllMessages() {
    const messages = [];
    
    // More targeted selectors for Bolt's actual chat interface
    const selectors = [
      // Bolt-specific chat selectors (more targeted)
      '[data-role="assistant"]',
      '[role="assistant"]',
      'div[class*="prose"]',
      'div[class*="markdown"]',
      
      // Look for conversation/chat containers
      '[class*="conversation"]',
      '[class*="chat-message"]',
      '[data-testid*="chat"]',
      '[data-testid*="message"]',
      
      // Look for elements that contain substantial paragraphs (likely messages)
      'div:has(p):not([class*="sidebar"]):not([class*="header"]):not([class*="footer"])',
      
      // Target main content areas
      'main div',
      'article div',
      
      // Fallback: any div with multiple sentences
      'div'
    ];
    
    const seenTexts = new Set();
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          const text = element.textContent?.trim();
          
          // Only consider elements with substantial, unique text
          if (text && 
              text.length > 50 && 
              text.length < 10000 && 
              !seenTexts.has(text) &&
              this.looksLikeConversationMessage(text)) {
            
            seenTexts.add(text);
            messages.push({
              element,
              text,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {
        // Skip invalid selectors
        continue;
      }
    }
    
    // Sort by DOM position (later elements are likely more recent)
    messages.sort((a, b) => {
      const position = a.element.compareDocumentPosition(b.element);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    
    return messages;
  }
  
  looksLikeConversationMessage(text) {
    // Filter out UI elements and focus on conversation content
    const lowerText = text.toLowerCase();
    
    // Skip obvious UI elements
    if (lowerText.includes('subscribe to pro') ||
        lowerText.includes('monthly tokens') ||
        lowerText.includes('waiting for preview') ||
        lowerText.includes('help center') ||
        lowerText.includes('join our community') ||
        lowerText.includes('your preview will appear') ||
        lowerText.match(/^\d+$/) || // Just numbers
        lowerText.length < 20) { // Too short
      return false;
    }
    
    // Look for conversation-like content
    const conversationIndicators = [
      "i'll", "i've", "let me", "here's", "i can", "i will",
      "created", "updated", "implemented", "added", "built",
      "the project", "the application", "the component",
      "now you can", "you should see", "this will"
    ];
    
    return conversationIndicators.some(indicator => lowerText.includes(indicator));
  }
  
  isCompletionMessage(text) {
    if (!text || text.length < 10) return false;
    
    const lowerText = text.toLowerCase();
    console.log('🔊 Bolt Monitor: Testing completion patterns on text:', lowerText.substring(0, 200) + '...');
    
    // Primary "I've" patterns - the most reliable indicator
    const ivePatterns = [
      /\bi've\s+(created|updated|implemented|added|built|set up|configured|fixed|modified|established|deployed|successfully)/i,
      /\bi've\s+(now|just|already)\s+(created|updated|implemented|added|built)/i,
      /\bi've\s+(made|completed|finished)/i,
    ];
    
    for (const pattern of ivePatterns) {
      if (pattern.test(text)) {
        console.log('🔊 Bolt Monitor: ✅ "I\'ve" pattern matched:', pattern.source);
        return true;
      }
    }
    
    // Secondary completion patterns
    const completionPatterns = [
      // More flexible completion patterns
      /\b(perfect|great|excellent)!\s+(i've|now)/i,
      /\b(changes|improvements|updates)\s+(made|completed)/i,
      /\b(task|implementation|setup|configuration|deployment)\s+(complete|completed|finished|done)/i,
      /\b(successfully|now)\s+(created|implemented|deployed|built|added)/i,
      /\bdeployment\s+(successful|complete|finished)/i,
      /\bsite\s+is\s+(live|deployed|ready)/i,
      /\bbuild\s+(successful|complete|finished)/i,
      /\ball\s+set!/i,
      /\bready\s+to\s+(go|use)/i,
      /\bproject\s+is\s+(ready|complete)/i,
      // Detect "Perfect!" or similar completion indicators
      /\bperfect!\s+/i,
      /\bexcellent!\s+/i,
      /\bgreat!\s+/i
    ];
    
    for (const pattern of completionPatterns) {
      if (pattern.test(text)) {
        console.log('🔊 Bolt Monitor: ✅ Completion pattern matched:', pattern.source);
        return true;
      }
    }
    
    console.log('🔊 Bolt Monitor: ❌ No patterns matched for text:', lowerText.substring(0, 100));
    
    return false;
  }
  
  isErrorMessage(text) {
    if (!text || text.length < 10) return false;
    
    const lowerText = text.toLowerCase();
    console.log('🔊 Bolt Monitor: Testing error patterns on text:', lowerText.substring(0, 200) + '...');
    
    // Primary error patterns - the specific phrases mentioned
    const errorPatterns = [
      /should we try to fix this problem\?/i,
      /potential problem detected/i,
      
      // Additional common error patterns
      /\berror\s+(occurred|detected|found)/i,
      /\bfailed\s+to\s+(create|build|deploy|install|load)/i,
      /\bsomething\s+went\s+wrong/i,
      /\bthere\s+was\s+an?\s+(error|issue|problem)/i,
      /\bunable\s+to\s+(connect|access|load|create)/i,
      /\bconnection\s+(failed|error|timeout)/i,
      /\bbuild\s+(failed|error)/i,
      /\bdeployment\s+(failed|error)/i,
      /\binstallation\s+(failed|error)/i,
      /\btimeout\s+(error|occurred)/i,
      /\bnetwork\s+(error|issue)/i,
      /\bpermission\s+(denied|error)/i,
      /\bfile\s+not\s+found/i,
      /\bmodule\s+not\s+found/i,
      /\bsyntax\s+error/i,
      /\breference\s+error/i,
      /\btype\s+error/i
    ];
    
    for (const pattern of errorPatterns) {
      if (pattern.test(text)) {
        console.log('🔊 Bolt Monitor: ❌ Error pattern matched:', pattern.source);
        return true;
      }
    }
    
    console.log('🔊 Bolt Monitor: ✅ No error patterns matched for text:', lowerText.substring(0, 100));
    
    return false;
  }
  
  handleStateChange(state) {
    if (this.isDefaultPage) return;
    
    console.log('🔊 Bolt Monitor: 🎵 TRIGGERING SOUND -', state);
    console.log('🔊 Bolt Monitor: Settings -', this.settings);
    console.log('🔊 Bolt Monitor: Page URL -', window.location.href);
    console.log('🔊 Bolt Monitor: Tab is active -', !document.hidden);
    
    // Send message to background script to play audio
    chrome.runtime.sendMessage({
      action: 'playSound',
      soundType: state,
      settings: this.settings
    }).then(response => {
      console.log('🔊 Bolt Monitor: ✅ Message sent successfully, response:', response);
    }).catch(error => {
      console.error('🔊 Bolt Monitor: ❌ Failed to send message to background:', error);
    });
  }
  
  // Manual test function for debugging
  testSound(type = 'success') {
    console.log('🔊 Bolt Monitor: 🧪 Manual test triggered for', type);
    this.handleStateChange(type);
  }
  
  // Manual function to test message detection
  testDetection() {
    console.log('🔊 Bolt Monitor: 🧪 Manual detection test...');
    const messages = this.findAllMessages();
    console.log('🔊 Bolt Monitor: Found', messages.length, 'messages total:');
    
    const recent = messages.slice(-10);
    console.log('🔊 Bolt Monitor: Recent 10 messages:');
    
    recent.forEach((msg, i) => {
      console.log(`${i + 1}. "${msg.text.substring(0, 150)}..."`);
      if (this.isCompletionMessage(msg.text)) {
        console.log('   ✅ COMPLETION DETECTED!');
        this.handleStateChange('success');
      }
    });
  }
}

// Initialize monitor when page loads
window.boltMonitor = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.boltMonitor = new BoltMonitor();
  });
} else {
  window.boltMonitor = new BoltMonitor();
}
# Bolt Monitor Chrome Extension

A Chrome extension that monitors bolt.new pages for task completion status and provides customizable audio feedback to users.

## Features

- **Real-time Monitoring**: Automatically detects task completions and errors on bolt.new pages
- **Audio Feedback**: Plays distinct sounds for success and error states
- **Sound Customization**: Choose from multiple preset audio files (MP3, WAV, OGG)
- **Favorite Projects**: Save and quickly access preferred bolt.new project URLs
- **Quick Navigation**: One-click access to saved projects via popup
- **Volume Control**: Adjustable audio levels with test functionality

## Installation

### From Source (Development)
1. Clone or download this repository
2. Add required audio files to the `sounds/` directory (see `sounds/README.md`)
3. Add icon files to the `icons/` directory (see `icons/README.md`)
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select this extension directory
7. The extension icon should appear in your browser toolbar

### Required Assets
Before installation, ensure you have:
- Audio files in `sounds/` directory (6 total: 3 success + 3 error sounds)
- Icon files in `icons/` directory (icon16.png, icon48.png, icon128.png)

## Usage

1. **Initial Setup**: Right-click the extension icon and select "Options" to configure settings
2. **Set Favorite Project**: Enter your preferred bolt.new project URL in settings
3. **Choose Sounds**: Select your preferred audio notifications for success/error events
4. **Adjust Volume**: Set comfortable audio levels using the volume slider
5. **Monitor Projects**: Visit any bolt.new page - the extension will automatically monitor for task completion
6. **Quick Access**: Click the extension icon to quickly navigate to your favorite project

## Settings

### Audio Preferences
- **Enable/Disable Audio**: Toggle audio notifications on/off
- **Success Sound**: Choose from 3 preset success notification sounds
- **Error Sound**: Choose from 3 preset error notification sounds  
- **Volume Control**: Adjust playback volume from 0-100%
- **Test Sounds**: Preview your selected audio notifications

### Project Management
- **Favorite Project URL**: Save a frequently used bolt.new project for quick access
- **Quick Navigation**: Access saved project directly from the popup

## Technical Details

- **Manifest Version**: V3 (latest Chrome extension standard)
- **Permissions**: Limited to bolt.new domain and storage only
- **Architecture**: Content script monitors DOM changes, popup provides quick access
- **Storage**: Uses Chrome's sync storage for cross-device settings persistence
- **Performance**: Lightweight monitoring with minimal impact on page performance

## File Structure

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for message handling
├── content.js            # DOM monitoring and audio playback
├── popup.html/js         # Extension popup interface
├── options.html/js       # Settings page
├── sounds/              # Audio notification files
│   ├── success1.mp3
│   ├── success2.wav
│   ├── success3.ogg
│   ├── error1.mp3
│   ├── error2.wav
│   └── error3.ogg
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

The extension is built with vanilla JavaScript and follows Chrome Extension best practices:

- Service Worker for background tasks
- Content Script for page monitoring
- Chrome Storage API for settings persistence
- Manifest V3 compliance
- Proper permission handling

## Privacy

This extension:
- Only accesses bolt.new pages
- Stores settings locally in your browser
- Does not collect or transmit any personal data
- Requires minimal permissions for functionality

## Support

For issues or feature requests, please check that:
1. All required audio and icon files are properly placed
2. You're using a supported version of Chrome (88+)
3. The extension has proper permissions for bolt.new

## License

MIT License - feel free to modify and distribute as needed.
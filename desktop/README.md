# Deen Duniya - Desktop Application

Electron-based desktop application wrapper for Deen Duniya Islamic Prayer Times.

## Features

- **System Tray Integration**: Quick access from system tray
- **Desktop Widgets**: Always-visible prayer time widgets (Coming soon)
- **Native Notifications**: Powerful desktop notifications
- **Auto-start**: Optional launch on system boot
- **Cross-platform**: Windows, macOS, and Linux support

## Development

### Prerequisites
- Node.js (v16 or higher)
- The web application built in `../web/dist`

### Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure the web app is built:
```bash
cd ../web
npm run build
cd ../desktop
```

3. Run in development mode:
```bash
npm run dev
```

Note: In development mode, it will try to connect to the web dev server at `http://localhost:5173`.
Make sure the web dev server is running first:
```bash
cd ../web
npm run dev
```

### Building

Build for your current platform:
```bash
npm run build
```

Build for specific platforms:
```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

The built application will be in the `dist/` directory.

## Architecture

- **main.js**: Electron main process (handles window management, system tray)
- **preload.js**: Secure bridge between main and renderer processes
- **assets/**: Application icons and resources
- Uses the Vue 3 web application from `../web/dist`

## Features Roadmap

### Implemented ✅
- Main window with web app
- System tray integration
- Basic IPC communication
- Development and production builds

### In Progress 🚧
- Desktop widget window
- Customizable widget position and size
- Taskbar integration

### Planned 📋
- Auto-start on system boot (user configurable)
- Global keyboard shortcuts
- Multiple widget layouts
- Minimized mode optimizations
- Update notifications

## System Tray Menu

- **Show App**: Opens the main application window
- **Toggle Widget**: Shows/hides the desktop widget
- **Settings**: Opens settings dialog
- **Quit**: Exits the application completely

## IPC Communication

The desktop app communicates with the renderer (web app) using these IPC channels:

- `show-notification`: Send notifications from renderer to main
- `update-tray-tooltip`: Update system tray tooltip text
- `open-widget`: Open the desktop widget
- `close-widget`: Close the desktop widget
- `open-settings`: Trigger settings dialog (from main to renderer)

## Building from Source

1. Clone the repository
2. Build the web application:
   ```bash
   cd web
   npm install
   npm run build
   ```
3. Build the desktop application:
   ```bash
   cd ../desktop
   npm install
   npm run build
   ```

## Distribution

The electron-builder configuration creates:

### Windows
- NSIS installer (.exe)
- Portable executable

### macOS
- DMG disk image
- ZIP archive

### Linux
- AppImage
- DEB package

## License

MIT License - Open source for personal and educational use.

## Credits

Built with Electron and Vue 3.

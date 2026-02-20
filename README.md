# Deen Duniya - Islamic Prayer Times Application

<div align="center">

**A beautiful, full-featured Islamic prayer times and calendar application**

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js)
![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)
![PrimeVue](https://img.shields.io/badge/PrimeVue-4-41B883)
![License](https://img.shields.io/badge/License-MIT-blue)

![Status](https://img.shields.io/badge/Web%20Version-Work%20in%20Progress-yellow)
![Status](https://img.shields.io/badge/Desktop%20Version-Starting%20Soon-blue)

[Features](#-features) • [Screenshots](#-screenshots) • [Installation](#-installation) • [Development](#-development) • [Tech Stack](#-tech-stack)

</div>

---

## 📖 Overview

Deen Duniya is a comprehensive Islamic prayer times application being developed as both a web and desktop application. It provides accurate prayer times, Islamic calendar, Ramadan features, and smart notifications to help Muslims maintain their daily prayers.

**Current Status:**
- 🚧 **Web Version:** Active development - functional and feature-rich
- 📅 **Desktop Version:** Starting soon - basic setup complete

## 🚦 Project Status

### Web Version 🚧
**Status:** Work in Progress

The web application is actively under development and is functional with the following features:
- ✅ Core prayer times functionality
- ✅ Islamic calendar with Hijri dates
- ✅ Ramadan-specific features
- ✅ Smart notifications system
- ✅ Location management (GPS, cities, manual)
- ✅ Hijri date calibration for local moon sighting
- ✅ Comprehensive settings and customization
- ✅ Dark/Light theme support
- ✅ Responsive design for all devices
- ✅ First-time user onboarding flow

**Try it:** The web version can be run locally following the [Installation](#-installation) instructions below.

### Desktop Version 📅
**Status:** Starting Soon

Desktop application development will begin soon. The basic Electron setup is complete, and we'll be implementing:
- 🔜 Desktop widgets for prayer times
- 🔜 System tray enhancements
- 🔜 Auto-start functionality
- 🔜 Offline caching
- 🔜 Native desktop notifications
- 🔜 Always-on-top widget mode

**Note:** Currently, the basic Electron wrapper exists but the desktop-specific features are not yet implemented.

## ✨ Features

### 🕌 Prayer Times
- **5 Daily Prayers**: Fajr, Dhuhr, Asr, Maghrib, Isha
- **Live Countdown**: Real-time countdown to next prayer
- **20+ Calculation Methods**: Support for major Islamic authorities
- **Asr Calculation**: Shafi (Standard) or Hanafi school selection
- **Additional Times**: Sunrise, Imsak, Midnight

### 📍 Smart Location
- **Auto-Detection**: GPS-based automatic location detection
- **80+ Cities**: Pre-configured major cities worldwide
- **Manual Entry**: Custom latitude/longitude coordinates
- **Persistent Storage**: Remembers your location

### 📅 Islamic Calendar
- **Hijri Calendar**: Full Islamic calendar with Gregorian dates
- **Monthly View**: Complete monthly prayer schedules
- **Islamic Events**: Displays holidays and significant dates
- **Jumu'ah Indicators**: Friday prayers highlighted

### 🌙 Ramadan Features
- **Sehri/Iftar Timers**: Countdowns for Suhoor and breaking fast
- **Fasting Progress**: Visual progress bar throughout the day
- **Ramadan Stats**: Day counter, completion percentage
- **Special Notifications**: Ramadan-specific reminders

### 🔔 Smart Notifications
- **Prayer Alerts**: Configurable notifications before/during/after prayers
- **Ramadan Reminders**: Special Sehri and Iftar notifications
- **Prayer-Specific**: Individual control for each prayer
- **Customizable Timing**: Set custom reminder intervals

### 🎨 Customization
- **Themes**: Light, Dark, and Auto modes
- **Time Format**: 12-hour or 24-hour display
- **Languages**: English (Arabic coming soon)
- **Notification Settings**: Granular control over all alerts

### 💻 Desktop Features (Coming Soon)
- **System Tray**: Quick access from taskbar (basic implementation exists)
- **Desktop Widgets**: Always-visible prayer time widgets (planned)
- **Auto-start**: Optional launch on system boot (planned)
- **Native Notifications**: Desktop notification integration (planned)
- **Offline Mode**: Cached prayer times working offline (planned)

## 📁 Project Structure

```
deen-duniya/
├── web/                              # Vue 3 Web Application
│   ├── src/
│   │   ├── components/               # Vue Components
│   │   │   ├── PrayerTimesCard.vue   # Main prayer times display
│   │   │   ├── RamadanCard.vue       # Ramadan features
│   │   │   ├── IslamicCalendar.vue   # Hijri calendar
│   │   │   ├── LocationDialog.vue    # Location selector
│   │   │   └── SettingsDialog.vue    # Settings panel
│   │   ├── stores/                   # Pinia State Management
│   │   │   ├── locationStore.js      # Location state
│   │   │   ├── prayerTimesStore.js   # Prayer times state
│   │   │   └── settingsStore.js      # App settings
│   │   ├── services/                 # API Services
│   │   │   ├── aladhanApi.js         # AlAdhan API wrapper
│   │   │   └── notificationService.js # Notification manager
│   │   ├── utils/                    # Utility Functions
│   │   │   ├── cities.js             # Cities database
│   │   │   └── dateUtils.js          # Date/time helpers
│   │   ├── App.vue                   # Main component
│   │   ├── main.js                   # Entry point
│   │   └── style.css                 # Global styles
│   ├── public/                       # Static assets
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── desktop/                          # Electron Desktop Application
│   ├── main.js                       # Electron main process
│   ├── preload.js                    # IPC bridge
│   ├── assets/                       # Desktop icons
│   ├── package.json
│   └── README.md
│
└── Prayer Times API - AlAdhan v1.txt # API Documentation
```

## 🚀 Installation

### Web Application (Recommended - Work in Progress)

The web application is functional and can be run locally:

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Open browser at `http://localhost:5173`

5. Build for production:
```bash
npm run build
```

### Desktop Application (Coming Soon)

The desktop version is in early stages. Basic Electron setup exists but desktop-specific features are not yet implemented.

1. First, build the web application:
```bash
cd web
npm run build
```

2. Navigate to desktop directory:
```bash
cd ../desktop
```

3. Install dependencies:
```bash
npm install
```

4. Run in development:
```bash
npm run dev
```

**Note:** Desktop widgets, system tray enhancements, and other desktop-specific features will be implemented soon.

## 🛠️ Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Next-generation build tool
- **PrimeVue 4** - Rich UI component library
- **Pinia** - State management
- **Day.js** - Date/time manipulation
- **PrimeIcons** - Icon library

### Desktop
- **Electron** - Cross-platform desktop framework
- **Electron Builder** - Application packaging

### API
- **AlAdhan API** - Islamic prayer times API

## 📊 Data & Privacy

- ✅ **No User Accounts**: No registration required
- ✅ **Local Storage**: All data stored locally
- ✅ **No Tracking**: No analytics or tracking
- ✅ **Open Source**: Transparent codebase
- ✅ **Free API**: Uses public AlAdhan API

## 🌍 Supported Locations

- **Worldwide Coverage**: Works anywhere with coordinates
- **80+ Pre-configured Cities**: Major Islamic cities worldwide
- **Custom Locations**: Manual coordinate entry
- **GPS Support**: Automatic location detection

## 📱 Browser Support

### Web Application
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ⚠️ Internet Explorer (Not supported)

### Desktop Application
- ✅ Windows 10/11
- ✅ macOS 10.13+
- ✅ Linux (Debian-based, AppImage)

## 🗺️ Roadmap

### Phase 1: Web Application 🚧 Work in Progress
- [x] Prayer times with live countdown
- [x] Location detection and management
- [x] Islamic calendar integration
- [x] Ramadan features with smart Sehri/Iftar switching
- [x] Browser notifications
- [x] Settings and customization
- [x] Theme support (Light/Dark)
- [x] Hijri date adjustment for local moon sighting
- [x] First-time user onboarding (Location + Hijri Calibration + Notifications)
- [x] Privacy-focused location handling
- [ ] PWA (Progressive Web App) support
- [ ] Qibla direction finder
- [ ] Prayer time history
- [ ] Multiple language support

### Phase 2: Desktop Application 📅 Starting Soon
- [x] Electron setup and configuration
- [x] System tray integration (basic)
- [ ] Desktop widgets (To be implemented)
- [ ] Taskbar integration
- [ ] Auto-start configuration
- [ ] Global keyboard shortcuts
- [ ] Offline prayer times caching
- [ ] Native desktop notifications
- [ ] Always-on-top prayer time widget

### Phase 3: Enhancements 📋 Planned
- [ ] 99 Names of Allah
- [ ] Daily Hadith/Quotes
- [ ] Prayer statistics and tracking
- [ ] Tasbih counter
- [ ] Mobile apps (iOS/Android)
- [ ] Advanced customization options

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies for both web and desktop
4. Create a feature branch
5. Make your changes
6. Test thoroughly
7. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Credits

- **AlAdhan API**: https://aladhan.com - Free Islamic prayer times API
- **PrimeVue**: https://primevue.org - Vue UI component library
- **Vue.js**: https://vuejs.org - Progressive JavaScript framework
- **Electron**: https://electronjs.org - Desktop application framework
- **Day.js**: https://day.js.org - Date/time library

## 💬 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check the documentation in README files
- Review the API documentation

## 🎯 Acknowledgments

**Note**: This application provides prayer times based on calculation methods. Please always verify times with your local mosque or Islamic authority, as timings may be adjusted or tuned locally according to local sighting and custom.

## 🌟 May Allah Accept This Effort

Built with ❤️ for the Muslim Ummah worldwide.

*"Indeed, prayer has been decreed upon the believers a decree of specified times."* - Quran 4:103

---

<div align="center">

**Deen Duniya** • Islamic Prayer Times Application

Made with 🤲 by the community, for the community

</div>

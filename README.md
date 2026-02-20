# Deen Duniya - Islamic Prayer Times Application

<div align="center">

**A beautiful, full-featured Islamic prayer times and calendar application**

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js)
![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)
![PrimeVue](https://img.shields.io/badge/PrimeVue-4-41B883)
![License](https://img.shields.io/badge/License-MIT-blue)

[Features](#-features) • [Screenshots](#-screenshots) • [Installation](#-installation) • [Development](#-development) • [Tech Stack](#-tech-stack)

</div>

---

## 📖 Overview

Deen Duniya is a comprehensive Islamic prayer times application available as both a web and desktop application. It provides accurate prayer times, Islamic calendar, Ramadan features, and smart notifications to help Muslims maintain their daily prayers.

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

### 💻 Desktop Features (Electron)
- **System Tray**: Quick access from taskbar
- **Desktop Widgets**: Always-visible prayer time widgets
- **Auto-start**: Optional launch on system boot
- **Native Notifications**: Desktop notification integration

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

### Web Application

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

### Desktop Application

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

Or build for production:
```bash
npm run build        # Current platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

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

### Phase 1: Web Application ✅
- [x] Prayer times with live countdown
- [x] Location detection and management
- [x] Islamic calendar integration
- [x] Ramadan features
- [x] Browser notifications
- [x] Settings and customization
- [x] Theme support (Light/Dark)

### Phase 2: Desktop Application 🚧
- [x] Electron setup
- [x] System tray integration
- [ ] Desktop widgets (In Progress)
- [ ] Taskbar integration
- [ ] Auto-start configuration
- [ ] Global keyboard shortcuts

### Phase 3: Enhancements 📋
- [ ] Qibla direction finder
- [ ] 99 Names of Allah
- [ ] Daily Hadith/Quotes
- [ ] Prayer statistics and tracking
- [ ] Multiple language support
- [ ] PWA (Progressive Web App)
- [ ] Mobile apps (iOS/Android)

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

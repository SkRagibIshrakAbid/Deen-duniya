# Deen Duniya - Islamic Prayer Times Application

A beautiful, full-featured Islamic prayer times and calendar application built with Vue 3 and Electron.

## 🌟 Features

### Web Application

#### Prayer Times
- **Real-time Prayer Times**: Displays all 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha)
- **Live Countdown**: Shows countdown to next prayer with visual progress indicators
- **Multiple Calculation Methods**: Supports 20+ Islamic prayer calculation methods
- **Asr Calculation**: Choose between Shafi (Standard) or Hanafi schools
- **Additional Times**: Sunrise, Imsak, and Midnight times included

#### Location Management
- **Auto-Detection**: Use GPS to automatically detect your location
- **City Selection**: Choose from 80+ popular cities worldwide
- **Manual Entry**: Enter custom latitude/longitude coordinates
- **Persistent Storage**: Remembers your location preference

#### Islamic Calendar
- **Hijri Calendar**: Full Islamic calendar with Hijri dates
- **Monthly View**: Browse prayer times for entire months
- **Islamic Holidays**: Displays Islamic holidays and significant dates
- **Jumu'ah Indicators**: Friday prayers highlighted
- **Current Day Marker**: Today's date prominently shown

#### Ramadan Features (Auto-activates during Ramadan)
- **Sehri Timer**: Countdown to Suhoor end time (Imsak/Fajr)
- **Iftar Timer**: Countdown to breaking fast (Maghrib)
- **Fasting Progress**: Visual progress bar showing fasting completion
- **Day Counter**: Shows which day of Ramadan it is
- **Ramadan Statistics**: Days completed, remaining, and overall progress
- **Daily Messages**: Did you know section with Ramadan facts

#### Smart Notifications
- **Prayer Reminders**: Get notified before prayer times
- **At Prayer Time**: Notifications when prayer time arrives
- **Prayer End Warnings**: Alerts before prayer time ends
- **Ramadan Notifications**: Special notifications for Sehri and Iftar
- **Customizable Timing**: Set how many minutes before you want to be notified
- **Prayer-Specific**: Enable/disable notifications for individual prayers
- **Browser Notifications**: Native browser notification support

#### Settings & Customization
- **Calculation Methods**: Choose from multiple calculation methods
- **Time Format**: Toggle between 12-hour and 24-hour formats
- **Themes**: Light, Dark, and Auto modes
- **Language Support**: English (with Arabic coming soon)
- **Notification Preferences**: Granular control over all notifications

## 🛠️ Technology Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **UI Library**: PrimeVue 4 (Aura theme)
- **State Management**: Pinia
- **Date/Time**: Day.js
- **Icons**: PrimeIcons
- **API**: AlAdhan Prayer Times API v1

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🎯 Usage

### First Time Setup
1. When you first open the application, you'll be prompted to set your location
2. Choose from three methods:
   - **Auto-Detect**: Allow location access for automatic detection
   - **Select City**: Choose from a list of 80+ cities
   - **Manual Entry**: Enter coordinates manually

### Viewing Prayer Times
- The main dashboard shows today's prayer times
- Next prayer is highlighted with a countdown timer
- Current prayer (if within prayer time) is indicated

### During Ramadan
- Ramadan card automatically appears
- Shows Sehri and Iftar countdowns
- Displays fasting progress throughout the day
- Tracks Ramadan day number and statistics

### Setting Up Notifications
1. Click the bell icon in the header
2. Grant notification permission when prompted
3. Configure notification preferences in Settings
4. Choose which prayers to be notified about
5. Set custom timing for before/after prayer notifications

## 📊 Data Storage

The application uses browser localStorage to store:
- Location preferences
- Prayer times cache
- Settings and preferences
- Last update timestamp

## 🔐 Privacy

- No user data is collected or sent to external servers
- All data is stored locally in your browser
- Location data is only used for prayer time calculation
- API calls are made directly to AlAdhan API (public, free service)

## 🤲 Credits

- **AlAdhan API**: https://aladhan.com
- **PrimeVue**: https://primevue.org
- **Vue.js**: https://vuejs.org
- **Day.js**: https://day.js.org

## 📄 License

This project is open source and available for personal and educational use.

## 🙏 May Allah accept this effort

Built with ❤️ for the Muslim community worldwide.

---

**Note**: This is a prayer time application. Please always verify times with your local mosque or Islamic authority, as timings may be adjusted or tuned locally.

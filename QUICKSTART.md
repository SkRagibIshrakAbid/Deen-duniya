# 🚀 Quick Start Guide - Deen Duniya

## Getting Started in 5 Minutes

### Option 1: Run Web Application (Easiest)

```bash
# Navigate to web directory
cd web

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Then open your browser at `http://localhost:5173`

### Option 2: Run Desktop Application

**Step 1: Build Web App First**
```bash
cd web
npm install
npm run build
```

**Step 2: Run Desktop App**
```bash
cd ../desktop
npm install
npm run dev
```

## First Time Setup

1. **Allow Location Access** (recommended)
   - Click "Set Location" when prompted
   - Choose "Auto-Detect" and allow browser/system location access
   - OR select your city from the list

2. **Enable Notifications** (optional)
   - Click the bell icon in the header
   - Allow notification permissions
   - Configure notification preferences in Settings

3. **Customize Settings**
   - Click the gear icon
   - Choose your preferred calculation method
   - Select time format (12h/24h)
   - Pick a theme (Light/Dark/Auto)

## Key Features at a Glance

### Prayer Times
- View all 5 daily prayers
- Live countdown to next prayer
- Visual progress indicators

### During Ramadan
- Automatic Ramadan detection
- Sehri/Iftar countdowns
- Fasting progress tracking
- Ramadan day counter

### Notifications
- Before prayer reminders
- Prayer time alerts
- Ramadan-specific notifications
- Customizable timing

### Islamic Calendar
- Monthly Hijri calendar
- Prayer times for each day
- Islamic holidays highlighted
- Friday (Jumu'ah) markers

## Troubleshooting

### Location Not Working
- Make sure you've allowed location permissions
- Try manual city selection instead
- Or enter coordinates manually

### Notifications Not Showing
- Check browser notification permissions
- Make sure notifications are enabled in Settings
- Test with the bell icon in header

### Prayer Times Incorrect
- Verify your location is correct
- Try different calculation method in Settings
- Check your timezone is detected correctly

### Desktop App Not Starting
- Make sure web app is built first (`cd web && npm run build`)
- Check Node.js version (requires v16+)
- Try deleting `node_modules` and reinstalling

## Development vs Production

### Development Mode
- Web: `cd web && npm run dev` (hot reload enabled)
- Desktop: `cd desktop && npm run dev` (connects to web dev server)

### Production Build
- Web: `cd web && npm run build` (optimized static files)
- Desktop: `cd desktop && npm run build` (packaged application)

## Useful Commands

### Web Application
```bash
npm install        # Install dependencies
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Desktop Application
```bash
npm install           # Install dependencies
npm run dev           # Run in development
npm run build         # Build for current platform
npm run build:win     # Build Windows installer
npm run build:mac     # Build macOS dmg
npm run build:linux   # Build Linux packages
```

## Next Steps

1. ✅ Set your location
2. ✅ Enable notifications
3. ✅ Customize calculation method
4. ✅ Choose your preferred theme
5. ✅ Explore Ramadan features (if in Ramadan)
6. ✅ Browse Islamic calendar

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review [web/README.md](web/README.md) for web app specifics
- See [desktop/README.md](desktop/README.md) for desktop app details
- Open an issue on GitHub for bugs or questions

## Quick Tips

💡 **Tip 1**: The app remembers your location and settings, so you only need to set them once!

💡 **Tip 2**: Prayer times are cached, so they work offline until midnight.

💡 **Tip 3**: During Ramadan, the app automatically shows Sehri/Iftar features.

💡 **Tip 4**: You can have both web and desktop versions running simultaneously.

💡 **Tip 5**: Desktop app runs in system tray - look for the icon in your taskbar!

## Happy Prayer Times! 🤲

May this application help you maintain your prayers and draw closer to Allah.

*"Indeed, prayer has been decreed upon the believers a decree of specified times."* - Quran 4:103

# Counsellor Notes (Electron)

Private, local-first counselling session notes with SQLite backup portability.

## Core Features

- Master password lock for the whole app
- Optional per-client PIN lock
- Session tracking with date, notes, outcomes, and next-session topics
- Simple rich text formatting: bold, italic, headings, bullet/numbered lists
- Print/PDF export for one session or full client history
- Local SQLite database backup and restore
- Branding settings: business name + custom logo upload
- Auto-update support via GitHub Releases

## Tech Stack

- Electron + React + Vite
- Local SQLite file via sql.js (WASM)
- Tailwind CSS + Tiptap editor

## Getting Started

Requirements:

- Node.js 20+ recommended
- npm

Install and run:

```bash
npm install
npm run dev
```

## Database Location

The local database is saved in Electron user data:

- macOS: `~/Library/Application Support/Counsellor Notes/counsellor-notes.db`
- Windows: `%APPDATA%/Counsellor Notes/counsellor-notes.db`

Also available inside the app:

- Backup button exports a `.db` file anywhere you choose
- Restore button imports a `.db` file

## Branding (Business Name + Logo)

Inside the app sidebar:

- Click Branding
- Set business name
- Upload logo image (PNG/JPG/SVG/WEBP, max 2MB)

This branding appears on login and in the app header.

## App Icons for Installers

Installer icons are generated from one source logo file.

Default source:

- `build/brand-logo.svg`

Generate icon files:

```bash
npm run generate:icons
```

This creates:

- `build/icons/icon.icns` (macOS)
- `build/icons/icon.ico` (Windows)

You can use a custom image instead:

```bash
APP_ICON_SOURCE=path/to/your-logo.png npm run generate:icons
```

## Build Distributables

These commands build installers only. They do not publish to GitHub Releases.

Build both:

```bash
npm run dist
```

Build macOS only:

```bash
npm run dist:mac
```

Build Windows only:

```bash
npm run dist:win
```

Output folder:

- `release/`

To publish installers to the configured GitHub release target, use:

```bash
npm run release
npm run release:mac
npm run release:win
```

## GitHub Releases + Auto Updates

This project includes:

- Electron publish config in `package.json`
- GitHub Actions release workflow at `.github/workflows/release.yml`
- In-app update prompt with a `Download Update` button that opens the latest GitHub Release

### How releases are created

1. Update `version` in `package.json`
2. Commit and push to `main`
3. GitHub Actions creates a GitHub Release `v<version>` if it does not already exist
4. electron-builder uploads the installers plus update metadata files to that release
5. Installed apps on an older version will see an update prompt on launch
6. Clicking `Download Update` opens the latest release page for manual install

Auto-update only works when the app version increases. Pushing code without changing the version will not create a newer update.

### Local publish commands

```bash
npm run release
npm run release:mac
npm run release:win
```

## Security Notes

- Passwords and client PINs are hashed using PBKDF2-SHA512
- Data is local-first; no cloud sync is built in
- Back up `.db` files regularly

## Useful Development Commands

```bash
npm run dev
npm run build
npm run generate:icons
npm run dist
npm run dist:mac
npm run dist:win
npm run release
```

## Run to get out of quarintine
```bash
xattr -d com.apple.quarantine /Applications/Counsellor\ Notes.app
```
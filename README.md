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

## GitHub Releases + Auto Updates

This project includes:

- Electron publish config in `package.json`
- GitHub Actions release workflow at `.github/workflows/release.yml`

### How releases are created

1. Commit and push code to GitHub
2. Create and push a tag like `v1.0.0`
3. GitHub Actions builds Mac + Windows installers
4. electron-builder publishes assets to that GitHub Release

### Commands to tag a release

```bash
git tag v1.0.0
git push origin v1.0.0
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
npm run dist:mac
npm run dist:win
```

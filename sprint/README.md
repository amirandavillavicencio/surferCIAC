# Saurabh's Sprint — 3D Endless Subway Runner

> A high-performance, feature-packed 3D endless runner web game built with **Three.js** and modern Web standards. Inspired by Subway Surfers, fully playable in any browser — no download required.

---

## Live Demo

Play now in your browser:
**https://lucent-lollipop-71a903.netlify.app/**

> Works on **Mobile**, **Tablet**, and **Laptop/Desktop** — fully responsive on all screen sizes.

---

## What's Inside

| Feature | Details |
| :--- | :--- |
| **3D WebGL Graphics** | Three.js rendering with real-time shadows, dynamic lighting, and 60 FPS |
| **26 Playable Heroes** | Diverse male & female characters with unique colors, styles & unlock costs |
| **26 Hoverboards** | Unique boards with distinct colors, names, and 3D showcase previews |
| **5 Power-Ups** | Coin Magnet, 2X Multiplier, Hoverboard Shield, Jetpack, Super Sneakers |
| **Upgrade Shop** | Permanently upgrade power-up durations using collected coins |
| **Missions & Quests** | Multi-tiered mission system with coin rewards |
| **Trophy Room** | 10+ achievements with progress tracking |
| **Daily Rewards** | 7-day login streak calendar with escalating rewards |
| **Lucky Spin Wheel** | Daily free spin for coins, keys & board unlocks |
| **Mystery Box** | Post-run loot crate with random coin & key rewards |
| **Word Hunt** | Collect in-run letters to spell the daily word for bonus coins |
| **Revive System** | Use keys to continue your run after a crash |
| **Inspector Chaser** | Police officer + dog chase sequence — catch = run over! |
| **Web Audio Engine** | Procedural SFX (jump, slide, crash, coins) via Web Audio API |
| **PWA — Install Offline** | Install on Android, iOS, Windows, macOS — 100% offline play |
| **Auto Save** | LocalStorage persistence for scores, coins, unlocks, missions |
| **Fully Responsive UI** | Glassmorphism UI scales perfectly across mobile, tablet, laptop |

---

## Controls

### Desktop / Keyboard

| Action | Primary | Secondary |
| :--- | :--- | :--- |
| Move Left | Left Arrow | A |
| Move Right | Right Arrow | D |
| Jump / Leap | Up Arrow | W |
| Slide / Duck | Down Arrow | S |
| Activate Hoverboard | Space | H / B / E |
| Pause / Resume | Escape | P |

### Mobile / Touch

| Action | Gesture |
| :--- | :--- |
| Move Left / Right | Swipe Left / Right |
| Jump | Swipe Up |
| Slide | Swipe Down |
| Activate Hoverboard | Double Tap Screen |
| Start Game | Swipe Up on menu |

---

## All 26 Playable Heroes

| # | Character | Style | Gender | Unlock |
| :- | :--- | :--- | :--- | :--- |
| 1 | **Cyber Dash** | Neon Speedster | Male | Default |
| 2 | **Shadow Blade** | Stealth Shinobi | Male | 250 Coins |
| 3 | **Neon Phoenix** | Flame Runner | Male | 500 Coins |
| 4 | **Valkyrie Gold** | Cyber Warrior | Female | 750 Coins |
| 5 | **Void Walker** | Phantom Spectre | Male | 1,000 Coins |
| 6 | **Blaze Apex** | Crimson Striker | Male | 1,500 Coins |
| 7 | **Turbo Bolt** | Thunder Sprinter | Male | 2,000 Coins |
| 8 | **Luna Spectra** | Moonlight Runner | Female | 2,500 Coins |
| 9 | **Titan Smash** | Heavy Juggernaut | Male | 3,000 Coins |
| 10 | **Spectre X** | Ghost Infiltrator | Male | 3,800 Coins |
| 11 | **Frost Bite** | Glacial Ranger | Female | 4,500 Coins |
| 12 | **Pulse Raider** | Synthwave Ace | Male | 5,500 Coins |
| 13 | **Viper Strike** | Venom Assassin | Male | 6,500 Coins |
| 14 | **Axel Prime** | Cyborg Commando | Male | 7,800 Coins |
| 15 | **Nova Star** | Cosmic Diva | Female | 9,000 Coins |
| 16 | **Zenith Zero** | Abyssal Overlord | Male | 10,500 Coins |
| 17 | **Vector Neo** | Matrix Hacker | Male | 12,000 Coins |
| 18 | **Chrono Drift** | Time Traveler | Male | 13,500 Coins |
| 19 | **Eclipse Hunter** | Blood Moon Sniper | Female | 15,000 Coins |
| 20 | **Vortex Master** | Hydro Sorcerer | Male | 16,500 Coins |
| 21 | **Sakura Blade** | Cherry Blossom Samurai | Female | 18,000 Coins |
| 22 | **Ghost Protocol** | Chrome Spectre | Male | 20,000 Coins |
| 23 | **Omega Strike** | Apex Mecha Soldier | Male | 22,000 Coins |
| 24 | **Hyperion King** | Golden Legend | Male | 25,000 Coins |
| 25 | **Cyberpunk Saurabh** | Sprint Supreme Legend | Male | 30,000 Coins |
| 26 | **Matrix Nyx** | Cyber Assassin Queen | Female | 35,000 Coins |

---

## All 26 Hoverboards

26 unique hoverboards with individual designs, colors, and 3D preview showcases:

> Classic Board · Flame Rider · Ocean Wave · Neon Glow · Shadow Glide ·
> Thunder Strike · Aurora Drift · Pixel Rush · Galaxy Surfer · Phoenix Wing ·
> Ice Crystal · Void Phantom · Solar Flare · Jungle Runner · Electric Storm ·
> Cherry Blossom · Lava Blade · Steel Hawk · Nebula · Crimson Tide ·
> Golden Sprint · Midnight Dash · Prism Shift · Cyber Sprint · Diamond Edge · **Legend Board**

---

## Power-Ups & Upgrades

| Power-Up | Effect | Upgrade Benefit |
| :--- | :--- | :--- |
| **Coin Magnet** | Pulls all coins from all 3 lanes | +Duration per level |
| **2X Multiplier** | Doubles score gains during run | +Duration per level |
| **Hoverboard Shield** | Absorbs 1 crash (double-tap to activate) | +Duration per level |
| **Jetpack** | Fly over all obstacles + coin trail | +Duration per level |
| **Super Sneakers** | Spring-loaded double-height jumps | +Duration per level |

Each power-up has **5 upgrade tiers** purchasable from the shop using coins.

---

## Achievements & Missions

### Missions
- Distance milestones (100m, 500m, 1km, 5km, 10km...)
- Score thresholds (1,000 to 1,000,000+)
- Coin collection goals
- Power-up activation counts
- Hoverboard usage, crash survivors, key collections
- Word Hunt completions

### Trophies (10 achievements)
Complete in-game achievements for bonus coin rewards. Progress is tracked and saved automatically.

---

## Revive / Save Me System

When you crash, a **5-second countdown** gives you the chance to:
- Spend **2 Keys** to continue your run from the exact position and score
- Each subsequent revive in the same run costs 2 more keys
- Keys are collected in-run or bought from the shop (3 keys = 150 coins)

---

## Responsive Layout — All Devices

The UI is built with a full responsive breakpoint system:

| Screen | Breakpoint | Layout |
| :--- | :--- | :--- |
| Ultra-Small Phone | < 360px | Compact HUD, small tiles |
| Mobile | up to 480px | Dock compressed, stacked bottom bar |
| Tablet | 481px to 1024px | Medium dock, wider modals |
| Desktop | 1025px and above | Full dock, large modals, hover effects |
| Landscape Phone | height < 480px | Middle dock hidden, compact header |

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **3D Rendering** | [Three.js](https://threejs.org/) r128 — WebGL |
| **Language** | Vanilla JavaScript (ES6+ Classes, no framework) |
| **Audio** | Web Audio API — fully synthesized, zero audio files |
| **UI / Styling** | HTML5, CSS3 — Glassmorphism, Flexbox, Grid |
| **Animations** | CSS keyframes + `will-change` GPU compositing |
| **PWA** | Service Worker API + Web App Manifest |
| **Persistence** | `localStorage` — scores, coins, unlocks, missions |
| **Dev Server** | Node.js static server (`server.js`) |
| **Build Tool** | Vite (optional, for production bundle) |
| **Deployment** | Netlify (live), Vercel (alt), any static host |

---

## Project Structure

```
Saurabh's Sprint/
|
+-- index.html                      # Main game entry point + full UI overlay DOM
+-- Saurabhs_Sprint_Standalone.html # Self-contained single-file build (477KB)
+-- Play_Saurabhs_Sprint.bat        # Windows one-click launcher (opens browser + server)
+-- manifest.json                   # PWA Web App Manifest
+-- sw.js                           # Service Worker — offline caching (Network-First)
+-- server.js                       # Node.js local static file server (port 3001)
+-- package.json                    # Project dependencies and npm scripts
+-- netlify.toml                    # Netlify deployment config + security headers
+-- vercel.json                     # Vercel routing configuration
+-- favicon.ico                     # Browser tab icon
+-- apple-touch-icon.png            # iOS home screen icon
+-- build_standalone.js             # Script to rebuild standalone HTML
|
+-- css/
|   +-- style.css                   # Full game UI stylesheet (4200+ lines)
|                                   # Glassmorphism, HUD, modals, responsive breakpoints
|
+-- js/
|   +-- main.js                     # Core game loop, scene setup, state machine
|   |                               # (MENU -> PLAYING -> PAUSED -> GAMEOVER)
|   +-- player.js                   # 3D character mesh builder, physics, animations
|   |                               # (jump, slide, roll, crash knockdown, power-ups)
|   +-- world.js                    # Procedural track generator, dynamic obstacles
|   |                               # (trains, barriers, traffic lights, arches, scenery)
|   +-- collectibles.js             # Coin arcs, power-up spawns, key items, particles
|   +-- chaser.js                   # Inspector + dog chase AI, catch animation
|   +-- input.js                    # Touch swipes, keyboard, double-tap, vibration
|   +-- audio.js                    # Web Audio API synthesizer (all SFX + BGM)
|   +-- ui.js                       # HUD, all menus, modals, shop, character showcase
|   |                               # (Daily rewards, Spin wheel, Achievements, Mystery box)
|   +-- missions.js                 # Quest system, Word Hunt, achievement tracking
|   +-- storage.js                  # LocalStorage persistence layer
|
+-- lib/
|   +-- three.min.js                # Bundled Three.js r128 library (local copy)
|
+-- assets/
|   +-- icons/                      # PWA icons and favicons
|       +-- icon-192.png            # Android / PWA 192x192
|       +-- icon-512.png            # Android / PWA 512x512
|       +-- icon-maskable-512.png   # Adaptive icon for Android
|       +-- apple-touch-icon.png    # iOS / iPadOS 180x180
|       +-- favicon-32x32.png       # Browser tab 32x32
|       +-- favicon-16x16.png       # Browser tab 16x16
|
+-- Unity_SaurabhsSprint/           # Unity prototype version (reference)
|   +-- Assets/Scripts/
|       +-- Camera/                 # Camera follow & shake scripts
|       +-- Collectibles/           # Coin & power-up pickup scripts
|       +-- Cutscenes/              # Intro cutscene controllers
|       +-- Managers/               # CharacterDatabase, GameManager
|       +-- Player/                 # InspectorChaser, movement controller
|       +-- UI/                     # UIManager, score display
|       +-- World/                  # TrackGenerator, obstacle spawning
|
+-- dist/                           # Production build output (auto-generated)
+-- scratch/                        # Dev scratch scripts (not shipped)
```

---

## Getting Started

### Option 1: One-Click Windows Launcher (Easiest)

Double-click **`Play_Saurabhs_Sprint.bat`** — it starts the server and opens the game in your browser automatically.

### Option 2: Node.js Server

```bash
# Clone the repo
git clone <repository-url>
cd "Saurabh's Sprint"

# Start the local game server
node server.js
```

Then open `http://localhost:3001/` in your browser.

### Option 3: Standalone HTML (No server needed)

Open **`Saurabhs_Sprint_Standalone.html`** directly in any modern browser. No installation or server required — everything is self-contained in one file.

### Option 4: Vite Dev Server (For developers)

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open the URL shown in terminal (typically `http://localhost:5173`).

---

## Production Build

```bash
# Build optimized bundle to /dist
npm run build
```

The compiled static assets will be output to the `dist/` directory.

---

## Deployment

### Netlify (Currently Live)
- Repository linked to Netlify
- Publish directory: `.` (root)
- Config: [`netlify.toml`](netlify.toml)
- Security headers: `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`

### Vercel
- Pre-configured via [`vercel.json`](vercel.json)
- Push to main branch and it auto-deploys

### Any Static Host
The entire game is static HTML/CSS/JS with no backend required. Deploy the root folder to GitHub Pages, Cloudflare Pages, Firebase Hosting, or any CDN.

---

## PWA Installation Guide

Install the game as a native app for the best experience:

**Android (Chrome / Edge / Brave):**
1. Open the game in your browser
2. Tap the 3-dot menu and select "Install App" or "Add to Home Screen"
3. Launch from your Home Screen anytime, even offline

**iPhone / iPad (Safari):**
1. Open the game in Safari
2. Tap the Share button at the bottom
3. Select "Add to Home Screen" and tap "Add"

**Windows / macOS (Chrome / Edge):**
1. Click the install icon in the address bar
2. Click "Install" — launches as a standalone desktop app

---

## Audio System

All sounds are **synthesized in real-time** using the Web Audio API — no audio files required:

| Sound | Description |
| :--- | :--- |
| **Background Music** | Synthwave arcade loop |
| **Jump SFX** | Bouncy spring tone |
| **Slide SFX** | Swoosh effect |
| **Crash SFX** | Impact burst + pitch drop |
| **Coin Collect** | Bright ding chime |
| **Key Collect** | Metallic jingle |
| **Power-Up** | Rising energy sweep |
| **Police Whistle** | Sharp frequency burst |
| **Dog Bark** | Noise burst |
| **Hoverboard Activate** | Electric hum |

---

## License

This project is licensed under the **MIT License** — see the [`LICENSE`](LICENSE) file for details.

---

## Author

Developed by **Saurabh Kumar**

If you liked this project, drop a star on the repo.

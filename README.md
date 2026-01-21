# Orbrya Engine - Professional IDE Interface

A Unity/DaVinci Resolve-inspired 3D engine interface optimized for Intel Celeron N4000 Chromebooks.

## Quick Start

```bash
# Option 1: Python server
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Then open: http://localhost:8000
```

## Project Structure

```
orbrya_engine/
├── index.html              # Entry point with toolbar & status bar
├── README.md               # This file
├── assets/
│   └── manifest.json       # Asset manifest for preloading
├── css/
│   └── panels.css          # Complete styling (glassmorphism, dark theme)
└── src/
    ├── main.js             # Application bootstrap
    ├── engine/
    │   ├── SceneController.js   # 3D engine (N4000 optimized)
    │   └── AssetLoader.js       # GLTF/GLB loading with progress
    └── ui/
        ├── PanelManager.js      # Drag/resize/SNAP panel system
        ├── VisualProfiler.js    # FPS, CPU, Memory health bars
        ├── CodeEditor.js        # C# syntax highlighting
        └── Hierarchy.js         # Scene object tree view
```

## Features

### Panel System (Unity-style)
- **Drag** panels by header to move
- **Snap** to workspace edges and other panels (15px threshold)
- **Visual snap guides** (purple lines show alignment)
- **Resize** from edges and corners
- **Minimize/Maximize** buttons
- **State persistence** (localStorage)

### Asset Loader (NEW)
- **GLTF/GLB loading** with Draco compression support
- **Progress tracking** with visual progress bar
- **30 second timeout** for slow school wifi (1Mbps assumed)
- **Memory caching** to avoid reloading
- **Texture compression detection** (ASTC, ETC, DXT)
- **Chunked loading** - yields to main thread to prevent blocking

### Panels Included

| Panel | Position | Description |
|-------|----------|-------------|
| **Scene Viewport** | Center | 3D view, auto-resizes to fill panel |
| **Performance** | Right | FPS counter, health bars, graph |
| **Code Editor** | Right | C# syntax highlighting, console |
| **Hierarchy** | Left | Scene object tree, search filter |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `T` | Cycle tree count: 25 → 50 → 100 → 175 → 300 |
| `F11` | Toggle viewport maximize |

## Testing Asset Loading on Slow Networks

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Slow 3G" or "Fast 3G" throttling
4. Refresh page and watch loading progress

The loader will:
- Show progress percentage
- Timeout after 30 seconds with clear error
- Fall back to procedural geometry if loading fails

## Debug Console

```javascript
// Performance stats
window.orbrya.getStats()

// Asset loader stats
window.orbrya.sceneController.getAssetLoader().getStats()

// Spawn trees
window.orbrya.spawnTrees(200)

// Clear asset cache
window.orbrya.sceneController.getAssetLoader().clearCache()
```

## N4000 Optimizations

| Optimization | Impact |
|-------------|--------|
| `setPixelRatio(1.0)` | +10-15 FPS |
| `antialias: false` | +10-15 FPS |
| Shadows disabled | +20-25 FPS |
| GPU Instancing | 175 trees = 2 draw calls |
| ResizeObserver | Reliable viewport resize |
| Panel snapping | 15px threshold |

## License

Proprietary - Orbrya Inc.

## Build & Deployment

### Prerequisites
```bash
node >= 18.0.0
npm
git
```

### Development
```bash
npm install
npm run dev     # Start dev server at http://localhost:3000
```

### Production Build
```bash
npm run build   # Outputs to /dist
npm run preview # Preview production build locally
```

### Deploy to GitHub Pages
```bash
# 1. Update base path in vite.config.js to match your repo name
# 2. Run deploy script
chmod +x deploy.sh
./deploy.sh
```

### Test Page
After deployment, visit:
- Full IDE: `https://YOUR_USERNAME.github.io/orbrya-engine/`
- Test Page: `https://YOUR_USERNAME.github.io/orbrya-engine/test.html`

### File Structure
```
orbrya_engine/
├── package.json        # Dependencies & scripts
├── vite.config.js      # Build configuration
├── deploy.sh           # GitHub Pages deployment
├── .gitignore          # Git ignore rules
├── index.html          # Full IDE entry
├── test.html           # Chromebook test page
├── assets/manifest.json
├── css/panels.css
└── src/
    ├── main.js
    ├── engine/
    │   ├── SceneController.js
    │   └── AssetLoader.js
    ├── ui/
    │   ├── PanelManager.js
    │   ├── VisualProfiler.js
    │   ├── CodeEditor.js
    │   └── Hierarchy.js
    └── utils/
        └── ProfilingTestSuite.js
```

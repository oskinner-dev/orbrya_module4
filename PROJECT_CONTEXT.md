# ORBRYA ENGINE - Development Context

**Use this file:** Upload to new Claude chats to maintain development continuity.

## Quick Start for Claude

```
Repository: https://github.com/oskinner-dev/orbrya_engine_prototype
Live Demo: https://oskinner-dev.github.io/orbrya_engine_prototype/
Local Path: C:\Users\sapph\orbrya_engine
```

**To deploy changes:**
```bash
cd C:\Users\sapph\orbrya_engine
git add -A && git commit -m "description" && git push origin master
```
GitHub Pages auto-deploys from master branch.

---

## What This Project Is

Orbrya is an **AI Literacy EdTech platform** that teaches K-12 students to audit and debug AI-generated code. The core mechanic ("Saboteur") presents students with intentionally broken code that crashes performance, and they must fix it.

**Target Hardware:** Intel Celeron N4000 Chromebook (4GB RAM, UHD 600 GPU)
**Performance Target:** 40-60 FPS with full IDE visible

---

## Architecture Overview

```
C:\Users\sapph\orbrya_engine\
├── index.html              # Main entry, status bar, keyboard help
├── vite.config.js          # GitHub Pages base path config
├── css/
│   └── panels.css          # All UI styling (1200+ lines)
├── src/
│   ├── main.js             # App entry, keyboard shortcuts, lite mode
│   ├── engine/
│   │   ├── SceneController.js   # Three.js scene, tree spawning, GPU instancing
│   │   ├── CodeExecutor.js      # Parses C# templates, extracts loop conditions
│   │   └── AssetLoader.js       # Asset loading (currently disabled)
│   ├── ui/
│   │   ├── PanelManager.js      # Draggable panels, grid snap, layout presets
│   │   ├── VisualProfiler.js    # FPS display, health bars, graph
│   │   ├── CodeEditor.js        # Textarea editor, run/validate/undo
│   │   └── Hierarchy.js         # Scene object tree
│   ├── scenarios/
│   │   ├── templates/
│   │   │   └── TreeSpawner.cs   # Default buggy code template
│   │   ├── Scenario.js          # Base scenario class
│   │   ├── ScenarioManager.js   # Scenario loading/switching
│   │   └── InfiniteForest.js    # First scenario implementation
│   └── utils/
│       └── ProfilingTestSuite.js # Performance testing
```

---

## Key Technical Constraints (N4000 Optimization)

**MUST DO:**
- Use GPU Instancing (InstancedMesh) for repeated objects
- MeshLambertMaterial only (no PBR)
- Shadows disabled
- Pixel ratio capped at 1.0
- Antialias disabled
- < 100 draw calls per frame
- < 400MB memory

**NEVER DO:**
- Unity/Unreal (won't run)
- Complex shaders
- Real-time shadows
- High-poly meshes
- Frequent GC allocations in render loop

---

## Core Loop: The "Saboteur" Mechanic

1. Student sees broken code: `while (true) { scene.SpawnTree(); }`
2. Scene spawns 1000 trees → FPS crashes to <20
3. Student edits: `while (treeCount < 50)`
4. Clicks "Run" → CodeExecutor parses condition
5. Scene respawns with 50 trees → FPS recovers to 60
6. Visual feedback: profiler shows green health bars

---

## How CodeExecutor Works

```javascript
// Extracts numeric limit from C# while conditions:
"while (treeCount < 50)"     → 50 trees
"while (treeCount <= 100)"   → 101 trees  
"while (50 > treeCount)"     → 50 trees
"while (true)"               → 1000 (safety cap + warning)
```

File: `src/engine/CodeExecutor.js`

---

## Layout System

**Keyboard Shortcuts:**
- `L` - Lite Mode (hide panels for max FPS)
- `P` - Toggle Profiler
- `T` - Cycle tree count
- `H` - Help overlay

**Layout Presets (Layout button):**
- Default, Code Focus, Viewport Focus, Presentation

**Grid Snapping:** 20px grid, can be toggled in Layout menu

---

## Adding New Scenarios

1. Create `src/scenarios/YourScenario.js` extending `Scenario`
2. Define `getBuggyCode()` and `getOptimalCode()`
3. Implement `setup()`, `validate()`, `getHints()`
4. Register in `ScenarioManager.js`
5. Add to dropdown in `CodeEditor.js`

See `src/scenarios/README.md` for full guide.

---

## Common Tasks

**Change tree spawning behavior:**
Edit `SceneController.js` → `spawnTrees(count)`

**Modify code parsing:**
Edit `CodeExecutor.js` → `parseStudentCode()`

**Add UI panels:**
Use `PanelManager.createPanel()` pattern from existing panels

**Adjust FPS thresholds:**
Edit `VisualProfiler.js` → `this.thresholds`

---

## Performance Checklist

Before committing, verify on N4000 or equivalent:
- [ ] 60 FPS with 25 trees
- [ ] 50+ FPS with 50 trees
- [ ] 40+ FPS with 100 trees
- [ ] No memory leaks (check profiler)
- [ ] Scroll wheel works in code editor
- [ ] Toolbar stays fixed when scrolling

---

## Current State (as of last update)

**Working:**
- Full IDE interface with 4 panels
- Grid snapping and layout presets
- CodeExecutor parsing C# while loops
- GPU-instanced tree rendering
- Custom scrollbars
- Lite mode for demos
- 58-60 FPS on N4000 with 50 trees

**TODO:**
- More scenario types (memory leaks, draw calls)
- Syntax highlighting (disabled due to bugs)
- Teacher dashboard
- Student progress tracking

---

## Git Workflow

```bash
# Check status
git status

# Commit and deploy
git add -A && git commit -m "message" && git push origin master

# Pull latest
git pull origin master
```

GitHub Pages deploys automatically in ~1 minute.

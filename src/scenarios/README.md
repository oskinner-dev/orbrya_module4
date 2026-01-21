# Orbrya Scenario System - "The Infinite Forest" Test

## Overview

The scenario system implements Orbrya's core "Saboteur" pedagogy: students fix intentionally broken AI-generated code to learn debugging, optimization, and systems thinking.

## Quick Start

### Run the Infinite Forest Scenario

**Option 1: Keyboard Shortcut**
- Press `S` to start the scenario

**Option 2: Console Command**
```javascript
window.orbrya.runInfiniteForest()
```

**Option 3: Dropdown Menu**
- Select "🌲 The Infinite Forest" from the scenario dropdown in the code editor toolbar

### Run Automated Tests
```javascript
// Full test suite (runs 3 times)
window.testRunner.runFullTest()

// Individual tests
window.testRunner.testBrokenState()
window.testRunner.testFixApply()
window.testRunner.testReset()
```

## The Infinite Forest Scenario

### Story
> "The AI tried to populate this forest, but it wrote a buggy loop. The forest is spawning WAY too many trees and the game is lagging. Can you fix the AI's code?"

### Workflow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scene loads | 500 trees spawn, FPS drops to ~10 |
| 2 | Profiler shows RED | FPS < 30, health bars critical |
| 3 | Click "🔍 Inspect AI Code" | Code editor loads buggy code |
| 4 | Find the bug | `while (true)` - infinite loop! |
| 5 | Fix the code | Change to `while (treeCount < 50)` |
| 6 | Click "✅ Apply Fix" | Scene respawns with 50 trees |
| 7 | Profiler shows GREEN | FPS returns to 55-60 |
| 8 | Success overlay | Shows improvement metrics |

### The Buggy Code
```csharp
while (true)  // ← ❌ INFINITE LOOP!
{
    SpawnTree();
    treeCount++;
}
```

### The Fix
```csharp
while (treeCount < 50)  // ✅ Proper termination condition
{
    SpawnTree();
    treeCount++;
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Start Infinite Forest scenario |
| `H` | Show hint |
| `R` | Reset current scenario |
| `T` | Cycle tree count (free mode) |
| `L` | Toggle Lite Mode (hide panels) |
| `P` | Toggle profiler panel |

## File Structure

```
src/scenarios/
├── Scenario.js          # Base class for all scenarios
├── InfiniteForest.js    # The Infinite Forest scenario
├── ScenarioManager.js   # Orchestrates scenario lifecycle
└── templates/
    └── TreeSpawner.cs   # C# template for reference

src/utils/
└── ScenarioTestRunner.js # Automated testing
```

## Test Criteria

The test runner validates:

1. **Broken State**
   - FPS < 30 ✓
   - Tree count >= 400 ✓

2. **Fix Application**  
   - FPS >= 45 after fix ✓
   - Tree count <= 100 ✓

3. **Completion Detection**
   - Success overlay displayed ✓
   - Metrics accurately reported ✓

4. **Memory Stability**
   - No significant heap growth between runs ✓
   - No memory leaks detected ✓

5. **Reset Functionality**
   - Returns to broken state ✓
   - All UI elements reset ✓

## API Reference

### ScenarioManager

```javascript
// Load a scenario
await scenarioManager.loadScenario('infinite-forest');

// Get current status
scenarioManager.getStatus();

// Get hint for current scenario
scenarioManager.getHint();

// Reset current scenario
scenarioManager.reset();
```

### Scenario (base class)

```javascript
// Lifecycle methods
await scenario.init();
await scenario.start();
scenario.inspect();
const result = await scenario.apply(code);
const completion = scenario.checkCompletion();
scenario.reset();
```

### ScenarioTestRunner

```javascript
// Run full test suite (3 iterations)
await testRunner.runFullTest();

// Individual tests
await testRunner.testBrokenState();
await testRunner.testFixApply();
await testRunner.testReset();
```

## Creating New Scenarios

1. Extend the `Scenario` base class:

```javascript
import { Scenario } from './Scenario.js';

export class MyNewScenario extends Scenario {
    constructor(sceneController, codeEditor, profiler) {
        super(sceneController, codeEditor, profiler);
        
        this.id = 'my-scenario';
        this.title = 'My New Scenario';
        
        this.buggyCode = `// AI-generated buggy code here`;
        
        this.solutionPatterns = [
            {
                regex: /pattern/,
                feedback: 'Good fix!'
            }
        ];
    }
    
    async start() {
        // Create broken state
        await super.start();
    }
}
```

2. Register in ScenarioManager:

```javascript
this.registerScenario('my-scenario', MyNewScenario);
```

## Performance Notes

- All scenarios must be N4000-safe (Intel Celeron N4000, 4GB RAM)
- Target 30-60 FPS in "fixed" state
- "Broken" state intentionally targets < 30 FPS to demonstrate lag
- GPU instancing keeps draw calls low (2 draw calls per tree type)

## Pedagogical Framework

The "Saboteur" method inverts traditional coding education:

| Traditional | Orbrya "Saboteur" |
|-------------|-------------------|
| Write code from scratch | Fix broken code |
| Abstract concepts | Visual consequences |
| Pass/fail tests | Performance metrics |
| AI does it for you | AI's mistakes teach you |

Students learn to:
- Identify infinite loops
- Understand performance impact
- Write proper termination conditions
- Debug systematically
- Think like systems architects


## JSON-Based Scenario Definitions (NEW)

Scenarios can now be defined using JSON configuration files, enabling:
- Data-driven scenario creation without code changes
- Curriculum alignment with education standards (CSTA, ISTE, Perkins V)
- A/B testing different hint strategies
- Easy localization and translation
- Teacher/admin scenario customization

### Definition File Structure

Create a JSON file in `src/scenarios/definitions/`:

```json
{
  "id": "infinite-forest",
  "name": "The Infinite Forest",
  "difficulty": "beginner",
  "estimatedTime": "15-20 min",
  
  "story": {
    "intro": "...",
    "problem": "...",
    "goal": "...",
    "hint": "...",
    "success": "...",
    "failure": "..."
  },
  
  "code": {
    "language": "csharp",
    "template": "// Buggy code here...",
    "correctSolution": "while (treeCount < 50)",
    "acceptablePatterns": [
      {
        "pattern": "treeCount\\s*<\\s*(\\d+)",
        "feedback": "Great! You added a proper loop limit.",
        "minValue": 10,
        "maxValue": 175
      }
    ]
  },
  
  "hints": [
    {
      "level": 1,
      "delaySeconds": 60,
      "text": "Look at the while loop condition...",
      "trigger": "time"
    }
  ],
  
  "validation": {
    "initialTreeCount": 500,
    "targetTreeCount": 50,
    "acceptableRange": { "min": 10, "max": 175 },
    "targetFPS": 45
  },
  
  "learningObjectives": [
    {
      "id": "lo-1",
      "objective": "Understand infinite loops",
      "standard": "CSTA 2-AP-17"
    }
  ],
  
  "metadata": {
    "tags": ["loops", "debugging"],
    "targetGrades": ["6", "7", "8"],
    "standards": {
      "csta": ["2-AP-12", "2-AP-17"],
      "iste": ["1.5"]
    }
  }
}
```

### Using the Scenario Loader

```javascript
import { ScenarioLoader } from './ScenarioLoader.js';

const loader = new ScenarioLoader();
const config = await loader.loadDefinition('infinite-forest');

// Get formatted hints
const hints = loader.getHints(config);

// Validate student solution
const result = loader.validateSolution(config, studentCode);

// Get standards for curriculum mapping
const standards = loader.getStandardsAlignment(config);
```

### File Organization

```
src/scenarios/
├── definitions/
│   ├── infinite-forest.json    # Beginner scenario
│   ├── memory-leak-manor.json  # Intermediate (coming soon)
│   └── draw-call-dungeon.json  # Advanced (coming soon)
├── ScenarioLoader.js           # JSON loader utility
├── Scenario.js                 # Base class
├── InfiniteForest.js          # JavaScript implementation
└── ScenarioManager.js         # Orchestration
```


## Scenario UI Components

The `ui/` folder contains reusable UI components for the scenario experience.

### Components

| Component | Purpose |
|-----------|---------|
| `ScenarioUI` | Main UI class with all visual components |
| `ScenarioUIIntegration` | Helper to connect scenarios to UI |

### Inspector Panel

Shows the AI assistant, story, problem, and goal:

```javascript
import { ScenarioUI } from './ui/ScenarioUI.js';

const ui = new ScenarioUI().init();

ui.showInspector({
    intro: "The AI made a mistake...",
    problem: "The loop never stops!",
    goal: "Add a proper exit condition"
});
```

### Hint System

Progressive hints with visual feedback:

```javascript
// Set up hints array
ui.setHints([
    { level: 1, text: "Look at the while loop..." },
    { level: 2, text: "Replace 'true' with a condition..." },
    { level: 3, text: "Try: while (treeCount < 50)" }
]);

// Show hint button
ui.showHintButton();

// Show specific hint
ui.showHint(1, "Look at the while loop...");

// Pulse button to draw attention
ui.pulseHintButton();
```

### Success Modal

Celebration with stats and next actions:

```javascript
ui.showSuccess({
    message: "You fixed the infinite loop!",
    fps: 60,
    time: 120,      // seconds
    attempts: 2,
    hintsUsed: 1,
    score: 85
});
```

### Error & Feedback

```javascript
// Show error toast (auto-hides after 4 seconds)
ui.showError("That's not quite right. Try again!");

// Show try again button
ui.showTryAgain();
```

### Integration with Scenarios

The easiest way to use ScenarioUI with a scenario:

```javascript
import { integrateScenarioUI } from './ui/index.js';

// In your scenario's init():
const integration = integrateScenarioUI(this);

// The integration automatically:
// - Shows inspector on scenario start
// - Handles hint requests
// - Shows success modal on completion
// - Handles try again / reset
```

### Callbacks

Set custom handlers for UI events:

```javascript
ui.setCallbacks({
    onHintRequest: () => { /* track hint usage */ },
    onTryAgain: () => { scenario.reset(); },
    onNextScenario: () => { loadNextScenario(); },
    onBackToDashboard: () => { window.location = '/dashboard.html'; },
    onInspectorDismiss: (action) => { 
        if (action === 'inspect') scenario.inspect();
    }
});
```

### Styling

The UI uses glassmorphism styling to match the engine:

- Dark theme with purple/blue accents
- Smooth CSS animations
- Responsive design
- Celebration particles on success

Custom themes can be added via CSS variables (coming soon).

### File Structure

```
src/scenarios/ui/
├── index.js              # Exports all components
├── ScenarioUI.js         # Main UI class (1400+ lines)
└── ScenarioUIIntegration.js  # Scenario-UI connector
```

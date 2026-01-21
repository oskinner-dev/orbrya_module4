# Infinite Forest Scenario - Test Verification

## ✅ Implementation Complete

### Files Implemented

| File | Lines | Status |
|------|-------|--------|
| `src/scenarios/Scenario.js` | 329 | ✅ Complete base class |
| `src/scenarios/InfiniteForest.js` | 523 | ✅ Full scenario implementation |
| `src/scenarios/ScenarioManager.js` | 334 | ✅ Orchestration complete |
| `src/utils/ScenarioTestRunner.js` | 309 | ✅ Automated testing |

### Workflow Verification

```
START → BROKEN STATE → INSPECT → FIX → SUCCESS

1. Press 'S' or select "🌲 The Infinite Forest" from dropdown
   → Spawns 500 trees
   → FPS drops to ~10
   → Story overlay appears
   → "🔍 Inspect AI Code" button shows

2. Click "🔍 Inspect AI Code"
   → Story overlay hides
   → Code editor loads buggy code:
     while (true) { SpawnTree(); treeCount++; }
   → Button changes to "📝 Code Loaded"

3. Student edits code:
   → Changes "while (true)" to "while (treeCount < 50)"

4. Click "✅ Apply Fix"
   → Validates code using regex patterns
   → Extracts limit (50) from condition
   → Calls sceneController.spawnTrees(50)
   → Waits for FPS to stabilize

5. Completion check:
   → If FPS >= 45: SUCCESS overlay with metrics
   → If FPS < 45: Warning message, try different limit

6. Reset (press 'R' or click "Try Again")
   → Restores 500 trees
   → Returns to step 1
```

## Testing Commands

### Browser Console (http://127.0.0.1:8080)

```javascript
// Start the scenario
window.orbrya.runInfiniteForest()

// Run full automated test (3 iterations)
window.testRunner.runFullTest()

// Individual tests
window.testRunner.testBrokenState()  // Verify 500 trees, low FPS
window.testRunner.testFixApply()     // Verify fix works
window.testRunner.testReset()        // Verify reset restores state
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Start Infinite Forest |
| `H` | Show hint |
| `R` | Reset scenario |
| `T` | Cycle tree count (free mode) |
| `L` | Lite Mode (max FPS) |
| `P` | Toggle profiler |

## Expected Test Results

### Broken State
- Trees: 500
- FPS: ~10-15 (should be < 30)
- Profiler: RED indicators

### After Fix (50 trees)
- Trees: 50
- FPS: 55-60 (should be >= 45)
- Profiler: GREEN indicators

### Memory Stability
- No significant heap growth between runs
- Target: < 10MB increase per test cycle

## Validation Patterns

The scenario accepts these fix patterns:

```csharp
while (treeCount < 50)   // Primary pattern
while (treeCount <= 49)  // Alternative
while (50 > treeCount)   // Reversed comparison
while (treeCount != 50)  // Works but less safe
```

## Success Metrics

| Metric | Target | Pass Condition |
|--------|--------|----------------|
| FPS Before | ~10 | < 30 |
| FPS After | ~60 | >= 45 |
| Trees Before | 500 | >= 400 |
| Trees After | varies | <= 100 |
| Improvement | ~500% | > 200% |

---

**Test Date:** December 30, 2025  
**Server:** http://127.0.0.1:8080  
**Ready for manual testing!**

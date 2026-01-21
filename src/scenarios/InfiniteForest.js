/**
 * InfiniteForest.js - "THE INFINITE FOREST" Scenario
 * 
 * A complete, production-ready implementation of Orbrya's first educational
 * scenario teaching students to identify and fix infinite loops.
 * 
 * PEDAGOGICAL GOAL:
 * Make the consequences of infinite loops visually obvious through
 * real-time FPS degradation, then reward students with immediate
 * visual feedback when they fix the bug.
 * 
 * LIFECYCLE:
 * 1. load()        - Load config from JSON, initialize state
 * 2. setup()       - Spawn broken scene (300+ trees), show intro
 * 3. inspect()     - Student views the buggy AI code
 * 4. onApplyCode() - Execute fix, respawn trees
 * 5. validate()    - Check solution correctness
 * 6. onComplete()  - Show success, save progress
 * 7. reset()       - Allow retry
 * 
 * @version 2.0.0 - Now loads from JSON config
 */

import { Scenario } from './Scenario.js';
import { ScenarioLoader } from './ScenarioLoader.js';

export class InfiniteForest extends Scenario {
    constructor(sceneController, codeEditor, profiler) {
        super(sceneController, codeEditor, profiler);
        
        // Scenario identification
        this.id = 'infinite-forest';
        this.title = 'The Infinite Forest';
        this.description = 'Fix the AI\'s buggy tree spawner to restore performance';
        this.difficulty = 'beginner';
        
        // Config loaded from JSON
        this.config = null;
        this.loader = new ScenarioLoader();
        
        // Session tracking (persisted during session)
        // Note: this.state is used by base class as a string ('idle', 'broken', etc.)
        this.session = {
            attempts: 0,
            hintsShown: 0,
            hintsRevealed: [],      // Which hint levels have been shown
            startTime: null,
            codeEdits: [],          // History of student's code versions
            checkpoints: {},        // Which checkpoints have been reached
            completed: false,
            fpsBefore: null,
            fpsAfter: null
        };
        
        // Hint system
        this._hintTimers = [];
        this._activeHintLevel = 0;
        
        // UI element references
        this._inspectorButton = null;
        this._storyOverlay = null;
        this._successOverlay = null;
        this._hintButton = null;
        this._hintPanel = null;
        
        // Fallback values if JSON load fails
        this._defaults = {
            initialTreeCount: 300,
            targetTreeCount: 50,
            acceptableRange: { min: 10, max: 175 },
            targetFPS: 45,
            minimumFPS: 30
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // LIFECYCLE METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Load scenario configuration from JSON and initialize
     */
    async load() {
        console.log(`[InfiniteForest] Loading configuration...`);
        
        try {
            this.config = await this.loader.loadDefinition(this.id);
            
            if (this.config) {
                // Apply config values
                this.title = this.config.name;
                this.difficulty = this.config.difficulty;
                this.story = this.config.story;
                this.buggyCode = this.config.code.template;
                this.solutionPatterns = this.loader.getValidationPatterns(this.config);
                this.validation = this.config.validation;
                
                console.log(`[InfiniteForest] Config loaded successfully`);
            } else {
                console.warn(`[InfiniteForest] Using fallback configuration`);
                this._useFallbackConfig();
            }
        } catch (error) {
            console.error(`[InfiniteForest] Config load error:`, error);
            this._useFallbackConfig();
        }
        
        return this;
    }

    /**
     * Use hardcoded fallback if JSON fails to load
     */
    _useFallbackConfig() {
        this.validation = this._defaults;
        this.story = this._getFallbackStory();
        this.buggyCode = this._getFallbackCode();
        this.solutionPatterns = this._getFallbackPatterns();
    }

    /**
     * Initialize the scenario (called once when first loaded)
     */
    async init() {
        await this.load();
        await super.init();
        
        // Create UI elements
        this._createInspectorButton();
        this._createStoryOverlay();
        this._createSuccessOverlay();
        this._createHintButton();
        this._createHintPanel();
        
        console.log(`[InfiniteForest] Initialized`);
        return this;
    }

    /**
     * Setup the broken scene state with ANIMATED tree spawning
     * This shows the "infinite loop running" rather than just the result
     */
    async setup() {
        console.log('[InfiniteForest] Setting up broken state...');
        
        // Reset state for new attempt
        this.session.startTime = Date.now();
        this.session.checkpoints = {};
        
        // Get initial tree count from config
        const brokenCount = this.validation?.initialTreeCount || 
                           this.config?.validation?.initialTreeCount || 
                           this._defaults.initialTreeCount;
        
        // Clear existing trees first
        this.sceneController.spawnTrees(0);
        
        // Animate tree spawning to show "the loop running"
        await this._animateInfiniteLoop(brokenCount);
        
        // Mark checkpoint
        this._markCheckpoint('scene_loaded');
        
        // Capture broken FPS after scene settles
        setTimeout(() => {
            this.session.fpsBefore = this.profiler?.metrics?.fps || 10;
            console.log(`[InfiniteForest] Broken FPS: ${this.session.fpsBefore}`);
        }, 500);
    }
    
    /**
     * Animate tree spawning to visually demonstrate the "infinite loop"
     * Spawns trees in batches, getting faster, showing FPS degradation
     */
    async _animateInfiniteLoop(targetCount) {
        return new Promise((resolve) => {
            let currentCount = 0;
            const batchSize = 15; // Trees per batch
            let delay = 150; // Start slow, get faster
            
            // Log to console like the AI is "running"
            this.codeEditor?.clearConsole();
            this.codeEditor?.log('info', '🤖 AI Code Executing...');
            this.codeEditor?.log('warning', '⚠️ Running: while (true) { SpawnTree(); }');
            
            const spawnBatch = () => {
                if (currentCount >= targetCount) {
                    // "Loop" stops due to performance
                    this.codeEditor?.log('error', `💥 Performance critical! ${currentCount} trees spawned!`);
                    this.codeEditor?.log('error', '❌ The loop has no exit condition!');
                    resolve();
                    return;
                }
                
                // Spawn a batch of trees
                currentCount += batchSize;
                if (currentCount > targetCount) currentCount = targetCount;
                
                this.sceneController.spawnTrees(currentCount);
                
                // Log progress periodically
                if (currentCount % 50 === 0 || currentCount === batchSize) {
                    const fps = this.profiler?.metrics?.fps || 60;
                    this.codeEditor?.log('info', `🌲 Trees: ${currentCount} | FPS: ${Math.round(fps)}`);
                }
                
                // Speed up the loop (like code running faster)
                delay = Math.max(30, delay * 0.85);
                
                // Continue the "loop"
                setTimeout(spawnBatch, delay);
            };
            
            // Start the animated spawning
            setTimeout(spawnBatch, 500);
        });
    }

    /**
     * Start the scenario - shows intro and begins the experience
     */
    async start() {
        console.log('[InfiniteForest] Starting scenario...');
        
        // Setup the broken scene
        await this.setup();
        
        // Show the story intro
        this._showStoryOverlay();
        
        // Show inspector button after delay
        setTimeout(() => {
            this._showInspectorButton();
        }, 1000);
        
        // Start hint timers
        this._startHintTimers();
        
        await super.start();
    }

    /**
     * Called when student clicks "Inspect AI Code"
     */
    inspect() {
        console.log('[InfiniteForest] Student inspecting code...');
        
        super.inspect();
        
        // Hide story overlay
        this._hideStoryOverlay();
        
        // Mark checkpoint
        this._markCheckpoint('inspect_code');
        
        // Load buggy code into editor
        if (this.codeEditor) {
            this.codeEditor.setCode(this.buggyCode);
            this.codeEditor.log('warning', '⚠️ AI code loaded - Find and fix the bug!');
            this.codeEditor.log('info', '💡 Hint: Look at the while loop condition');
        }
        
        // Update inspector button
        if (this._inspectorButton) {
            this._inspectorButton.textContent = '📝 Code Loaded';
            this._inspectorButton.disabled = true;
        }
        
        // Show hint button
        this._showHintButton();
    }

    /**
     * Called when student modifies the code
     */
    onStudentEdit(code) {
        // Track code edits for analytics
        this.session.codeEdits.push({
            timestamp: Date.now(),
            code: code,
            elapsed: Date.now() - this.session.startTime
        });
        
        // Mark checkpoint on first edit
        if (!this.session.checkpoints.code_modified) {
            this._markCheckpoint('code_modified');
        }
    }

    /**
     * Called when student clicks "Apply Fix" / "Run"
     */
    async onApplyCode(code) {
        console.log('[InfiniteForest] Applying student fix...');
        
        this.session.attempts++;
        this._markCheckpoint('code_applied');
        
        // Track this edit
        this.onStudentEdit(code);
        
        // Parse student's code
        const result = this._parseStudentCode(code);
        
        if (!result.valid) {
            this._showError(result.feedback);
            return { success: false, validation: result };
        }
        
        // Respawn with student's limit
        const limit = result.extractedValue;
        console.log(`[InfiniteForest] Respawning with ${limit} trees`);
        this.sceneController.spawnTrees(limit);
        
        // Log feedback
        this.codeEditor?.log('info', result.feedback);
        
        // Wait for FPS to stabilize, then validate
        return new Promise(resolve => {
            setTimeout(() => {
                const completion = this.validate();
                resolve({ success: completion.success, validation: result, completion });
            }, 1500);
        });
    }

    /**
     * Apply the student's fix (alias for integration with ScenarioManager)
     */
    async apply(code) {
        return this.onApplyCode(code);
    }


    // ═══════════════════════════════════════════════════════════════
    // VALIDATION & COMPLETION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Parse the student's code to extract their solution
     */
    _parseStudentCode(code) {
        // Use the loader if config is available
        if (this.config && this.loader) {
            return this.loader.validateSolution(this.config, code);
        }
        
        // Fallback to pattern matching
        for (const pattern of this.solutionPatterns) {
            const match = code.match(pattern.regex);
            if (match) {
                const value = match[1] ? parseInt(match[1], 10) : null;
                return {
                    valid: true,
                    feedback: pattern.feedback,
                    extractedValue: value
                };
            }
        }
        
        return {
            valid: false,
            feedback: this.story?.hint || "Try adding a condition like: treeCount < 50",
            extractedValue: null
        };
    }

    /**
     * Validate if the student's solution is correct
     */
    validate() {
        const fps = this.profiler?.metrics?.fps || 0;
        const treeCount = this.sceneController?.currentTreeCount || 0;
        
        // Get thresholds from config or defaults
        const targetFPS = this.validation?.targetFPS || this._defaults.targetFPS;
        const minTrees = this.validation?.acceptableRange?.min || this._defaults.acceptableRange.min;
        const maxTrees = this.validation?.acceptableRange?.max || this._defaults.acceptableRange.max;
        
        // Update metrics
        this.session.fpsAfter = fps;
        this.metrics.fpsAfter = fps;
        
        // Check success criteria
        const fpsPass = fps >= targetFPS;
        const treeCountPass = treeCount >= minTrees && treeCount <= maxTrees;
        const success = fpsPass && treeCountPass;
        
        console.log(`[InfiniteForest] Validate: FPS=${fps} (need ${targetFPS}), Trees=${treeCount} (need ${minTrees}-${maxTrees})`);
        
        if (success) {
            this._markCheckpoint('fps_improved');
            this._markCheckpoint('tree_count_valid');
            this.onComplete();
        } else {
            this._showFeedback(fps, treeCount, targetFPS, minTrees, maxTrees);
        }
        
        return {
            success,
            fps,
            treeCount,
            targetFPS,
            improvement: fps - (this.session.fpsBefore || 10),
            message: success ? this.story?.success : this.story?.failure
        };
    }

    /**
     * Show feedback when solution isn't quite right
     */
    _showFeedback(fps, treeCount, targetFPS, minTrees, maxTrees) {
        let message = '';
        
        if (fps < targetFPS && treeCount > maxTrees) {
            message = `Still too many trees (${treeCount})! The FPS is ${fps}. Try a smaller number like 50.`;
        } else if (fps < targetFPS) {
            message = `FPS is ${fps}, but we need at least ${targetFPS}. Try reducing the tree count.`;
        } else if (treeCount < minTrees) {
            message = `That works, but ${treeCount} trees looks a bit empty. Try 40-50 trees.`;
        } else if (treeCount > maxTrees) {
            message = `${treeCount} trees is still causing some lag. Try a number under ${maxTrees}.`;
        } else {
            message = this.story?.failure || "Not quite right. Keep trying!";
        }
        
        this.codeEditor?.log('warning', message);
        this._showHintButton(); // Make sure hint is visible
    }

    /**
     * Called when scenario is successfully completed
     */
    onComplete() {
        console.log('[InfiniteForest] Scenario complete!');
        
        this.session.completed = true;
        this._markCheckpoint('scenario_complete');
        
        // Stop hint timers
        this._stopHintTimers();
        
        // Calculate stats
        const timeSpent = Math.floor((Date.now() - this.session.startTime) / 1000);
        const improvement = this.session.fpsAfter - (this.session.fpsBefore || 10);
        const improvementPercent = Math.round((improvement / (this.session.fpsBefore || 10)) * 100);
        
        // Show success overlay
        this._showSuccessOverlay({
            fpsBefore: this.session.fpsBefore || 10,
            fpsAfter: this.session.fpsAfter || 60,
            improvement: `+${improvementPercent}%`,
            attempts: this.session.attempts,
            time: timeSpent,
            hintsUsed: this.session.hintsShown
        });
        
        // Log to code editor
        this.codeEditor?.log('success', `🎉 Completed in ${timeSpent}s with ${this.session.attempts} attempt(s)`);
        
        // Call parent complete
        this.complete(true);
        
        // Save progress (if ProgressTracker is available)
        this._saveProgress();
    }

    /**
     * Save progress to ProgressTracker
     */
    _saveProgress() {
        // Check if ProgressTracker and AuthManager are available
        if (typeof window !== 'undefined' && window.ProgressTracker && window.AuthManager) {
            const user = window.AuthManager.getCurrentUser?.();
            if (user?.userId) {
                window.ProgressTracker.markComplete(
                    user.userId,
                    this.id,
                    this._calculateScore()
                );
            }
        }
    }

    /**
     * Calculate score based on performance
     */
    _calculateScore() {
        let score = 100;
        
        // Deduct for attempts beyond first
        score -= (this.session.attempts - 1) * 5;
        
        // Deduct for hints used
        score -= this.session.hintsShown * 10;
        
        // Bonus for speed (under 2 minutes)
        const timeSpent = (Date.now() - this.session.startTime) / 1000;
        if (timeSpent < 120) {
            score += 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }


    // ═══════════════════════════════════════════════════════════════
    // HINT SYSTEM
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start automatic hint timers
     */
    _startHintTimers() {
        const hints = this.config?.hints || this._getFallbackHints();
        
        hints.forEach((hint, index) => {
            if (hint.trigger === 'time' && hint.delaySeconds) {
                const timer = setTimeout(() => {
                    this._revealHint(hint.level);
                }, hint.delaySeconds * 1000);
                
                this._hintTimers.push(timer);
            }
        });
        
        console.log(`[InfiniteForest] Started ${this._hintTimers.length} hint timers`);
    }

    /**
     * Stop all hint timers
     */
    _stopHintTimers() {
        this._hintTimers.forEach(timer => clearTimeout(timer));
        this._hintTimers = [];
    }

    /**
     * Reveal a hint by level
     */
    _revealHint(level) {
        if (this.session.completed) return; // Don't show hints after completion
        if (this.session.hintsRevealed.includes(level)) return; // Already shown
        
        const hints = this.config?.hints || this._getFallbackHints();
        const hint = hints.find(h => h.level === level);
        
        if (!hint) return;
        
        this.session.hintsRevealed.push(level);
        this._activeHintLevel = level;
        
        // Show hint notification
        this._showHintNotification(hint.text);
        
        console.log(`[InfiniteForest] Revealed hint level ${level}`);
    }

    /**
     * Manual hint request (from hint button)
     */
    requestHint() {
        // Find next unrevealed hint
        const hints = this.config?.hints || this._getFallbackHints();
        const available = hints
            .filter(h => !this.session.hintsRevealed.includes(h.level))
            .sort((a, b) => a.level - b.level);
        
        if (available.length === 0) {
            this.codeEditor?.log('info', '💡 No more hints available. Try: while (treeCount < 50)');
            return;
        }
        
        const nextHint = available[0];
        
        // "Cost" for manual hint
        this.session.hintsShown++;
        
        this._revealHint(nextHint.level);
        
        // Update hint panel
        this._updateHintPanel(nextHint.text);
    }

    /**
     * Show hint notification (toast-style)
     */
    _showHintNotification(text) {
        // Log to code editor console
        this.codeEditor?.log('info', text);
        
        // Also update hint panel if visible
        this._updateHintPanel(text);
        
        // Pulse the hint button
        if (this._hintButton) {
            this._hintButton.classList.add('hint-pulse');
            setTimeout(() => {
                this._hintButton?.classList.remove('hint-pulse');
            }, 2000);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CHECKPOINT TRACKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Mark a checkpoint as reached
     */
    _markCheckpoint(checkpointId) {
        if (!this.session.checkpoints[checkpointId]) {
            this.session.checkpoints[checkpointId] = {
                reached: true,
                timestamp: Date.now(),
                elapsed: Date.now() - this.session.startTime
            };
            console.log(`[InfiniteForest] Checkpoint: ${checkpointId}`);
        }
    }

    /**
     * Get checkpoint status for analytics
     */
    getCheckpointStatus() {
        return {
            scenarioId: this.id,
            checkpoints: this.session.checkpoints,
            progress: Object.keys(this.session.checkpoints).length,
            total: 6 // Total checkpoints in this scenario
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // RESET & ERROR HANDLING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Reset scenario for retry
     */
    reset() {
        console.log('[InfiniteForest] Resetting...');
        
        // Stop hint timers
        this._stopHintTimers();
        
        // Reset session (keep some analytics)
        const previousAttempts = this.session.attempts;
        this.session = {
            attempts: previousAttempts,
            hintsShown: this.session.hintsShown,
            hintsRevealed: [],
            startTime: Date.now(),
            codeEdits: [],
            checkpoints: {},
            completed: false,
            fpsBefore: null,
            fpsAfter: null
        };
        
        // Reset UI
        this._hideSuccessOverlay();
        this._hideHintPanel();
        this._showInspectorButton();
        
        if (this._inspectorButton) {
            this._inspectorButton.textContent = '🔍 Inspect AI Code';
            this._inspectorButton.disabled = false;
        }
        
        // Setup broken state again
        this.setup();
        
        // Show story again
        this._showStoryOverlay();
        
        // Clear code editor
        this.codeEditor?.clearConsole();
        this.codeEditor?.log('info', '🔄 Scenario reset - Try again!');
        
        // Call parent reset
        super.reset();
    }

    /**
     * Show error message to student
     */
    _showError(message) {
        this.codeEditor?.log('error', message);
    }


    // ═══════════════════════════════════════════════════════════════
    // UI CREATION METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create the "Inspect AI Code" button
     */
    _createInspectorButton() {
        if (document.getElementById('scenario-inspector-btn')) {
            this._inspectorButton = document.getElementById('scenario-inspector-btn');
            return;
        }
        
        const btn = document.createElement('button');
        btn.id = 'scenario-inspector-btn';
        btn.className = 'scenario-action-btn';
        btn.innerHTML = '🔍 Inspect AI Code';
        btn.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 30px;
            font-size: 18px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
            z-index: 1000;
            display: none;
            transition: all 0.3s ease;
        `;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateX(-50%) scale(1.05)';
            btn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.6)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateX(-50%) scale(1)';
            btn.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
        });
        
        btn.addEventListener('click', () => this.inspect());
        
        document.body.appendChild(btn);
        this._inspectorButton = btn;
    }

    _showInspectorButton() {
        if (this._inspectorButton) this._inspectorButton.style.display = 'block';
    }

    _hideInspectorButton() {
        if (this._inspectorButton) this._inspectorButton.style.display = 'none';
    }

    /**
     * Create the story intro overlay
     */
    _createStoryOverlay() {
        if (document.getElementById('scenario-story-overlay')) {
            this._storyOverlay = document.getElementById('scenario-story-overlay');
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'scenario-story-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            max-width: 400px;
            background: rgba(15, 22, 41, 0.95);
            border: 2px solid #667eea;
            border-radius: 15px;
            padding: 25px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            z-index: 999;
            display: none;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;
        
        const introText = this.story?.intro || this._getFallbackStory().intro;
        
        overlay.innerHTML = `
            <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${introText}</div>
            <button id="story-dismiss-btn" style="
                margin-top: 15px;
                padding: 10px 20px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
            ">Got it!</button>
        `;
        
        document.body.appendChild(overlay);
        this._storyOverlay = overlay;
        
        overlay.querySelector('#story-dismiss-btn').addEventListener('click', () => {
            this._hideStoryOverlay();
        });
    }

    _showStoryOverlay() {
        if (this._storyOverlay) {
            // Update text in case config loaded after creation
            const introDiv = this._storyOverlay.querySelector('div');
            if (introDiv) {
                introDiv.textContent = this.story?.intro || this._getFallbackStory().intro;
            }
            this._storyOverlay.style.display = 'block';
        }
    }

    _hideStoryOverlay() {
        if (this._storyOverlay) this._storyOverlay.style.display = 'none';
    }

    /**
     * Create hint button
     */
    _createHintButton() {
        if (document.getElementById('scenario-hint-btn')) {
            this._hintButton = document.getElementById('scenario-hint-btn');
            return;
        }
        
        const btn = document.createElement('button');
        btn.id = 'scenario-hint-btn';
        btn.innerHTML = '💡';
        btn.title = 'Get a hint';
        btn.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            font-size: 24px;
            background: rgba(15, 22, 41, 0.9);
            border: 2px solid #ffc107;
            border-radius: 50%;
            cursor: pointer;
            z-index: 1000;
            display: none;
            transition: all 0.3s ease;
        `;
        
        btn.addEventListener('click', () => this.requestHint());
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.5)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
        });
        
        document.body.appendChild(btn);
        this._hintButton = btn;
        
        // Add pulse animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes hint-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
                50% { box-shadow: 0 0 0 15px rgba(255, 193, 7, 0); }
            }
            .hint-pulse { animation: hint-pulse 1s ease-in-out 3; }
        `;
        document.head.appendChild(style);
    }

    _showHintButton() {
        if (this._hintButton) this._hintButton.style.display = 'block';
    }

    _hideHintButton() {
        if (this._hintButton) this._hintButton.style.display = 'none';
    }

    /**
     * Create hint panel
     */
    _createHintPanel() {
        if (document.getElementById('scenario-hint-panel')) {
            this._hintPanel = document.getElementById('scenario-hint-panel');
            return;
        }
        
        const panel = document.createElement('div');
        panel.id = 'scenario-hint-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 30px;
            max-width: 300px;
            background: rgba(15, 22, 41, 0.95);
            border: 2px solid #ffc107;
            border-radius: 10px;
            padding: 15px;
            color: white;
            font-size: 14px;
            z-index: 999;
            display: none;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
        `;
        
        panel.innerHTML = `<div id="hint-text"></div>`;
        
        document.body.appendChild(panel);
        this._hintPanel = panel;
    }

    _updateHintPanel(text) {
        if (this._hintPanel) {
            const textDiv = this._hintPanel.querySelector('#hint-text');
            if (textDiv) textDiv.textContent = text;
            this._hintPanel.style.display = 'block';
        }
    }

    _hideHintPanel() {
        if (this._hintPanel) this._hintPanel.style.display = 'none';
    }


    /**
     * Create success overlay
     */
    _createSuccessOverlay() {
        if (document.getElementById('scenario-success-overlay')) {
            this._successOverlay = document.getElementById('scenario-success-overlay');
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'scenario-success-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #0f1629 0%, #1a2744 100%);
                border: 2px solid #00ff88;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                text-align: center;
                color: white;
                box-shadow: 0 0 60px rgba(0, 255, 136, 0.3);
            ">
                <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #00ff88; margin: 0 0 20px 0; font-size: 28px;">MISSION COMPLETE!</h2>
                <div id="success-message" style="font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin-bottom: 25px;"></div>
                <div id="success-metrics" style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-bottom: 25px;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                ">
                    <div>
                        <div style="font-size: 28px; color: #ff4757;" id="metric-fps-before">10</div>
                        <div style="font-size: 11px; color: #888;">FPS Before</div>
                    </div>
                    <div>
                        <div style="font-size: 28px; color: #00ff88;" id="metric-fps-after">60</div>
                        <div style="font-size: 11px; color: #888;">FPS After</div>
                    </div>
                    <div>
                        <div style="font-size: 28px; color: #667eea;" id="metric-improvement">+500%</div>
                        <div style="font-size: 11px; color: #888;">Improvement</div>
                    </div>
                </div>
                <div id="success-stats" style="font-size: 12px; color: #888; margin-bottom: 20px;"></div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="success-continue-btn" style="
                        padding: 12px 30px;
                        background: linear-gradient(135deg, #00ff88 0%, #00d4aa 100%);
                        color: #0a0a14;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 16px;
                    ">Continue</button>
                    <button id="success-retry-btn" style="
                        padding: 12px 30px;
                        background: transparent;
                        color: #667eea;
                        border: 2px solid #667eea;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Try Again</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this._successOverlay = overlay;
        
        overlay.querySelector('#success-continue-btn').addEventListener('click', () => {
            this._hideSuccessOverlay();
        });
        
        overlay.querySelector('#success-retry-btn').addEventListener('click', () => {
            this._hideSuccessOverlay();
            this.reset();
        });
    }

    _showSuccessOverlay(stats) {
        if (!this._successOverlay) return;
        
        // Update metrics
        this._successOverlay.querySelector('#metric-fps-before').textContent = stats.fpsBefore;
        this._successOverlay.querySelector('#metric-fps-after').textContent = stats.fpsAfter;
        this._successOverlay.querySelector('#metric-improvement').textContent = stats.improvement;
        
        // Update message
        const successText = this.story?.success || this._getFallbackStory().success;
        this._successOverlay.querySelector('#success-message').textContent = successText;
        
        // Update stats
        this._successOverlay.querySelector('#success-stats').textContent = 
            `Attempts: ${stats.attempts} | Time: ${stats.time}s | Hints: ${stats.hintsUsed}`;
        
        // Show
        this._successOverlay.style.display = 'flex';
        this._hideInspectorButton();
        this._hideHintButton();
    }

    _hideSuccessOverlay() {
        if (this._successOverlay) this._successOverlay.style.display = 'none';
    }


    // ═══════════════════════════════════════════════════════════════
    // FALLBACK CONFIGURATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Fallback story if JSON fails to load
     */
    _getFallbackStory() {
        return {
            intro: `🌲 THE INFINITE FOREST 🌲

The AI assistant tried to help build a forest scene, 
but something went wrong...

It wrote a loop that never stops! The forest keeps 
growing until the game crashes!

🔴 PROBLEM: FPS has dropped to ~10. The game is unplayable!

Your mission: Find the bug in the AI's code and fix it.

Click "🔍 Inspect AI Code" to begin your investigation.`,
            
            hint: `💡 HINT: Look at the while loop condition.
"while (true)" means "loop forever" - that's the bug!
Try changing it to "while (treeCount < 50)" to limit the trees.`,
            
            success: `🎉 EXCELLENT WORK!

You fixed the infinite loop! The forest now has a reasonable 
number of trees and the game runs smoothly.

📊 Your Results:
• FPS improved dramatically!
• You learned: Loop termination conditions

You're becoming a great AI code auditor!`,
            
            failure: `🔄 Not quite right yet!

The game is still lagging. Make sure your loop has a 
proper exit condition.

💡 Remember: The loop needs to STOP at some point.
Try: while (treeCount < 50)`
        };
    }

    /**
     * Fallback buggy code if JSON fails to load
     */
    _getFallbackCode() {
        return `// ════════════════════════════════════════════
// 🤖 AI GENERATED CODE - Contains Bug!
// ════════════════════════════════════════════

using Orbrya.Engine;

public class ForestGenerator : ScenarioBase
{
    private int treeCount = 0;

    public void PopulateForest()
    {
        treeCount = 0;
        
        // ╔══════════════════════════════════════════╗
        // ║  🔴 BUG FOUND! FIX THE LINE BELOW!       ║
        // ╚══════════════════════════════════════════╝
        
        while (true)  // ← ❌ INFINITE LOOP!
        {
            SpawnTree();
            treeCount++;
        }
        
        // 💡 HINT: Replace "true" with a condition
        // ✅ Example: while (treeCount < 50)
    }
}`;
    }

    /**
     * Fallback solution patterns if JSON fails to load
     */
    _getFallbackPatterns() {
        return [
            {
                regex: /while\s*\(\s*treeCount\s*<\s*(\d+)\s*\)/,
                extractRegex: /while\s*\(\s*treeCount\s*<\s*(\d+)\s*\)/,
                feedback: 'Great! You added a proper loop limit.',
                minValue: 10,
                maxValue: 175
            },
            {
                regex: /while\s*\(\s*treeCount\s*<=\s*(\d+)\s*\)/,
                extractRegex: /while\s*\(\s*treeCount\s*<=\s*(\d+)\s*\)/,
                feedback: 'Good use of <= operator!',
                minValue: 10,
                maxValue: 174
            },
            {
                regex: /while\s*\(\s*(\d+)\s*>\s*treeCount\s*\)/,
                extractRegex: /while\s*\(\s*(\d+)\s*>\s*treeCount\s*\)/,
                feedback: 'Clever! Reversed the comparison.',
                minValue: 10,
                maxValue: 175
            }
        ];
    }

    /**
     * Fallback hints if JSON fails to load
     */
    _getFallbackHints() {
        return [
            {
                level: 1,
                delaySeconds: 60,
                text: "🤔 Look at the while loop. What happens when the condition is 'true'?",
                trigger: 'time'
            },
            {
                level: 2,
                delaySeconds: 120,
                text: "💡 Replace 'true' with a condition that checks the tree count.",
                trigger: 'time'
            },
            {
                level: 3,
                delaySeconds: 180,
                text: "✅ Try: while (treeCount < 50)",
                trigger: 'time'
            }
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════

    /**
     * Clean up when scenario is disposed
     */
    dispose() {
        console.log('[InfiniteForest] Disposing...');
        
        // Stop timers
        this._stopHintTimers();
        
        // Remove UI elements
        if (this._inspectorButton) this._inspectorButton.remove();
        if (this._storyOverlay) this._storyOverlay.remove();
        if (this._successOverlay) this._successOverlay.remove();
        if (this._hintButton) this._hintButton.remove();
        if (this._hintPanel) this._hintPanel.remove();
        
        // Clear references
        this._inspectorButton = null;
        this._storyOverlay = null;
        this._successOverlay = null;
        this._hintButton = null;
        this._hintPanel = null;
        this.config = null;
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get current scenario status for UI/analytics
     */
    getStatus() {
        return {
            id: this.id,
            title: this.title,
            state: this.state,
            checkpoints: this.getCheckpointStatus(),
            config: this.config ? {
                difficulty: this.config.difficulty,
                estimatedTime: this.config.estimatedTime,
                learningObjectives: this.config.learningObjectives?.length || 0
            } : null
        };
    }

    /**
     * Get learning objectives for curriculum display
     */
    getLearningObjectives() {
        if (this.config && this.loader) {
            return this.loader.getLearningObjectives(this.config);
        }
        return [];
    }

    /**
     * Get standards alignment for reporting
     */
    getStandardsAlignment() {
        if (this.config && this.loader) {
            return this.loader.getStandardsAlignment(this.config);
        }
        return {};
    }
}

export default InfiniteForest;

/**
 * ScenarioManager.js - Orchestrates Educational Scenarios
 * 
 * Manages the lifecycle of scenarios, handles scenario switching,
 * integrates with the CodeEditor for "Apply Fix" functionality,
 * and tracks student progress.
 * 
 * RESPONSIBILITIES:
 * - Load and initialize scenarios
 * - Connect scenarios to CodeEditor "Run" button
 * - Track completion and analytics
 * - Handle scenario switching
 */

import { InfiniteForest } from './InfiniteForest.js';

export class ScenarioManager {
    constructor(sceneController, codeEditor, profiler) {
        this.sceneController = sceneController;
        this.codeEditor = codeEditor;
        this.profiler = profiler;
        
        // Available scenarios
        this.scenarios = {};
        this.currentScenario = null;
        
        // Progress tracking
        this.progress = {
            completed: [],
            currentAttempts: 0,
            totalTime: 0
        };
        
        // UI elements
        this._scenarioSelect = null;
        this._applyFixBtn = null;
    }

    /**
     * Initialize the scenario manager
     */
    async init() {
        console.log('[ScenarioManager] Initializing...');
        
        // Register built-in scenarios
        this.registerScenario('infinite-forest', InfiniteForest);
        
        // Modify CodeEditor to use scenario system
        this._hookCodeEditor();
        
        // Create scenario selector UI
        this._createScenarioSelector();
        
        console.log('[ScenarioManager] Ready. Available scenarios:', Object.keys(this.scenarios));
        
        // Auto-load scenario from URL parameter
        await this._loadScenarioFromUrl();
        
        return this;
    }
    
    /**
     * Load scenario from URL parameter if present
     */
    async _loadScenarioFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const scenarioId = urlParams.get('scenario');
        
        if (scenarioId && this.scenarios[scenarioId]) {
            console.log(`[ScenarioManager] Auto-loading scenario from URL: ${scenarioId}`);
            await this.loadScenario(scenarioId);
            
            // Update the selector UI
            if (this._scenarioSelect) {
                this._scenarioSelect.value = scenarioId;
            }
        } else if (scenarioId) {
            console.warn(`[ScenarioManager] Unknown scenario in URL: ${scenarioId}`);
            this.codeEditor?.log('warning', `⚠️ Unknown scenario: ${scenarioId}`);
        }
    }

    /**
     * Register a scenario class
     */
    registerScenario(id, ScenarioClass) {
        this.scenarios[id] = ScenarioClass;
        console.log(`[ScenarioManager] Registered scenario: ${id}`);
    }

    /**
     * Load and start a scenario
     */
    async loadScenario(id) {
        console.log(`[ScenarioManager] Loading scenario: ${id}`);
        
        // Cleanup current scenario
        if (this.currentScenario) {
            this.currentScenario.dispose?.();
            this.currentScenario = null;
        }
        
        // Get scenario class
        const ScenarioClass = this.scenarios[id];
        if (!ScenarioClass) {
            console.error(`[ScenarioManager] Unknown scenario: ${id}`);
            return null;
        }
        
        // Create scenario instance
        this.currentScenario = new ScenarioClass(
            this.sceneController,
            this.codeEditor,
            this.profiler
        );
        
        // Set up callbacks
        this.currentScenario.onStateChange = (event) => this._onScenarioStateChange(event);
        this.currentScenario.onComplete = (event) => this._onScenarioComplete(event);
        this.currentScenario.onError = (event) => this._onScenarioError(event);
        
        // Initialize and start
        await this.currentScenario.init();
        await this.currentScenario.start();
        
        return this.currentScenario;
    }


    /**
     * Hook into CodeEditor's Run button to use scenario validation
     */
    _hookCodeEditor() {
        if (!this.codeEditor) return;
        
        // Replace the Run button click handler
        const runBtn = document.getElementById('run-code-btn');
        if (runBtn) {
            // Remove old handler by cloning
            const newRunBtn = runBtn.cloneNode(true);
            runBtn.parentNode.replaceChild(newRunBtn, runBtn);
            
            // Add new handler that uses scenario system
            newRunBtn.addEventListener('click', () => this.applyStudentFix());
            
            // Keep button text as Run
            newRunBtn.innerHTML = '▶ Run';
            newRunBtn.title = 'Run your code';
        }
        
        console.log('[ScenarioManager] CodeEditor hooked');
    }

    /**
     * Apply the student's code fix via the current scenario
     */
    async applyStudentFix() {
        if (!this.currentScenario) {
            // No active scenario - use default executor
            this.codeEditor?.runCode();
            return;
        }
        
        const code = this.codeEditor?.getCode() || '';
        console.log('[ScenarioManager] Applying student fix...');
        
        // Log to console
        this.codeEditor?.log('info', '▶ Applying your fix...');
        
        // Apply via scenario (includes validation)
        const result = await this.currentScenario.apply(code);
        
        if (result.success) {
            this.codeEditor?.log('success', '✅ Fix applied successfully!');
            
            // Wait for FPS to stabilize then check completion
            setTimeout(() => {
                const completion = this.currentScenario.checkCompletion();
                if (!completion.success) {
                    this.codeEditor?.log('warning', 
                        `FPS: ${completion.fps} (need ${completion.targetFPS}+ to pass)`);
                }
            }, 2000);
        } else {
            result.validation?.errors?.forEach(e => {
                this.codeEditor?.log('error', e);
            });
            this.codeEditor?.log('info', result.validation?.feedback || '');
        }
    }

    /**
     * Create scenario selector dropdown
     */
    _createScenarioSelector() {
        // Add to the code editor toolbar
        const toolbar = document.querySelector('.editor-toolbar');
        if (!toolbar) return;
        
        // Replace script-selector with scenario selector
        const oldSelect = document.getElementById('script-selector');
        if (oldSelect) {
            oldSelect.style.display = 'none';
        }
        
        const select = document.createElement('select');
        select.id = 'scenario-selector';
        select.style.cssText = 'margin-right: 10px;';
        select.innerHTML = `
            <option value="">📚 Select Scenario</option>
            <option value="infinite-forest">🌲 The Infinite Forest</option>
            <option value="free-mode">🎮 Free Mode</option>
        `;
        
        select.addEventListener('change', (e) => {
            if (e.target.value && e.target.value !== 'free-mode') {
                this.loadScenario(e.target.value);
            } else if (e.target.value === 'free-mode') {
                this._exitScenario();
            }
        });
        
        toolbar.insertBefore(select, toolbar.firstChild);
        this._scenarioSelect = select;
        
        // Add reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'editor-btn';
        resetBtn.id = 'scenario-reset-btn';
        resetBtn.title = 'Reset Scenario';
        resetBtn.textContent = '🔄';
        resetBtn.style.display = 'none';
        resetBtn.addEventListener('click', () => this.currentScenario?.reset());
        
        const applyBtn = document.getElementById('run-code-btn');
        if (applyBtn) {
            applyBtn.parentNode.insertBefore(resetBtn, applyBtn.nextSibling);
        }
    }


    /**
     * Exit current scenario and return to free mode
     */
    _exitScenario() {
        if (this.currentScenario) {
            this.currentScenario.dispose?.();
            this.currentScenario = null;
        }
        
        // Reset to default tree count
        this.sceneController.spawnTrees(50);
        
        // Show reset button
        const resetBtn = document.getElementById('scenario-reset-btn');
        if (resetBtn) resetBtn.style.display = 'none';
        
        // Restore original code editor behavior
        this.codeEditor?.loadScript('TreeSpawner');
        this.codeEditor?.log('info', '🎮 Free Mode - Edit code freely!');
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    _onScenarioStateChange(event) {
        console.log(`[ScenarioManager] State change: ${event.state}`);
        
        const resetBtn = document.getElementById('scenario-reset-btn');
        
        switch (event.state) {
            case 'broken':
                if (resetBtn) resetBtn.style.display = 'inline-block';
                break;
            case 'inspecting':
                // Student is looking at code
                break;
            case 'fixed':
                // Wait for completion check
                break;
            case 'complete':
                // Success!
                break;
        }
    }

    _onScenarioComplete(event) {
        console.log('[ScenarioManager] Scenario complete!', event);
        
        // Track progress
        if (event.success && !this.progress.completed.includes(event.scenario)) {
            this.progress.completed.push(event.scenario);
        }
        
        this.progress.totalTime += event.duration;
        
        // Log achievement
        this.codeEditor?.log('success', `🏆 Completed in ${Math.round(event.duration / 1000)}s with ${event.attempts} attempt(s)`);
    }

    _onScenarioError(event) {
        console.log('[ScenarioManager] Scenario error:', event);
        
        event.errors?.forEach(e => {
            this.codeEditor?.log('error', e);
        });
        
        if (event.feedback) {
            this.codeEditor?.log('info', event.feedback);
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================

    /**
     * Get list of available scenarios
     */
    getAvailableScenarios() {
        return Object.keys(this.scenarios);
    }

    /**
     * Get current scenario status
     */
    getStatus() {
        return {
            currentScenario: this.currentScenario?.id || null,
            state: this.currentScenario?.state || 'idle',
            progress: this.progress
        };
    }

    /**
     * Get hint for current scenario
     */
    getHint() {
        if (!this.currentScenario) {
            return "No active scenario. Select one from the dropdown.";
        }
        
        const hint = this.currentScenario.getHint();
        this.codeEditor?.log('info', hint);
        return hint;
    }

    /**
     * Reset current scenario
     */
    reset() {
        this.currentScenario?.reset();
    }
}

export default ScenarioManager;

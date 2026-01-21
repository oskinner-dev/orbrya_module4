/**
 * Scenario.js - Base Class for All Orbrya Educational Scenarios
 * 
 * This is the CORE PEDAGOGICAL FRAMEWORK for the "Saboteur" teaching method.
 * Each scenario presents broken AI-generated code that students must fix.
 * 
 * LIFECYCLE:
 * 1. init()      - Load resources, setup scene
 * 2. start()     - Begin the broken state
 * 3. inspect()   - Student examines the AI's buggy code
 * 4. validate()  - Check if student's fix is correct
 * 5. apply()     - Execute the fix and update scene
 * 6. complete()  - Show success/failure feedback
 * 7. reset()     - Allow retry
 * 
 * IMPORTANT: All scenarios must be N4000-safe (no heavy operations)
 */

export class Scenario {
    constructor(sceneController, codeEditor, profiler) {
        this.sceneController = sceneController;
        this.codeEditor = codeEditor;
        this.profiler = profiler;
        
        // Scenario metadata
        this.id = 'base';
        this.title = 'Base Scenario';
        this.description = '';
        this.difficulty = 'beginner'; // beginner, intermediate, advanced
        
        // Story elements
        this.story = {
            intro: '',      // Initial problem description
            hint: '',       // Hint for struggling students
            success: '',    // Success message
            failure: ''     // Failure/retry message
        };
        
        // The buggy code the AI "wrote"
        this.buggyCode = '';
        
        // Expected solution patterns (regex patterns that indicate correct fix)
        this.solutionPatterns = [];
        
        // Validation thresholds
        this.validation = {
            targetFPS: 45,      // FPS threshold for success
            maxObjects: 100,    // Max objects for acceptable performance
            minObjects: 10      // Min objects (too few = cheating)
        };
        
        // State tracking
        this.state = 'idle'; // idle, broken, inspecting, fixed, complete
        this.attempts = 0;
        this.startTime = null;
        this.completionTime = null;
        
        // Metrics for analytics
        this.metrics = {
            fpsBefore: null,
            fpsAfter: null,
            codeChanges: 0,
            hintsUsed: 0
        };
        
        // Callbacks for UI updates
        this.onStateChange = null;
        this.onComplete = null;
        this.onError = null;
    }


    /**
     * Initialize the scenario - called once when scenario loads
     * Override in subclasses to setup specific resources
     */
    async init() {
        console.log(`[Scenario:${this.id}] Initializing...`);
        this.state = 'idle';
        this.attempts = 0;
        this.metrics = {
            fpsBefore: null,
            fpsAfter: null,
            codeChanges: 0,
            hintsUsed: 0
        };
        return this;
    }

    /**
     * Start the scenario - puts scene into broken state
     * This is where we spawn too many objects, create lag, etc.
     */
    async start() {
        console.log(`[Scenario:${this.id}] Starting broken state...`);
        this.state = 'broken';
        this.startTime = Date.now();
        this._emitStateChange();
        
        // Capture initial (broken) FPS after scene settles
        setTimeout(() => {
            this.metrics.fpsBefore = this.profiler?.metrics?.fps || 0;
            console.log(`[Scenario:${this.id}] Broken FPS: ${this.metrics.fpsBefore}`);
        }, 2000);
    }

    /**
     * Called when student clicks "Inspect" to see the AI's code
     */
    inspect() {
        console.log(`[Scenario:${this.id}] Student inspecting code...`);
        this.state = 'inspecting';
        this._emitStateChange();
        
        // Load buggy code into editor
        if (this.codeEditor && this.buggyCode) {
            this.codeEditor.setCode(this.buggyCode);
            this.codeEditor.log('info', `📂 Loaded AI's buggy code for inspection`);
        }
    }

    /**
     * Validate the student's fix without applying it
     * Returns { valid: boolean, errors: [], warnings: [], feedback: string }
     */
    validate(code) {
        console.log(`[Scenario:${this.id}] Validating student code...`);
        
        const result = {
            valid: false,
            errors: [],
            warnings: [],
            feedback: '',
            extractedLimit: null
        };
        
        // Check against solution patterns
        for (const pattern of this.solutionPatterns) {
            if (pattern.regex.test(code)) {
                result.valid = true;
                result.feedback = pattern.feedback || 'Looks good!';
                
                // Extract the numeric limit if present
                const match = code.match(pattern.extractRegex || pattern.regex);
                if (match && match[1]) {
                    result.extractedLimit = parseInt(match[1], 10);
                }
                break;
            }
        }
        
        if (!result.valid) {
            result.errors.push("The fix doesn't look quite right yet.");
            result.feedback = this.story.hint || "Try a different approach.";
        }

        
        // Additional validation checks
        if (result.extractedLimit !== null) {
            if (result.extractedLimit > this.validation.maxObjects) {
                result.warnings.push(`⚠️ ${result.extractedLimit} objects might still cause lag`);
            }
            if (result.extractedLimit < this.validation.minObjects) {
                result.warnings.push(`⚠️ Only ${result.extractedLimit}? That might be too few.`);
            }
        }
        
        return result;
    }

    /**
     * Apply the student's fix and update the scene
     * Returns { success: boolean, metrics: {} }
     */
    async apply(code) {
        console.log(`[Scenario:${this.id}] Applying student fix...`);
        this.attempts++;
        this.metrics.codeChanges++;
        
        const validation = this.validate(code);
        
        if (!validation.valid) {
            if (this.onError) {
                this.onError({
                    scenario: this.id,
                    errors: validation.errors,
                    feedback: validation.feedback
                });
            }
            return { success: false, validation };
        }
        
        // Execute the fix (subclasses implement specifics)
        const execResult = await this._executeFix(validation.extractedLimit);
        
        if (execResult.success) {
            this.state = 'fixed';
            this._emitStateChange();
            
            // Wait for FPS to stabilize, then check
            await this._waitForFPSStabilize();
            
            return { success: true, validation, metrics: this.metrics };
        }
        
        return { success: false, validation };
    }

    /**
     * Internal method - execute the actual fix
     * Override in subclasses for specific behavior
     */
    async _executeFix(limit) {
        // Default: use SceneController to spawn objects
        if (this.sceneController && limit !== null) {
            this.sceneController.spawnTrees(limit);
            return { success: true };
        }
        return { success: false };
    }

    /**
     * Wait for FPS to stabilize after fix is applied
     */
    async _waitForFPSStabilize() {
        return new Promise(resolve => {
            setTimeout(() => {
                this.metrics.fpsAfter = this.profiler?.metrics?.fps || 0;
                console.log(`[Scenario:${this.id}] Fixed FPS: ${this.metrics.fpsAfter}`);
                resolve();
            }, 1500);
        });
    }


    /**
     * Check if the scenario has been successfully completed
     */
    checkCompletion() {
        const fps = this.metrics.fpsAfter || this.profiler?.metrics?.fps || 0;
        
        const success = fps >= this.validation.targetFPS;
        
        if (success) {
            this.complete(true);
        }
        
        return {
            success,
            fps,
            targetFPS: this.validation.targetFPS,
            improvement: this.metrics.fpsAfter - this.metrics.fpsBefore,
            message: success ? this.story.success : this.story.failure
        };
    }

    /**
     * Mark scenario as complete
     */
    complete(success) {
        this.state = 'complete';
        this.completionTime = Date.now();
        
        const duration = this.completionTime - this.startTime;
        
        console.log(`[Scenario:${this.id}] Complete! Success: ${success}, Time: ${duration}ms`);
        
        if (this.onComplete) {
            this.onComplete({
                scenario: this.id,
                success,
                duration,
                attempts: this.attempts,
                metrics: this.metrics
            });
        }
        
        this._emitStateChange();
    }

    /**
     * Reset the scenario for retry
     */
    reset() {
        console.log(`[Scenario:${this.id}] Resetting...`);
        this.state = 'idle';
        this.metrics.fpsBefore = null;
        this.metrics.fpsAfter = null;
        this._emitStateChange();
    }

    /**
     * Get a hint for struggling students
     */
    getHint() {
        this.metrics.hintsUsed++;
        return this.story.hint;
    }

    /**
     * Get current scenario status for UI
     */
    getStatus() {
        return {
            id: this.id,
            title: this.title,
            state: this.state,
            attempts: this.attempts,
            metrics: this.metrics,
            duration: this.startTime ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Emit state change event
     */
    _emitStateChange() {
        if (this.onStateChange) {
            this.onStateChange({
                scenario: this.id,
                state: this.state,
                status: this.getStatus()
            });
        }
    }
}

export default Scenario;

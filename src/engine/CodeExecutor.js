/**
 * CodeExecutor.js - C# Template Code Execution Engine
 * 
 * Parses student C# code and applies changes to the 3D scene.
 * Uses regex-based parsing to extract loop conditions.
 * 
 * SUPPORTED PATTERNS:
 * - while (treeCount < N)  → spawns N trees
 * - while (treeCount <= N) → spawns N+1 trees  
 * - while (true)           → infinite (capped at 1000)
 * - for (... i < N ...)    → spawns N trees
 * - maxTrees = N           → spawns N trees
 */

export class CodeExecutor {
    constructor(sceneController, profiler = null) {
        this.sceneController = sceneController;
        this.profiler = profiler;
        this.lastResult = null;
        this.maxTreeLimit = 1000; // Safety cap for infinite loops
        this.history = [];
        
        // Callbacks for UI updates
        this.onExecute = null;
        this.onError = null;
        this.onValidate = null;
    }

    /**
     * Parse student code to extract the tree limit
     * @param {string} code - C# code from editor
     * @returns {ParseResult}
     */
    parseStudentCode(code) {
        const result = {
            valid: false,
            limit: null,
            condition: null,
            pattern: null,
            errors: [],
            warnings: []
        };

        const cleanCode = this.stripComments(code);
        
        // Try multiple patterns in order of specificity
        
        // Pattern 1: while (treeCount < N) or while (treeCount <= N)
        const whileMatch = cleanCode.match(/while\s*\(\s*(.+?)\s*\)/);
        if (whileMatch) {
            const condition = whileMatch[1].trim();
            result.condition = condition;
            result.pattern = 'while';
            
            const limit = this.extractLimitFromCondition(condition);
            if (limit !== null) {
                result.limit = Math.min(limit, this.maxTreeLimit);
                result.valid = true;
                if (limit > this.maxTreeLimit) {
                    result.warnings.push(`Capped at ${this.maxTreeLimit} trees for safety`);
                }
            } else if (condition === 'true') {
                result.limit = this.maxTreeLimit;
                result.valid = true;
                result.errors.push("⚠️ 'while (true)' = infinite loop!");
                result.warnings.push(`Safety cap: spawning ${this.maxTreeLimit} trees`);
            } else if (condition === 'false') {
                result.limit = 0;
                result.valid = true;
                result.warnings.push("'while (false)' spawns 0 trees");
            } else {
                result.errors.push(`Can't parse: "${condition}"`);
                result.errors.push("💡 Try: treeCount < 50");
            }
            
            this.addPerformanceWarnings(result);
            return result;
        }

        // Pattern 2: for (int i = 0; i < N; i++)
        const forMatch = cleanCode.match(/for\s*\([^;]+;\s*\w+\s*(<|<=)\s*(\d+)/);
        if (forMatch) {
            result.pattern = 'for';
            const op = forMatch[1];
            let limit = parseInt(forMatch[2], 10);
            if (op === '<=') limit += 1;
            result.limit = Math.min(limit, this.maxTreeLimit);
            result.condition = `i ${op} ${forMatch[2]}`;
            result.valid = true;
            this.addPerformanceWarnings(result);
            return result;
        }

        // Pattern 3: maxTrees = N or treeCount = N (direct assignment)
        const assignMatch = cleanCode.match(/(maxTrees|treeCount|count)\s*=\s*(\d+)/i);
        if (assignMatch) {
            result.pattern = 'assignment';
            result.limit = Math.min(parseInt(assignMatch[2], 10), this.maxTreeLimit);
            result.condition = `${assignMatch[1]} = ${assignMatch[2]}`;
            result.valid = true;
            this.addPerformanceWarnings(result);
            return result;
        }

        // No pattern found
        result.errors.push("Couldn't find a loop or tree count.");
        result.errors.push("💡 Add: while (treeCount < 50)");
        return result;
    }

    /**
     * Extract numeric limit from a condition like "treeCount < 50"
     */
    extractLimitFromCondition(condition) {
        // treeCount < N
        let match = condition.match(/\w+\s*<\s*(\d+)/);
        if (match) return parseInt(match[1], 10);
        
        // treeCount <= N  
        match = condition.match(/\w+\s*<=\s*(\d+)/);
        if (match) return parseInt(match[1], 10) + 1;
        
        // N > treeCount
        match = condition.match(/(\d+)\s*>\s*\w+/);
        if (match) return parseInt(match[1], 10);
        
        // N >= treeCount
        match = condition.match(/(\d+)\s*>=\s*\w+/);
        if (match) return parseInt(match[1], 10) + 1;
        
        // treeCount != N
        match = condition.match(/\w+\s*!=\s*(\d+)/);
        if (match) return parseInt(match[1], 10);
        
        return null;
    }

    /**
     * Add performance warnings based on tree count
     */
    addPerformanceWarnings(result) {
        if (!result.limit) return;
        
        if (result.limit > 500) {
            result.warnings.push("🔴 500+ trees: Expect <20 FPS on Chromebook");
        } else if (result.limit > 300) {
            result.warnings.push("🟠 300+ trees: FPS will drop to ~30");
        } else if (result.limit > 175) {
            result.warnings.push("🟡 175+ trees: FPS may drop below 45");
        } else if (result.limit <= 50) {
            result.warnings.push("🟢 Good choice! Should run at 60 FPS");
        }
    }

    /**
     * Validate code without executing
     */
    validate(code) {
        const result = this.parseStudentCode(code);
        if (this.onValidate) this.onValidate(result);
        return result;
    }

    /**
     * Execute code - parse and apply to scene
     */
    execute(code) {
        console.log('[CodeExecutor] Execute called');
        const execResult = {
            success: false,
            treeCount: 0,
            previousCount: this.sceneController.currentTreeCount,
            errors: [],
            warnings: [],
            fpsBefore: this.profiler?.metrics?.fps || null,
            fpsAfter: null
        };

        // Parse
        const parsed = this.parseStudentCode(code);
        execResult.errors = parsed.errors;
        execResult.warnings = parsed.warnings;
        
        if (!parsed.valid || parsed.limit === null) {
            if (this.onError) this.onError(execResult);
            return execResult;
        }

        // Save for undo
        this.history.push({
            treeCount: execResult.previousCount,
            timestamp: Date.now()
        });

        // Execute!
        try {
            console.log(`[CodeExecutor] Spawning ${parsed.limit} trees...`);
            this.sceneController.spawnTrees(parsed.limit);
            
            execResult.success = true;
            execResult.treeCount = parsed.limit;
            
            // Capture FPS after delay
            setTimeout(() => {
                execResult.fpsAfter = this.profiler?.metrics?.fps || null;
                console.log(`[CodeExecutor] FPS: ${execResult.fpsBefore} → ${execResult.fpsAfter}`);
            }, 1000);

            this.lastResult = execResult;
            if (this.onExecute) this.onExecute(execResult);
            
        } catch (err) {
            execResult.errors.push(`Runtime error: ${err.message}`);
            if (this.onError) this.onError(execResult);
        }

        return execResult;
    }

    /**
     * Undo last execution
     */
    undo() {
        if (this.history.length === 0) {
            return { success: false, message: "Nothing to undo" };
        }
        const prev = this.history.pop();
        this.sceneController.spawnTrees(prev.treeCount);
        return { success: true, treeCount: prev.treeCount };
    }

    /**
     * Strip comments from C# code
     */
    stripComments(code) {
        return code
            .replace(/\/\/.*$/gm, '')      // Single-line
            .replace(/\/\*[\s\S]*?\*\//g, ''); // Multi-line
    }

    /**
     * Format errors for display
     */
    formatErrors(errors) {
        return errors.length ? errors.join('\n') : '';
    }

    /**
     * Format warnings for display  
     */
    formatWarnings(warnings) {
        return warnings.length ? warnings.join('\n') : '';
    }

    /**
     * Quick execute with specific tree count (for testing)
     */
    quickRun(count) {
        return this.execute(`while (treeCount < ${count}) { }`);
    }

    /**
     * Get current stats
     */
    getStats() {
        return {
            historyLength: this.history.length,
            lastResult: this.lastResult,
            currentTrees: this.sceneController.currentTreeCount
        };
    }
}

/**
 * CodeEditor.js - C# Code Editor with Execution
 * 
 * Features:
 * - Syntax highlighting for C#
 * - Line numbers
 * - Console output with errors/warnings
 * - Integration with CodeExecutor
 * - Real-time validation (debounced)
 * - Progress tracking for scenarios
 */

import { CodeExecutor } from '../engine/CodeExecutor.js';
import { StudentPortal } from '../portal/StudentPortal.js';

export class CodeEditor {
    constructor(panelManager, sceneController, profiler = null) {
        this.panelManager = panelManager;
        this.sceneController = sceneController;
        this.profiler = profiler;
        this.executor = null;
        this.panel = null;
        
        // DOM elements
        this.codeArea = null;
        this.lineNumbers = null;
        this.consoleOutput = null;
        
        // State
        this.currentScript = '';
        this.parseTimeout = null;
        this.parseDelay = 500; // Debounce for N4000
        
        // Progress tracking state
        this.scenarioId = this.getScenarioFromUrl();
        this.progressMilestones = {
            ranBuggyCode: false,      // 25%: First run with buggy code
            identifiedProblem: false,  // 50%: Selected/focused on problem area
            madeChange: false,         // 75%: Changed the while condition
            ranFixedCode: false        // 100%: Successfully ran fixed code
        };
        this.originalCode = '';        // Store original to detect changes
        this.hasInfiniteLoop = true;   // Track if code still has the bug
        
        // Session time tracking
        this.sessionStartTime = Date.now();
        this.lastSaveTime = Date.now();
        
        // C# syntax
        this.keywords = [
            'using', 'namespace', 'class', 'public', 'private', 'protected',
            'static', 'void', 'int', 'float', 'bool', 'string', 'var',
            'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case',
            'break', 'continue', 'return', 'new', 'this', 'null', 'true', 'false',
            'override'
        ];
        
        this.types = [
            'GameObject', 'Transform', 'Vector3', 'MonoBehaviour',
            'Debug', 'Console', 'Math', 'Random', 'Profiler',
            'ForestScene', 'ScenarioBase'
        ];
    }

    init() {
        // Create executor
        this.executor = new CodeExecutor(this.sceneController, this.profiler);
        
        // Wire callbacks
        this.executor.onExecute = (result) => this.onExecuteSuccess(result);
        this.executor.onError = (result) => this.onExecuteError(result);
        
        // Guard: only execute on explicit Run click
        this.canExecute = false;
        
        // Set up time tracking
        this._setupTimeTracking();
        
        return this;
    }
    
    _setupTimeTracking() {
        // Autosave time every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            if (this.scenarioId) {
                const now = Date.now();
                const timeSpentSeconds = Math.floor((now - this.lastSaveTime) / 1000);
                if (timeSpentSeconds >= 30) {
                    const progress = this.calculateProgress();
                    StudentPortal.updateScenarioProgress(this.scenarioId, progress, timeSpentSeconds);
                    this.lastSaveTime = now;
                    console.log(`[TimeTrack] Auto-saved ${timeSpentSeconds}s for ${this.scenarioId}`);
                }
            }
        }, 30000);
        
        // Save time when leaving page
        window.addEventListener('beforeunload', () => {
            if (this.scenarioId) {
                const now = Date.now();
                const timeSpentSeconds = Math.floor((now - this.lastSaveTime) / 1000);
                if (timeSpentSeconds > 0) {
                    const progress = this.calculateProgress();
                    StudentPortal.updateScenarioProgress(this.scenarioId, progress, timeSpentSeconds);
                    console.log(`[TimeTrack] Saved ${timeSpentSeconds}s on exit`);
                }
            }
        });
        
        // Also save on visibility change (tab switch, minimize)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.scenarioId) {
                const now = Date.now();
                const timeSpentSeconds = Math.floor((now - this.lastSaveTime) / 1000);
                if (timeSpentSeconds > 0) {
                    const progress = this.calculateProgress();
                    StudentPortal.updateScenarioProgress(this.scenarioId, progress, timeSpentSeconds);
                    this.lastSaveTime = now;
                    console.log(`[TimeTrack] Saved ${timeSpentSeconds}s on tab hide`);
                }
            }
        });
    }

    // ========== PROGRESS TRACKING ==========

    getScenarioFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('scenario') || 'infinite-forest';
    }

    calculateProgress() {
        let progress = 0;
        if (this.progressMilestones.ranBuggyCode) progress += 25;
        if (this.progressMilestones.identifiedProblem) progress += 25;
        if (this.progressMilestones.madeChange) progress += 25;
        if (this.progressMilestones.ranFixedCode) progress += 25;
        return progress;
    }

    saveProgress() {
        if (!this.scenarioId) return;
        
        const progress = this.calculateProgress();
        
        // Calculate time spent since last save (in seconds)
        const now = Date.now();
        const timeSpentSeconds = Math.floor((now - this.lastSaveTime) / 1000);
        this.lastSaveTime = now;
        
        StudentPortal.updateScenarioProgress(this.scenarioId, progress, timeSpentSeconds);
        
        // Check for completion
        if (progress >= 100 && !this.progressMilestones.completed) {
            this.progressMilestones.completed = true;
            StudentPortal.completeScenario(this.scenarioId);
            this.log('success', '🎉 SCENARIO COMPLETE! Great job fixing the bug!');
            
            // Show completion modal after a short delay
            setTimeout(() => {
                if (typeof window.showCompletionModal === 'function') {
                    window.showCompletionModal('Great job fixing the infinite loop! The forest is running smoothly now.');
                }
            }, 1500);
        }
        
        console.log(`[Progress] ${this.scenarioId}: ${progress}% (+${timeSpentSeconds}s)`, this.progressMilestones);
    }

    checkForCodeChange() {
        const currentCode = this.codeArea.value;
        
        // Check if while condition was changed from "true"
        const hasWhileTrue = /while\s*\(\s*true\s*\)/.test(currentCode);
        const hasWhileCondition = /while\s*\([^)]*(?:treeCount|<|>|<=|>=|\d+)[^)]*\)/.test(currentCode);
        
        if (!hasWhileTrue && hasWhileCondition && !this.progressMilestones.madeChange) {
            // Milestone 3 (75%) - They changed the while condition
            this.progressMilestones.madeChange = true;
            this.progressMilestones.identifiedProblem = true; // Ensure this is set
            this.hasInfiniteLoop = false;
            this.log('success', '✏️ Nice change! Click Run to test your fix.');
            this.saveProgress();
        }
    }

    createPanel() {
        const content = document.createElement('div');
        content.className = 'code-editor-wrapper';
        // Use absolute positioning for bulletproof layout
        content.style.cssText = 'position:relative; height:100%;';
        content.innerHTML = `
            <div class="editor-toolbar" style="position:absolute; top:0; left:0; right:0; height:36px; z-index:100; background:#0f1629; border-bottom:1px solid #2d3748;">
                <select id="script-selector">
                    <option value="TreeSpawner">🌲 TreeSpawner.cs</option>
                    <option value="MemoryDemo">💾 MemoryDemo.cs</option>
                </select>
                <button class="editor-btn" id="validate-btn" title="Validate">✓</button>
                <button class="editor-btn run-btn" id="run-code-btn" title="Run Code">▶ Run</button>
                <button class="editor-btn" id="undo-btn" title="Undo">↩</button>
            </div>
            <div class="code-editor" style="position:absolute; top:36px; left:0; right:0; bottom:120px; display:flex; overflow:hidden;">
                <div class="line-numbers" id="line-numbers" style="flex-shrink:0; padding:12px 10px; overflow:hidden; font-size:14px; line-height:1.6;"></div>
                <textarea id="code-area" spellcheck="false" style="flex:1; resize:none; border:none; outline:none; background:#0d0d1a; color:#e4e4e7; font-family:Consolas,Monaco,'Courier New',monospace; font-size:14px; line-height:1.6; padding:12px; tab-size:4;"></textarea>
            </div>
            <div class="console-output" id="console-output" style="position:absolute; bottom:0; left:0; right:0; height:120px; font-size:13px;">
                <div class="console-line info">📝 Ready - Edit the code and click Run</div>
            </div>
        `;

        const saved = this.panelManager?.getSavedState('code-editor-panel');
        this.panel = this.panelManager.createPanel({
            id: 'code-editor-panel',
            title: 'Code Editor',
            icon: '📝',
            x: saved?.x ?? 0,
            y: saved?.y ?? 0,
            width: saved?.width ?? 550,
            height: saved?.height ?? 600,
            minWidth: 450,
            minHeight: 400,
            content
        });

        // Ensure panel-content is set up for absolute positioning
        const panelContent = this.panel.querySelector('.panel-content');
        if (panelContent) {
            panelContent.style.cssText = 'overflow:hidden; padding:0; position:relative; height:100%;';
        }

        // Cache elements
        this.codeArea = document.getElementById('code-area');
        this.lineNumbers = document.getElementById('line-numbers');
        this.consoleOutput = document.getElementById('console-output');

        // Event listeners
        this.codeArea.addEventListener('input', () => this.onCodeChange());
        this.codeArea.addEventListener('scroll', () => this.syncScroll());
        this.codeArea.addEventListener('keydown', (e) => this.handleKeyDown(e));
        // Syntax highlighting disabled - was causing corruption
        
        document.getElementById('run-code-btn').addEventListener('click', () => this.runCode());
        document.getElementById('validate-btn').addEventListener('click', () => this.validateCode());
        document.getElementById('undo-btn').addEventListener('click', () => this.undoCode());
        document.getElementById('script-selector').addEventListener('change', (e) => this.loadScript(e.target.value));

        // Load default
        this.loadScript('TreeSpawner');
        return this.panel;
    }

    loadScript(name) {
        const scripts = {
            TreeSpawner: `// ════════════════════════════════════════════
// ORBRYA SCENARIO: Forest Optimization
// ════════════════════════════════════════════
// 
// 🔴 PROBLEM: The AI spawned infinite trees!
// The frame rate has crashed. Fix the bug!
//
// 🎯 TASK: Change the while condition to limit trees
// 💡 HINT: Try "treeCount < 50"
// ════════════════════════════════════════════

using Orbrya.Engine;

public class TreeSpawner : ScenarioBase
{
    private int treeCount = 0;

    public void SpawnTrees()
    {
        treeCount = 0;
        
        // ╔══════════════════════════════════════╗
        // ║  🔧 FIX THE BUG BELOW!               ║
        // ╚══════════════════════════════════════╝
        
        while (true)  // ← ❌ INFINITE LOOP!
        {
            SpawnTree();
            treeCount++;
        }
        
        // ════════════════════════════════════════
        // ✅ Change "true" to: treeCount < 50
        // ════════════════════════════════════════
        
        Debug.Log($"Spawned {treeCount} trees");
    }
}`,

            MemoryDemo: `// ════════════════════════════════════════════
// ORBRYA SCENARIO: Memory Management
// ════════════════════════════════════════════
//
// Learn how object count affects RAM usage
// ════════════════════════════════════════════

using Orbrya.Engine;

public class MemoryDemo : ScenarioBase
{
    public int objectCount = 100;

    public void CreateObjects()
    {
        // Try different values:
        // 50  = Low memory usage
        // 200 = Medium memory usage  
        // 500 = High memory usage
        
        while (treeCount < objectCount)
        {
            SpawnTree();
            treeCount++;
        }
    }
}`
        };

        this.currentScript = scripts[name] || scripts.TreeSpawner;
        this.originalCode = this.currentScript; // Store for change detection
        this.codeArea.value = this.currentScript;
        this.updateLineNumbers();
        this.log('info', `📂 Loaded ${name}.cs`);
        
        // Reset progress tracking for this script
        this.hasInfiniteLoop = /while\s*\(\s*true\s*\)/.test(this.currentScript);
    }

    // ========== EXECUTION METHODS ==========

    runCode() {
        console.log('[CodeEditor] Run button clicked');
        const code = this.codeArea.value;
        this.log('info', '▶ Running code...');
        
        // Progress tracking: Check if this is first run or run after fixing
        const hasWhileTrue = /while\s*\(\s*true\s*\)/.test(code);
        
        if (hasWhileTrue && !this.progressMilestones.ranBuggyCode) {
            // First run with buggy code - Milestone 1 (25%)
            this.progressMilestones.ranBuggyCode = true;
            this.log('info', '🔴 See the problem? The FPS dropped! Find and fix the bug.');
            this.saveProgress();
            
            // After a delay, mark "identified problem" since they see the bad FPS
            setTimeout(() => {
                if (!this.progressMilestones.identifiedProblem) {
                    this.progressMilestones.identifiedProblem = true;
                    this.log('info', '💡 Hint: Look for "while (true)" - that\'s an infinite loop!');
                    this.saveProgress();
                }
            }, 2000);
        }
        
        const result = this.executor.execute(code);
        
        // Result handled by callbacks
        return result;
    }

    validateCode() {
        const code = this.codeArea.value;
        const result = this.executor.validate(code);
        
        if (result.valid) {
            this.log('success', `✓ Valid! Will spawn ${result.limit} trees`);
            result.warnings.forEach(w => this.log('warning', w));
        } else {
            result.errors.forEach(e => this.log('error', e));
        }
        
        return result;
    }

    undoCode() {
        const result = this.executor.undo();
        if (result.success) {
            this.log('info', `↩ Reverted to ${result.treeCount} trees`);
        } else {
            this.log('warning', result.message || 'Nothing to undo');
        }
    }

    onExecuteSuccess(result) {
        this.log('success', `✅ Spawned ${result.treeCount} trees`);
        
        if (result.warnings.length > 0) {
            result.warnings.forEach(w => this.log('warning', w));
        }
        
        // Progress tracking: Check if they ran fixed code successfully
        const code = this.codeArea.value;
        const hasWhileTrue = /while\s*\(\s*true\s*\)/.test(code);
        
        if (!hasWhileTrue && this.progressMilestones.madeChange && !this.progressMilestones.ranFixedCode) {
            // They fixed the bug and ran it - Milestone 4 (100%)
            this.progressMilestones.ranFixedCode = true;
            this.saveProgress();
        }
        
        // Show FPS change after delay
        setTimeout(() => {
            const fps = this.profiler?.metrics?.fps;
            if (fps !== null) {
                const emoji = fps >= 45 ? '🟢' : fps >= 30 ? '🟡' : '🔴';
                this.log('info', `${emoji} Current FPS: ${fps}`);
            }
        }, 1500);
    }

    onExecuteError(result) {
        result.errors.forEach(e => this.log('error', e));
    }

    // ========== CONSOLE OUTPUT ==========

    log(type, message) {
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = message;
        this.consoleOutput.appendChild(line);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
        
        // Limit console lines
        while (this.consoleOutput.children.length > 50) {
            this.consoleOutput.removeChild(this.consoleOutput.firstChild);
        }
    }

    clearConsole() {
        this.consoleOutput.innerHTML = '<div class="console-line info">Console cleared</div>';
    }

    // ========== EDITOR FUNCTIONALITY ==========

    onCodeChange() {
        // Only update line numbers while typing - highlighting on blur
        this.updateLineNumbers();
        
        // Progress tracking: Check for code changes (debounced)
        clearTimeout(this.changeCheckTimeout);
        this.changeCheckTimeout = setTimeout(() => this.checkForCodeChange(), 300);
    }

    handleKeyDown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
        // Ctrl+Enter to run
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            this.runCode();
        }
    }

    syncScroll() {
        this.lineNumbers.scrollTop = this.codeArea.scrollTop;
    }

    updateLineNumbers() {
        const lines = this.codeArea.value.split('\n').length;
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<div>${i}</div>`;
        }
        this.lineNumbers.innerHTML = html;
    }

    highlightSyntax() {
        // DISABLED - was causing recursive corruption
        // TODO: Fix syntax highlighting properly
        // For now, just ensure plain text display
        return;
    }

    restoreCursor(offset) {
        const selection = window.getSelection();
        const range = document.createRange();
        
        let currentOffset = 0;
        const walker = document.createTreeWalker(this.codeArea, NodeFilter.SHOW_TEXT);
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const len = node.length;
            
            if (currentOffset + len >= offset) {
                range.setStart(node, offset - currentOffset);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }
            currentOffset += len;
        }
    }

    getCode() {
        return this.codeArea.value;
    }

    setCode(code) {
        this.codeArea.value = code;
        this.updateLineNumbers();
    }
}

/**
 * main.js - Orbrya Engine Entry Point
 * 
 * Initializes the complete IDE-style interface with:
 * - Panel management system
 * - 3D Viewport (center)
 * - Visual Profiler (right)
 * - Code Editor (right)
 * - Hierarchy panel (left) [future]
 */

import { SceneController } from './engine/SceneController.js';
import { PanelManager } from './ui/PanelManager.js';
import { VisualProfiler } from './ui/VisualProfiler.js';
import { CodeEditor } from './ui/CodeEditor.js';
import { Hierarchy } from './ui/Hierarchy.js';
import { ProfilingTestSuite } from './utils/ProfilingTestSuite.js';
import { ScenarioManager } from './scenarios/ScenarioManager.js';
import { ScenarioTestRunner } from './utils/ScenarioTestRunner.js';

class OrbryaEngine {
    constructor() {
        this.panelManager = null;
        this.testSuite = null;
        this.sceneController = null;
        this.profiler = null;
        this.codeEditor = null;
        this.hierarchy = null;
        this.scenarioManager = null;
        this.scenarioTestRunner = null;
        this.liteMode = false;
    }

    async init() {
        console.log('═'.repeat(50));
        console.log('ORBRYA ENGINE - Professional IDE Interface');
        console.log('Target: Intel Celeron N4000, 4GB RAM, UHD 600');
        console.log('═'.repeat(50));

        this.updateLoadingStatus('Initializing panel system...');
        
        // Initialize panel manager
        this.panelManager = new PanelManager();
        
        // Create viewport panel (center, main 3D view)
        this.createViewportPanel();
        
        this.updateLoadingStatus('Creating 3D scene...');


        // Initialize 3D scene in viewport
        const viewportContent = this.panelManager.getPanelContent('viewport-panel');
        this.sceneController = new SceneController(viewportContent);
        await this.sceneController.init();
        
        this.updateLoadingStatus('Setting up profiler...');
        
        // Create visual profiler with new API
        this.profiler = new VisualProfiler();
        this.profiler.setRenderer(this.sceneController.getRenderer());
        this.profiler.init(this.panelManager);
        
        // Connect profiler to scene controller's render loop
        this.sceneController.onFrameUpdate = () => {
            this.profiler.update();
        };
        
        this.updateLoadingStatus('Loading code editor...');
        
        // Create code editor with executor integration
        this.codeEditor = new CodeEditor(this.panelManager, this.sceneController, this.profiler);
        this.codeEditor.init();
        this.codeEditor.createPanel();
        
        this.updateLoadingStatus('Building hierarchy...');
        
        // Create hierarchy panel
        this.hierarchy = new Hierarchy(this.panelManager, this.sceneController);
        this.hierarchy.createPanel();
        
        // Apply default layout (force reset if layout version changed)
        const LAYOUT_VERSION = 2; // Increment this to force layout reset
        const savedLayoutVersion = localStorage.getItem('orbrya-layout-version');
        const hasSavedLayout = localStorage.getItem('orbrya-panel-states') || localStorage.getItem('orbrya_panels');
        
        if (!hasSavedLayout || savedLayoutVersion !== String(LAYOUT_VERSION)) {
            localStorage.removeItem('orbrya-panel-states');
            localStorage.removeItem('orbrya_panels');
            localStorage.setItem('orbrya-layout-version', String(LAYOUT_VERSION));
            this.panelManager.applyLayout('default');
            console.log('[Main] Applied fresh default layout (version ' + LAYOUT_VERSION + ')');
        }
        
        // Skip asset loading for now - use procedural geometry
        // Assets would need to be deployed with the site
        console.log('[Main] Using procedural assets (faster startup)');
        
        // Initialize Scenario Manager
        this.updateLoadingStatus('Loading scenario system...');
        this.scenarioManager = new ScenarioManager(
            this.sceneController,
            this.codeEditor,
            this.profiler
        );
        await this.scenarioManager.init();
        
        // Initialize Test Runner (available via window.testRunner)
        this.scenarioTestRunner = new ScenarioTestRunner(this);
        
        // Start render loop
        this.sceneController.start();
        
        // Hide loading overlay
        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');
        }, 500);
        
        // Setup global keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Test suite disabled by default - enable with window.orbrya.enableTestSuite()
        this.testSuite = null;
        
        console.log('[Main] Orbrya Engine initialized successfully');
        
        // Expose for debugging
        window.orbrya = this;
        window.testRunner = this.scenarioTestRunner;
        
        // Log available commands
        console.log('[Main] Available commands:');
        console.log('  - window.orbrya.runInfiniteForest() - Start the Infinite Forest scenario');
        console.log('  - window.testRunner.runFullTest() - Run full test suite (3 iterations)');
        console.log('  - Press S to start scenario, H for hint, R to reset');
    }


    createViewportPanel() {
        const saved = this.panelManager.getSavedState('viewport-panel');
        
        // Calculate center position
        const workspace = document.getElementById('workspace');
        const workspaceRect = workspace.getBoundingClientRect();
        
        const defaultWidth = Math.min(800, workspaceRect.width * 0.5);
        const defaultHeight = Math.min(600, workspaceRect.height * 0.8);
        const defaultX = (workspaceRect.width - defaultWidth) / 2 - 100;
        const defaultY = (workspaceRect.height - defaultHeight) / 2;
        
        this.panelManager.createPanel({
            id: 'viewport-panel',
            title: 'Scene Viewport',
            icon: '🎮',
            x: saved?.x ?? defaultX,
            y: saved?.y ?? defaultY,
            width: saved?.width ?? defaultWidth,
            height: saved?.height ?? defaultHeight,
            minWidth: 400,
            minHeight: 300,
            closable: false
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in editor
            const target = e.target;
            const isEditing = target.contentEditable === 'true' || 
                              target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' ||
                              target.closest('.code-area');
            
            if (isEditing) return;
            
            // T - Cycle tree count
            if (e.key === 't' || e.key === 'T') {
                const levels = [25, 50, 100, 175, 300];
                const current = this.sceneController.currentTreeCount;
                const idx = levels.indexOf(current);
                const next = levels[(idx + 1) % levels.length];
                this.sceneController.spawnTrees(next);
                console.log(`[Shortcut] T pressed - cycling to ${next} trees`);
            }
            
            // F11 - Toggle viewport maximize
            if (e.key === 'F11') {
                e.preventDefault();
                this.panelManager.toggleMaximize('viewport-panel');
            }
            
            // L - Lite Mode (hide side panels for max FPS)
            if (e.key === 'l' || e.key === 'L') {
                this.toggleLiteMode();
            }
            
            // P - Toggle profiler panel
            if (e.key === 'p' || e.key === 'P') {
                const profilerPanel = document.getElementById('profiler-panel');
                if (profilerPanel) {
                    profilerPanel.style.display = profilerPanel.style.display === 'none' ? '' : 'none';
                }
            }
            
            // S - Start Scenario (Infinite Forest)
            if (e.key === 's' || e.key === 'S') {
                if (this.scenarioManager) {
                    this.scenarioManager.loadScenario('infinite-forest');
                    console.log('[Shortcut] S pressed - starting Infinite Forest scenario');
                }
            }
            
            // H - Get hint for current scenario
            if (e.key === 'h' || e.key === 'H') {
                if (this.scenarioManager) {
                    this.scenarioManager.getHint();
                    console.log('[Shortcut] H pressed - showing hint');
                }
            }
            
            // R - Reset current scenario
            if (e.key === 'r' || e.key === 'R') {
                if (this.scenarioManager?.currentScenario) {
                    this.scenarioManager.reset();
                    console.log('[Shortcut] R pressed - resetting scenario');
                }
            }
        });
    }
    
    toggleLiteMode() {
        this.liteMode = !this.liteMode;
        
        const panels = ['profiler-panel', 'code-editor-panel', 'hierarchy-panel'];
        panels.forEach(id => {
            const panel = document.getElementById(id);
            if (panel) {
                panel.style.display = this.liteMode ? 'none' : '';
            }
        });
        
        // Also stop profiler updates in lite mode
        if (this.liteMode) {
            this.profiler.stopUpdates();
            console.log('[LiteMode] Enabled - panels hidden, profiler stopped');
        } else {
            this.profiler.startUpdates();
            console.log('[LiteMode] Disabled - panels restored');
        }
    }


    updateLoadingStatus(message) {
        const statusEl = document.querySelector('#loading-overlay .status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    updateLoadingProgress(percent) {
        let bar = document.querySelector('#loading-overlay .progress-bar-fill');
        if (!bar) {
            // Create progress bar if not exists
            const container = document.querySelector('#loading-overlay');
            const progressContainer = document.createElement('div');
            progressContainer.className = 'loading-progress';
            progressContainer.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
            `;
            container.insertBefore(progressContainer, container.querySelector('.status'));
            bar = progressContainer.querySelector('.progress-bar-fill');
        }
        bar.style.width = `${percent}%`;
    }

    // Public API
    spawnTrees(count) {
        this.sceneController.spawnTrees(count);
    }

    getStats() {
        return {
            fps: this.sceneController.currentFps,
            treeCount: this.sceneController.currentTreeCount,
            drawCalls: this.sceneController.getRenderer().info.render.calls,
            triangles: this.sceneController.getRenderer().info.render.triangles
        };
    }

    /**
     * Start a scenario by ID
     * @param {string} scenarioId - e.g., 'infinite-forest'
     */
    async startScenario(scenarioId) {
        if (this.scenarioManager) {
            return await this.scenarioManager.loadScenario(scenarioId);
        }
        return null;
    }

    /**
     * Run the Infinite Forest test scenario
     * Convenience method for testing
     */
    async runInfiniteForest() {
        return await this.startScenario('infinite-forest');
    }
}

// Initialize when DOM is ready
async function main() {
    try {
        const engine = new OrbryaEngine();
        await engine.init();
    } catch (error) {
        console.error('[Main] Failed to initialize:', error);
        const statusEl = document.querySelector('#loading-overlay .status');
        if (statusEl) {
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.style.color = '#ff4757';
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

export { OrbryaEngine };


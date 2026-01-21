/**
 * ScenarioUIIntegration.js - Example Integration
 * 
 * Shows how to integrate ScenarioUI with the InfiniteForest scenario.
 * This can be used as a template for integrating with other scenarios.
 * 
 * USAGE:
 * ```javascript
 * import { ScenarioUIIntegration } from './ui/ScenarioUIIntegration.js';
 * 
 * const integration = new ScenarioUIIntegration(scenario, scenarioUI);
 * integration.setup();
 * ```
 */

import { ScenarioUI } from './ScenarioUI.js';

export class ScenarioUIIntegration {
    constructor(scenario, ui = null) {
        this.scenario = scenario;
        this.ui = ui || new ScenarioUI().init();
    }

    /**
     * Set up all connections between scenario and UI
     */
    setup() {
        // Set up hints
        if (this.scenario.config?.hints) {
            this.ui.setHints(this.scenario.config.hints);
        } else if (this.scenario._getFallbackHints) {
            this.ui.setHints(this.scenario._getFallbackHints());
        }

        // Set up callbacks
        this.ui.setCallbacks({
            onHintRequest: () => this._handleHintRequest(),
            onTryAgain: () => this._handleTryAgain(),
            onNextScenario: () => this._handleNextScenario(),
            onBackToDashboard: () => this._handleBackToDashboard(),
            onInspectorDismiss: (action) => this._handleInspectorDismiss(action)
        });

        // Hook into scenario events
        this._hookScenarioEvents();

        return this;
    }

    /**
     * Hook into scenario lifecycle events
     */
    _hookScenarioEvents() {
        // Override scenario's start method to show inspector
        const originalStart = this.scenario.start.bind(this.scenario);
        this.scenario.start = async () => {
            await originalStart();
            this._showInspector();
        };

        // Override scenario's onComplete to show success
        const originalOnComplete = this.scenario.onComplete.bind(this.scenario);
        this.scenario.onComplete = () => {
            originalOnComplete();
            this._showSuccess();
        };

        // Override scenario's _showError to use UI
        this.scenario._showError = (message) => {
            this.ui.showError(message);
            this.ui.showTryAgain();
        };
    }

    /**
     * Show inspector panel with scenario story
     */
    _showInspector() {
        const story = this.scenario.story || this.scenario.config?.story;
        if (story) {
            this.ui.showInspector({
                intro: story.intro,
                problem: story.problem,
                goal: story.goal
            });
        }
    }

    /**
     * Show success modal with stats
     */
    _showSuccess() {
        const state = this.scenario.state;
        const story = this.scenario.story || this.scenario.config?.story;
        
        this.ui.showSuccess({
            message: story?.success || 'Great work!',
            fps: state.fpsAfter || 60,
            time: Math.floor((Date.now() - state.startTime) / 1000),
            attempts: state.attempts,
            hintsUsed: state.hintsShown,
            score: this.scenario._calculateScore?.() || 100
        });
    }

    /**
     * Handle hint request from UI
     */
    _handleHintRequest() {
        const state = this.scenario.state;
        const hints = this.scenario.config?.hints || this.scenario._getFallbackHints?.() || [];
        
        // Find next unrevealed hint
        const nextLevel = state.hintsShown + 1;
        const hint = hints.find(h => h.level === nextLevel);
        
        if (hint) {
            state.hintsShown++;
            state.hintsRevealed.push(nextLevel);
            this.ui.showHint(nextLevel, hint.text);
            
            // Log to code editor
            this.scenario.codeEditor?.log('info', hint.text);
        }
    }

    /**
     * Handle try again button click
     */
    _handleTryAgain() {
        this.scenario.reset?.();
        this.ui.reset();
        this._showInspector();
    }

    /**
     * Handle next scenario button click
     */
    _handleNextScenario() {
        const nextId = this.scenario.config?.metadata?.nextScenario;
        if (nextId && window.scenarioManager) {
            window.scenarioManager.loadScenario(nextId);
        } else {
            console.log('[ScenarioUIIntegration] No next scenario defined');
        }
    }

    /**
     * Handle back to dashboard button click
     */
    _handleBackToDashboard() {
        if (window.location.pathname.includes('dashboard')) {
            window.location.reload();
        } else {
            window.location.href = '/dashboard.html';
        }
    }

    /**
     * Handle inspector panel dismiss
     */
    _handleInspectorDismiss(action) {
        if (action === 'inspect') {
            this.scenario.inspect?.();
            this.ui.showHintButton();
        }
    }

    /**
     * Clean up
     */
    dispose() {
        this.ui.dispose();
    }
}

/**
 * Quick setup function for scenarios
 */
export function integrateScenarioUI(scenario) {
    const ui = new ScenarioUI().init();
    const integration = new ScenarioUIIntegration(scenario, ui);
    return integration.setup();
}

export default ScenarioUIIntegration;

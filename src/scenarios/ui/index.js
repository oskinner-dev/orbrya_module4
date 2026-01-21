/**
 * Scenario UI Components - Index
 * 
 * Export all scenario-specific UI components for easy importing.
 * 
 * USAGE:
 * ```javascript
 * import { ScenarioUI, createScenarioUI, integrateScenarioUI } from './ui/index.js';
 * 
 * // Option 1: Manual setup
 * const ui = createScenarioUI();
 * ui.showInspector({ intro: '...', problem: '...', goal: '...' });
 * 
 * // Option 2: Automatic integration with scenario
 * const integration = integrateScenarioUI(myScenario);
 * ```
 */

export { ScenarioUI, createScenarioUI } from './ScenarioUI.js';
export { ScenarioUIIntegration, integrateScenarioUI } from './ScenarioUIIntegration.js';

// Default export is the main ScenarioUI class
export { default } from './ScenarioUI.js';

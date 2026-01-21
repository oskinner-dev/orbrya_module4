/**
 * ScenarioLoader.js - Data-Driven Scenario Configuration Loader
 * 
 * Loads scenario definitions from JSON files, allowing for:
 * - Centralized configuration
 * - Easy scenario creation without code changes
 * - Curriculum management and standards alignment
 * - A/B testing different hint strategies
 * 
 * USAGE:
 * const loader = new ScenarioLoader();
 * const config = await loader.loadDefinition('infinite-forest');
 * 
 * DEFINITIONS LOCATION:
 * /src/scenarios/definitions/*.json
 */

export class ScenarioLoader {
    constructor() {
        this.definitionsPath = './definitions';
        this.cache = new Map();
        this.loaded = false;
    }

    /**
     * Load a scenario definition from JSON
     * @param {string} scenarioId - The scenario ID (filename without .json)
     * @returns {Promise<Object>} The parsed scenario configuration
     */
    async loadDefinition(scenarioId) {
        // Check cache first
        if (this.cache.has(scenarioId)) {
            return this.cache.get(scenarioId);
        }

        const url = `${this.definitionsPath}/${scenarioId}.json`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.status}`);
            }
            
            const definition = await response.json();
            
            // Validate required fields
            this._validateDefinition(definition);
            
            // Cache it
            this.cache.set(scenarioId, definition);
            
            console.log(`[ScenarioLoader] Loaded definition: ${scenarioId}`);
            return definition;
            
        } catch (error) {
            console.error(`[ScenarioLoader] Error loading ${scenarioId}:`, error);
            return null;
        }
    }

    /**
     * Validate that a definition has required fields
     */
    _validateDefinition(def) {
        const required = ['id', 'name', 'story', 'code', 'validation'];
        
        for (const field of required) {
            if (!def[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (!def.story.intro || !def.story.success) {
            throw new Error('Story must have intro and success messages');
        }

        if (!def.code.template) {
            throw new Error('Code must have a template');
        }

        return true;
    }

    /**
     * Get hints for a scenario, sorted by level
     */
    getHints(definition) {
        if (!definition.hints) return [];
        return [...definition.hints].sort((a, b) => a.level - b.level);
    }

    /**
     * Get learning objectives formatted for display
     */
    getLearningObjectives(definition) {
        if (!definition.learningObjectives) return [];
        return definition.learningObjectives.map(lo => ({
            objective: lo.objective,
            standard: lo.standard,
            description: lo.description
        }));
    }

    /**
     * Get validation patterns as RegExp objects
     */
    getValidationPatterns(definition) {
        if (!definition.code?.acceptablePatterns) return [];
        
        return definition.code.acceptablePatterns.map(p => ({
            regex: new RegExp(p.pattern),
            extractRegex: new RegExp(p.pattern),
            feedback: p.feedback,
            minValue: p.minValue,
            maxValue: p.maxValue
        }));
    }

    /**
     * Check if a solution matches any acceptable pattern
     */
    validateSolution(definition, code) {
        const patterns = this.getValidationPatterns(definition);
        
        for (const pattern of patterns) {
            const match = code.match(pattern.regex);
            if (match) {
                const extractedValue = match[1] ? parseInt(match[1], 10) : null;
                
                // Check value bounds if specified
                if (extractedValue !== null) {
                    if (pattern.minValue && extractedValue < pattern.minValue) {
                        return {
                            valid: false,
                            feedback: `${extractedValue} is too low. Try at least ${pattern.minValue}.`,
                            extractedValue
                        };
                    }
                    if (pattern.maxValue && extractedValue > pattern.maxValue) {
                        return {
                            valid: false,
                            feedback: `${extractedValue} might cause lag. Try ${pattern.maxValue} or fewer.`,
                            extractedValue
                        };
                    }
                }

                return {
                    valid: true,
                    feedback: pattern.feedback,
                    extractedValue
                };
            }
        }

        return {
            valid: false,
            feedback: definition.story.hint || 'Try a different approach.',
            extractedValue: null
        };
    }

    /**
     * Get standards alignment for curriculum mapping
     */
    getStandardsAlignment(definition) {
        return definition.metadata?.standards || {};
    }

    /**
     * Get scenario metadata for catalog/dashboard
     */
    getMetadata(definition) {
        return {
            id: definition.id,
            name: definition.name,
            difficulty: definition.difficulty,
            estimatedTime: definition.estimatedTime,
            tags: definition.metadata?.tags || [],
            targetGrades: definition.metadata?.targetGrades || [],
            prerequisite: definition.metadata?.prerequisite,
            nextScenario: definition.metadata?.nextScenario
        };
    }

    /**
     * List all available scenario definitions
     * Note: In production, this would fetch from an index file
     */
    async listAvailableScenarios() {
        // For now, return known scenarios
        // In production, fetch from /definitions/index.json
        return ['infinite-forest'];
    }
}

export default ScenarioLoader;

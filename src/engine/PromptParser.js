/**
 * PromptParser.js - Natural Language Prompt Parser for Module 4
 * 
 * Parses student prompts to extract scene generation parameters.
 * Uses SIMPLE keyword matching (no NLP libraries) to stay N4000-safe.
 * 
 * SUPPORTED PARAMETERS:
 * - treeCount: "50 trees", "about 30", "a few trees"
 * - treeType: "pine", "oak", "birch", "palm", "mixed"
 * - arrangement: "random", "grid", "cluster", "line", "circle"
 * - sizeVariation: "varied sizes", "same size", "mixed"
 * - density: "dense", "sparse", "spread out"
 * 
 * EXAMPLE PROMPTS:
 * - "Create a forest with 50 pine trees"
 * - "Spawn about 30 trees in a grid pattern"
 * - "Generate a dense cluster of varied oak trees"
 */

export class PromptParser {
    constructor() {
        // Keyword dictionaries for pattern matching
        this.treeTypes = {
            pine: ['pine', 'conifer', 'evergreen', 'fir', 'spruce'],
            oak: ['oak', 'deciduous', 'leafy'],
            birch: ['birch', 'white tree', 'silver'],
            palm: ['palm', 'tropical', 'beach'],
            generic: ['tree', 'trees', 'forest']
        };
        
        this.arrangements = {
            random: ['random', 'scattered', 'natural', 'organic', 'wild'],
            grid: ['grid', 'rows', 'columns', 'organized', 'lined up', 'orderly'],
            cluster: ['cluster', 'group', 'clump', 'bunch', 'together'],
            line: ['line', 'row', 'path', 'along', 'border', 'edge'],
            circle: ['circle', 'ring', 'around', 'circular', 'surround']
        };
        
        this.densityKeywords = {
            dense: ['dense', 'thick', 'packed', 'crowded', 'lots of', 'many', 'full'],
            sparse: ['sparse', 'spread out', 'few', 'scattered', 'minimal', 'light'],
            normal: ['normal', 'moderate', 'some', 'several']
        };
        
        this.sizeKeywords = {
            varied: ['varied', 'different', 'diverse', 'mixed', 'various', 'assorted'],
            uniform: ['same', 'uniform', 'identical', 'equal', 'consistent'],
            large: ['large', 'big', 'tall', 'huge', 'giant'],
            small: ['small', 'tiny', 'short', 'little', 'mini']
        };
        
        // Quantifier words that modify numbers
        this.quantifiers = {
            few: { min: 5, max: 15 },
            some: { min: 15, max: 35 },
            several: { min: 20, max: 40 },
            many: { min: 50, max: 100 },
            lots: { min: 75, max: 150 },
            bunch: { min: 30, max: 60 }
        };
        
        // Default values
        this.defaults = {
            treeCount: 25,
            treeType: 'generic',
            arrangement: 'random',
            sizeVariation: false,
            density: 'normal'
        };
    }

    /**
     * Main parsing method - extracts all parameters from a prompt
     * @param {string} userPrompt - Natural language prompt from student
     * @returns {ParseResult} Structured result with params, specificity, feedback
     */
    parsePrompt(userPrompt) {
        const normalizedPrompt = this.normalizePrompt(userPrompt);
        
        const params = {
            treeCount: this.extractNumber(normalizedPrompt),
            treeType: this.extractTreeType(normalizedPrompt),
            arrangement: this.extractArrangement(normalizedPrompt),
            sizeVariation: this.extractSizeVariation(normalizedPrompt),
            density: this.extractDensity(normalizedPrompt)
        };
        
        // Apply density modifier to tree count if no explicit number given
        if (params.treeCount === this.defaults.treeCount && params.density !== 'normal') {
            params.treeCount = this.applyDensityModifier(params.treeCount, params.density);
        }
        
        const specificity = this.calculateSpecificity(normalizedPrompt, params);
        const interpretation = this.generateInterpretation(params);
        const feedback = this.generateFeedback(params, normalizedPrompt, specificity);
        
        return {
            params,
            specificity,
            interpretation,
            feedback,
            rawPrompt: userPrompt,
            normalized: normalizedPrompt
        };
    }

    /**
     * Normalize prompt for easier matching
     */
    normalizePrompt(prompt) {
        return prompt
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')  // Remove punctuation
            .replace(/\s+/g, ' ')       // Collapse whitespace
            .trim();
    }

    /**
     * Extract tree count from prompt
     * Handles: "50 trees", "about 30", "a few", "many trees"
     */
    extractNumber(prompt) {
        // Pattern 1: Explicit number (e.g., "50 trees", "create 30")
        const numberMatch = prompt.match(/(\d+)\s*(?:trees?|objects?)?/i);
        if (numberMatch) {
            const num = parseInt(numberMatch[1], 10);
            // Safety bounds
            return Math.max(1, Math.min(num, 500));
        }
        
        // Pattern 2: "about/around N"
        const aboutMatch = prompt.match(/(?:about|around|approximately|roughly)\s*(\d+)/i);
        if (aboutMatch) {
            const num = parseInt(aboutMatch[1], 10);
            // Add slight randomness for "about"
            const variance = Math.floor(num * 0.1);
            return Math.max(1, Math.min(num + Math.floor(Math.random() * variance * 2) - variance, 500));
        }
        
        // Pattern 3: Quantifier words
        for (const [word, range] of Object.entries(this.quantifiers)) {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(prompt)) {
                // Pick a random number in the range
                return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            }
        }
        
        // Pattern 4: "a forest" implies moderate count
        if (/\bforest\b/i.test(prompt)) {
            return 50;
        }
        
        // Pattern 5: "a tree" (singular) = 1
        if (/\ba tree\b/i.test(prompt) && !/trees/i.test(prompt)) {
            return 1;
        }
        
        return this.defaults.treeCount;
    }

    /**
     * Extract tree type from prompt
     */
    extractTreeType(prompt) {
        for (const [type, keywords] of Object.entries(this.treeTypes)) {
            if (type === 'generic') continue; // Check generic last
            
            for (const keyword of keywords) {
                if (prompt.includes(keyword)) {
                    return type;
                }
            }
        }
        
        // Check for "mixed" or "variety"
        if (/mixed|variety|different types|various/i.test(prompt)) {
            return 'mixed';
        }
        
        return this.defaults.treeType;
    }

    /**
     * Extract arrangement pattern from prompt
     */
    extractArrangement(prompt) {
        for (const [pattern, keywords] of Object.entries(this.arrangements)) {
            for (const keyword of keywords) {
                // Use word boundary for single words, includes for phrases
                const regex = keyword.includes(' ') 
                    ? new RegExp(keyword, 'i')
                    : new RegExp(`\\b${keyword}\\b`, 'i');
                    
                if (regex.test(prompt)) {
                    return pattern;
                }
            }
        }
        
        return this.defaults.arrangement;
    }

    /**
     * Extract size variation preference
     */
    extractSizeVariation(prompt) {
        // Check for varied sizes
        for (const keyword of this.sizeKeywords.varied) {
            if (prompt.includes(keyword)) {
                return true;
            }
        }
        
        // Check for uniform sizes
        for (const keyword of this.sizeKeywords.uniform) {
            if (prompt.includes(keyword)) {
                return false;
            }
        }
        
        // Default: slight variation
        return this.defaults.sizeVariation;
    }

    /**
     * Extract density preference
     */
    extractDensity(prompt) {
        for (const [level, keywords] of Object.entries(this.densityKeywords)) {
            for (const keyword of keywords) {
                const regex = keyword.includes(' ')
                    ? new RegExp(keyword, 'i')
                    : new RegExp(`\\b${keyword}\\b`, 'i');
                    
                if (regex.test(prompt)) {
                    return level;
                }
            }
        }
        
        return this.defaults.density;
    }

    /**
     * Apply density modifier to tree count
     */
    applyDensityModifier(baseCount, density) {
        switch (density) {
            case 'dense':
                return Math.floor(baseCount * 2);
            case 'sparse':
                return Math.floor(baseCount * 0.5);
            default:
                return baseCount;
        }
    }

    /**
     * Calculate specificity score (0-100)
     * Higher = more detailed prompt
     */
    calculateSpecificity(prompt, params) {
        let score = 0;
        const maxScore = 100;
        
        // Points for explicit number (30 pts)
        if (/\d+/.test(prompt)) {
            score += 30;
        } else if (Object.keys(this.quantifiers).some(q => prompt.includes(q))) {
            score += 15; // Partial credit for quantifier words
        }
        
        // Points for tree type (20 pts)
        if (params.treeType !== 'generic') {
            score += 20;
        }
        
        // Points for arrangement (20 pts)
        if (params.arrangement !== 'random') {
            score += 20;
        }
        
        // Points for size specification (15 pts)
        const hasSizeKeyword = [...this.sizeKeywords.varied, ...this.sizeKeywords.uniform, 
                               ...this.sizeKeywords.large, ...this.sizeKeywords.small]
                               .some(k => prompt.includes(k));
        if (hasSizeKeyword) {
            score += 15;
        }
        
        // Points for density (15 pts)
        if (params.density !== 'normal') {
            score += 15;
        }
        
        return Math.min(score, maxScore);
    }

    /**
     * Generate human-readable interpretation of parsed params
     */
    generateInterpretation(params) {
        const parts = [];
        
        // Count
        parts.push(`${params.treeCount} ${params.treeCount === 1 ? 'tree' : 'trees'}`);
        
        // Type
        if (params.treeType !== 'generic') {
            parts[0] = `${params.treeCount} ${params.treeType} ${params.treeCount === 1 ? 'tree' : 'trees'}`;
        }
        
        // Arrangement
        if (params.arrangement !== 'random') {
            parts.push(`in a ${params.arrangement} pattern`);
        } else {
            parts.push('randomly placed');
        }
        
        // Size variation
        if (params.sizeVariation) {
            parts.push('with varied sizes');
        }
        
        // Density
        if (params.density === 'dense') {
            parts.push('packed densely');
        } else if (params.density === 'sparse') {
            parts.push('spread out');
        }
        
        return parts.join(', ');
    }

    /**
     * Generate feedback for the student about their prompt
     */
    generateFeedback(params, prompt, specificity) {
        const feedback = {
            message: '',
            suggestions: [],
            quality: 'good' // good, needs_detail, excellent
        };
        
        if (specificity >= 70) {
            feedback.quality = 'excellent';
            feedback.message = '✨ Great prompt! Very specific and clear.';
        } else if (specificity >= 40) {
            feedback.quality = 'good';
            feedback.message = '👍 Good prompt! Here\'s what I understood:';
        } else {
            feedback.quality = 'needs_detail';
            feedback.message = '💡 Your prompt could be more specific. I\'ll use defaults for missing details.';
        }
        
        // Add suggestions for improvement
        if (!/\d+/.test(prompt) && !Object.keys(this.quantifiers).some(q => prompt.includes(q))) {
            feedback.suggestions.push('Try specifying a number (e.g., "50 trees")');
        }
        
        if (params.treeType === 'generic') {
            feedback.suggestions.push('Specify a tree type (e.g., "pine trees", "oak trees")');
        }
        
        if (params.arrangement === 'random' && !/random|scatter/i.test(prompt)) {
            feedback.suggestions.push('Describe the arrangement (e.g., "in a grid", "clustered together")');
        }
        
        return feedback;
    }

    /**
     * Validate that parsed params are within acceptable ranges
     */
    validateParams(params) {
        const errors = [];
        const warnings = [];
        
        // Tree count validation
        if (params.treeCount > 300) {
            warnings.push(`⚠️ ${params.treeCount} trees may cause performance issues on Chromebook`);
        }
        if (params.treeCount > 500) {
            errors.push(`❌ Maximum 500 trees allowed (you specified ${params.treeCount})`);
            params.treeCount = 500;
        }
        if (params.treeCount < 1) {
            errors.push('❌ Need at least 1 tree');
            params.treeCount = 1;
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            params
        };
    }

    /**
     * Quick parse - just get the tree count (for simple integration)
     */
    quickParse(prompt) {
        return this.extractNumber(this.normalizePrompt(prompt));
    }

    /**
     * Get example prompts for UI
     */
    getExamplePrompts() {
        return [
            { text: 'Create a forest with 50 pine trees', description: 'Basic forest' },
            { text: 'Spawn 30 oak trees in a grid pattern', description: 'Organized layout' },
            { text: 'Generate a dense cluster of varied trees', description: 'Using modifiers' },
            { text: 'Place a few birch trees in a circle', description: 'Specific arrangement' },
            { text: 'Create many scattered palm trees', description: 'Quantity words' },
            { text: 'Make a sparse forest with tall pines', description: 'Density + size' }
        ];
    }
}

export default PromptParser;

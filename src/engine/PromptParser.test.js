/**
 * PromptParser Test Suite
 * Run in browser console or via test.html
 */

import { PromptParser } from './PromptParser.js';

export function runPromptParserTests() {
    const parser = new PromptParser();
    const results = [];
    
    console.log('═'.repeat(50));
    console.log('PROMPTPARSER TEST SUITE');
    console.log('═'.repeat(50));
    
    // Test cases
    const testCases = [
        // Explicit numbers
        { prompt: 'Create 50 trees', expected: { treeCount: 50 } },
        { prompt: 'Spawn 30 pine trees', expected: { treeCount: 30, treeType: 'pine' } },
        { prompt: 'Generate about 25 trees', expected: { treeCount: [20, 30] } }, // Range for "about"
        
        // Quantifier words
        { prompt: 'Create a few trees', expected: { treeCount: [5, 15] } },
        { prompt: 'Spawn many oak trees', expected: { treeCount: [50, 100], treeType: 'oak' } },
        { prompt: 'Generate lots of trees', expected: { treeCount: [75, 150] } },
        
        // Tree types
        { prompt: 'Create pine trees', expected: { treeType: 'pine' } },
        { prompt: 'Spawn some birch', expected: { treeType: 'birch' } },
        { prompt: 'Generate palm trees', expected: { treeType: 'palm' } },
        { prompt: 'Create evergreen trees', expected: { treeType: 'pine' } }, // evergreen → pine
        
        // Arrangements
        { prompt: '50 trees in a grid', expected: { arrangement: 'grid' } },
        { prompt: 'Trees clustered together', expected: { arrangement: 'cluster' } },
        { prompt: 'Scattered trees', expected: { arrangement: 'random' } },
        { prompt: 'Trees in a circle', expected: { arrangement: 'circle' } },
        { prompt: 'Trees in a line', expected: { arrangement: 'line' } },
        
        // Density
        { prompt: 'Dense forest', expected: { density: 'dense' } },
        { prompt: 'Sparse trees', expected: { density: 'sparse' } },
        { prompt: 'Spread out trees', expected: { density: 'sparse' } },
        
        // Size variation
        { prompt: 'Trees with varied sizes', expected: { sizeVariation: true } },
        { prompt: 'Same size trees', expected: { sizeVariation: false } },
        { prompt: 'Mixed sizes', expected: { sizeVariation: true } },
        
        // Complex prompts
        { 
            prompt: 'Create a dense forest with 75 pine trees in a cluster pattern with varied sizes',
            expected: { treeCount: 75, treeType: 'pine', arrangement: 'cluster', density: 'dense', sizeVariation: true }
        },
        { 
            prompt: 'Spawn 20 oak trees in a grid',
            expected: { treeCount: 20, treeType: 'oak', arrangement: 'grid' }
        },
        
        // Edge cases
        { prompt: 'Create a tree', expected: { treeCount: 1 } },
        { prompt: 'forest', expected: { treeCount: 50 } },
        { prompt: '', expected: { treeCount: 25 } }, // defaults
        { prompt: '1000 trees', expected: { treeCount: 500 } }, // capped
    ];
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach((test, index) => {
        const result = parser.parsePrompt(test.prompt);
        const params = result.params;
        let testPassed = true;
        const failures = [];
        
        for (const [key, expected] of Object.entries(test.expected)) {
            const actual = params[key];
            
            // Handle range expectations (for "about" and quantifiers)
            if (Array.isArray(expected)) {
                if (actual < expected[0] || actual > expected[1]) {
                    testPassed = false;
                    failures.push(`${key}: expected ${expected[0]}-${expected[1]}, got ${actual}`);
                }
            } else if (actual !== expected) {
                testPassed = false;
                failures.push(`${key}: expected ${expected}, got ${actual}`);
            }
        }
        
        if (testPassed) {
            passed++;
            console.log(`✅ Test ${index + 1}: "${test.prompt.substring(0, 40)}..."`);
        } else {
            failed++;
            console.log(`❌ Test ${index + 1}: "${test.prompt.substring(0, 40)}..."`);
            failures.forEach(f => console.log(`   └─ ${f}`));
        }
        
        results.push({
            prompt: test.prompt,
            expected: test.expected,
            actual: params,
            passed: testPassed,
            failures
        });
    });
    
    console.log('─'.repeat(50));
    console.log(`Results: ${passed}/${testCases.length} passed (${Math.round(passed/testCases.length*100)}%)`);
    console.log('═'.repeat(50));
    
    // Test specificity scoring
    console.log('\nSPECIFICITY TESTS:');
    const specificityTests = [
        'trees', // Very vague
        '50 trees', // Has number
        '50 pine trees', // Number + type
        '50 pine trees in a grid', // Number + type + arrangement
        '50 pine trees in a grid with varied sizes', // Full detail
    ];
    
    specificityTests.forEach(prompt => {
        const result = parser.parsePrompt(prompt);
        console.log(`  "${prompt}" → Specificity: ${result.specificity}/100`);
    });
    
    return { passed, failed, total: testCases.length, results };
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
    window.testPromptParser = runPromptParserTests;
    console.log('[PromptParser Test] Run window.testPromptParser() to execute tests');
}

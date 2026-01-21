/**
 * ScenarioTestRunner.js - Automated Testing for Orbrya Scenarios
 * 
 * Runs through the complete student workflow multiple times to verify:
 * - Consistent FPS numbers
 * - No memory leaks
 * - Clear student feedback at each step
 * 
 * USAGE:
 * Open browser console and run:
 *   window.testRunner.runFullTest()
 * 
 * Or run individual tests:
 *   window.testRunner.testBrokenState()
 *   window.testRunner.testFixApply()
 *   window.testRunner.testReset()
 */

export class ScenarioTestRunner {
    constructor(engine) {
        this.engine = engine;
        this.results = [];
        this.isRunning = false;
    }

    /**
     * Run the full test suite 3 times
     */
    async runFullTest() {
        console.log('═'.repeat(60));
        console.log('SCENARIO TEST RUNNER - Starting Full Test Suite');
        console.log('═'.repeat(60));
        
        this.results = [];
        
        for (let i = 1; i <= 3; i++) {
            console.log(`\n📋 TEST RUN ${i}/3`);
            console.log('─'.repeat(40));
            
            const result = await this.runSingleTest();
            this.results.push({ run: i, ...result });
            
            // Wait between runs
            if (i < 3) {
                console.log('⏳ Waiting 3s before next run...');
                await this._wait(3000);
            }
        }
        
        this._printSummary();
        return this.results;
    }

    /**
     * Run a single complete test
     */
    async runSingleTest() {
        const result = {
            brokenState: { passed: false, fps: 0, treeCount: 0 },
            inspection: { passed: false, codeLoaded: false },
            fixApplied: { passed: false, fps: 0, treeCount: 0 },
            completion: { passed: false, message: '' },
            memoryLeak: { passed: true, heapBefore: 0, heapAfter: 0 },
            timing: { start: 0, end: 0, duration: 0 }
        };
        
        result.timing.start = performance.now();
        
        try {
            // Record initial memory
            if (performance.memory) {
                result.memoryLeak.heapBefore = performance.memory.usedJSHeapSize;
            }
            
            // STEP 1: Start scenario (broken state)
            console.log('\n[TEST] Step 1: Starting broken state...');
            await this.engine.startScenario('infinite-forest');
            await this._wait(2500); // Wait for FPS to stabilize
            
            const brokenFps = this.engine.profiler?.metrics?.fps || 0;
            const brokenTrees = this.engine.sceneController?.currentTreeCount || 0;
            
            result.brokenState.fps = brokenFps;
            result.brokenState.treeCount = brokenTrees;
            result.brokenState.passed = brokenFps < 30 && brokenTrees >= 400;
            
            console.log(`   FPS: ${brokenFps} (expected < 30) ${result.brokenState.passed ? '✅' : '❌'}`);
            console.log(`   Trees: ${brokenTrees} (expected >= 400)`);

            
            // STEP 2: Inspect code
            console.log('\n[TEST] Step 2: Inspecting AI code...');
            const scenario = this.engine.scenarioManager?.currentScenario;
            if (scenario) {
                scenario.inspect();
                await this._wait(500);
                
                const codeInEditor = this.engine.codeEditor?.getCode() || '';
                result.inspection.codeLoaded = codeInEditor.includes('while (true)');
                result.inspection.passed = result.inspection.codeLoaded;
                
                console.log(`   Code loaded: ${result.inspection.codeLoaded ? '✅' : '❌'}`);
            }
            
            // STEP 3: Apply fix
            console.log('\n[TEST] Step 3: Applying student fix...');
            if (this.engine.codeEditor) {
                // Simulate student fix
                const fixedCode = this.engine.codeEditor.getCode()
                    .replace('while (true)', 'while (treeCount < 50)');
                this.engine.codeEditor.setCode(fixedCode);
                
                // Apply the fix via scenario manager
                await this.engine.scenarioManager.applyStudentFix();
                await this._wait(2000); // Wait for FPS to stabilize
                
                const fixedFps = this.engine.profiler?.metrics?.fps || 0;
                const fixedTrees = this.engine.sceneController?.currentTreeCount || 0;
                
                result.fixApplied.fps = fixedFps;
                result.fixApplied.treeCount = fixedTrees;
                result.fixApplied.passed = fixedFps >= 45 && fixedTrees <= 100;
                
                console.log(`   FPS: ${fixedFps} (expected >= 45) ${fixedFps >= 45 ? '✅' : '❌'}`);
                console.log(`   Trees: ${fixedTrees} (expected <= 100) ${fixedTrees <= 100 ? '✅' : '❌'}`);
            }
            
            // STEP 4: Check completion
            console.log('\n[TEST] Step 4: Checking completion...');
            if (scenario) {
                const completion = scenario.checkCompletion();
                result.completion.passed = completion.success;
                result.completion.message = completion.message;
                
                console.log(`   Success: ${completion.success ? '✅' : '❌'}`);
                console.log(`   FPS improvement: ${completion.improvement || 'N/A'}`);
            }
            
            // STEP 5: Reset scenario
            console.log('\n[TEST] Step 5: Resetting scenario...');
            if (scenario) {
                scenario.reset();
                await this._wait(1000);
                
                const resetTrees = this.engine.sceneController?.currentTreeCount || 0;
                console.log(`   Trees after reset: ${resetTrees} (expected >= 400)`);
            }
            
            // Memory check
            if (performance.memory) {
                result.memoryLeak.heapAfter = performance.memory.usedJSHeapSize;
                const diff = result.memoryLeak.heapAfter - result.memoryLeak.heapBefore;
                const diffMB = (diff / 1024 / 1024).toFixed(2);
                
                // Allow up to 10MB increase per run (some variance is normal)
                result.memoryLeak.passed = diff < 10 * 1024 * 1024;
                
                console.log(`\n[TEST] Memory: ${diffMB}MB change ${result.memoryLeak.passed ? '✅' : '⚠️'}`);
            }
            
        } catch (error) {
            console.error('[TEST] Error:', error);
            result.error = error.message;
        }
        
        result.timing.end = performance.now();
        result.timing.duration = result.timing.end - result.timing.start;
        
        console.log(`\n[TEST] Run completed in ${(result.timing.duration / 1000).toFixed(2)}s`);
        
        return result;
    }


    /**
     * Print summary of all test runs
     */
    _printSummary() {
        console.log('\n' + '═'.repeat(60));
        console.log('TEST SUMMARY');
        console.log('═'.repeat(60));
        
        const passed = this.results.filter(r => 
            r.brokenState.passed && 
            r.inspection.passed && 
            r.fixApplied.passed && 
            r.completion.passed
        ).length;
        
        console.log(`\nRuns Passed: ${passed}/3`);
        
        console.log('\n📊 FPS Consistency:');
        const brokenFpsValues = this.results.map(r => r.brokenState.fps);
        const fixedFpsValues = this.results.map(r => r.fixApplied.fps);
        console.log(`   Broken state: ${brokenFpsValues.join(', ')} FPS`);
        console.log(`   Fixed state:  ${fixedFpsValues.join(', ')} FPS`);
        
        console.log('\n💾 Memory:');
        const memoryChanges = this.results.map(r => 
            ((r.memoryLeak.heapAfter - r.memoryLeak.heapBefore) / 1024 / 1024).toFixed(2)
        );
        console.log(`   Changes per run: ${memoryChanges.join('MB, ')}MB`);
        const anyLeak = this.results.some(r => !r.memoryLeak.passed);
        console.log(`   Memory leak detected: ${anyLeak ? '⚠️ YES' : '✅ NO'}`);
        
        console.log('\n⏱️ Timing:');
        const durations = this.results.map(r => (r.timing.duration / 1000).toFixed(2));
        console.log(`   Run durations: ${durations.join('s, ')}s`);
        
        console.log('\n' + '═'.repeat(60));
        console.log(passed === 3 ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
        console.log('═'.repeat(60));
    }

    /**
     * Test just the broken state
     */
    async testBrokenState() {
        console.log('[TEST] Testing broken state only...');
        await this.engine.startScenario('infinite-forest');
        await this._wait(2500);
        
        const fps = this.engine.profiler?.metrics?.fps || 0;
        const trees = this.engine.sceneController?.currentTreeCount || 0;
        
        console.log(`FPS: ${fps} (expected < 30)`);
        console.log(`Trees: ${trees} (expected >= 400)`);
        
        return { fps, trees, passed: fps < 30 && trees >= 400 };
    }

    /**
     * Test the fix application
     */
    async testFixApply() {
        console.log('[TEST] Testing fix application...');
        
        // Start with broken state
        await this.engine.startScenario('infinite-forest');
        await this._wait(1000);
        
        // Inspect
        this.engine.scenarioManager?.currentScenario?.inspect();
        
        // Apply fix
        const fixedCode = this.engine.codeEditor?.getCode()
            .replace('while (true)', 'while (treeCount < 50)');
        this.engine.codeEditor?.setCode(fixedCode);
        await this.engine.scenarioManager?.applyStudentFix();
        
        await this._wait(2000);
        
        const fps = this.engine.profiler?.metrics?.fps || 0;
        const trees = this.engine.sceneController?.currentTreeCount || 0;
        
        console.log(`FPS after fix: ${fps} (expected >= 45)`);
        console.log(`Trees after fix: ${trees} (expected ~50)`);
        
        return { fps, trees, passed: fps >= 45 && trees <= 100 };
    }

    /**
     * Test reset functionality
     */
    async testReset() {
        console.log('[TEST] Testing reset...');
        
        const scenario = this.engine.scenarioManager?.currentScenario;
        if (!scenario) {
            await this.engine.startScenario('infinite-forest');
            await this._wait(1000);
        }
        
        // Apply fix first
        this.engine.scenarioManager?.currentScenario?.inspect();
        const fixedCode = this.engine.codeEditor?.getCode()
            .replace('while (true)', 'while (treeCount < 50)');
        this.engine.codeEditor?.setCode(fixedCode);
        await this.engine.scenarioManager?.applyStudentFix();
        await this._wait(1000);
        
        const treesBeforeReset = this.engine.sceneController?.currentTreeCount;
        
        // Reset
        this.engine.scenarioManager?.reset();
        await this._wait(1000);
        
        const treesAfterReset = this.engine.sceneController?.currentTreeCount;
        
        console.log(`Trees before reset: ${treesBeforeReset}`);
        console.log(`Trees after reset: ${treesAfterReset} (expected >= 400)`);
        
        return {
            treesBeforeReset,
            treesAfterReset,
            passed: treesAfterReset >= 400
        };
    }

    /**
     * Helper: wait for specified milliseconds
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default ScenarioTestRunner;

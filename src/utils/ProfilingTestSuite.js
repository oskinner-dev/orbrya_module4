/**
 * ProfilingTestSuite.js - Stress Test Suite for VisualProfiler
 * 
 * Test Scenarios:
 * 1. Baseline (25 trees) → All GREEN
 * 2. Medium Load (100 trees) → YELLOW
 * 3. Stress Test (300 trees) → RED
 * 4. Rapid Toggle → Tests responsiveness
 * 
 * Keyboard Shortcuts:
 * 1 → Baseline | 2 → Medium | 3 → Stress | P → Toggle profiler
 */

export class ProfilingTestSuite {
    constructor(sceneController, profiler) {
        this.sceneController = sceneController;
        this.profiler = profiler;
        
        this.scenarios = {
            baseline: { name: 'Baseline', trees: 25, expected: 'GREEN' },
            medium: { name: 'Medium Load', trees: 100, expected: 'YELLOW' },
            stress: { name: 'Stress Test', trees: 300, expected: 'RED' }
        };
        
        this.currentScenario = null;
        this.logInterval = null;
        this.scenarioDisplay = null;
        
        this.init();
    }

    init() {
        this.createScenarioDisplay();
        this.setupKeyboardShortcuts();
        this.startLogging();
        
        // Start with baseline
        this.runScenario('baseline');
        
        console.log('[TestSuite] Initialized. Keys: 1=Baseline, 2=Medium, 3=Stress, P=Toggle Profiler');
    }

    createScenarioDisplay() {
        this.scenarioDisplay = document.createElement('div');
        this.scenarioDisplay.id = 'scenario-display';
        this.scenarioDisplay.style.cssText = `
            position: fixed;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(22, 33, 62, 0.95);
            backdrop-filter: blur(10px);
            color: #e4e4e7;
            padding: 10px 24px;
            border-radius: 8px;
            font-family: 'Consolas', monospace;
            font-size: 14px;
            z-index: 10000;
            border: 1px solid #667eea;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(this.scenarioDisplay);
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.scenarioDisplay) return;
        
        const s = this.currentScenario;
        if (!s) {
            this.scenarioDisplay.innerHTML = 'Scenario: <span style="color:#667eea">Ready</span>';
            return;
        }
        
        const colorMap = { GREEN: '#00ff88', YELLOW: '#ffa500', RED: '#ff4757' };
        const color = colorMap[s.expected] || '#667eea';
        
        this.scenarioDisplay.innerHTML = `
            Scenario: <span style="color:${color};font-weight:bold">${s.name}</span>
            <span style="color:#71717a;margin-left:10px">(${s.trees} trees → ${s.expected})</span>
        `;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.contentEditable === 'true') return;
            
            switch (e.key) {
                case '1':
                    this.runScenario('baseline');
                    break;
                case '2':
                    this.runScenario('medium');
                    break;
                case '3':
                    this.runScenario('stress');
                    break;
                case 'p':
                case 'P':
                    this.toggleProfiler();
                    break;
                case '4':
                    this.runRapidToggle();
                    break;
            }
        });
    }

    runScenario(scenarioKey) {
        const scenario = this.scenarios[scenarioKey];
        if (!scenario) return;
        
        this.currentScenario = scenario;
        
        console.log(`[TestSuite] Running: ${scenario.name} (${scenario.trees} trees)`);
        console.log(`[TestSuite] Expected result: ${scenario.expected}`);
        
        this.sceneController.spawnTrees(scenario.trees);
        this.updateDisplay();
        
        // Log immediate status after short delay
        setTimeout(() => this.logStatus(), 1000);
    }

    /**
     * Rapid toggle test - quickly switches between tree counts
     */
    async runRapidToggle() {
        console.log('[TestSuite] Running: Rapid Toggle Test');
        this.currentScenario = { name: 'Rapid Toggle', trees: '25↔300', expected: 'VARIES' };
        this.updateDisplay();
        
        const counts = [25, 300, 25, 300, 100, 300, 50, 175];
        
        for (let i = 0; i < counts.length; i++) {
            this.sceneController.spawnTrees(counts[i]);
            console.log(`[TestSuite] Toggle ${i+1}/${counts.length}: ${counts[i]} trees`);
            await this.delay(500);
        }
        
        console.log('[TestSuite] Rapid Toggle complete');
        this.runScenario('baseline');
    }

    toggleProfiler() {
        if (this.profiler.visible) {
            this.profiler.hide();
            console.log('[TestSuite] Profiler hidden');
        } else {
            this.profiler.show();
            console.log('[TestSuite] Profiler visible');
        }
    }

    startLogging() {
        // Log every 5 seconds
        this.logInterval = setInterval(() => this.logStatus(), 5000);
    }

    stopLogging() {
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
    }

    logStatus() {
        const metrics = this.profiler.getMetrics();
        const status = this.getOverallStatus(metrics);
        
        console.log(
            `[Profiler] FPS: ${metrics.fps} | ` +
            `RAM: ${metrics.memory}MB | ` +
            `Draw Calls: ${metrics.drawCalls} | ` +
            `Status: ${status}`
        );
    }

    getOverallStatus(metrics) {
        const fpsHealth = metrics.health?.fps?.class || 'unknown';
        const memHealth = metrics.health?.memory?.class || 'unknown';
        const dcHealth = metrics.health?.drawCalls?.class || 'unknown';
        
        // Map class names to colors
        const statusMap = { healthy: 'GREEN', warning: 'YELLOW', critical: 'RED' };
        
        // Return worst status
        if (fpsHealth === 'critical' || memHealth === 'critical' || dcHealth === 'critical') {
            return 'RED';
        }
        if (fpsHealth === 'warning' || memHealth === 'warning' || dcHealth === 'warning') {
            return 'YELLOW';
        }
        return 'GREEN';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Run full test sequence
     */
    async runFullTestSequence() {
        console.log('[TestSuite] Starting full test sequence...');
        
        const sequence = ['baseline', 'medium', 'stress', 'baseline'];
        
        for (const scenarioKey of sequence) {
            this.runScenario(scenarioKey);
            await this.delay(5000);  // 5 seconds per scenario
        }
        
        console.log('[TestSuite] Full test sequence complete');
    }

    /**
     * Get test report
     */
    getReport() {
        const metrics = this.profiler.getMetrics();
        return {
            scenario: this.currentScenario?.name || 'None',
            trees: this.sceneController.currentTreeCount,
            fps: metrics.fps,
            memory: metrics.memory,
            drawCalls: metrics.drawCalls,
            status: this.getOverallStatus(metrics),
            timestamp: new Date().toISOString()
        };
    }

    dispose() {
        this.stopLogging();
        if (this.scenarioDisplay) {
            this.scenarioDisplay.remove();
        }
    }
}

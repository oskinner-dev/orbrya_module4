/**
 * VisualProfiler.js - CORE PEDAGOGICAL TOOL (N4000 OPTIMIZED)
 * 
 * Makes invisible performance concepts visually tangible for students.
 * HEAVILY OPTIMIZED to avoid causing the very lag we're measuring.
 * 
 * OPTIMIZATIONS:
 * - 500ms update interval (not 100ms)
 * - Circular buffer for history (no array shift)
 * - Cached DOM references
 * - Skip unchanged values
 * - Graph updates every 2nd cycle
 */

export class VisualProfiler {
    constructor(renderer = null) {
        this.renderer = renderer;
        this.panelManager = null;
        this.panel = null;
        this.visible = true;
        
        // Thresholds
        this.thresholds = {
            fps: { green: 45, yellow: 30 },
            memory: { green: 300, yellow: 350 },
            drawCalls: { green: 50, yellow: 80 }
        };
        
        // Metrics
        this.metrics = {
            fps: 60, frameTime: 16.67,
            memory: 0, drawCalls: 0,
            triangles: 0, geometries: 0
        };
        
        // Circular buffer for FPS history (no shift = no GC)
        this.fpsHistory = new Array(60).fill(60);
        this.historyIndex = 0;
        
        // Frame counting
        this.frameCount = 0;
        this.lastFpsTime = performance.now();
        
        // Update control
        this.updateInterval = null;
        this.graphUpdateCounter = 0;
        
        // Cached previous values (skip unchanged updates)
        this.prevValues = {};
        
        // DOM cache
        this.elements = {};
        this.graphCanvas = null;
        this.graphCtx = null;
    }

    init(panelManager = null) {
        this.panelManager = panelManager;
        if (panelManager) {
            this.createPanel();
        }
        this.startUpdates();
        return this;
    }

    createPanel() {
        const content = document.createElement('div');
        content.className = 'profiler-content';
        content.innerHTML = `
            <div class="profiler-fps-display">
                <div class="fps-ring healthy" id="fps-ring">
                    <div class="fps-value" id="prof-fps">60</div>
                    <div class="fps-unit">FPS</div>
                </div>
                <div class="fps-status healthy" id="fps-status">✅ Excellent</div>
            </div>
            <div class="profiler-section">
                <div class="profiler-section-title">System Health</div>
                <div class="health-bar-row">
                    <div class="health-bar-icon">⚡</div>
                    <div class="health-bar-content">
                        <div class="health-bar-header">
                            <span class="health-bar-name">FPS</span>
                            <span class="health-bar-value" id="prof-fps-val">60</span>
                        </div>
                        <div class="health-bar-track">
                            <div class="health-bar-fill healthy" id="prof-fps-bar" style="width:100%"></div>
                        </div>
                    </div>
                </div>
                <div class="health-bar-row">
                    <div class="health-bar-icon">💾</div>
                    <div class="health-bar-content">
                        <div class="health-bar-header">
                            <span class="health-bar-name">RAM</span>
                            <span class="health-bar-value" id="prof-mem-val">0 MB</span>
                        </div>
                        <div class="health-bar-track">
                            <div class="health-bar-fill healthy" id="prof-mem-bar" style="width:0%"></div>
                        </div>
                    </div>
                </div>
                <div class="health-bar-row">
                    <div class="health-bar-icon">🎨</div>
                    <div class="health-bar-content">
                        <div class="health-bar-header">
                            <span class="health-bar-name">DRAW</span>
                            <span class="health-bar-value" id="prof-dc-val">0</span>
                        </div>
                        <div class="health-bar-track">
                            <div class="health-bar-fill healthy" id="prof-dc-bar" style="width:0%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="profiler-section">
                <div class="profiler-section-title">FPS History</div>
                <div class="profiler-graph"><canvas id="profiler-graph-canvas"></canvas></div>
            </div>
            <div class="profiler-section">
                <div class="profiler-section-title">Stats</div>
                <div class="profiler-stats-grid">
                    <div class="profiler-stat"><span class="stat-value" id="prof-triangles">0</span><span class="stat-label">Tris</span></div>
                    <div class="profiler-stat"><span class="stat-value" id="prof-geometries">0</span><span class="stat-label">Geo</span></div>
                </div>
            </div>
        `;

        const saved = this.panelManager?.getSavedState('profiler-panel');
        this.panel = this.panelManager.createPanel({
            id: 'profiler-panel', title: 'Performance', icon: '📊',
            x: saved?.x ?? window.innerWidth - 280, y: saved?.y ?? 50,
            width: saved?.width ?? 260, height: saved?.height ?? 420,
            minWidth: 220, minHeight: 300, content
        });

        this.cacheElements();
        this.setupGraph();
        return this.panel;
    }

    cacheElements() {
        this.elements = {
            fpsRing: document.getElementById('fps-ring'),
            fps: document.getElementById('prof-fps'),
            fpsVal: document.getElementById('prof-fps-val'),
            fpsBar: document.getElementById('prof-fps-bar'),
            fpsStatus: document.getElementById('fps-status'),
            memVal: document.getElementById('prof-mem-val'),
            memBar: document.getElementById('prof-mem-bar'),
            dcVal: document.getElementById('prof-dc-val'),
            dcBar: document.getElementById('prof-dc-bar'),
            triangles: document.getElementById('prof-triangles'),
            geometries: document.getElementById('prof-geometries')
        };
    }

    setupGraph() {
        this.graphCanvas = document.getElementById('profiler-graph-canvas');
        if (this.graphCanvas) {
            this.graphCtx = this.graphCanvas.getContext('2d');
            this.resizeGraph();
        }
    }

    resizeGraph() {
        if (!this.graphCanvas?.parentElement) return;
        const rect = this.graphCanvas.parentElement.getBoundingClientRect();
        this.graphCanvas.width = Math.max(100, rect.width - 20);
        this.graphCanvas.height = Math.max(40, rect.height - 10);
    }

    setRenderer(renderer) { this.renderer = renderer; }

    startUpdates() {
        if (this.updateInterval) return;
        // 1000ms interval - minimal overhead for N4000
        this.updateInterval = setInterval(() => this.sampleMetrics(), 1000);
    }

    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Called each frame - MUST be ultra lightweight
    update() {
        this.frameCount++;
    }

    sampleMetrics() {
        const now = performance.now();
        const elapsed = now - this.lastFpsTime;
        
        // Calculate FPS
        if (elapsed > 0) {
            this.metrics.fps = Math.round((this.frameCount / elapsed) * 1000);
            this.frameCount = 0;
            this.lastFpsTime = now;
            
            // Circular buffer update (no GC pressure)
            this.fpsHistory[this.historyIndex] = this.metrics.fps;
            this.historyIndex = (this.historyIndex + 1) % 60;
        }
        
        // Sample renderer (lightweight)
        if (this.renderer?.info) {
            const info = this.renderer.info;
            this.metrics.drawCalls = info.render?.calls || 0;
            this.metrics.triangles = info.render?.triangles || 0;
            this.metrics.geometries = info.memory?.geometries || 0;
        }
        
        // Memory (Chrome only)
        if (performance.memory) {
            this.metrics.memory = Math.round(performance.memory.usedJSHeapSize / 1048576);
        }
        
        this.updateUI();
    }

    updateUI() {
        if (!this.elements.fps) return;
        const { fps, memory, drawCalls, triangles, geometries } = this.metrics;
        
        // Only update changed values
        if (this.prevValues.fps !== fps) {
            this.elements.fps.textContent = fps;
            this.elements.fpsVal.textContent = fps;
            const h = this.getHealth('fps', fps);
            this.elements.fpsRing.className = `fps-ring ${h.c}`;
            this.elements.fpsStatus.textContent = `${h.i} ${h.l}`;
            this.elements.fpsBar.style.width = `${Math.min(100, (fps/60)*100)}%`;
            this.elements.fpsBar.className = `health-bar-fill ${h.c}`;
            this.prevValues.fps = fps;
        }
        
        if (this.prevValues.memory !== memory) {
            const h = this.getHealth('memory', memory);
            this.elements.memVal.textContent = `${memory} MB`;
            this.elements.memBar.style.width = `${Math.min(100, (memory/400)*100)}%`;
            this.elements.memBar.className = `health-bar-fill ${h.c}`;
            this.prevValues.memory = memory;
        }
        
        if (this.prevValues.dc !== drawCalls) {
            const h = this.getHealth('drawCalls', drawCalls);
            this.elements.dcVal.textContent = drawCalls;
            this.elements.dcBar.style.width = `${Math.min(100, (drawCalls/100)*100)}%`;
            this.elements.dcBar.className = `health-bar-fill ${h.c}`;
            this.prevValues.dc = drawCalls;
        }
        
        this.elements.triangles.textContent = triangles > 1000 ? `${(triangles/1000).toFixed(1)}K` : triangles;
        this.elements.geometries.textContent = geometries;
        
        // Graph every 3rd update (3 seconds) - reduce canvas overhead
        this.graphUpdateCounter++;
        if (this.graphUpdateCounter >= 3) {
            this.drawGraph();
            this.graphUpdateCounter = 0;
        }
    }

    getHealth(metric, value) {
        const t = this.thresholds[metric];
        if (metric === 'fps') {
            if (value >= t.green) return { c: 'healthy', i: '✅', l: 'Excellent' };
            if (value >= t.yellow) return { c: 'warning', i: '⚠️', l: 'Moderate' };
            return { c: 'critical', i: '❌', l: 'Poor' };
        } else {
            if (value < t.green) return { c: 'healthy', i: '✅', l: 'Good' };
            if (value < t.yellow) return { c: 'warning', i: '⚠️', l: 'Warning' };
            return { c: 'critical', i: '❌', l: 'Critical' };
        }
    }

    drawGraph() {
        if (!this.graphCtx) return;
        const ctx = this.graphCtx;
        const w = this.graphCanvas.width;
        const h = this.graphCanvas.height;
        
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w, h);
        
        // 30 FPS line
        ctx.strokeStyle = 'rgba(255,165,0,0.3)';
        ctx.setLineDash([2, 2]);
        const y30 = h - (30/70) * h;
        ctx.beginPath();
        ctx.moveTo(0, y30);
        ctx.lineTo(w, y30);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // FPS line (read circular buffer correctly)
        ctx.strokeStyle = this.metrics.fps >= 45 ? '#00ff88' : this.metrics.fps >= 30 ? '#ffa500' : '#ff4757';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < 60; i++) {
            const idx = (this.historyIndex + i) % 60;
            const fps = this.fpsHistory[idx];
            const x = (i / 59) * w;
            const y = h - (Math.min(70, fps) / 70) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    show() { this.visible = true; this.startUpdates(); }
    hide() { this.visible = false; this.stopUpdates(); }
    
    reset() {
        this.fpsHistory.fill(60);
        this.historyIndex = 0;
        this.frameCount = 0;
        this.prevValues = {};
    }

    getMetrics() {
        return {
            ...this.metrics,
            health: {
                fps: this.getHealth('fps', this.metrics.fps),
                memory: this.getHealth('memory', this.metrics.memory),
                drawCalls: this.getHealth('drawCalls', this.metrics.drawCalls)
            }
        };
    }

    dispose() { this.stopUpdates(); }
}

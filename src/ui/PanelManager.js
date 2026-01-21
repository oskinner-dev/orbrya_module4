/**
 * PanelManager.js - Movable/Resizable Panel System with SNAPPING
 * Unity/DaVinci Resolve inspired dockable panel management
 * 
 * Features:
 * - Drag to move panels with edge/panel snapping
 * - Resize from edges and corners
 * - Snap guides (visual feedback)
 * - Focus management (z-index)
 * - Minimize/maximize
 * - Panel state persistence (localStorage)
 */

export class PanelManager {
    constructor() {
        this.panels = new Map();
        this.activePanel = null;
        this.dragState = null;
        this.resizeState = null;
        this.baseZIndex = 100;
        this.topZIndex = 100;
        
        // Snapping configuration
        this.snapThreshold = 15;  // pixels to trigger snap
        this.snapGuides = [];     // visual snap indicators
        
        // Grid configuration
        this.gridSize = 20;       // snap to 20px grid
        this.gridEnabled = true;  // can be toggled
        
        // Layout presets
        this.layouts = this.defineLayouts();
        this.currentLayout = 'default';
        
        this.init();
    }

    init() {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.loadPanelStates();
        this.createSnapGuides();
        this.setupLayoutButton();
        this.createMinimizedDock();
    }
    
    /**
     * Create dock at bottom of screen for minimized panels
     */
    createMinimizedDock() {
        if (document.getElementById('minimized-dock')) return;
        
        const dock = document.createElement('div');
        dock.id = 'minimized-dock';
        dock.className = 'minimized-dock';
        dock.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(15, 22, 41, 0.95);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 10px;
            z-index: 2000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
        `;
        
        document.body.appendChild(dock);
        this.minimizedDock = dock;
    }
    
    /**
     * Update dock visibility based on minimized panels
     */
    updateMinimizedDock() {
        if (!this.minimizedDock) return;
        
        // Clear dock
        this.minimizedDock.innerHTML = '';
        
        let hasMinimized = false;
        
        // Add button for each minimized panel
        this.panels.forEach((data, id) => {
            if (data.state.minimized) {
                hasMinimized = true;
                
                const btn = document.createElement('button');
                btn.className = 'dock-panel-btn';
                btn.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    background: rgba(102, 126, 234, 0.2);
                    border: 1px solid rgba(102, 126, 234, 0.4);
                    border-radius: 6px;
                    color: #e0e0e0;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                
                // Get panel title and icon
                const title = data.config.title || id;
                const icon = data.element.querySelector('.panel-icon')?.textContent || '📋';
                
                btn.innerHTML = `<span>${icon}</span><span>${title}</span>`;
                btn.title = `Restore ${title}`;
                
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'rgba(102, 126, 234, 0.4)';
                    btn.style.transform = 'translateY(-2px)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'rgba(102, 126, 234, 0.2)';
                    btn.style.transform = 'translateY(0)';
                });
                btn.addEventListener('click', () => {
                    this.showPanel(id);
                });
                
                this.minimizedDock.appendChild(btn);
            }
        });
        
        // Show/hide dock
        if (hasMinimized) {
            this.minimizedDock.style.opacity = '1';
            this.minimizedDock.style.visibility = 'visible';
        } else {
            this.minimizedDock.style.opacity = '0';
            this.minimizedDock.style.visibility = 'hidden';
        }
    }
    
    defineLayouts() {
        // Layouts are defined as percentages of workspace
        // Code Editor on LEFT for maximum readability
        return {
            default: {
                name: 'Default',
                panels: {
                    'code-editor-panel': { x: 0, y: 0, w: 0.32, h: 1 },
                    'viewport-panel': { x: 0.32, y: 0, w: 0.48, h: 1 },
                    'profiler-panel': { x: 0.80, y: 0, w: 0.20, h: 0.50 },
                    'hierarchy-panel': { x: 0.80, y: 0.50, w: 0.20, h: 0.50 }
                }
            },
            codeFocus: {
                name: 'Code Focus',
                panels: {
                    'code-editor-panel': { x: 0, y: 0, w: 0.45, h: 1 },
                    'viewport-panel': { x: 0.45, y: 0, w: 0.40, h: 1 },
                    'profiler-panel': { x: 0.85, y: 0, w: 0.15, h: 0.50 },
                    'hierarchy-panel': { x: 0.85, y: 0.50, w: 0.15, h: 0.50 }
                }
            },
            viewportFocus: {
                name: 'Viewport Focus',
                panels: {
                    'code-editor-panel': { x: 0, y: 0.55, w: 0.30, h: 0.45 },
                    'viewport-panel': { x: 0, y: 0, w: 0.75, h: 0.55 },
                    'profiler-panel': { x: 0.75, y: 0, w: 0.25, h: 0.50 },
                    'hierarchy-panel': { x: 0.75, y: 0.50, w: 0.25, h: 0.50 }
                }
            },
            presentation: {
                name: 'Presentation',
                panels: {
                    'hierarchy-panel': { x: -1, y: -1, w: 0, h: 0, hidden: true },
                    'code-editor-panel': { x: 0, y: 0, w: 0.35, h: 1 },
                    'viewport-panel': { x: 0.35, y: 0, w: 0.50, h: 1 },
                    'profiler-panel': { x: 0.85, y: 0, w: 0.15, h: 1 }
                }
            }
        };
    }
    
    setupLayoutButton() {
        const layoutBtn = document.getElementById('btn-layout');
        if (!layoutBtn) return;
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.id = 'layout-dropdown';
        dropdown.className = 'layout-dropdown';
        dropdown.style.cssText = `
            display: none;
            position: absolute;
            top: 40px;
            background: #16213e;
            border: 1px solid #2d3748;
            border-radius: 6px;
            padding: 8px 0;
            min-width: 160px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        Object.entries(this.layouts).forEach(([key, layout]) => {
            const item = document.createElement('div');
            item.className = 'layout-item';
            item.textContent = layout.name;
            item.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                color: #e4e4e7;
                font-size: 13px;
            `;
            item.addEventListener('mouseenter', () => item.style.background = '#1f2b47');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
            item.addEventListener('click', () => {
                this.applyLayout(key);
                dropdown.style.display = 'none';
            });
            dropdown.appendChild(item);
        });
        
        // Add separator and grid toggle
        const sep = document.createElement('div');
        sep.style.cssText = 'border-top: 1px solid #2d3748; margin: 8px 0;';
        dropdown.appendChild(sep);
        
        const gridToggle = document.createElement('div');
        gridToggle.className = 'layout-item';
        gridToggle.innerHTML = `<span id="grid-check">${this.gridEnabled ? '✓' : ''}</span> Grid Snap (${this.gridSize}px)`;
        gridToggle.style.cssText = `padding: 8px 16px; cursor: pointer; color: #e4e4e7; font-size: 13px;`;
        gridToggle.addEventListener('mouseenter', () => gridToggle.style.background = '#1f2b47');
        gridToggle.addEventListener('mouseleave', () => gridToggle.style.background = 'transparent');
        gridToggle.addEventListener('click', () => {
            this.gridEnabled = !this.gridEnabled;
            document.getElementById('grid-check').textContent = this.gridEnabled ? '✓' : '';
            console.log(`[Layout] Grid snap: ${this.gridEnabled}`);
        });
        dropdown.appendChild(gridToggle);
        
        // Add reset layout option
        const resetItem = document.createElement('div');
        resetItem.className = 'layout-item';
        resetItem.textContent = '↺ Reset to Default';
        resetItem.style.cssText = `padding: 8px 16px; cursor: pointer; color: #ff6b6b; font-size: 13px;`;
        resetItem.addEventListener('mouseenter', () => resetItem.style.background = '#1f2b47');
        resetItem.addEventListener('mouseleave', () => resetItem.style.background = 'transparent');
        resetItem.addEventListener('click', () => {
            localStorage.removeItem('orbrya_panels');
            localStorage.removeItem('orbrya-panel-states');
            this.applyLayout('default');
            dropdown.style.display = 'none';
            console.log('[Layout] Reset to default');
        });
        dropdown.appendChild(resetItem);
        
        layoutBtn.parentElement.appendChild(dropdown);
        
        layoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        // Close on click outside
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }
    
    applyLayout(layoutKey) {
        const layout = this.layouts[layoutKey];
        if (!layout) return;
        
        const workspace = document.getElementById('workspace');
        const wW = workspace.clientWidth;
        const wH = workspace.clientHeight;
        
        Object.entries(layout.panels).forEach(([panelId, pos]) => {
            const panel = document.getElementById(panelId);
            if (!panel) return;
            
            if (pos.hidden) {
                panel.style.display = 'none';
                return;
            }
            
            panel.style.display = '';
            panel.style.left = `${Math.round(pos.x * wW)}px`;
            panel.style.top = `${Math.round(pos.y * wH)}px`;
            panel.style.width = `${Math.round(pos.w * wW)}px`;
            panel.style.height = `${Math.round(pos.h * wH)}px`;
        });
        
        this.currentLayout = layoutKey;
        this.savePanelStates();
        console.log(`[Layout] Applied: ${layout.name}`);
        
        // Trigger resize events for panels that need it
        window.dispatchEvent(new Event('resize'));
    }
    
    snapToGrid(value) {
        if (!this.gridEnabled) return value;
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    createSnapGuides() {
        // Create vertical and horizontal snap guide lines
        const workspace = document.getElementById('workspace');
        
        const vGuide = document.createElement('div');
        vGuide.className = 'snap-guide vertical';
        vGuide.id = 'snap-guide-v';
        workspace.appendChild(vGuide);
        
        const hGuide = document.createElement('div');
        hGuide.className = 'snap-guide horizontal';
        hGuide.id = 'snap-guide-h';
        workspace.appendChild(hGuide);
    }

    showSnapGuide(type, position) {
        const guide = document.getElementById(`snap-guide-${type === 'vertical' ? 'v' : 'h'}`);
        if (!guide) return;
        
        guide.classList.add('visible');
        if (type === 'vertical') {
            guide.style.left = `${position}px`;
        } else {
            guide.style.top = `${position}px`;
        }
    }

    hideSnapGuides() {
        document.getElementById('snap-guide-v')?.classList.remove('visible');
        document.getElementById('snap-guide-h')?.classList.remove('visible');
    }

    /**
     * Calculate snap positions for a panel
     */
    calculateSnap(panelId, newX, newY, width, height) {
        const workspace = document.getElementById('workspace');
        const workspaceRect = workspace.getBoundingClientRect();
        const wW = workspaceRect.width;
        const wH = workspaceRect.height;
        
        let snapX = newX;
        let snapY = newY;
        let snappedV = false;
        let snappedH = false;
        let snapPosV = 0;
        let snapPosH = 0;
        
        // Snap to workspace edges
        // Left edge
        if (Math.abs(newX) < this.snapThreshold) {
            snapX = 0;
            snappedV = true;
            snapPosV = 0;
        }
        // Right edge
        if (Math.abs(newX + width - wW) < this.snapThreshold) {
            snapX = wW - width;
            snappedV = true;
            snapPosV = wW;
        }
        // Top edge
        if (Math.abs(newY) < this.snapThreshold) {
            snapY = 0;
            snappedH = true;
            snapPosH = 0;
        }
        // Bottom edge
        if (Math.abs(newY + height - wH) < this.snapThreshold) {
            snapY = wH - height;
            snappedH = true;
            snapPosH = wH;
        }
        
        // Snap to other panels
        this.panels.forEach((data, id) => {
            if (id === panelId) return;
            const el = data.element;
            if (el.classList.contains('hidden') || el.classList.contains('maximized')) return;
            
            const rect = el.getBoundingClientRect();
            const pLeft = rect.left - workspaceRect.left;
            const pTop = rect.top - workspaceRect.top;
            const pRight = pLeft + rect.width;
            const pBottom = pTop + rect.height;

            // Snap left edge to other panel's right edge
            if (Math.abs(newX - pRight) < this.snapThreshold) {
                snapX = pRight;
                snappedV = true;
                snapPosV = pRight;
            }
            // Snap right edge to other panel's left edge
            if (Math.abs(newX + width - pLeft) < this.snapThreshold) {
                snapX = pLeft - width;
                snappedV = true;
                snapPosV = pLeft;
            }
            // Snap left edges together
            if (Math.abs(newX - pLeft) < this.snapThreshold) {
                snapX = pLeft;
                snappedV = true;
                snapPosV = pLeft;
            }
            // Snap right edges together
            if (Math.abs(newX + width - pRight) < this.snapThreshold) {
                snapX = pRight - width;
                snappedV = true;
                snapPosV = pRight;
            }
            
            // Snap top edge to other panel's bottom
            if (Math.abs(newY - pBottom) < this.snapThreshold) {
                snapY = pBottom;
                snappedH = true;
                snapPosH = pBottom;
            }
            // Snap bottom edge to other panel's top
            if (Math.abs(newY + height - pTop) < this.snapThreshold) {
                snapY = pTop - height;
                snappedH = true;
                snapPosH = pTop;
            }
            // Snap top edges together
            if (Math.abs(newY - pTop) < this.snapThreshold) {
                snapY = pTop;
                snappedH = true;
                snapPosH = pTop;
            }
            // Snap bottom edges together
            if (Math.abs(newY + height - pBottom) < this.snapThreshold) {
                snapY = pBottom - height;
                snappedH = true;
                snapPosH = pBottom;
            }
        });
        
        return { snapX, snapY, snappedV, snappedH, snapPosV, snapPosH };
    }

    createPanel(config) {
        const {
            id, title, icon = '📦',
            x = 100, y = 100, width = 300, height = 400,
            minWidth = 200, minHeight = 150,
            resizable = true, closable = true, content = null
        } = config;

        const panel = document.createElement('div');
        panel.id = id;
        panel.className = 'panel';
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        panel.style.width = `${width}px`;
        panel.style.height = `${height}px`;

        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-icon">${icon}</span>
                <span class="panel-title">${title}</span>
                <div class="panel-controls">
                    <button class="panel-btn minimize" title="Minimize">−</button>
                    <button class="panel-btn maximize" title="Maximize">□</button>
                    ${closable ? '<button class="panel-btn close" title="Close">×</button>' : ''}
                </div>
            </div>
            <div class="panel-content"></div>
            ${resizable ? this.createResizeHandles() : ''}
        `;

        this.panels.set(id, {
            element: panel,
            config: { id, title, minWidth, minHeight, resizable, closable },
            state: { minimized: false, maximized: false, prevBounds: null }
        });

        if (content) {
            panel.querySelector('.panel-content').appendChild(content);
        }

        this.attachPanelEvents(panel, id);
        document.getElementById('workspace').appendChild(panel);
        return panel;
    }

    createResizeHandles() {
        return `
            <div class="resize-handle n"></div>
            <div class="resize-handle s"></div>
            <div class="resize-handle e"></div>
            <div class="resize-handle w"></div>
            <div class="resize-handle nw"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle sw"></div>
            <div class="resize-handle se"></div>
        `;
    }

    attachPanelEvents(panel, id) {
        const header = panel.querySelector('.panel-header');
        const panelData = this.panels.get(id);

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.panel-controls')) return;
            this.startDrag(e, panel, id);
        });

        panel.addEventListener('mousedown', () => this.focusPanel(id));

        panel.querySelector('.panel-btn.minimize')?.addEventListener('click', () => {
            this.minimizePanel(id);
        });
        panel.querySelector('.panel-btn.maximize')?.addEventListener('click', () => {
            this.toggleMaximize(id);
        });
        panel.querySelector('.panel-btn.close')?.addEventListener('click', () => {
            this.closePanel(id);
        });

        if (panelData.config.resizable) {
            panel.querySelectorAll('.resize-handle').forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    this.startResize(e, panel, id, handle.className.split(' ')[1]);
                });
            });
        }
    }

    focusPanel(id) {
        this.panels.forEach((data) => data.element.classList.remove('focused'));
        const panelData = this.panels.get(id);
        if (panelData) {
            this.topZIndex++;
            panelData.element.style.zIndex = this.topZIndex;
            panelData.element.classList.add('focused');
            this.activePanel = id;
        }
    }

    startDrag(e, panel, id) {
        e.preventDefault();
        this.focusPanel(id);
        const rect = panel.getBoundingClientRect();
        const workspace = document.getElementById('workspace').getBoundingClientRect();
        
        this.dragState = {
            panel, id,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect.left - workspace.left,
            startTop: rect.top - workspace.top,
            width: rect.width,
            height: rect.height
        };
        document.body.style.cursor = 'move';
        panel.classList.add('dragging');
    }

    startResize(e, panel, id, direction) {
        e.preventDefault();
        e.stopPropagation();
        this.focusPanel(id);
        
        const rect = panel.getBoundingClientRect();
        const workspace = document.getElementById('workspace').getBoundingClientRect();
        const panelData = this.panels.get(id);
        
        this.resizeState = {
            panel, id, direction,
            startX: e.clientX, startY: e.clientY,
            startLeft: rect.left - workspace.left,
            startTop: rect.top - workspace.top,
            startWidth: rect.width, startHeight: rect.height,
            minWidth: panelData.config.minWidth,
            minHeight: panelData.config.minHeight
        };
        panel.classList.add('resizing');
    }

    handleMouseMove(e) {
        if (this.dragState) {
            this.handleDrag(e);
        } else if (this.resizeState) {
            this.handleResize(e);
        }
    }

    handleDrag(e) {
        const { panel, id, startX, startY, startLeft, startTop, width, height } = this.dragState;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newX = startLeft + dx;
        let newY = startTop + dy;
        
        // Always apply grid snapping first
        if (this.gridEnabled) {
            newX = Math.round(newX / this.gridSize) * this.gridSize;
            newY = Math.round(newY / this.gridSize) * this.gridSize;
        }
        
        // Then apply panel/edge snapping (overrides grid if close to edge)
        const snap = this.calculateSnap(id, newX, newY, width, height);
        
        // Use snapped position if within threshold
        if (snap.snappedV) newX = snap.snapX;
        if (snap.snappedH) newY = snap.snapY;
        
        // Show/hide snap guides
        if (snap.snappedV) {
            this.showSnapGuide('vertical', snap.snapPosV);
        } else {
            document.getElementById('snap-guide-v')?.classList.remove('visible');
        }
        if (snap.snappedH) {
            this.showSnapGuide('horizontal', snap.snapPosH);
        } else {
            document.getElementById('snap-guide-h')?.classList.remove('visible');
        }
        
        panel.style.left = `${newX}px`;
        panel.style.top = `${newY}px`;
    }

    handleResize(e) {
        const { panel, direction, startX, startY, startLeft, startTop,
                startWidth, startHeight, minWidth, minHeight } = this.resizeState;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newLeft = startLeft;
        let newTop = startTop;
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (direction.includes('e')) newWidth = Math.max(minWidth, startWidth + dx);
        if (direction.includes('w')) {
            newWidth = Math.max(minWidth, startWidth - dx);
            if (newWidth > minWidth) newLeft = startLeft + dx;
        }
        if (direction.includes('s')) newHeight = Math.max(minHeight, startHeight + dy);
        if (direction.includes('n')) {
            newHeight = Math.max(minHeight, startHeight - dy);
            if (newHeight > minHeight) newTop = startTop + dy;
        }
        
        // Apply grid snapping to all values
        if (this.gridEnabled) {
            newWidth = Math.round(newWidth / this.gridSize) * this.gridSize;
            newHeight = Math.round(newHeight / this.gridSize) * this.gridSize;
            newLeft = Math.round(newLeft / this.gridSize) * this.gridSize;
            newTop = Math.round(newTop / this.gridSize) * this.gridSize;
            
            // Re-enforce minimums after snapping
            newWidth = Math.max(minWidth, newWidth);
            newHeight = Math.max(minHeight, newHeight);
        }

        panel.style.left = `${newLeft}px`;
        panel.style.top = `${newTop}px`;
        panel.style.width = `${newWidth}px`;
        panel.style.height = `${newHeight}px`;

        panel.dispatchEvent(new CustomEvent('panelresize', {
            detail: { width: newWidth, height: newHeight }
        }));
    }

    handleMouseUp() {
        if (this.dragState) {
            document.body.style.cursor = '';
            this.dragState.panel.classList.remove('dragging');
            this.hideSnapGuides();
            this.savePanelStates();
        }
        if (this.resizeState) {
            this.resizeState.panel.classList.remove('resizing');
            this.savePanelStates();
        }
        this.dragState = null;
        this.resizeState = null;
    }

    minimizePanel(id) {
        const panelData = this.panels.get(id);
        if (!panelData) return;
        panelData.element.classList.add('hidden');
        panelData.state.minimized = true;
        this.updateMinimizedDock();
    }

    toggleMaximize(id) {
        const panelData = this.panels.get(id);
        if (!panelData) return;
        const panel = panelData.element;
        
        if (panelData.state.maximized) {
            const prev = panelData.state.prevBounds;
            panel.style.left = prev.left;
            panel.style.top = prev.top;
            panel.style.width = prev.width;
            panel.style.height = prev.height;
            panel.classList.remove('maximized');
            panelData.state.maximized = false;
        } else {
            panelData.state.prevBounds = {
                left: panel.style.left, top: panel.style.top,
                width: panel.style.width, height: panel.style.height
            };
            panel.classList.add('maximized');
            panelData.state.maximized = true;
        }
        panel.dispatchEvent(new CustomEvent('panelresize'));
    }

    closePanel(id) {
        const panelData = this.panels.get(id);
        if (!panelData) return;
        panelData.element.remove();
        this.panels.delete(id);
        this.savePanelStates();
    }

    showPanel(id) {
        const panelData = this.panels.get(id);
        if (!panelData) return;
        panelData.element.classList.remove('hidden');
        panelData.state.minimized = false;
        this.focusPanel(id);
        this.updateMinimizedDock();
    }

    getPanel(id) { return this.panels.get(id); }
    
    getPanelContent(id) {
        return this.panels.get(id)?.element.querySelector('.panel-content');
    }

    savePanelStates() {
        const states = {};
        this.panels.forEach((data, id) => {
            const rect = data.element.getBoundingClientRect();
            states[id] = {
                x: parseInt(data.element.style.left),
                y: parseInt(data.element.style.top),
                width: rect.width, height: rect.height,
                minimized: data.state.minimized,
                maximized: data.state.maximized
            };
        });
        localStorage.setItem('orbrya_panels', JSON.stringify(states));
    }

    loadPanelStates() {
        try {
            const saved = localStorage.getItem('orbrya_panels');
            if (saved) this.savedStates = JSON.parse(saved);
        } catch (e) {
            console.warn('[PanelManager] Could not load saved panel states');
        }
    }

    getSavedState(id) { return this.savedStates?.[id]; }
}

/**
 * Hierarchy.js - Scene Object Hierarchy Panel
 * Unity-style object tree showing all scene objects
 * 
 * Features:
 * - Expandable tree view
 * - Object selection
 * - Object visibility toggle
 * - Count badges for children
 */

export class Hierarchy {
    constructor(panelManager, sceneController) {
        this.panelManager = panelManager;
        this.sceneController = sceneController;
        this.panel = null;
        this.selectedObject = null;
        this.expandedItems = new Set(['scene-root']);
    }

    createPanel() {
        const content = document.createElement('div');
        content.className = 'hierarchy-wrapper';
        content.innerHTML = `
            <div class="hierarchy-toolbar">
                <input type="text" class="hierarchy-search" placeholder="Search objects..." id="hierarchy-search">
                <button class="hierarchy-btn" id="hierarchy-refresh" title="Refresh">↻</button>
            </div>
            <div class="hierarchy-tree" id="hierarchy-tree"></div>
        `;

        const saved = this.panelManager.getSavedState('hierarchy-panel');
        this.panel = this.panelManager.createPanel({
            id: 'hierarchy-panel',
            title: 'Hierarchy',
            icon: '📁',
            x: saved?.x ?? 20,
            y: saved?.y ?? 50,
            width: saved?.width ?? 220,
            height: saved?.height ?? 400,
            minWidth: 180,
            minHeight: 200,
            content
        });

        // Event listeners
        document.getElementById('hierarchy-refresh').addEventListener('click', () => {
            this.refresh();
        });

        document.getElementById('hierarchy-search').addEventListener('input', (e) => {
            this.filterTree(e.target.value);
        });

        this.refresh();
        return this.panel;
    }

    refresh() {
        const tree = document.getElementById('hierarchy-tree');
        if (!tree || !this.sceneController?.scene) return;

        const scene = this.sceneController.scene;
        tree.innerHTML = this.buildTreeHTML(scene, 'Scene', true);
        this.attachTreeEvents();
    }

    buildTreeHTML(obj, name, isRoot = false) {
        const children = obj.children || [];
        const hasChildren = children.length > 0;
        const id = obj.uuid || 'scene-root';
        const isExpanded = this.expandedItems.has(id);
        const isSelected = this.selectedObject === obj;
        
        // Determine icon based on object type
        let icon = '📦';
        if (obj.isScene) icon = '🌍';
        else if (obj.isCamera) icon = '📷';
        else if (obj.isLight) icon = '💡';
        else if (obj.isInstancedMesh) icon = '🌲';
        else if (obj.isMesh) icon = '◼️';
        else if (obj.isGroup) icon = '📁';
        else if (name.includes('Grid')) icon = '⊞';

        let html = `
            <div class="hierarchy-item ${isSelected ? 'selected' : ''}" data-id="${id}">
                <span class="expand-btn">${hasChildren ? (isExpanded ? '▼' : '▶') : '  '}</span>
                <span class="item-icon">${icon}</span>
                <span class="item-name">${name}</span>
                ${hasChildren ? `<span class="item-count">${children.length}</span>` : ''}
            </div>
        `;

        if (hasChildren && isExpanded) {
            html += '<div class="hierarchy-children">';
            children.forEach((child, idx) => {
                const childName = child.name || child.type || `Object_${idx}`;
                html += this.buildTreeHTML(child, childName);
            });
            html += '</div>';
        }

        return html;
    }

    attachTreeEvents() {
        const items = document.querySelectorAll('.hierarchy-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                const id = item.dataset.id;
                
                // Toggle expansion if clicking expand button
                if (e.target.classList.contains('expand-btn')) {
                    if (this.expandedItems.has(id)) {
                        this.expandedItems.delete(id);
                    } else {
                        this.expandedItems.add(id);
                    }
                    this.refresh();
                    return;
                }
                
                // Select item
                document.querySelectorAll('.hierarchy-item').forEach(i => {
                    i.classList.remove('selected');
                });
                item.classList.add('selected');
                
                // Find and store selected object
                if (id === 'scene-root') {
                    this.selectedObject = this.sceneController.scene;
                } else {
                    this.selectedObject = this.findObjectByUUID(this.sceneController.scene, id);
                }
                
                console.log('[Hierarchy] Selected:', this.selectedObject?.name || id);
            });
        });
    }

    findObjectByUUID(obj, uuid) {
        if (obj.uuid === uuid) return obj;
        for (const child of (obj.children || [])) {
            const found = this.findObjectByUUID(child, uuid);
            if (found) return found;
        }
        return null;
    }

    filterTree(query) {
        const items = document.querySelectorAll('.hierarchy-item');
        const lowerQuery = query.toLowerCase();
        
        items.forEach(item => {
            const name = item.querySelector('.item-name').textContent.toLowerCase();
            if (query === '' || name.includes(lowerQuery)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    getSelectedObject() {
        return this.selectedObject;
    }
}

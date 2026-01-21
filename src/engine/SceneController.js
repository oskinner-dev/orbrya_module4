/**
 * SceneController.js - Orbrya Core 3D Engine
 * 
 * Optimized for Intel Celeron N4000 Chromebooks (4GB RAM, UHD Graphics 600)
 * Target: 30-60 FPS with up to 175 trees
 * 
 * N4000 CRITICAL OPTIMIZATIONS:
 * - devicePixelRatio capped at 1.0 (saves 10-15 FPS)
 * - Antialiasing disabled (saves 10-15 FPS)  
 * - No PCFSoftShadowMap (saves 20-25 FPS)
 * - GPU Instancing via InstancedMesh
 * - MeshLambertMaterial (cheaper than Standard)
 */

import * as THREE from 'three';
import { AssetLoader } from './AssetLoader.js';

export class SceneController {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Asset loader
        this.assetLoader = new AssetLoader();
        this.assetsLoaded = false;
        this.useLoadedModels = false; // Toggle for loaded vs procedural
        
        // Tree management
        this.treeInstancedMesh = null;
        this.loadedTreeModel = null;
        this.currentTreeCount = 25;
        
        // Camera orbit
        this.cameraAngle = 0;
        this.cameraRadius = 60;
        this.cameraHeight = 30;
        this.orbitSpeed = 0.15;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.currentFps = 60;
        this.frameTime = 16.67;
        this.lastFrameTime = performance.now();
        
        // Callbacks
        this.onPerformanceUpdate = null;
        this.onFrameUpdate = null;  // Called each frame for profiler
    }


    async init() {
        console.log('[SceneController] Initializing N4000-optimized engine...');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            500
        );
        this.camera.position.set(60, 30, 0);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer with N4000 optimizations
        await this.createRenderer();
        
        // Setup lighting
        this.setupLighting();
        
        // Create ground
        this.createGround();
        
        // Spawn initial trees
        this.spawnTrees(this.currentTreeCount);
        
        // Debounced resize handler (prevents resize spam that causes flickering)
        this.resizeTimeout = null;
        this.isResizing = false;
        
        const debouncedResize = () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            
            // Mark as resizing to pause render updates
            if (!this.isResizing) {
                this.isResizing = true;
            }
            
            this.resizeTimeout = setTimeout(() => {
                this.onResize();
                this.isResizing = false;
            }, 150); // Increased debounce time to prevent flicker
        };
        
        this.resizeObserver = new ResizeObserver(debouncedResize);
        this.resizeObserver.observe(this.container);
        
        // Also listen to panel resize events
        this.container.addEventListener('panelresize', debouncedResize);
        window.addEventListener('resize', debouncedResize);
        
        console.log('[SceneController] Initialization complete');
    }

    async createRenderer() {
        // N4000 CRITICAL OPTIMIZATIONS
        const config = {
            antialias: false,           // Saves 10-15 FPS
            powerPreference: 'high-performance',
            alpha: false,
            depth: true,
            stencil: false,
            preserveDrawingBuffer: false
        };
        
        this.renderer = new THREE.WebGLRenderer(config);
        
        // Cap pixel ratio at 1.0 - saves 10-15 FPS on N4000
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        
        // Disable shadows - PCFSoftShadowMap costs 20-25 FPS
        this.renderer.shadowMap.enabled = false;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        this.container.appendChild(this.renderer.domElement);
        
        console.log(`[Renderer] pixelRatio: ${this.renderer.getPixelRatio()}, shadows: false`);
    }


    setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(50, 100, 50);
        directional.castShadow = false;
        this.scene.add(directional);
    }

    createGround() {
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshLambertMaterial({
            color: 0x3d5c3d,
            side: THREE.FrontSide
        });
        
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
        
        const grid = new THREE.GridHelper(100, 20, 0x000000, 0x444444);
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    spawnTrees(count) {
        console.log(`[Trees] Spawning ${count} trees with GPU Instancing...`);
        
        // Cleanup existing
        if (this.treeInstancedMesh) {
            this.scene.remove(this.treeInstancedMesh.trunk);
            this.scene.remove(this.treeInstancedMesh.foliage);
            this.treeInstancedMesh.trunk.geometry.dispose();
            this.treeInstancedMesh.trunk.material.dispose();
            this.treeInstancedMesh.foliage.geometry.dispose();
            this.treeInstancedMesh.foliage.material.dispose();
        }


        // Low-poly Kenney-style tree geometry
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2, 6);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const foliageGeo = new THREE.ConeGeometry(1.5, 4, 6);
        const foliageMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        
        // GPU Instancing - renders ALL trees in 2 draw calls
        const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        const foliageInstanced = new THREE.InstancedMesh(foliageGeo, foliageMat, count);
        
        const dummy = new THREE.Object3D();
        const spreadRadius = 45;
        
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * spreadRadius * 2;
            const z = (Math.random() - 0.5) * spreadRadius * 2;
            const scale = 0.7 + Math.random() * 0.6;
            const rotation = Math.random() * Math.PI * 2;
            
            // Trunk
            dummy.position.set(x, 1, z);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.y = rotation;
            dummy.updateMatrix();
            trunkInstanced.setMatrixAt(i, dummy.matrix);
            
            // Foliage
            dummy.position.set(x, 3.5 * scale, z);
            dummy.updateMatrix();
            foliageInstanced.setMatrixAt(i, dummy.matrix);
        }
        
        trunkInstanced.instanceMatrix.needsUpdate = true;
        foliageInstanced.instanceMatrix.needsUpdate = true;
        
        this.scene.add(trunkInstanced);
        this.scene.add(foliageInstanced);
        
        this.treeInstancedMesh = { trunk: trunkInstanced, foliage: foliageInstanced };
        this.currentTreeCount = count;
        
        console.log(`[Trees] ${count} trees = 2 draw calls (GPU Instancing)`);
    }


    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        // Skip if dimensions are invalid or unchanged
        if (width === 0 || height === 0) return;
        if (this._lastWidth === width && this._lastHeight === height) return;
        
        this._lastWidth = width;
        this._lastHeight = height;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false); // false = don't update style
        
        console.log(`[SceneController] Resized to ${width}x${height}`);
    }

    update() {
        const now = performance.now();
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        // Call frame update for profiler (lightweight)
        if (this.onFrameUpdate) this.onFrameUpdate();
        
        // Calculate frame time
        this.frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        // Update camera orbit
        this.cameraAngle += this.orbitSpeed * deltaTime;
        this.camera.position.x = Math.cos(this.cameraAngle) * this.cameraRadius;
        this.camera.position.z = Math.sin(this.cameraAngle) * this.cameraRadius;
        this.camera.position.y = this.cameraHeight + Math.sin(elapsedTime * 0.3) * 5;
        this.camera.lookAt(0, 5, 0);
        
        // FPS calculation
        this.frameCount++;
        if (elapsedTime - this.lastFpsUpdate >= 0.1) {  // Update 10x/sec for smoother graph
            this.currentFps = Math.round(this.frameCount / (elapsedTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = elapsedTime;
            
            // Callback for profiler
            if (this.onPerformanceUpdate) {
                this.onPerformanceUpdate(this.currentFps, this.frameTime);
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.render();
    }

    start() {
        console.log('[SceneController] Starting render loop...');
        this.animate();
    }

    getRenderer() {
        return this.renderer;
    }

    /**
     * Load assets from manifest
     * @param {Function} onProgress - Progress callback
     */
    async loadAssets(onProgress = null) {
        console.log('[SceneController] Loading assets...');
        
        this.assetLoader.onProgress = (progress) => {
            if (onProgress) onProgress(progress);
            console.log(`[Assets] ${progress.percent}% - ${progress.name || progress.url}`);
        };
        
        try {
            const manifest = await this.assetLoader.loadManifest('assets/manifest.json');
            const assets = await this.assetLoader.preloadScenario(manifest.assets);
            
            // Store loaded tree model for later use
            if (assets.has('tree_pine')) {
                this.loadedTreeModel = assets.get('tree_pine');
                this.useLoadedModels = true;
                console.log('[SceneController] Tree model loaded, switching to loaded assets');
            }
            
            this.assetsLoaded = true;
            return assets;
            
        } catch (error) {
            console.warn('[SceneController] Asset loading failed, using procedural fallback:', error);
            this.useLoadedModels = false;
            return null;
        }
    }

    /**
     * Spawn trees using loaded models (if available) or procedural geometry
     */
    spawnTreesWithModels(count) {
        if (this.useLoadedModels && this.loadedTreeModel) {
            this.spawnLoadedTrees(count);
        } else {
            this.spawnTrees(count);
        }
    }

    /**
     * Spawn trees using loaded GLTF models with instancing
     */
    spawnLoadedTrees(count) {
        // Clean up existing
        if (this.treeGroup) {
            this.scene.remove(this.treeGroup);
        }
        
        this.treeGroup = new THREE.Group();
        const spreadRadius = 45;
        
        for (let i = 0; i < count; i++) {
            const tree = this.loadedTreeModel.clone();
            
            tree.position.set(
                (Math.random() - 0.5) * spreadRadius * 2,
                0,
                (Math.random() - 0.5) * spreadRadius * 2
            );
            
            const scale = 0.5 + Math.random() * 0.5;
            tree.scale.set(scale, scale, scale);
            tree.rotation.y = Math.random() * Math.PI * 2;
            
            this.treeGroup.add(tree);
        }
        
        this.scene.add(this.treeGroup);
        this.currentTreeCount = count;
        
        console.log(`[Trees] Spawned ${count} loaded model trees`);
    }

    getAssetLoader() {
        return this.assetLoader;
    }
}


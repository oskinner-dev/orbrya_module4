/**
 * AssetLoader.js - GLTF/GLB Asset Loading System
 * 
 * Optimized for school network constraints:
 * - 1Mbps bandwidth assumed
 * - 30 second timeout
 * - Progress tracking
 * - Memory caching
 * - Texture compression (ASTC/DXT detection)
 * 
 * N4000 Considerations:
 * - Chunked loading to avoid blocking main thread
 * - Memory-efficient asset caching
 * - Automatic LOD selection (future)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class AssetLoader {
    constructor() {
        // Asset cache
        this.cache = new Map();
        this.textureCache = new Map();
        
        // Loading state
        this.loadingQueue = [];
        this.isLoading = false;
        this.currentProgress = 0;
        this.totalProgress = 0;
        
        // Configuration
        this.timeout = 30000;  // 30 second timeout for slow school wifi
        this.maxConcurrent = 2; // Limit concurrent loads for N4000
        this.activeLoads = 0;
        
        // Compression support detection
        this.compressionSupport = {
            astc: false,
            dxt: false,
            etc: false,
            pvrtc: false
        };
        
        // Callbacks
        this.onProgress = null;
        this.onError = null;
        this.onComplete = null;
        
        // Initialize loaders
        this.initLoaders();
        this.detectCompressionSupport();
    }

    initLoaders() {
        // GLTF Loader with Draco compression support
        this.gltfLoader = new GLTFLoader();
        
        // Draco decoder for compressed meshes
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS decoder for compatibility
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        
        // Texture loader
        this.textureLoader = new THREE.TextureLoader();
        
        // Loading manager for progress tracking
        this.loadingManager = new THREE.LoadingManager();
        this.loadingManager.onProgress = (url, loaded, total) => {
            this.updateProgress(loaded, total, url);
        };
        
        console.log('[AssetLoader] Loaders initialized');
    }

    detectCompressionSupport() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!gl) {
            console.warn('[AssetLoader] WebGL not available for compression detection');
            return;
        }
        
        // Check for ASTC (best for mobile/Chromebooks)
        const astc = gl.getExtension('WEBGL_compressed_texture_astc');
        this.compressionSupport.astc = !!astc;
        
        // Check for DXT/S3TC (desktop GPUs)
        const dxt = gl.getExtension('WEBGL_compressed_texture_s3tc');
        this.compressionSupport.dxt = !!dxt;
        
        // Check for ETC (Android/some Chromebooks)
        const etc = gl.getExtension('WEBGL_compressed_texture_etc');
        this.compressionSupport.etc = !!etc;
        
        console.log('[AssetLoader] Compression support:', this.compressionSupport);
    }

    /**
     * Get preferred texture format based on device support
     */
    getPreferredTextureFormat() {
        if (this.compressionSupport.astc) return 'astc';
        if (this.compressionSupport.etc) return 'etc';
        if (this.compressionSupport.dxt) return 'dxt';
        return 'png'; // Fallback
    }

    /**
     * Load a GLTF/GLB model with timeout and progress tracking
     * @param {string} url - URL to the model
     * @param {string} name - Cache key name
     * @returns {Promise<THREE.Object3D>}
     */
    async loadGLTF(url, name = null) {
        const cacheKey = name || url;
        
        // Return cached if available
        if (this.cache.has(cacheKey)) {
            console.log(`[AssetLoader] Cache hit: ${cacheKey}`);
            return this.cache.get(cacheKey).scene.clone();
        }
        
        return new Promise((resolve, reject) => {
            // Timeout controller
            const timeoutId = setTimeout(() => {
                reject(new Error(`Load timeout (${this.timeout/1000}s): ${url}\nSchool wifi may be slow. Try refreshing.`));
            }, this.timeout);
            
            const startTime = performance.now();
            
            this.gltfLoader.load(
                url,
                // Success
                (gltf) => {
                    clearTimeout(timeoutId);
                    const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
                    console.log(`[AssetLoader] Loaded ${cacheKey} in ${loadTime}s`);
                    
                    // Cache the result
                    this.cache.set(cacheKey, gltf);
                    
                    // Return a clone to prevent shared state issues
                    resolve(gltf.scene.clone());
                },
                // Progress
                (xhr) => {
                    if (xhr.lengthComputable) {
                        const percent = (xhr.loaded / xhr.total) * 100;
                        this.updateProgress(xhr.loaded, xhr.total, url);
                        
                        if (this.onProgress) {
                            this.onProgress({
                                url, loaded: xhr.loaded, total: xhr.total,
                                percent: Math.round(percent)
                            });
                        }
                    }
                },
                // Error
                (error) => {
                    clearTimeout(timeoutId);
                    console.error(`[AssetLoader] Failed to load ${url}:`, error);
                    reject(new Error(`Failed to load: ${url}\n${error.message}`));
                }
            );
        });
    }

    /**
     * Load a texture with caching
     * @param {string} url - Texture URL
     * @param {string} name - Cache key
     * @returns {Promise<THREE.Texture>}
     */
    async loadTexture(url, name = null) {
        const cacheKey = name || url;
        
        if (this.textureCache.has(cacheKey)) {
            console.log(`[AssetLoader] Texture cache hit: ${cacheKey}`);
            return this.textureCache.get(cacheKey);
        }
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Texture load timeout: ${url}`));
            }, this.timeout);
            
            this.textureLoader.load(
                url,
                (texture) => {
                    clearTimeout(timeoutId);
                    texture.colorSpace = THREE.SRGBColorSpace;
                    this.textureCache.set(cacheKey, texture);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            );
        });
    }

    /**
     * Get a cached asset by name
     * @param {string} name - Asset cache key
     * @returns {THREE.Object3D|null}
     */
    getAsset(name) {
        if (this.cache.has(name)) {
            return this.cache.get(name).scene.clone();
        }
        return null;
    }

    /**
     * Check if asset is cached
     */
    hasAsset(name) {
        return this.cache.has(name);
    }

    /**
     * Preload multiple assets from a manifest
     * Loads sequentially to avoid overwhelming slow networks
     * 
     * @param {Array} assetList - Array of {name, url, type} objects
     * @returns {Promise<Map>} - Map of loaded assets
     */
    async preloadScenario(assetList) {
        console.log(`[AssetLoader] Preloading ${assetList.length} assets...`);
        
        this.totalProgress = assetList.length;
        this.currentProgress = 0;
        
        const results = new Map();
        const errors = [];
        
        for (let i = 0; i < assetList.length; i++) {
            const asset = assetList[i];
            this.currentProgress = i;
            
            try {
                if (this.onProgress) {
                    this.onProgress({
                        current: i + 1,
                        total: assetList.length,
                        name: asset.name,
                        percent: Math.round(((i + 1) / assetList.length) * 100)
                    });
                }
                
                let loaded;
                if (asset.type === 'texture') {
                    loaded = await this.loadTexture(asset.url, asset.name);
                } else {
                    loaded = await this.loadGLTF(asset.url, asset.name);
                }
                
                results.set(asset.name, loaded);
                console.log(`[AssetLoader] Loaded ${i + 1}/${assetList.length}: ${asset.name}`);
                
            } catch (error) {
                console.error(`[AssetLoader] Failed: ${asset.name}`, error);
                errors.push({ name: asset.name, error: error.message });
                
                if (this.onError) {
                    this.onError({ name: asset.name, error });
                }
            }
            
            // Yield to main thread between loads
            await this.yieldToMain();
        }
        
        if (errors.length > 0) {
            console.warn(`[AssetLoader] ${errors.length} assets failed to load`);
        }
        
        if (this.onComplete) {
            this.onComplete({ loaded: results.size, failed: errors.length, errors });
        }
        
        return results;
    }

    /**
     * Yield to main thread to prevent blocking
     * Critical for N4000 which has limited CPU
     */
    yieldToMain() {
        return new Promise(resolve => {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(resolve, { timeout: 50 });
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    updateProgress(loaded, total, url) {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        // Internal tracking
        this.lastProgress = { loaded, total, percent, url };
    }

    /**
     * Load manifest JSON file
     */
    async loadManifest(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('[AssetLoader] Failed to load manifest:', error);
            throw error;
        }
    }

    /**
     * Clear all cached assets (memory management)
     */
    clearCache() {
        this.cache.forEach((gltf) => {
            if (gltf.scene) {
                gltf.scene.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        });
        this.cache.clear();
        
        this.textureCache.forEach(tex => tex.dispose());
        this.textureCache.clear();
        
        console.log('[AssetLoader] Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            cachedModels: this.cache.size,
            cachedTextures: this.textureCache.size,
            compressionSupport: this.compressionSupport
        };
    }

    dispose() {
        this.clearCache();
        this.dracoLoader.dispose();
    }
}

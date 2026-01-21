/**
 * ScenarioUI.js - Scenario-Specific UI Components
 * 
 * Provides all UI elements for the educational scenario experience:
 * - Inspector Panel (story, instructions, AI assistant)
 * - Hint System (button + progressive hint modal)
 * - Success Modal (celebration with particles and stats)
 * - Error/Feedback displays
 * - Try Again functionality
 * 
 * DESIGN PRINCIPLES:
 * - Glassmorphism aesthetic matching engine UI
 * - Smooth CSS animations
 * - Encouraging, friendly tone
 * - Accessible and mobile-friendly
 * 
 * @version 1.0.0
 */

export class ScenarioUI {
    constructor(options = {}) {
        this.options = {
            theme: 'dark',
            animationDuration: 300,
            particleCount: 50,
            ...options
        };
        
        // UI Element references
        this.elements = {
            inspector: null,
            hintButton: null,
            hintModal: null,
            successModal: null,
            errorToast: null,
            tryAgainButton: null,
            overlay: null,
            particleContainer: null
        };
        
        // State
        this.currentHint = 0;
        this.totalHints = 0;
        this.hints = [];
        this.isVisible = {
            inspector: false,
            hintModal: false,
            successModal: false
        };
        
        // Callbacks
        this.onHintRequest = null;
        this.onTryAgain = null;
        this.onNextScenario = null;
        this.onBackToDashboard = null;
        this.onInspectorDismiss = null;
        
        // Inject styles
        this._injectStyles();
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Initialize all UI components
     */
    init() {
        this._createOverlay();
        this._createInspectorPanel();
        this._createHintButton();
        this._createHintModal();
        this._createSuccessModal();
        this._createErrorToast();
        this._createParticleContainer();
        
        console.log('[ScenarioUI] Initialized');
        return this;
    }

    /**
     * Inject CSS styles for all components
     */
    _injectStyles() {
        if (document.getElementById('scenario-ui-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'scenario-ui-styles';
        styles.textContent = `
            /* ═══════════════════════════════════════════════════════════════
               SCENARIO UI - BASE STYLES
               ═══════════════════════════════════════════════════════════════ */
            
            .scenario-ui-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
                z-index: 1999;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .scenario-ui-overlay.visible {
                opacity: 1;
                visibility: visible;
            }
            
            /* Glassmorphism base */
            .scenario-ui-glass {
                background: rgba(15, 22, 41, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(102, 126, 234, 0.3);
                border-radius: 16px;
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            
            /* ═══════════════════════════════════════════════════════════════
               INSPECTOR PANEL
               ═══════════════════════════════════════════════════════════════ */
            
            .scenario-inspector {
                position: fixed;
                top: 20px;
                left: 20px;
                width: 380px;
                max-height: calc(100vh - 40px);
                overflow-y: auto;
                z-index: 1000;
                opacity: 0;
                transform: translateX(-20px);
                visibility: hidden;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .scenario-inspector.visible {
                opacity: 1;
                transform: translateX(0);
                visibility: visible;
            }
            
            .scenario-inspector-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 20px;
                border-bottom: 1px solid rgba(102, 126, 234, 0.2);
            }
            
            .scenario-inspector-avatar {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }
            
            .scenario-inspector-title {
                flex: 1;
            }
            
            .scenario-inspector-title h3 {
                margin: 0;
                color: #fff;
                font-size: 16px;
                font-weight: 600;
            }
            
            .scenario-inspector-title span {
                color: #00ff88;
                font-size: 12px;
            }
            
            .scenario-inspector-close {
                background: none;
                border: none;
                color: #888;
                font-size: 20px;
                cursor: pointer;
                padding: 5px;
                transition: color 0.2s;
            }
            
            .scenario-inspector-close:hover {
                color: #fff;
            }
            
            .scenario-inspector-body {
                padding: 20px;
            }
            
            .scenario-inspector-section {
                margin-bottom: 20px;
            }
            
            .scenario-inspector-section:last-child {
                margin-bottom: 0;
            }
            
            .scenario-inspector-label {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #888;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }
            
            .scenario-inspector-text {
                color: #e0e0e0;
                font-size: 14px;
                line-height: 1.6;
                white-space: pre-wrap;
            }
            
            .scenario-inspector-problem {
                background: rgba(255, 71, 87, 0.1);
                border-left: 3px solid #ff4757;
                padding: 12px 15px;
                border-radius: 0 8px 8px 0;
            }
            
            .scenario-inspector-goal {
                background: rgba(0, 255, 136, 0.1);
                border-left: 3px solid #00ff88;
                padding: 12px 15px;
                border-radius: 0 8px 8px 0;
            }
            
            .scenario-inspector-actions {
                padding: 15px 20px;
                border-top: 1px solid rgba(102, 126, 234, 0.2);
                display: flex;
                gap: 10px;
            }
            
            .scenario-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .scenario-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .scenario-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
            }
            
            .scenario-btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #888;
            }
            
            .scenario-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.15);
                color: #fff;
            }
            
            .scenario-btn-success {
                background: linear-gradient(135deg, #00ff88 0%, #00d4aa 100%);
                color: #0a0a14;
            }
            
            .scenario-btn-success:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(0, 255, 136, 0.4);
            }

            /* ═══════════════════════════════════════════════════════════════
               HINT BUTTON & MODAL
               ═══════════════════════════════════════════════════════════════ */
            
            .scenario-hint-button {
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                background: rgba(15, 22, 41, 0.95);
                border: 2px solid #ffc107;
                border-radius: 30px;
                color: #ffc107;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                z-index: 1000;
                opacity: 0;
                transform: translateY(20px);
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .scenario-hint-button.visible {
                opacity: 1;
                transform: translateY(0);
                visibility: visible;
            }
            
            .scenario-hint-button:hover {
                background: rgba(255, 193, 7, 0.1);
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(255, 193, 7, 0.3);
            }
            
            .scenario-hint-button .hint-icon {
                font-size: 20px;
            }
            
            .scenario-hint-button .hint-count {
                font-size: 12px;
                opacity: 0.8;
            }
            
            @keyframes hint-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
                50% { box-shadow: 0 0 0 15px rgba(255, 193, 7, 0); }
            }
            
            .scenario-hint-button.pulse {
                animation: hint-pulse 1s ease-in-out 3;
            }
            
            .scenario-hint-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                width: 450px;
                max-width: 90vw;
                z-index: 2000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .scenario-hint-modal.visible {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
                visibility: visible;
            }
            
            .scenario-hint-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px;
                border-bottom: 1px solid rgba(255, 193, 7, 0.2);
            }
            
            .scenario-hint-modal-header h3 {
                margin: 0;
                color: #ffc107;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .scenario-hint-modal-header h3 span {
                font-size: 24px;
            }
            
            .scenario-hint-progress {
                display: flex;
                gap: 6px;
            }
            
            .scenario-hint-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(255, 193, 7, 0.3);
                transition: background 0.3s;
            }
            
            .scenario-hint-dot.active {
                background: #ffc107;
            }
            
            .scenario-hint-modal-body {
                padding: 25px 20px;
            }
            
            .scenario-hint-text {
                color: #e0e0e0;
                font-size: 15px;
                line-height: 1.7;
                white-space: pre-wrap;
            }
            
            .scenario-hint-modal-footer {
                display: flex;
                justify-content: space-between;
                padding: 15px 20px;
                border-top: 1px solid rgba(255, 193, 7, 0.2);
            }
            
            .scenario-hint-modal .scenario-btn-hint {
                background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
                color: #0a0a14;
            }
            
            .scenario-hint-modal .scenario-btn-hint:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(255, 193, 7, 0.4);
            }
            
            .scenario-hint-modal .scenario-btn-hint:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            /* ═══════════════════════════════════════════════════════════════
               SUCCESS MODAL
               ═══════════════════════════════════════════════════════════════ */
            
            .scenario-success-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                width: 500px;
                max-width: 90vw;
                z-index: 2000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                border-color: #00ff88;
            }
            
            .scenario-success-modal.visible {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
                visibility: visible;
            }
            
            .scenario-success-modal-header {
                text-align: center;
                padding: 30px 20px 20px;
            }
            
            .scenario-success-icon {
                font-size: 64px;
                margin-bottom: 15px;
                animation: success-bounce 0.6s ease-out;
            }
            
            @keyframes success-bounce {
                0% { transform: scale(0); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            .scenario-success-modal-header h2 {
                margin: 0;
                color: #00ff88;
                font-size: 28px;
                font-weight: 700;
            }
            
            .scenario-success-modal-body {
                padding: 0 25px 25px;
            }
            
            .scenario-success-message {
                color: #e0e0e0;
                font-size: 14px;
                line-height: 1.7;
                text-align: center;
                margin-bottom: 25px;
                white-space: pre-wrap;
            }
            
            .scenario-success-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                padding: 20px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 12px;
                margin-bottom: 25px;
            }
            
            .scenario-stat {
                text-align: center;
            }
            
            .scenario-stat-value {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 5px;
            }
            
            .scenario-stat-value.green { color: #00ff88; }
            .scenario-stat-value.blue { color: #667eea; }
            .scenario-stat-value.yellow { color: #ffc107; }
            .scenario-stat-value.red { color: #ff4757; }
            
            .scenario-stat-label {
                font-size: 11px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .scenario-success-modal-footer {
                display: flex;
                justify-content: center;
                gap: 15px;
                padding: 0 25px 25px;
            }

            /* ═══════════════════════════════════════════════════════════════
               ERROR TOAST
               ═══════════════════════════════════════════════════════════════ */
            
            .scenario-error-toast {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                padding: 15px 25px;
                background: rgba(255, 71, 87, 0.95);
                border-radius: 10px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                z-index: 2001;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 5px 25px rgba(255, 71, 87, 0.4);
            }
            
            .scenario-error-toast.visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
                visibility: visible;
            }
            
            .scenario-error-toast .error-icon {
                margin-right: 10px;
            }
            
            /* ═══════════════════════════════════════════════════════════════
               TRY AGAIN BUTTON
               ═══════════════════════════════════════════════════════════════ */
            
            .scenario-try-again {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                padding: 12px 30px;
                background: linear-gradient(135deg, #ff4757 0%, #c0392b 100%);
                border: none;
                border-radius: 25px;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .scenario-try-again.visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
                visibility: visible;
            }
            
            .scenario-try-again:hover {
                transform: translateX(-50%) translateY(-3px);
                box-shadow: 0 8px 25px rgba(255, 71, 87, 0.4);
            }
            
            /* ═══════════════════════════════════════════════════════════════
               CELEBRATION PARTICLES
               ═══════════════════════════════════════════════════════════════ */
            
            .scenario-particles {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 2001;
                overflow: hidden;
            }
            
            .scenario-particle {
                position: absolute;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                animation: particle-fall linear forwards;
            }
            
            @keyframes particle-fall {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
            
            .scenario-confetti {
                position: absolute;
                width: 12px;
                height: 12px;
                animation: confetti-fall linear forwards;
            }
            
            @keyframes confetti-fall {
                0% {
                    transform: translateY(-10px) rotateX(0deg) rotateY(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotateX(720deg) rotateY(540deg);
                    opacity: 0;
                }
            }
            
            /* ═══════════════════════════════════════════════════════════════
               RESPONSIVE
               ═══════════════════════════════════════════════════════════════ */
            
            @media (max-width: 768px) {
                .scenario-inspector {
                    width: calc(100vw - 40px);
                    max-height: 50vh;
                }
                
                .scenario-success-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .scenario-success-modal-footer {
                    flex-direction: column;
                }
                
                .scenario-success-modal-footer .scenario-btn {
                    width: 100%;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }


    // ═══════════════════════════════════════════════════════════════
    // COMPONENT CREATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create the overlay backdrop
     */
    _createOverlay() {
        if (document.getElementById('scenario-ui-overlay')) {
            this.elements.overlay = document.getElementById('scenario-ui-overlay');
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'scenario-ui-overlay';
        overlay.className = 'scenario-ui-overlay';
        overlay.addEventListener('click', () => this._hideAllModals());
        
        document.body.appendChild(overlay);
        this.elements.overlay = overlay;
    }

    /**
     * Create the inspector panel
     */
    _createInspectorPanel() {
        if (document.getElementById('scenario-inspector')) {
            this.elements.inspector = document.getElementById('scenario-inspector');
            return;
        }
        
        const panel = document.createElement('div');
        panel.id = 'scenario-inspector';
        panel.className = 'scenario-inspector scenario-ui-glass';
        
        panel.innerHTML = `
            <div class="scenario-inspector-header">
                <div class="scenario-inspector-avatar">🤖</div>
                <div class="scenario-inspector-title">
                    <h3>AI Assistant</h3>
                    <span>● Online</span>
                </div>
                <button class="scenario-inspector-close" title="Close">×</button>
            </div>
            
            <div class="scenario-inspector-body">
                <div class="scenario-inspector-section">
                    <div class="scenario-inspector-label">
                        <span>📖</span> Story
                    </div>
                    <div class="scenario-inspector-text" id="inspector-story"></div>
                </div>
                
                <div class="scenario-inspector-section">
                    <div class="scenario-inspector-label">
                        <span>🔴</span> Problem
                    </div>
                    <div class="scenario-inspector-text scenario-inspector-problem" id="inspector-problem"></div>
                </div>
                
                <div class="scenario-inspector-section">
                    <div class="scenario-inspector-label">
                        <span>🎯</span> Your Goal
                    </div>
                    <div class="scenario-inspector-text scenario-inspector-goal" id="inspector-goal"></div>
                </div>
            </div>
            
            <div class="scenario-inspector-actions">
                <button class="scenario-btn scenario-btn-primary" id="inspector-start-btn">
                    🔍 Inspect Code
                </button>
                <button class="scenario-btn scenario-btn-secondary" id="inspector-dismiss-btn">
                    Got it
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.elements.inspector = panel;
        
        // Event listeners
        panel.querySelector('.scenario-inspector-close').addEventListener('click', () => {
            this.hideInspector();
        });
        
        panel.querySelector('#inspector-dismiss-btn').addEventListener('click', () => {
            this.hideInspector();
        });
        
        panel.querySelector('#inspector-start-btn').addEventListener('click', () => {
            this.hideInspector();
            if (this.onInspectorDismiss) this.onInspectorDismiss('inspect');
        });
    }

    /**
     * Create the hint button
     */
    _createHintButton() {
        if (document.getElementById('scenario-hint-button')) {
            this.elements.hintButton = document.getElementById('scenario-hint-button');
            return;
        }
        
        const button = document.createElement('button');
        button.id = 'scenario-hint-button';
        button.className = 'scenario-hint-button';
        
        button.innerHTML = `
            <span class="hint-icon">💡</span>
            <span class="hint-label">Hint</span>
            <span class="hint-count">(0/0)</span>
        `;
        
        button.addEventListener('click', () => {
            if (this.onHintRequest) {
                this.onHintRequest();
            }
            this._showHintModal();
        });
        
        document.body.appendChild(button);
        this.elements.hintButton = button;
    }

    /**
     * Create the hint modal
     */
    _createHintModal() {
        if (document.getElementById('scenario-hint-modal')) {
            this.elements.hintModal = document.getElementById('scenario-hint-modal');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'scenario-hint-modal';
        modal.className = 'scenario-hint-modal scenario-ui-glass';
        
        modal.innerHTML = `
            <div class="scenario-hint-modal-header">
                <h3><span>💡</span> Hint <span id="hint-number">#1</span></h3>
                <div class="scenario-hint-progress" id="hint-progress"></div>
            </div>
            
            <div class="scenario-hint-modal-body">
                <div class="scenario-hint-text" id="hint-text"></div>
            </div>
            
            <div class="scenario-hint-modal-footer">
                <button class="scenario-btn scenario-btn-secondary" id="hint-close-btn">
                    Close
                </button>
                <button class="scenario-btn scenario-btn-hint" id="hint-next-btn">
                    Show Next Hint
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.elements.hintModal = modal;
        
        // Event listeners
        modal.querySelector('#hint-close-btn').addEventListener('click', () => {
            this._hideHintModal();
        });
        
        modal.querySelector('#hint-next-btn').addEventListener('click', () => {
            this.nextHint();
        });
    }


    /**
     * Create the success modal
     */
    _createSuccessModal() {
        if (document.getElementById('scenario-success-modal')) {
            this.elements.successModal = document.getElementById('scenario-success-modal');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'scenario-success-modal';
        modal.className = 'scenario-success-modal scenario-ui-glass';
        
        modal.innerHTML = `
            <div class="scenario-success-modal-header">
                <div class="scenario-success-icon">🎉</div>
                <h2>Scenario Complete!</h2>
            </div>
            
            <div class="scenario-success-modal-body">
                <div class="scenario-success-message" id="success-message"></div>
                
                <div class="scenario-success-stats">
                    <div class="scenario-stat">
                        <div class="scenario-stat-value green" id="stat-fps">60</div>
                        <div class="scenario-stat-label">Final FPS</div>
                    </div>
                    <div class="scenario-stat">
                        <div class="scenario-stat-value blue" id="stat-time">0:00</div>
                        <div class="scenario-stat-label">Time</div>
                    </div>
                    <div class="scenario-stat">
                        <div class="scenario-stat-value yellow" id="stat-attempts">1</div>
                        <div class="scenario-stat-label">Attempts</div>
                    </div>
                    <div class="scenario-stat">
                        <div class="scenario-stat-value" id="stat-score">100</div>
                        <div class="scenario-stat-label">Score</div>
                    </div>
                </div>
            </div>
            
            <div class="scenario-success-modal-footer">
                <button class="scenario-btn scenario-btn-secondary" id="success-dashboard-btn">
                    📊 Dashboard
                </button>
                <button class="scenario-btn scenario-btn-success" id="success-next-btn">
                    Next Scenario →
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.elements.successModal = modal;
        
        // Event listeners
        modal.querySelector('#success-dashboard-btn').addEventListener('click', () => {
            this._hideSuccessModal();
            if (this.onBackToDashboard) this.onBackToDashboard();
        });
        
        modal.querySelector('#success-next-btn').addEventListener('click', () => {
            this._hideSuccessModal();
            if (this.onNextScenario) this.onNextScenario();
        });
    }

    /**
     * Create the error toast
     */
    _createErrorToast() {
        if (document.getElementById('scenario-error-toast')) {
            this.elements.errorToast = document.getElementById('scenario-error-toast');
            return;
        }
        
        const toast = document.createElement('div');
        toast.id = 'scenario-error-toast';
        toast.className = 'scenario-error-toast';
        
        toast.innerHTML = `
            <span class="error-icon">⚠️</span>
            <span class="error-message" id="error-message"></span>
        `;
        
        document.body.appendChild(toast);
        this.elements.errorToast = toast;
    }

    /**
     * Create try again button
     */
    _createTryAgainButton() {
        if (document.getElementById('scenario-try-again')) {
            this.elements.tryAgainButton = document.getElementById('scenario-try-again');
            return;
        }
        
        const button = document.createElement('button');
        button.id = 'scenario-try-again';
        button.className = 'scenario-try-again';
        
        button.innerHTML = `
            <span>🔄</span>
            <span>Try Again</span>
        `;
        
        button.addEventListener('click', () => {
            this.hideTryAgain();
            if (this.onTryAgain) this.onTryAgain();
        });
        
        document.body.appendChild(button);
        this.elements.tryAgainButton = button;
    }

    /**
     * Create particle container for celebrations
     */
    _createParticleContainer() {
        if (document.getElementById('scenario-particles')) {
            this.elements.particleContainer = document.getElementById('scenario-particles');
            return;
        }
        
        const container = document.createElement('div');
        container.id = 'scenario-particles';
        container.className = 'scenario-particles';
        
        document.body.appendChild(container);
        this.elements.particleContainer = container;
    }


    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API - INSPECTOR
    // ═══════════════════════════════════════════════════════════════

    /**
     * Show the inspector panel with scenario configuration
     * @param {Object} config - Scenario configuration
     * @param {string} config.intro - Story introduction text
     * @param {string} config.problem - Problem description
     * @param {string} config.goal - What the student should do
     */
    showInspector(config) {
        if (!this.elements.inspector) return;
        
        // Populate content
        const storyEl = this.elements.inspector.querySelector('#inspector-story');
        const problemEl = this.elements.inspector.querySelector('#inspector-problem');
        const goalEl = this.elements.inspector.querySelector('#inspector-goal');
        
        if (storyEl) storyEl.textContent = config.intro || '';
        if (problemEl) problemEl.textContent = config.problem || '';
        if (goalEl) goalEl.textContent = config.goal || '';
        
        // Show panel
        this.elements.inspector.classList.add('visible');
        this.isVisible.inspector = true;
    }

    /**
     * Hide the inspector panel
     */
    hideInspector() {
        if (!this.elements.inspector) return;
        
        this.elements.inspector.classList.remove('visible');
        this.isVisible.inspector = false;
        
        if (this.onInspectorDismiss) this.onInspectorDismiss('dismiss');
    }

    /**
     * Update inspector content dynamically
     */
    updateInspector(field, content) {
        if (!this.elements.inspector) return;
        
        const el = this.elements.inspector.querySelector(`#inspector-${field}`);
        if (el) el.textContent = content;
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API - HINTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Set up hints for the scenario
     * @param {Array} hints - Array of hint objects { level, text }
     */
    setHints(hints) {
        this.hints = hints || [];
        this.totalHints = this.hints.length;
        this.currentHint = 0;
        
        this._updateHintButton();
    }

    /**
     * Show hint button
     */
    showHintButton() {
        if (!this.elements.hintButton) return;
        
        this._updateHintButton();
        this.elements.hintButton.classList.add('visible');
    }

    /**
     * Hide hint button
     */
    hideHintButton() {
        if (!this.elements.hintButton) return;
        this.elements.hintButton.classList.remove('visible');
    }

    /**
     * Pulse the hint button to draw attention
     */
    pulseHintButton() {
        if (!this.elements.hintButton) return;
        
        this.elements.hintButton.classList.add('pulse');
        setTimeout(() => {
            this.elements.hintButton?.classList.remove('pulse');
        }, 3000);
    }

    /**
     * Show a specific hint by number (1-indexed)
     * @param {number} hintNumber - Hint number (1-indexed)
     * @param {string} hintText - Hint text content
     */
    showHint(hintNumber, hintText) {
        this.currentHint = hintNumber;
        
        // Update hint modal content
        if (this.elements.hintModal) {
            this.elements.hintModal.querySelector('#hint-number').textContent = `#${hintNumber}`;
            this.elements.hintModal.querySelector('#hint-text').textContent = hintText;
            
            // Update progress dots
            this._updateHintProgress();
            
            // Update next button
            const nextBtn = this.elements.hintModal.querySelector('#hint-next-btn');
            if (nextBtn) {
                nextBtn.disabled = hintNumber >= this.totalHints;
                nextBtn.textContent = hintNumber >= this.totalHints ? 'No More Hints' : 'Show Next Hint';
            }
        }
        
        this._updateHintButton();
        this._showHintModal();
    }

    /**
     * Show the next available hint
     */
    nextHint() {
        if (this.currentHint >= this.totalHints) return;
        
        const nextHint = this.hints[this.currentHint];
        if (nextHint) {
            this.showHint(this.currentHint + 1, nextHint.text);
        }
        
        if (this.onHintRequest) this.onHintRequest();
    }

    /**
     * Update hint button text
     */
    _updateHintButton() {
        if (!this.elements.hintButton) return;
        
        const countEl = this.elements.hintButton.querySelector('.hint-count');
        if (countEl) {
            countEl.textContent = `(${this.currentHint}/${this.totalHints})`;
        }
    }

    /**
     * Update hint progress dots
     */
    _updateHintProgress() {
        if (!this.elements.hintModal) return;
        
        const progressEl = this.elements.hintModal.querySelector('#hint-progress');
        if (!progressEl) return;
        
        progressEl.innerHTML = '';
        for (let i = 0; i < this.totalHints; i++) {
            const dot = document.createElement('div');
            dot.className = `scenario-hint-dot ${i < this.currentHint ? 'active' : ''}`;
            progressEl.appendChild(dot);
        }
    }

    /**
     * Show hint modal with overlay
     */
    _showHintModal() {
        if (!this.elements.hintModal) return;
        
        this.elements.overlay?.classList.add('visible');
        this.elements.hintModal.classList.add('visible');
        this.isVisible.hintModal = true;
    }

    /**
     * Hide hint modal
     */
    _hideHintModal() {
        if (!this.elements.hintModal) return;
        
        this.elements.hintModal.classList.remove('visible');
        this.elements.overlay?.classList.remove('visible');
        this.isVisible.hintModal = false;
    }


    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API - SUCCESS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Show the success modal with stats
     * @param {Object} stats - Completion statistics
     * @param {string} stats.message - Success message
     * @param {number} stats.fps - Final FPS
     * @param {number} stats.time - Time in seconds
     * @param {number} stats.attempts - Number of attempts
     * @param {number} stats.hintsUsed - Number of hints used
     * @param {number} stats.score - Final score (0-100)
     */
    showSuccess(stats) {
        if (!this.elements.successModal) return;
        
        // Update message
        const messageEl = this.elements.successModal.querySelector('#success-message');
        if (messageEl) messageEl.textContent = stats.message || 'Great work!';
        
        // Update stats
        const fpsEl = this.elements.successModal.querySelector('#stat-fps');
        const timeEl = this.elements.successModal.querySelector('#stat-time');
        const attemptsEl = this.elements.successModal.querySelector('#stat-attempts');
        const scoreEl = this.elements.successModal.querySelector('#stat-score');
        
        if (fpsEl) fpsEl.textContent = stats.fps || 60;
        if (timeEl) timeEl.textContent = this._formatTime(stats.time || 0);
        if (attemptsEl) attemptsEl.textContent = stats.attempts || 1;
        if (scoreEl) {
            scoreEl.textContent = stats.score || 100;
            scoreEl.className = `scenario-stat-value ${this._getScoreColor(stats.score || 100)}`;
        }
        
        // Hide other elements
        this.hideHintButton();
        
        // Show modal
        this.elements.overlay?.classList.add('visible');
        this.elements.successModal.classList.add('visible');
        this.isVisible.successModal = true;
        
        // Trigger celebration
        this._triggerCelebration();
    }

    /**
     * Hide the success modal
     */
    _hideSuccessModal() {
        if (!this.elements.successModal) return;
        
        this.elements.successModal.classList.remove('visible');
        this.elements.overlay?.classList.remove('visible');
        this.isVisible.successModal = false;
    }

    /**
     * Format time in minutes:seconds
     */
    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get color class based on score
     */
    _getScoreColor(score) {
        if (score >= 90) return 'green';
        if (score >= 70) return 'blue';
        if (score >= 50) return 'yellow';
        return 'red';
    }

    /**
     * Trigger celebration particles
     */
    _triggerCelebration() {
        if (!this.elements.particleContainer) return;
        
        // Clear existing particles
        this.elements.particleContainer.innerHTML = '';
        
        const colors = ['#00ff88', '#667eea', '#ffc107', '#ff4757', '#e056fd', '#00d4aa'];
        const shapes = ['circle', 'square'];
        
        for (let i = 0; i < this.options.particleCount; i++) {
            const particle = document.createElement('div');
            const isConfetti = Math.random() > 0.5;
            
            particle.className = isConfetti ? 'scenario-confetti' : 'scenario-particle';
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = 2 + Math.random() * 2;
            const size = isConfetti ? (8 + Math.random() * 8) : (6 + Math.random() * 6);
            
            particle.style.cssText = `
                left: ${left}%;
                top: -20px;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
                ${isConfetti ? '' : 'border-radius: 50%;'}
            `;
            
            this.elements.particleContainer.appendChild(particle);
        }
        
        // Clean up particles after animation
        setTimeout(() => {
            if (this.elements.particleContainer) {
                this.elements.particleContainer.innerHTML = '';
            }
        }, 5000);
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API - ERROR & FEEDBACK
    // ═══════════════════════════════════════════════════════════════

    /**
     * Show an error message
     * @param {string} message - Error message to display
     * @param {number} duration - How long to show (ms), default 4000
     */
    showError(message, duration = 4000) {
        if (!this.elements.errorToast) return;
        
        const messageEl = this.elements.errorToast.querySelector('#error-message');
        if (messageEl) messageEl.textContent = message;
        
        this.elements.errorToast.classList.add('visible');
        
        // Auto-hide after duration
        setTimeout(() => {
            this.hideError();
        }, duration);
    }

    /**
     * Hide the error toast
     */
    hideError() {
        if (!this.elements.errorToast) return;
        this.elements.errorToast.classList.remove('visible');
    }

    /**
     * Show the try again button
     */
    showTryAgain() {
        if (!this.elements.tryAgainButton) {
            this._createTryAgainButton();
        }
        this.elements.tryAgainButton?.classList.add('visible');
    }

    /**
     * Hide the try again button
     */
    hideTryAgain() {
        if (!this.elements.tryAgainButton) return;
        this.elements.tryAgainButton.classList.remove('visible');
    }


    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Hide all modals
     */
    _hideAllModals() {
        this._hideHintModal();
        this._hideSuccessModal();
    }

    /**
     * Reset all UI to initial state
     */
    reset() {
        this.currentHint = 0;
        this._updateHintButton();
        this._hideAllModals();
        this.hideError();
        this.hideTryAgain();
        this.hideHintButton();
        
        // Clear inspector content
        if (this.elements.inspector) {
            this.elements.inspector.querySelector('#inspector-story').textContent = '';
            this.elements.inspector.querySelector('#inspector-problem').textContent = '';
            this.elements.inspector.querySelector('#inspector-goal').textContent = '';
        }
    }

    /**
     * Set callback handlers
     */
    setCallbacks(callbacks) {
        if (callbacks.onHintRequest) this.onHintRequest = callbacks.onHintRequest;
        if (callbacks.onTryAgain) this.onTryAgain = callbacks.onTryAgain;
        if (callbacks.onNextScenario) this.onNextScenario = callbacks.onNextScenario;
        if (callbacks.onBackToDashboard) this.onBackToDashboard = callbacks.onBackToDashboard;
        if (callbacks.onInspectorDismiss) this.onInspectorDismiss = callbacks.onInspectorDismiss;
    }

    /**
     * Check if any modal is currently visible
     */
    isModalVisible() {
        return this.isVisible.hintModal || this.isVisible.successModal;
    }

    /**
     * Get current UI state
     */
    getState() {
        return {
            currentHint: this.currentHint,
            totalHints: this.totalHints,
            isVisible: { ...this.isVisible }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════

    /**
     * Remove all UI elements and clean up
     */
    dispose() {
        console.log('[ScenarioUI] Disposing...');
        
        // Remove all created elements
        Object.values(this.elements).forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        // Clear references
        this.elements = {};
        this.hints = [];
        
        // Remove styles
        const styles = document.getElementById('scenario-ui-styles');
        if (styles) styles.remove();
    }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Create and initialize ScenarioUI with default options
 */
export function createScenarioUI(options = {}) {
    const ui = new ScenarioUI(options);
    return ui.init();
}

export default ScenarioUI;

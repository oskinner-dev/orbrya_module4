/**
 * PromptInterface.js - Chatbot-style Natural Language Interface
 * 
 * Provides a conversational UI where students "chat" with the AI system,
 * learning prompt engineering through dialogue and immediate visual feedback.
 * 
 * Design: Mimics ChatGPT/Claude conversation flow
 * - Message bubbles (user on right, AI on left)
 * - Typing indicators
 * - Conversational responses with personality
 * - Clarifying questions for vague prompts
 */

import { PromptParser } from '../engine/PromptParser.js';

export class PromptInterface {
    constructor(panelManager, sceneController) {
        this.panelManager = panelManager;
        this.sceneController = sceneController;
        this.parser = new PromptParser();
        
        this.panel = null;
        this.messagesContainer = null;
        this.inputField = null;
        this.messages = [];
        
        // AI personality for responses
        this.aiName = 'Forest Builder';
        this.aiAvatar = '🌲';
        
        // Callbacks
        this.onSceneUpdate = null;
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.addWelcomeMessage();
    }
    
    createPanel() {
        const content = document.createElement('div');
        content.className = 'prompt-chat-container';
        content.innerHTML = `
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-area">
                <div class="typing-indicator" id="typing-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
                <div class="input-row">
                    <textarea 
                        id="prompt-input" 
                        placeholder="Describe what you want to create..."
                        rows="1"
                    ></textarea>
                    <button id="send-btn" class="send-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
                <div class="quick-prompts">
                    <span class="quick-label">Try:</span>
                    <button class="quick-btn" data-prompt="Create a small forest">🌳 Small forest</button>
                    <button class="quick-btn" data-prompt="Make 50 pine trees in a grid">📐 Grid of pines</button>
                    <button class="quick-btn" data-prompt="Spawn a dense cluster of trees">🌲 Dense cluster</button>
                </div>
            </div>
        `;
        
        this.panel = this.panelManager.createPanel({
            id: 'prompt-interface',
            title: '💬 AI Forest Builder',
            icon: '💬',
            x: 20,
            y: 100,
            width: 380,
            height: 500,
            content: content,
            resizable: true,
            closable: true
        });
        
        this.messagesContainer = content.querySelector('#chat-messages');
        this.inputField = content.querySelector('#prompt-input');
        this.typingIndicator = content.querySelector('#typing-indicator');
        this.sendButton = content.querySelector('#send-btn');
        
        this.attachEventListeners(content);
        this.injectStyles();
    }
    
    attachEventListeners(container) {
        // Send on button click
        this.sendButton.addEventListener('click', () => this.handleSend());
        
        // Send on Enter (Shift+Enter for newline)
        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
        
        // Auto-resize textarea
        this.inputField.addEventListener('input', () => {
            this.inputField.style.height = 'auto';
            this.inputField.style.height = Math.min(this.inputField.scrollHeight, 100) + 'px';
        });
        
        // Quick prompt buttons
        container.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                this.inputField.value = prompt;
                this.handleSend();
            });
        });
    }
    
    async handleSend() {
        const userText = this.inputField.value.trim();
        if (!userText) return;
        
        // Clear input
        this.inputField.value = '';
        this.inputField.style.height = 'auto';
        
        // Add user message
        this.addMessage('user', userText);
        
        // Show typing indicator
        this.showTyping(true);
        
        // Simulate AI "thinking" time (feels more natural)
        await this.delay(400 + Math.random() * 400);
        
        // Parse the prompt
        const result = this.parser.parsePrompt(userText);
        
        // Generate conversational response
        const response = this.generateResponse(result);
        
        // Hide typing, show response
        this.showTyping(false);
        this.addMessage('ai', response.text, response.params);
        
        // Execute the scene update if we have valid params
        if (result.params && this.sceneController) {
            await this.delay(300);
            this.executeSceneUpdate(result.params);
        }
        
        // Fire callback
        if (this.onSceneUpdate) {
            this.onSceneUpdate(result);
        }
    }
    
    generateResponse(parseResult) {
        const { params, specificity, feedback } = parseResult;
        let text = '';
        
        // High specificity = confident response
        if (specificity >= 70) {
            const intros = [
                "Perfect, I know exactly what you want!",
                "Great prompt! Here's what I'm creating:",
                "Got it! Building your scene now:",
                "Crystal clear! Here we go:"
            ];
            text = this.randomChoice(intros);
        }
        // Medium specificity = confirm understanding
        else if (specificity >= 40) {
            const intros = [
                "Okay, here's what I understood:",
                "Let me make sure I got this right:",
                "Building based on your description:",
                "Here's my interpretation:"
            ];
            text = this.randomChoice(intros);
        }
        // Low specificity = note assumptions
        else {
            const intros = [
                "I'll fill in some details for you:",
                "Your prompt was a bit vague, so I'm making some choices:",
                "Here's what I'm going with (you can be more specific next time):",
                "I'll use some defaults since the prompt was brief:"
            ];
            text = this.randomChoice(intros);
        }
        
        // Add the interpretation
        text += `\n\n**Creating:** ${params.treeCount} ${params.treeType !== 'generic' ? params.treeType + ' ' : ''}trees`;
        text += `\n**Arrangement:** ${this.formatArrangement(params.arrangement)}`;
        
        if (params.density !== 'normal') {
            text += `\n**Density:** ${params.density}`;
        }
        if (params.sizeVariation) {
            text += `\n**Sizes:** Varied`;
        }
        
        // Add suggestions if prompt could be improved
        if (feedback.suggestions.length > 0 && specificity < 70) {
            text += '\n\n💡 *Tip: ' + feedback.suggestions[0] + '*';
        }
        
        // Performance warning
        if (params.treeCount > 200) {
            text += '\n\n⚠️ *That\'s a lot of trees! Performance might dip on slower devices.*';
        }
        
        return { text, params };
    }
    
    formatArrangement(arrangement) {
        const formats = {
            random: 'Scattered naturally',
            grid: 'Organized grid pattern',
            cluster: 'Grouped together',
            line: 'In a line/row',
            circle: 'Circular arrangement'
        };
        return formats[arrangement] || arrangement;
    }
    
    addMessage(type, text, params = null) {
        const message = { type, text, params, timestamp: Date.now() };
        this.messages.push(message);
        
        const msgEl = document.createElement('div');
        msgEl.className = `chat-message ${type}-message`;
        
        if (type === 'ai') {
            msgEl.innerHTML = `
                <div class="message-avatar">${this.aiAvatar}</div>
                <div class="message-content">
                    <div class="message-name">${this.aiName}</div>
                    <div class="message-text">${this.formatMessageText(text)}</div>
                    ${params ? this.createParamsPreview(params) : ''}
                </div>
            `;
        } else {
            msgEl.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(text)}</div>
                </div>
                <div class="message-avatar">👤</div>
            `;
        }
        
        this.messagesContainer.appendChild(msgEl);
        this.scrollToBottom();
    }
    
    createParamsPreview(params) {
        return `
            <div class="params-preview">
                <div class="param-chip">🌲 ${params.treeCount}</div>
                <div class="param-chip">${this.getArrangementIcon(params.arrangement)} ${params.arrangement}</div>
                ${params.treeType !== 'generic' ? `<div class="param-chip">🏷️ ${params.treeType}</div>` : ''}
            </div>
        `;
    }
    
    getArrangementIcon(arrangement) {
        const icons = {
            random: '🎲',
            grid: '📐',
            cluster: '🫧',
            line: '➡️',
            circle: '⭕'
        };
        return icons[arrangement] || '📍';
    }
    
    formatMessageText(text) {
        // Simple markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    addWelcomeMessage() {
        const welcomeText = `Hey! I'm your AI Forest Builder. 🌲

Tell me what kind of scene you want to create, and I'll build it for you. Try being specific about:

• **How many** trees (e.g., "50 trees")
• **What type** (pine, oak, birch, palm)
• **How arranged** (grid, clustered, scattered)

The more detail you give, the better I understand!`;
        
        this.addMessage('ai', welcomeText);
    }
    
    async executeSceneUpdate(params) {
        if (!this.sceneController) return;
        
        // Clear existing trees
        this.sceneController.clearTrees?.();
        
        // Spawn new trees based on params
        // Note: SceneController.spawnTrees() currently only takes count
        // Future: extend to support arrangement, type, etc.
        this.sceneController.spawnTrees(params.treeCount);
        
        // Add confirmation message
        await this.delay(500);
        const confirmations = [
            `Done! ${params.treeCount} trees are now in your scene.`,
            `There you go! Check out your ${params.treeCount} trees.`,
            `All set! Your forest is ready.`,
            `Created! Take a look at the viewport.`
        ];
        this.addMessage('ai', this.randomChoice(confirmations) + ' 🎉');
    }
    
    showTyping(show) {
        this.typingIndicator.classList.toggle('visible', show);
        if (show) this.scrollToBottom();
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    // Public API
    getMessages() {
        return [...this.messages];
    }
    
    clearChat() {
        this.messages = [];
        this.messagesContainer.innerHTML = '';
        this.addWelcomeMessage();
    }
    
    setSceneController(controller) {
        this.sceneController = controller;
    }
    
    injectStyles() {
        if (document.getElementById('prompt-interface-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'prompt-interface-styles';
        styles.textContent = `
            .prompt-chat-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: #0a0f1a;
            }
            
            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .chat-message {
                display: flex;
                gap: 10px;
                max-width: 90%;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .user-message {
                align-self: flex-end;
                flex-direction: row-reverse;
            }
            
            .ai-message {
                align-self: flex-start;
            }
            
            .message-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #1a2744;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
            }
            
            .user-message .message-avatar {
                background: #667eea;
            }
            
            .message-content {
                background: #1a2744;
                border-radius: 16px;
                padding: 12px 16px;
                max-width: 100%;
            }
            
            .user-message .message-content {
                background: #667eea;
                border-radius: 16px 16px 4px 16px;
            }
            
            .ai-message .message-content {
                border-radius: 16px 16px 16px 4px;
            }
            
            .message-name {
                font-size: 11px;
                color: #888;
                margin-bottom: 4px;
                font-weight: 600;
            }
            
            .message-text {
                color: #e4e4e7;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .message-text strong {
                color: #00ff88;
            }
            
            .message-text em {
                color: #ffc107;
                font-style: italic;
            }
            
            .params-preview {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            
            .param-chip {
                background: rgba(102, 126, 234, 0.2);
                color: #a5b4fc;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .chat-input-area {
                padding: 12px 16px;
                background: #0f1629;
                border-top: 1px solid #1a2744;
            }
            
            .typing-indicator {
                display: none;
                padding: 8px 12px;
                margin-bottom: 8px;
            }
            
            .typing-indicator.visible {
                display: flex;
                gap: 4px;
            }
            
            .typing-indicator .dot {
                width: 8px;
                height: 8px;
                background: #667eea;
                border-radius: 50%;
                animation: bounce 1.4s infinite ease-in-out;
            }
            
            .typing-indicator .dot:nth-child(1) { animation-delay: -0.32s; }
            .typing-indicator .dot:nth-child(2) { animation-delay: -0.16s; }
            
            @keyframes bounce {
                0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
            
            .input-row {
                display: flex;
                gap: 8px;
                align-items: flex-end;
            }
            
            #prompt-input {
                flex: 1;
                background: #1a2744;
                border: 1px solid #2d3748;
                border-radius: 20px;
                padding: 10px 16px;
                color: #e4e4e7;
                font-size: 14px;
                font-family: inherit;
                resize: none;
                min-height: 20px;
                max-height: 100px;
                line-height: 1.4;
            }
            
            #prompt-input:focus {
                outline: none;
                border-color: #667eea;
            }
            
            #prompt-input::placeholder {
                color: #666;
            }
            
            .send-button {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s, box-shadow 0.2s;
                flex-shrink: 0;
            }
            
            .send-button:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            .send-button:active {
                transform: scale(0.95);
            }
            
            .quick-prompts {
                display: flex;
                gap: 6px;
                margin-top: 10px;
                flex-wrap: wrap;
                align-items: center;
            }
            
            .quick-label {
                font-size: 11px;
                color: #666;
            }
            
            .quick-btn {
                background: #1a2744;
                border: 1px solid #2d3748;
                border-radius: 14px;
                padding: 4px 10px;
                font-size: 11px;
                color: #a5b4fc;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .quick-btn:hover {
                background: #2d3748;
                border-color: #667eea;
            }
            
            /* Scrollbar styling */
            .chat-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            .chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .chat-messages::-webkit-scrollbar-thumb {
                background: #2d3748;
                border-radius: 3px;
            }
            
            .chat-messages::-webkit-scrollbar-thumb:hover {
                background: #3d4f68;
            }
        `;
        document.head.appendChild(styles);
    }
}

export default PromptInterface;

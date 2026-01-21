/**
 * PromptQuest.js - A Chatbot Game for Learning Prompt Engineering
 * 
 * Students chat with "Fernie" the Forest Spirit to build scenes.
 * The twist: Fernie interprets prompts literally, teaching students
 * that specificity matters when talking to AI.
 * 
 * NO CODE. NO PARAMETERS. Just conversation and consequences.
 */

import { PromptParser } from '../engine/PromptParser.js';

export class PromptQuest {
    constructor(panelManager, sceneController) {
        this.panelManager = panelManager;
        this.sceneController = sceneController;
        this.parser = new PromptParser();
        
        // Game state
        this.currentChallenge = null;
        this.challengeIndex = 0;
        this.promptCount = 0;
        this.totalScore = 0;
        this.gameStarted = false;
        
        // Chat state
        this.messages = [];
        this.isTyping = false;
        this.awaitingResponse = false;
        
        // UI elements
        this.panel = null;
        this.chatContainer = null;
        this.inputField = null;
        
        // Fernie's personality
        this.spirit = {
            name: 'Fernie',
            emoji: '🌲',
            mood: 'curious' // curious, confused, excited, proud
        };
        
        // Challenge definitions
        this.challenges = [
            {
                id: 'intro',
                type: 'freeplay',
                description: null,
                target: null
            },
            {
                id: 'challenge_1',
                type: 'match',
                description: 'Create a small grove of exactly 10 trees',
                target: { treeCount: 10, tolerance: 2 },
                hints: [
                    "How many trees make a 'grove' to you?",
                    "Try telling me exactly how many trees you want!"
                ]
            },
            {
                id: 'challenge_2', 
                type: 'match',
                description: 'Build a dense forest with around 50 trees',
                target: { treeCount: 50, tolerance: 10, density: 'dense' },
                hints: [
                    "What makes a forest feel 'dense'?",
                    "Think about both the number AND how packed together they are"
                ]
            },
            {
                id: 'challenge_3',
                type: 'match', 
                description: 'Plant a neat orchard: 25 trees in organized rows',
                target: { treeCount: 25, tolerance: 5, arrangement: 'grid' },
                hints: [
                    "Orchards aren't random - they have a pattern!",
                    "Think about words like 'rows', 'grid', 'organized'"
                ]
            }
        ];
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.showIntro();
    }
    
    createPanel() {
        const content = document.createElement('div');
        content.className = 'prompt-quest-container';
        content.innerHTML = `
            <div class="pq-header">
                <div class="pq-spirit">${this.spirit.emoji}</div>
                <div class="pq-title">
                    <span class="pq-name">${this.spirit.name}</span>
                    <span class="pq-status">Forest Spirit</span>
                </div>
                <div class="pq-score" id="pq-score"></div>
            </div>
            <div class="pq-challenge-bar" id="pq-challenge"></div>
            <div class="pq-chat" id="pq-chat"></div>
            <div class="pq-input-area">
                <div class="pq-typing" id="pq-typing">
                    <span></span><span></span><span></span>
                </div>
                <div class="pq-input-row">
                    <input type="text" id="pq-input" placeholder="Type your message..." />
                    <button id="pq-send">➤</button>
                </div>
            </div>
        `;
        
        this.panel = this.panelManager.createPanel({
            id: 'prompt-quest',
            title: '🌲 Forest Spirit',
            icon: '🌲',
            x: 20,
            y: 80,
            width: 360,
            height: 520,
            content: content,
            resizable: true,
            closable: true
        });
        
        this.chatContainer = content.querySelector('#pq-chat');
        this.inputField = content.querySelector('#pq-input');
        this.typingIndicator = content.querySelector('#pq-typing');
        this.challengeBar = content.querySelector('#pq-challenge');
        this.scoreDisplay = content.querySelector('#pq-score');
        
        // Event listeners
        content.querySelector('#pq-send').addEventListener('click', () => this.handleSend());
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
        
        this.injectStyles();
    }
    
    // ═══════════════════════════════════════════════════════════
    // CONVERSATION FLOW
    // ═══════════════════════════════════════════════════════════
    
    async showIntro() {
        await this.delay(500);
        await this.fernieSays(
            "Oh! A visitor! ✨",
            300
        );
        await this.fernieSays(
            "I'm Fernie, the spirit of this forest. I can grow trees, shape landscapes, create whole worlds... but I need YOUR words to guide me.",
            100
        );
        await this.fernieSays(
            "Here's the thing though - I take words very literally. If you say 'some trees', well... that could mean 3 trees or 300! 🤷‍♂️",
            100
        );
        await this.fernieSays(
            "Want to try? Just tell me what kind of forest to create. Be as specific as you like!",
            100
        );
        
        this.gameStarted = true;
        this.currentChallenge = this.challenges[0]; // Freeplay intro
    }
    
    async handleSend() {
        if (this.awaitingResponse || this.isTyping) return;
        
        const text = this.inputField.value.trim();
        if (!text) return;
        
        this.inputField.value = '';
        this.promptCount++;
        
        // Show user message
        this.addMessage('user', text);
        
        // Process and respond
        this.awaitingResponse = true;
        await this.processPlayerMessage(text);
        this.awaitingResponse = false;
    }
    
    async processPlayerMessage(text) {
        const lowerText = text.toLowerCase();
        
        // Check for meta commands
        if (lowerText.includes('help') || lowerText.includes('hint')) {
            await this.giveHint();
            return;
        }
        
        if (lowerText.includes('challenge') || lowerText.includes('ready') || lowerText.includes('next')) {
            await this.startNextChallenge();
            return;
        }
        
        if (lowerText.includes('restart') || lowerText.includes('start over')) {
            await this.restartGame();
            return;
        }
        
        // It's a forest-building prompt!
        await this.interpretPrompt(text);
    }
    
    async interpretPrompt(text) {
        const result = this.parser.parsePrompt(text);
        const params = result.params;
        const specificity = result.specificity;
        
        // Show thinking
        await this.showTyping(600 + Math.random() * 400);
        
        // Fernie's reaction based on specificity
        if (specificity < 25) {
            await this.respondToVaguePrompt(text, params);
        } else if (specificity < 50) {
            await this.respondToOkayPrompt(text, params);
        } else {
            await this.respondToGreatPrompt(text, params);
        }
        
        // Build the scene
        await this.buildScene(params);
        
        // Check if challenge is complete
        if (this.currentChallenge?.type === 'match') {
            await this.checkChallengeProgress(params);
        }
    }
    
    async respondToVaguePrompt(text, params) {
        const responses = [
            `"${this.extractKeyword(text)}"... hmm, that's pretty open to interpretation! Let me just... *waves branches mysteriously*`,
            `Ooh, creative freedom! I'll just do what feels right to me... 🎲`,
            `You're giving me a lot of artistic license here! Don't blame me if it's not what you imagined...`,
            `*tilts leaves thoughtfully* ...that could mean so many things! Here's my best guess:`
        ];
        await this.fernieSays(this.randomChoice(responses));
    }
    
    async respondToOkayPrompt(text, params) {
        const responses = [
            `Getting warmer! I think I know what you want...`,
            `Okay, I can work with that! Though a few more details wouldn't hurt...`,
            `*nods thoughtfully* I have a decent picture in my mind now!`,
            `Not bad! Let's see if this matches your vision...`
        ];
        await this.fernieSays(this.randomChoice(responses));
    }
    
    async respondToGreatPrompt(text, params) {
        const responses = [
            `NOW we're talking! Crystal clear! ✨`,
            `Ooh, I love a person who knows what they want! Coming right up!`,
            `Perfect! I can see it clearly in my mind. Watch this... 🌟`,
            `*excited rustling* Yes! That's exactly the kind of detail I need!`
        ];
        await this.fernieSays(this.randomChoice(responses));
    }
    
    async buildScene(params) {
        // Clear and rebuild
        if (this.sceneController) {
            this.sceneController.clearTrees?.();
            await this.delay(200);
            this.sceneController.spawnTrees(params.treeCount);
        }
        
        // Describe what was created (without technical jargon)
        await this.delay(400);
        await this.describeResult(params);
    }
    
    async describeResult(params) {
        const count = params.treeCount;
        let description = '';
        
        if (count === 1) {
            description = `There! One single, magnificent tree. 🌳`;
        } else if (count <= 10) {
            description = `Done! A cozy little cluster of ${count} trees appeared.`;
        } else if (count <= 30) {
            description = `*whoosh* ${count} trees spring up from the earth!`;
        } else if (count <= 75) {
            description = `Wow, ${count} trees! That's starting to feel like a real forest!`;
        } else if (count <= 150) {
            description = `${count} trees! *slightly out of breath* That's... quite a forest you've got there!`;
        } else {
            description = `*panting* ${count} trees?! You're really putting me to work! 😅`;
        }
        
        await this.fernieSays(description);
    }
    
    // ═══════════════════════════════════════════════════════════
    // CHALLENGE SYSTEM
    // ═══════════════════════════════════════════════════════════
    
    async startNextChallenge() {
        this.challengeIndex++;
        
        if (this.challengeIndex >= this.challenges.length) {
            await this.showEnding();
            return;
        }
        
        this.currentChallenge = this.challenges[this.challengeIndex];
        this.promptCount = 0;
        
        await this.fernieSays(`Ooh, ready for a challenge? Let's see... 🎯`);
        await this.delay(300);
        
        this.showChallengeBar(this.currentChallenge.description);
        
        await this.fernieSays(
            `**Challenge ${this.challengeIndex}:** ${this.currentChallenge.description}`
        );
        await this.fernieSays(
            `Tell me what to create - but choose your words carefully!`
        );
    }
    
    showChallengeBar(text) {
        if (text) {
            this.challengeBar.innerHTML = `🎯 <strong>Goal:</strong> ${text}`;
            this.challengeBar.classList.add('visible');
        } else {
            this.challengeBar.classList.remove('visible');
        }
    }
    
    async checkChallengeProgress(params) {
        const target = this.currentChallenge.target;
        let success = true;
        let feedback = [];
        
        // Check tree count
        if (target.treeCount !== undefined) {
            const diff = Math.abs(params.treeCount - target.treeCount);
            if (diff > target.tolerance) {
                success = false;
                if (params.treeCount < target.treeCount) {
                    feedback.push("Hmm, that's fewer than I was hoping for...");
                } else {
                    feedback.push("Whoa, that's more than I expected!");
                }
            }
        }
        
        // Check arrangement
        if (target.arrangement && params.arrangement !== target.arrangement) {
            success = false;
            feedback.push("The arrangement isn't quite right...");
        }
        
        // Check density
        if (target.density && params.density !== target.density) {
            success = false;
            feedback.push("The spacing feels off somehow...");
        }
        
        if (success) {
            await this.celebrateSuccess();
        } else {
            await this.delay(500);
            for (const fb of feedback) {
                await this.fernieSays(fb);
            }
            await this.fernieSays("Want to try again? Or say 'hint' if you're stuck!");
        }
    }
    
    async celebrateSuccess() {
        const bonus = Math.max(0, 100 - (this.promptCount - 1) * 20);
        const score = 100 + bonus;
        this.totalScore += score;
        
        await this.delay(300);
        await this.fernieSays(`🎉 **Perfect!** That's exactly what I was imagining!`);
        
        if (this.promptCount === 1) {
            await this.fernieSays(`And on your FIRST try! You're a natural! (+${score} points)`);
        } else {
            await this.fernieSays(`It took ${this.promptCount} tries, but you nailed it! (+${score} points)`);
        }
        
        this.updateScore();
        
        await this.delay(500);
        await this.fernieSays(`Say "next" when you're ready for another challenge!`);
        this.challengeBar.classList.remove('visible');
    }
    
    async giveHint() {
        if (!this.currentChallenge?.hints) {
            await this.fernieSays("Try being more specific! Tell me exactly what you want - how many, what kind, how arranged...");
            return;
        }
        
        const hintIndex = Math.min(this.promptCount - 1, this.currentChallenge.hints.length - 1);
        const hint = this.currentChallenge.hints[hintIndex];
        
        await this.fernieSays(`💡 ${hint}`);
    }
    
    updateScore() {
        this.scoreDisplay.textContent = `⭐ ${this.totalScore}`;
        this.scoreDisplay.classList.add('visible');
    }
    
    async showEnding() {
        await this.fernieSays(`🌟 **Amazing!** You've completed all the challenges!`);
        await this.fernieSays(`Your final score: ${this.totalScore} points`);
        await this.fernieSays(
            `You've learned the most important lesson of talking to AI: **be specific**! The clearer your words, the better we understand you.`
        );
        await this.fernieSays(`Feel free to keep playing, or say "restart" to begin again!`);
    }
    
    async restartGame() {
        this.challengeIndex = 0;
        this.totalScore = 0;
        this.promptCount = 0;
        this.messages = [];
        this.chatContainer.innerHTML = '';
        this.challengeBar.classList.remove('visible');
        this.scoreDisplay.classList.remove('visible');
        
        await this.fernieSays(`Fresh start! Let's grow something beautiful together. 🌱`);
        this.currentChallenge = this.challenges[0];
        this.gameStarted = true;
    }
    
    // ═══════════════════════════════════════════════════════════
    // CHAT UI HELPERS
    // ═══════════════════════════════════════════════════════════
    
    addMessage(type, text) {
        const msg = document.createElement('div');
        msg.className = `pq-message pq-${type}`;
        
        if (type === 'spirit') {
            msg.innerHTML = `
                <div class="pq-avatar">${this.spirit.emoji}</div>
                <div class="pq-bubble">${this.formatText(text)}</div>
            `;
        } else {
            msg.innerHTML = `
                <div class="pq-bubble">${this.escapeHtml(text)}</div>
            `;
        }
        
        this.chatContainer.appendChild(msg);
        this.scrollToBottom();
        this.messages.push({ type, text, time: Date.now() });
    }
    
    async fernieSays(text, extraDelay = 0) {
        await this.showTyping(Math.min(text.length * 15, 1200) + extraDelay);
        this.addMessage('spirit', text);
    }
    
    async showTyping(duration) {
        this.isTyping = true;
        this.typingIndicator.classList.add('visible');
        this.scrollToBottom();
        await this.delay(duration);
        this.typingIndicator.classList.remove('visible');
        this.isTyping = false;
    }
    
    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
    
    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    extractKeyword(text) {
        const words = text.toLowerCase().split(/\s+/);
        const keywords = words.filter(w => w.length > 3 && !['want', 'make', 'create', 'some', 'please', 'could', 'would'].includes(w));
        return keywords[0] || 'that';
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    // ═══════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════
    
    injectStyles() {
        if (document.getElementById('prompt-quest-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'prompt-quest-styles';
        style.textContent = `
            .prompt-quest-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: linear-gradient(180deg, #0a1628 0%, #132238 100%);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            
            .pq-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 16px;
                background: rgba(0,0,0,0.3);
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .pq-spirit {
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, #2d5a27 0%, #1a3d17 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                box-shadow: 0 0 20px rgba(45, 90, 39, 0.5);
            }
            
            .pq-title {
                flex: 1;
            }
            
            .pq-name {
                display: block;
                font-weight: 600;
                font-size: 16px;
                color: #e4e4e7;
            }
            
            .pq-status {
                font-size: 12px;
                color: #4ade80;
            }
            
            .pq-score {
                background: rgba(250, 204, 21, 0.2);
                color: #facc15;
                padding: 6px 12px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 14px;
                display: none;
            }
            
            .pq-score.visible {
                display: block;
            }
            
            .pq-challenge-bar {
                display: none;
                padding: 12px 16px;
                background: linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
                border-bottom: 1px solid rgba(139, 92, 246, 0.3);
                font-size: 13px;
                color: #c4b5fd;
            }
            
            .pq-challenge-bar.visible {
                display: block;
            }
            
            .pq-chat {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .pq-message {
                display: flex;
                gap: 10px;
                max-width: 88%;
                animation: pqFadeIn 0.3s ease;
            }
            
            @keyframes pqFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .pq-spirit {
                align-self: flex-start;
            }
            
            .pq-user {
                align-self: flex-end;
                flex-direction: row-reverse;
            }
            
            .pq-avatar {
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #2d5a27 0%, #1a3d17 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }
            
            .pq-bubble {
                background: #1e3a5f;
                padding: 10px 14px;
                border-radius: 18px;
                color: #e4e4e7;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .pq-user .pq-bubble {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                border-radius: 18px 18px 4px 18px;
            }
            
            .pq-spirit .pq-bubble {
                border-radius: 18px 18px 18px 4px;
            }
            
            .pq-bubble strong {
                color: #4ade80;
            }
            
            .pq-bubble em {
                color: #fbbf24;
            }
            
            .pq-input-area {
                padding: 12px 16px 16px;
                background: rgba(0,0,0,0.2);
                border-top: 1px solid rgba(255,255,255,0.05);
            }
            
            .pq-typing {
                display: none;
                gap: 4px;
                padding: 8px 0;
                justify-content: flex-start;
                padding-left: 42px;
            }
            
            .pq-typing.visible {
                display: flex;
            }
            
            .pq-typing span {
                width: 8px;
                height: 8px;
                background: #4ade80;
                border-radius: 50%;
                animation: pqBounce 1.4s ease-in-out infinite;
            }
            
            .pq-typing span:nth-child(2) { animation-delay: 0.2s; }
            .pq-typing span:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes pqBounce {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                30% { transform: translateY(-6px); opacity: 1; }
            }
            
            .pq-input-row {
                display: flex;
                gap: 10px;
            }
            
            #pq-input {
                flex: 1;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 24px;
                padding: 12px 18px;
                color: #e4e4e7;
                font-size: 14px;
                outline: none;
                transition: all 0.2s;
            }
            
            #pq-input:focus {
                border-color: #6366f1;
                background: rgba(255,255,255,0.12);
            }
            
            #pq-input::placeholder {
                color: rgba(255,255,255,0.4);
            }
            
            #pq-send {
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                border: none;
                border-radius: 50%;
                color: #052e16;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #pq-send:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 20px rgba(74, 222, 128, 0.4);
            }
            
            #pq-send:active {
                transform: scale(0.95);
            }
            
            .pq-chat::-webkit-scrollbar {
                width: 6px;
            }
            
            .pq-chat::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .pq-chat::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }
        `;
        document.head.appendChild(style);
    }
}

export default PromptQuest;

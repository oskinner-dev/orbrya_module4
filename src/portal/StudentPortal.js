/**
 * StudentPortal.js - Student Dashboard Management
 * Orbrya EdTech Platform
 * 
 * Manages student progress, scenario states, and dashboard data.
 * 
 * @version 1.0.0
 */

import { AuthManager } from './AuthManager.js';

export class StudentPortal {
    static PROGRESS_KEY = 'orbrya_progress';
    
    // Scenario definitions
    static SCENARIOS = [
        {
            id: 'infinite-forest',
            name: 'Infinite Forest',
            icon: '🌲',
            description: 'Fix an infinite loop that crashes the forest generator',
            difficulty: 'Beginner',
            estimatedTime: '15-20 min',
            prerequisites: [],
            order: 1,
            learningObjectives: [
                'Understanding loop conditions',
                'Performance impact of infinite loops',
                'Writing constraints'
            ],
            tags: ['loops', 'performance', 'debugging']
        },
        {
            id: 'memory-leak',
            name: 'Memory Leak',
            icon: '💾',
            description: 'Find and fix memory leaks draining system resources',
            difficulty: 'Intermediate',
            estimatedTime: '20-25 min',
            prerequisites: ['infinite-forest'],
            order: 2,
            learningObjectives: [
                'Memory management basics',
                'Object lifecycle awareness',
                'Resource cleanup patterns'
            ],
            tags: ['memory', 'optimization', 'resources']
        },
        {
            id: 'physics-chaos',
            name: 'Physics Chaos',
            icon: '⚙️',
            description: 'Debug physics calculations causing objects to explode',
            difficulty: 'Intermediate',
            estimatedTime: '20-30 min',
            prerequisites: ['infinite-forest'],
            order: 3,
            learningObjectives: [
                'Understanding physics constraints',
                'Debugging visual artifacts',
                'Parameter tuning'
            ],
            tags: ['physics', 'debugging', 'math']
        },
        {
            id: 'render-storm',
            name: 'Render Storm',
            icon: '🎨',
            description: 'Optimize excessive draw calls killing frame rate',
            difficulty: 'Advanced',
            estimatedTime: '25-35 min',
            prerequisites: ['memory-leak'],
            order: 4,
            learningObjectives: [
                'Understanding draw calls',
                'Batching and instancing',
                'GPU performance profiling'
            ],
            tags: ['rendering', 'optimization', 'gpu']
        },
        {
            id: 'ai-rebellion',
            name: 'AI Rebellion',
            icon: '🤖',
            description: 'Constrain an AI that spawns too many enemies',
            difficulty: 'Advanced',
            estimatedTime: '30-40 min',
            prerequisites: ['physics-chaos'],
            order: 5,
            learningObjectives: [
                'AI behavior constraints',
                'Rate limiting patterns',
                'System resource budgeting'
            ],
            tags: ['ai', 'constraints', 'optimization']
        }
    ];

    /**
     * Get default progress structure for a new user
     */
    static getDefaultProgress() {
        const scenarios = {};
        this.SCENARIOS.forEach(scenario => {
            scenarios[scenario.id] = {
                status: scenario.prerequisites.length === 0 ? 'available' : 'locked',
                progress: 0,
                attempts: 0,
                timeSpent: 0,
                lastAccessed: null,
                completedAt: null
            };
        });
        
        return {
            scenarios,
            stats: {
                totalCompleted: 0,
                totalTime: 0,
                streak: 0,
                lastActiveDate: null,
                achievements: []
            }
        };
    }

    /**
     * Load student progress from localStorage
     */
    static loadProgress() {
        const user = AuthManager.getCurrentUser();
        if (!user) return null;

        try {
            const data = localStorage.getItem(`${this.PROGRESS_KEY}_${user.userId}`);
            if (!data) {
                const defaultProgress = this.getDefaultProgress();
                this.saveProgress(defaultProgress);
                return defaultProgress;
            }
            return JSON.parse(data);
        } catch (e) {
            console.error('StudentPortal: Error loading progress', e);
            return this.getDefaultProgress();
        }
    }

    /**
     * Save student progress to localStorage
     */
    static saveProgress(progress) {
        const user = AuthManager.getCurrentUser();
        if (!user) return false;

        try {
            localStorage.setItem(
                `${this.PROGRESS_KEY}_${user.userId}`,
                JSON.stringify(progress)
            );
            return true;
        } catch (e) {
            console.error('StudentPortal: Error saving progress', e);
            return false;
        }
    }

    /**
     * Get all scenarios with their current status
     */
    static getScenariosWithStatus() {
        const progress = this.loadProgress();
        if (!progress) return [];

        return this.SCENARIOS.map(scenario => {
            const scenarioProgress = progress.scenarios[scenario.id] || {
                status: 'locked',
                progress: 0
            };

            // Check if prerequisites are met
            const prerequisitesMet = scenario.prerequisites.every(prereqId => {
                const prereq = progress.scenarios[prereqId];
                return prereq && prereq.status === 'completed';
            });

            // Update status if prerequisites now met
            let status = scenarioProgress.status;
            if (status === 'locked' && prerequisitesMet) {
                status = 'available';
            }

            return {
                ...scenario,
                ...scenarioProgress,
                status,
                isLocked: status === 'locked',
                isCompleted: status === 'completed',
                isInProgress: status === 'in_progress'
            };
        }).sort((a, b) => a.order - b.order);
    }

    /**
     * Get the current in-progress scenario (for Continue button)
     */
    static getCurrentScenario() {
        const scenarios = this.getScenariosWithStatus();
        const inProgress = scenarios.filter(s => s.status === 'in_progress');
        
        if (inProgress.length === 0) return null;
        
        // Return most recently accessed
        return inProgress.sort((a, b) => {
            const dateA = new Date(a.lastAccessed || 0);
            const dateB = new Date(b.lastAccessed || 0);
            return dateB - dateA;
        })[0];
    }

    /**
     * Get student stats
     */
    static getStats() {
        const progress = this.loadProgress();
        if (!progress) return { totalCompleted: 0, totalTime: 0, streak: 0 };

        // Update streak
        this.updateStreak();
        
        const refreshedProgress = this.loadProgress();
        return refreshedProgress.stats;
    }

    /**
     * Update daily streak
     */
    static updateStreak() {
        const progress = this.loadProgress();
        if (!progress) return;

        const today = new Date().toDateString();
        const lastActive = progress.stats.lastActiveDate;

        if (lastActive === today) return; // Already counted today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastActive === yesterday.toDateString()) {
            progress.stats.streak += 1;
        } else if (lastActive !== today) {
            progress.stats.streak = 1; // Reset streak
        }

        progress.stats.lastActiveDate = today;
        this.saveProgress(progress);
    }

    /**
     * Start or resume a scenario
     */
    static startScenario(scenarioId) {
        const progress = this.loadProgress();
        if (!progress) return false;

        const scenario = progress.scenarios[scenarioId];
        if (!scenario) return false;

        if (scenario.status === 'locked') return false;

        scenario.status = 'in_progress';
        scenario.lastAccessed = new Date().toISOString();
        scenario.attempts += 1;

        this.saveProgress(progress);
        return true;
    }

    /**
     * Update scenario progress
     */
    static updateScenarioProgress(scenarioId, progressPercent, timeSpentSeconds = 0) {
        const progress = this.loadProgress();
        if (!progress) return false;

        const scenario = progress.scenarios[scenarioId];
        if (!scenario) return false;

        scenario.progress = Math.min(100, Math.max(0, progressPercent));
        scenario.timeSpent += timeSpentSeconds;
        scenario.lastAccessed = new Date().toISOString();
        progress.stats.totalTime += timeSpentSeconds;

        this.saveProgress(progress);
        return true;
    }

    /**
     * Mark scenario as completed
     */
    static completeScenario(scenarioId) {
        const progress = this.loadProgress();
        if (!progress) return false;

        const scenario = progress.scenarios[scenarioId];
        if (!scenario) return false;

        scenario.status = 'completed';
        scenario.progress = 100;
        scenario.completedAt = new Date().toISOString();
        progress.stats.totalCompleted += 1;

        // Unlock dependent scenarios
        this.SCENARIOS.forEach(s => {
            if (s.prerequisites.includes(scenarioId)) {
                const depScenario = progress.scenarios[s.id];
                if (depScenario && depScenario.status === 'locked') {
                    // Check if ALL prerequisites are now met
                    const allMet = s.prerequisites.every(prereqId => {
                        return progress.scenarios[prereqId]?.status === 'completed';
                    });
                    if (allMet) {
                        depScenario.status = 'available';
                    }
                }
            }
        });

        this.saveProgress(progress);
        return true;
    }

    /**
     * Format seconds to human-readable time
     */
    static formatTime(seconds) {
        if (seconds < 60) return `${seconds} seconds`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return `${hours}h ${remainingMins}m`;
    }

    /**
     * Get scenario URL for launching
     */
    static getScenarioUrl(scenarioId) {
        return `index.html?scenario=${encodeURIComponent(scenarioId)}`;
    }

    /**
     * Reset all progress (for testing)
     */
    static resetProgress() {
        const user = AuthManager.getCurrentUser();
        if (!user) return;
        localStorage.removeItem(`${this.PROGRESS_KEY}_${user.userId}`);
    }
}

export default StudentPortal;

/**
 * AuthManager.js - Student Portal Authentication
 * Orbrya EdTech Platform
 * 
 * MVP authentication using localStorage for pilot tracking.
 * No passwords - just username identification for tracking.
 * 
 * Storage key: 'orbrya_user'
 * Structure: { userId, username, displayName, schoolCode, createdAt }
 * 
 * @version 1.0.0
 * @license MIT
 */

export class AuthManager {
    static STORAGE_KEY = 'orbrya_user';
    static USERS_REGISTRY = 'orbrya_users_registry';  // Persist userId by username
    static USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
    static SCHOOL_CODE_PATTERN = /^[a-zA-Z0-9-]{0,20}$/;

    /**
     * Generate a unique user ID
     * Format: timestamp + random string for uniqueness
     * @returns {string} Unique user ID
     */
    static generateUserId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `usr_${timestamp}_${randomStr}`;
    }

    /**
     * Validate username format
     * @param {string} username - Username to validate
     * @returns {{ valid: boolean, error?: string }}
     */
    static validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }
        
        const trimmed = username.trim();
        
        if (trimmed.length < 3) {
            return { valid: false, error: 'Username must be at least 3 characters' };
        }
        
        if (trimmed.length > 20) {
            return { valid: false, error: 'Username must be 20 characters or less' };
        }
        
        if (!this.USERNAME_PATTERN.test(trimmed)) {
            return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
        }
        
        return { valid: true };
    }

    /**
     * Validate school code format (optional field)
     * @param {string} schoolCode - School code to validate
     * @returns {{ valid: boolean, error?: string }}
     */
    static validateSchoolCode(schoolCode) {
        if (!schoolCode || schoolCode.trim() === '') {
            return { valid: true }; // Optional field
        }
        
        const trimmed = schoolCode.trim();
        
        if (trimmed.length > 20) {
            return { valid: false, error: 'School code must be 20 characters or less' };
        }
        
        if (!this.SCHOOL_CODE_PATTERN.test(trimmed)) {
            return { valid: false, error: 'School code can only contain letters, numbers, and hyphens' };
        }
        
        return { valid: true };
    }

    /**
     * Check if a user is currently logged in
     * @returns {boolean}
     */
    static isLoggedIn() {
        try {
            const userData = localStorage.getItem(this.STORAGE_KEY);
            if (!userData) return false;
            
            const user = JSON.parse(userData);
            return !!(user && user.userId && user.username);
        } catch (e) {
            console.error('AuthManager: Error checking login status', e);
            return false;
        }
    }

    /**
     * Get the currently logged in user
     * @returns {{ userId: string, username: string, displayName: string, schoolCode: string } | null}
     */
    static getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.STORAGE_KEY);
            if (!userData) return null;
            
            const user = JSON.parse(userData);
            if (!user || !user.userId) return null;
            
            return {
                userId: user.userId,
                username: user.username,
                displayName: user.displayName || user.username,
                schoolCode: user.schoolCode || ''
            };
        } catch (e) {
            console.error('AuthManager: Error getting current user', e);
            return null;
        }
    }

    /**
     * Log in a user (create/store session)
     * @param {string} username - Required username
     * @param {string} [schoolCode=''] - Optional school/district code
     * @param {string} [displayName=''] - Optional display name (defaults to username)
     * @returns {Promise<{ userId: string, username: string, displayName: string, schoolCode: string }>}
     */
    static async login(username, schoolCode = '', displayName = '') {
        // Validate username
        const usernameValidation = this.validateUsername(username);
        if (!usernameValidation.valid) {
            throw new Error(usernameValidation.error);
        }
        
        // Validate school code if provided
        const schoolValidation = this.validateSchoolCode(schoolCode);
        if (!schoolValidation.valid) {
            throw new Error(schoolValidation.error);
        }
        
        const trimmedUsername = username.trim();
        const trimmedSchoolCode = schoolCode ? schoolCode.trim() : '';
        const trimmedDisplayName = displayName ? displayName.trim() : trimmedUsername;
        
        // Check if this username has logged in before (preserve userId)
        let userId;
        try {
            const registry = JSON.parse(localStorage.getItem(this.USERS_REGISTRY) || '{}');
            if (registry[trimmedUsername]) {
                userId = registry[trimmedUsername];
                console.log(`AuthManager: Returning user - ${trimmedUsername}`);
            } else {
                userId = this.generateUserId();
                registry[trimmedUsername] = userId;
                localStorage.setItem(this.USERS_REGISTRY, JSON.stringify(registry));
                console.log(`AuthManager: New user registered - ${trimmedUsername}`);
            }
        } catch (e) {
            userId = this.generateUserId();
        }
        
        // Create user object
        const user = {
            userId: userId,
            username: trimmedUsername,
            displayName: trimmedDisplayName,
            schoolCode: trimmedSchoolCode,
            createdAt: new Date().toISOString()
        };
        
        // Store in localStorage
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        } catch (e) {
            throw new Error('Unable to save login. Please check your browser settings.');
        }
        
        console.log(`AuthManager: User logged in - ${user.username} (${user.userId})`);
        
        return {
            userId: user.userId,
            username: user.username,
            displayName: user.displayName,
            schoolCode: user.schoolCode
        };
    }

    /**
     * Log out the current user
     */
    static logout() {
        try {
            const user = this.getCurrentUser();
            localStorage.removeItem(this.STORAGE_KEY);
            if (user) {
                console.log(`AuthManager: User logged out - ${user.username}`);
            }
        } catch (e) {
            console.error('AuthManager: Error during logout', e);
        }
    }

    /**
     * Require authentication - redirects to login if not logged in
     * @param {string} [loginPath='/login.html'] - Path to login page
     * @returns {boolean} True if logged in, false if redirecting
     */
    static requireAuth(loginPath = '/login.html') {
        if (!this.isLoggedIn()) {
            // Store the intended destination for post-login redirect
            const currentPath = window.location.pathname + window.location.search;
            sessionStorage.setItem('orbrya_redirect', currentPath);
            
            window.location.href = loginPath;
            return false;
        }
        return true;
    }

    /**
     * Get and clear the post-login redirect path
     * @returns {string | null}
     */
    static getRedirectPath() {
        const path = sessionStorage.getItem('orbrya_redirect');
        sessionStorage.removeItem('orbrya_redirect');
        return path;
    }

    /**
     * Update user's display name
     * @param {string} newDisplayName
     */
    static updateDisplayName(newDisplayName) {
        const userData = localStorage.getItem(this.STORAGE_KEY);
        if (!userData) return;
        
        try {
            const user = JSON.parse(userData);
            user.displayName = newDisplayName.trim() || user.username;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        } catch (e) {
            console.error('AuthManager: Error updating display name', e);
        }
    }
}

// Export for ES6 module usage
export default AuthManager;

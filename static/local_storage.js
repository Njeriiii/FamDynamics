/**
 * Manages client-side local storage for family data persistence
 * Enhanced with fallback mechanisms for cross-domain environments
 */
class LocalStorageManager {
    constructor() {
        // Test localStorage availability first
        this.storageAvailable = this._testStorage();
        
        // Fallback storage
        this.memoryStorage = {};
        
        // Initialize client ID if not exists
        this.clientId = this.getOrCreateClientId();
        
        // Storage keys
        this.FAMILY_DATA_KEY = 'fda_family_data';
        this.PHASE_KEY = 'fda_conversation_phase';
    }
    
    /**
     * Test if localStorage is available and working
     */
    _testStorage() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    }
    
    /**
     * Get or create a persistent client ID
     * This helps identify this browser/device across sessions
     */
    getOrCreateClientId() {
        let clientId = null;
        
        // Try localStorage first if available
        if (this.storageAvailable) {
            try {
                clientId = localStorage.getItem('fda_client_id');
            } catch (e) {
                console.warn('Error accessing localStorage for client ID:', e);
            }
        }
        
        // If not found in localStorage, check cookies
        if (!clientId) {
            clientId = this._getCookie('fda_client_id');
        }
        
        // If still not found, create new ID
        if (!clientId) {
            clientId = this.generateUUID();
            
            // Try to store in multiple places for redundancy
            if (this.storageAvailable) {
                try {
                    localStorage.setItem('fda_client_id', clientId);
                } catch (e) {
                    console.warn('Error storing client ID in localStorage:', e);
                }
            }
            
            // Also store in cookie with long expiration (30 days)
            this._setCookie('fda_client_id', clientId, 30);
            
            // In-memory fallback
            this.memoryStorage['fda_client_id'] = clientId;
        }
        
        return clientId;
    }
    
    /**
     * Generate a random UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Get a cookie value by name
     */
    _getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }
    
    /**
     * Set a cookie with expiration
     */
    _setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Strict`;
    }
    
    /**
     * Save data to localStorage
     */
    saveData(data) {
        // Add timestamp and client ID
        const dataToSave = {
            ...data,
            clientId: this.clientId,
            timestamp: new Date().toISOString()
        };
        
        try {
            // Try localStorage first if available
            if (this.storageAvailable) {
                try {
                    localStorage.setItem(this.FAMILY_DATA_KEY, JSON.stringify(dataToSave));
                    
                    // Also save phase separately for quicker access
                    if (data.phase) {
                        localStorage.setItem(this.PHASE_KEY, data.phase);
                    }
                } catch (e) {
                    console.warn('Error saving to localStorage, using fallbacks:', e);
                }
            }
            
            // Always store in memory as fallback
            this.memoryStorage[this.FAMILY_DATA_KEY] = dataToSave;
            
            // Also try sessionStorage as another fallback
            try {
                sessionStorage.setItem(this.FAMILY_DATA_KEY, JSON.stringify(dataToSave));
            } catch (e) {
                console.warn('sessionStorage not available:', e);
            }
            
            // Store small identifier in cookies for detection
            this._setCookie('fda_has_data', '1', 30);
            
            return {
                success: true
            };
        } catch (error) {
            console.error('Error saving to storage:', error);
            
            // Last resort - try to save in memory only
            this.memoryStorage[this.FAMILY_DATA_KEY] = dataToSave;
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Load data from storage
     */
    loadData() {
        try {
            let data = null;
            let source = 'none';
            
            // Try localStorage first if available
            if (this.storageAvailable) {
                try {
                    const localData = localStorage.getItem(this.FAMILY_DATA_KEY);
                    if (localData) {
                        data = JSON.parse(localData);
                        source = 'local';
                    }
                } catch (e) {
                    console.warn('Error reading from localStorage:', e);
                }
            }
            
            // If not found in localStorage, try memory storage
            if (!data && this.memoryStorage[this.FAMILY_DATA_KEY]) {
                data = this.memoryStorage[this.FAMILY_DATA_KEY];
                source = 'memory';
            }
            
            // If still not found, try sessionStorage
            if (!data) {
                try {
                    const sessionData = sessionStorage.getItem(this.FAMILY_DATA_KEY);
                    if (sessionData) {
                        data = JSON.parse(sessionData);
                        source = 'session';
                    }
                } catch (e) {
                    console.warn('Error reading from sessionStorage:', e);
                }
            }
            
            return {
                data: data,
                source: source
            };
        } catch (error) {
            console.error('Error loading from storage:', error);
            
            // Last resort - try memory storage
            if (this.memoryStorage[this.FAMILY_DATA_KEY]) {
                return {
                    data: this.memoryStorage[this.FAMILY_DATA_KEY],
                    source: 'memory-fallback'
                };
            }
            
            return {
                data: null,
                source: 'none',
                error: error.message
            };
        }
    }
    
    /**
     * Clear all stored data
     */
    clearData() {
        try {
            // Clear localStorage if available
            if (this.storageAvailable) {
                try {
                    localStorage.removeItem(this.FAMILY_DATA_KEY);
                    localStorage.removeItem(this.PHASE_KEY);
                } catch (e) {
                    console.warn('Error clearing localStorage:', e);
                }
            }
            
            // Clear memory storage
            delete this.memoryStorage[this.FAMILY_DATA_KEY];
            delete this.memoryStorage[this.PHASE_KEY];
            
            // Try to clear sessionStorage
            try {
                sessionStorage.removeItem(this.FAMILY_DATA_KEY);
                sessionStorage.removeItem(this.PHASE_KEY);
            } catch (e) {
                console.warn('Error clearing sessionStorage:', e);
            }
            
            // Remove cookie indicator
            this._setCookie('fda_has_data', '', -1);
            
            // Keep client ID
            return {
                success: true
            };
        } catch (error) {
            console.error('Error clearing data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Export data as JSON file
     */
    exportData() {
        const result = this.loadData();
        
        if (result.data) {
            // Create a downloadable JSON file
            const dataStr = JSON.stringify(result.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            // Create and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `family_data_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return {
                success: true
            };
        }
        
        return {
            success: false,
            error: 'No data to export'
        };
    }
    
    /**
     * Check if data exists in storage
     */
    hasStoredData() {
        // Check all possible storage locations
        if (this.storageAvailable) {
            try {
                if (localStorage.getItem(this.FAMILY_DATA_KEY)) {
                    return true;
                }
            } catch (e) {
                // Ignore localStorage errors
            }
        }
        
        if (this.memoryStorage[this.FAMILY_DATA_KEY]) {
            return true;
        }
        
        try {
            if (sessionStorage.getItem(this.FAMILY_DATA_KEY)) {
                return true;
            }
        } catch (e) {
            // Ignore sessionStorage errors
        }
        
        // Check if cookie indicator exists
        return !!this._getCookie('fda_has_data');
    }
}

// Make available globally
window.LocalStorageManager = LocalStorageManager;
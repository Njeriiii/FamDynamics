/**
 * Manages client-side local storage for family data persistence
 */
class LocalStorageManager {
    constructor() {
        // Initialize client ID if not exists
        this.clientId = this.getOrCreateClientId();
        
        // Storage keys
        this.FAMILY_DATA_KEY = 'fda_family_data';
        this.PHASE_KEY = 'fda_conversation_phase';
    }
    
    /**
     * Get or create a persistent client ID
     * This helps identify this browser/device across sessions
     */
    getOrCreateClientId() {
        let clientId = localStorage.getItem('fda_client_id');
        
        if (!clientId) {
            clientId = this.generateUUID();
            localStorage.setItem('fda_client_id', clientId);
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
     * Save data to localStorage
     */
    saveData(data) {
        // Add timestamp and client ID
        const dataToSave = {
            ...data,
            clientId: this.clientId,
            timestamp: new Date().toISOString()
        };

        console.log('Saving data to localStorage:', dataToSave);
        
        try {
            localStorage.setItem(this.FAMILY_DATA_KEY, JSON.stringify(dataToSave));
            
            // Also save phase separately for quicker access
            if (data.phase) {
                localStorage.setItem(this.PHASE_KEY, data.phase);
            }
            
            return {
                success: true
            };
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Load data from localStorage
     */
    loadData() {
        try {
            const data = localStorage.getItem(this.FAMILY_DATA_KEY);
            return {
                data: data ? JSON.parse(data) : null,
                source: data ? 'local' : 'none'
            };
        } catch (error) {
            console.error('Error loading from localStorage:', error);
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
            localStorage.removeItem(this.FAMILY_DATA_KEY);
            localStorage.removeItem(this.PHASE_KEY);
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
        return !!localStorage.getItem(this.FAMILY_DATA_KEY);
    }
}

// Make available globally
window.LocalStorageManager = LocalStorageManager;

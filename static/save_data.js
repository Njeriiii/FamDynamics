/**
 * SaveManager handles saving conversational data with different storage options
 */
class SaveManager {
    constructor() {
        this.localStorageManager = new window.LocalStorageManager();
        this.storageType = 'local'; // Default to local storage
        console.log('SaveManager initialized');
    }
    
    /**
     * Set the storage type
     * @param {string} type - Storage type ('local', 'session', or 'cloud')
     */
    setStorageType(type) {
        if (['local', 'session', 'cloud'].includes(type)) {
            this.storageType = type;
            return true;
        }
        return false;
    }
    
    /**
     * Get current storage type
     */
    getStorageType() {
        return this.storageType;
    }
    
    /**
     * Save conversation data
     * @param {Object} data - Conversation data to save
     */
    async saveConversation(data) {
        console.log('saveConversation called with data:', data);
        
        // Show saving status
        this.updateSaveStatus('saving');
        
        try {
            // Extract data from conversation if not provided
            const conversationData = data;

            console.log('Saving conversation data:', conversationData);
            
            if (!conversationData) {
                console.error('No conversation data to save');
                this.updateSaveStatus('error', 'Failed to extract conversation data');
                return { success: false, error: 'No data to save' };
            }
            
            // Save based on storage type
            let result;
            
            switch (this.storageType) {
                case 'local':
                    console.log('Saving to local storage');
                    result = this.saveToLocal(conversationData);
                    break;
                case 'session':
                    console.log('Saving to session storage');
                    result = this.saveToSession(conversationData);
                    break;
                case 'cloud':
                    console.log('Saving to cloud storage');
                    result = await this.saveToCloud(conversationData);
                    break;
                default:
                    console.log('Using default storage (local)');
                    result = this.saveToLocal(conversationData);
            }

            console.log('Save result:', result);

            // Update UI based on result
            if (result.success) {
                this.updateSaveStatus('success', result.message || 'Conversation saved');
                
            } else {
                this.updateSaveStatus('error', result.error || 'Save failed');
            }
            
            return result;
        } catch (error) {
            console.error('Save error:', error);
            this.updateSaveStatus('error', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Save data to local storage
     * @param {Object} data - Data to save
     */
    saveToLocal(data) {
        console.log('Executing saveToLocal with data:', data);
        try {
            const result = this.localStorageManager.saveData({
                extracted_data: data.data?.extracted_data || {},
                phase: data.data?.phase || '',
                timestamp: new Date().toISOString()
            });
            console.log('Local storage save result:', result);
            return result;
        } catch (error) {
            console.error('Error in saveToLocal:', error);
            return { success: false, error: error.message };
        }
    }

    
    /**
     * Save data to cloud (placeholder)
     * @param {Object} data - Data to save
     */
    async saveToCloud(data) {
        console.log('saveToCloud initiated');
        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Cloud save response:', response);
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Cloud save result:', result);
            
            return {
                success: result.extraction_status === 'complete',
                message: result.extraction_status === 'complete' ? 'Saved to cloud' : 'Failed to save',
                error: result.error
            };
        } catch (error) {
            console.error('Cloud save error:', error);
            return {
                success: false,
                error: `Cloud save failed: ${error.message}`
            };
        }
    }
    
    /**
     * Update the save status indicator in the UI
     * @param {string} status - Status type ('saving', 'success', 'error')
     * @param {string} message - Message to display
     */
    updateSaveStatus(status, message = '') {
        console.log(`updateSaveStatus called: ${status}, ${message}`);
        
        const saveButton = document.getElementById('save-conversation-button');
        const saveStatus = document.getElementById('save-status');
        
        if (!saveButton) {
            console.error('Save button element not found in DOM');
            return;
        }
        
        if (!saveStatus) {
            console.error('Save status element not found in DOM');
            return;
        }
        
        console.log('Updating UI elements with status:', status);
        
        switch (status) {
            case 'saving':
                saveButton.disabled = true;
                saveButton.innerHTML = '⏳ Saving...';
                saveStatus.textContent = 'Saving...';
                saveStatus.className = 'save-status';
                break;
                
            case 'success':
                saveButton.disabled = false;
                saveButton.innerHTML = '💾 Save Conversation';
                saveStatus.textContent = message || '✓ Saved';
                saveStatus.className = 'save-status success';
                break;
                
            case 'error':
                saveButton.disabled = false;
                saveButton.innerHTML = '💾 Save Conversation';
                saveStatus.textContent = message || '✗ Error';
                saveStatus.className = 'save-status error';
                break;
        }
        
        // Clear status after a delay
        if (status !== 'saving') {
            setTimeout(() => {
                if (saveStatus) {
                    console.log('Clearing status text after timeout');
                    saveStatus.textContent = '';
                }
            }, 5000);
        }
    }

    /**
     * Load data from storage and send to backend
     * @returns {Promise<Object>} Result of the operation
     */
    async loadData() {
        console.log('Loading data from storage');
        try {
            // Get data from local storage
            let storedData;
            switch (this.storageType) {
            case 'local':
                console.log('Loading from local storage');
                storedData = this.localStorageManager.loadData();
                break;
            case 'session':
                console.log('Loading from session storage');
                storedData = this.localStorageManager.loadData(); // Placeholder
                break;
            case 'cloud':
                console.log('Loading from cloud storage');
                storedData = this.localStorageManager.loadData(); // Placeholder
                break;
            default:
                console.log('Using default storage (local)');
                storedData = this.localStorageManager.loadData();
            }
            
            console.log('Retrieved stored data:', storedData);
            
            if (!storedData.data) {
                console.log('No stored data found, proceeding with normal conversation');
                return { success: false, message: 'No saved data found' };
            }
            
            // Send to backend API automatically
            const response = await fetch('/api/load_context', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                saved_data: storedData.data
            })
            });
            
            console.log('Backend response status:', response.status);
            
            if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Load context result:', result);
            
            return result;
            
        } catch (error) {
            console.error('Error loading data:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Initialize the Save button in the UI
     */
    initializeSaveButton() {
        console.log('Initializing save button');
        
        // Check if button already exists
        if (document.getElementById('save-conversation-button')) {
            console.log('Save button already exists, skipping initialization');
            return;
        }
        
        // Create the save button container
        const saveButtonContainer = document.createElement('div');
        saveButtonContainer.className = 'save-button-container';
        
        // Create the save button
        const saveButton = document.createElement('button');
        saveButton.id = 'save-conversation-button';
        saveButton.className = 'save-button';
        saveButton.innerHTML = '💾 Save Conversation';
        saveButton.title = 'Extract and save data from this conversation';
        
        // Create save status element
        const saveStatus = document.createElement('span');
        saveStatus.id = 'save-status';
        saveStatus.className = 'save-status';
        
        // Add elements to container
        saveButtonContainer.appendChild(saveButton);
        saveButtonContainer.appendChild(saveStatus);
        
        // Add container to the page - before the input container
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            console.log('Adding save button before input container');
            inputContainer.parentNode.insertBefore(saveButtonContainer, inputContainer);
        } else {
            console.warn('Input container not found, appending to body');
            document.body.appendChild(saveButtonContainer);
        }
        
        // Add event listener
        saveButton.addEventListener('click', () => {
            console.log('Save button clicked');
            this.handleSaveButtonClick();
        });
        
        console.log('Save button initialized');
    }
    
    /**
     * Handle save button click
     * This calls the appropriate save method based on storage type
     */
    async handleSaveButtonClick() {
        console.log('handleSaveButtonClick triggered');
        this.updateSaveStatus('saving');
        
        try {
            if (this.storageType === 'cloud') {
                // For cloud storage, call API directly and process response
                console.log('Cloud storage selected, calling saveToCloud');
                const result = await this.saveToCloud();
                
                if (result.success) {
                    this.updateSaveStatus('success', 'Conversation saved to server');
                } else {
                    this.updateSaveStatus('error', result.error || 'Failed to save to server');
                }
            } else {
                // For local/session storage, we need to get the data from the server first
                console.log('Local/session storage selected, fetching data from server');
                this.updateSaveStatus('saving', 'Fetching data...');
                
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Server response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Data received from server:', data);
                
                // Process the data with our local save methods
                if (data.extraction_status === 'complete') {
                    // Save the extracted data locally
                    console.log('Extraction complete, saving locally');
                    await this.saveConversation(data);
                } else {
                    console.error('Extraction failed:', data.error);
                    this.updateSaveStatus('error', data.error || 'Failed to extract data');
                }
            }
        } catch (error) {
            console.error('Error during save process:', error);
            this.updateSaveStatus('error', error.message);
        }
    }
}

// Create and export the save manager
window.saveManager = new SaveManager();

// Initialize when the DOM is loaded
document.addEventListener("DOMContentLoaded", async function() {
    console.log('DOM loaded, initializing SaveManager');
    
    const saveManager = window.saveManager;
    
    // Initialize save button
    saveManager.initializeSaveButton();
});
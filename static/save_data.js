/**
 * SaveManager handles saving conversational data with different storage options
 */
class SaveManager {
    constructor() {
        this.localStorageManager = new window.LocalStorageManager();
        this.storageType = 'local'; // Default to local storage
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
        // Show saving status
        this.updateSaveStatus('saving');
        
        try {
            // Extract data from conversation if not provided
            const conversationData = data;

            console.log('Saving conversation data:', conversationData);
            
            if (!conversationData) {
                this.updateSaveStatus('error', 'Failed to extract conversation data');
                return { success: false, error: 'No data to save' };
            }
            
            // Save based on storage type
            let result;
            
            switch (this.storageType) {
                case 'local':
                    result = this.saveToLocal(conversationData);
                    break;
                case 'session':
                    result = this.saveToSession(conversationData);
                    break;
                case 'cloud':
                    result = await this.saveToCloud(conversationData);
                    break;
                default:
                    result = this.saveToLocal(conversationData);
            }

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
        console.log('Saving to local storage22:', data);
        return this.localStorageManager.saveData({
            extracted_data: data.data?.extracted_data || {},
            phase: data.data?.phase || '',
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Save data to session storage (placeholder)
     * @param {Object} data - Data to save
     */
    saveToSession(data) {
        console.warn('Default is session storage. Note that this data will not persist after a refresh.');
        return this.saveToLocal(data);
    }
    
    /**
     * Save data to cloud (placeholder)
     * @param {Object} data - Data to save
     */
    async saveToCloud(data) {
        // For cloud saving, we don't need to send data - the server already has it
        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            
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
        const saveButton = document.getElementById('save-conversation-button');
        const saveStatus = document.getElementById('save-status');
        
        if (!saveButton || !saveStatus) return;
        
        switch (status) {
            case 'saving':
                saveButton.disabled = true;
                saveButton.innerHTML = '⏳ Saving...';
                saveStatus.textContent = '';
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
                if (saveStatus) saveStatus.textContent = '';
            }, 5000);
        }
    }
    
    /**
     * Initialize the Save button in the UI
     */
    initializeSaveButton() {
        // Create the save button container
        const saveButtonContainer = document.createElement('div');
        saveButtonContainer.className = 'save-button-container';
        
        // Create the save button
        const saveButton = document.createElement('button');
        saveButton.id = 'save-conversation-button';
        saveButton.className = 'save-button';
        saveButton.innerHTML = '💾 Save Conversation';
        saveButton.title = 'Extract and save data from this conversation';
        
        // Add button to container
        saveButtonContainer.appendChild(saveButton);
        
        // Add container to the page - before the input container
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.parentNode.insertBefore(saveButtonContainer, inputContainer);
        } else {
            document.body.appendChild(saveButtonContainer);
        }
        
        // Add save status indicator
        const saveStatus = document.createElement('span');
        saveStatus.id = 'save-status';
        saveStatus.className = 'save-status';
        saveButtonContainer.appendChild(saveStatus);
        
        // Add event listener
        saveButton.addEventListener('click', () => this.handleSaveButtonClick());
    }
    
    /**
     * Handle save button click
     * This calls the appropriate save method based on storage type
     */
    async handleSaveButtonClick() {
        try {
            if (this.storageType === 'cloud') {
                // For cloud storage, call API directly and process response
                const result = await this.saveToCloud();
                
                if (result.success) {
                    this.updateSaveStatus('success', 'Conversation saved to server');
                    
                } else {
                    this.updateSaveStatus('error', result.error || 'Failed to save to server');
                    console.error('Save failed:', result.error);
                }
            } else {
                // For local/session storage, we need to get the data from the server first
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Response2:', response);
                console.log('Response3:', response.body);
                
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                
                const data = await response.json();

                console.log('Data2:', data);
                
                // Process the data with our local save methods
                if (data.extraction_status === 'complete') {
                    // Save the extracted data locally
                    this.saveConversation(data);
                } else {
                    this.updateSaveStatus('error', data.error || 'Failed to extract data');
                    console.error('Save failed:', data.error);
                }
            }
        } catch (error) {
            console.error('Error during save:', error);
            this.updateSaveStatus('error', error.message);
        }
    }
}

// Create and export the save manager
const saveManager = new SaveManager();
window.saveManager = saveManager;

// Initialize when the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    saveManager.initializeSaveButton();
});
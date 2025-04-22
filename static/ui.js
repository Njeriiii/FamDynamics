/**
 * ui.js - Handles UI interactions for the Family Dynamics Analyzer
 */
document.addEventListener("DOMContentLoaded", function() {
    // Element references
    const aboutButton = document.getElementById("about-app");
    const aboutModal = document.getElementById("about-modal");
    const closeModalButton = document.querySelector(".close-modal");
    const newConversationButton = document.getElementById("new-conversation");
    const exportDataButton = document.getElementById("export-data");
    const resetButton = document.getElementById("reset-button");
    
    
    // Format phase name for display
    function formatPhase(phase) {
        if (!phase) return "Initial Data Collection";
        
        return phase
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }
        
    // About modal functionality
    aboutButton.addEventListener("click", function() {
        aboutModal.classList.add("show");
    });
    
    closeModalButton.addEventListener("click", function() {
        aboutModal.classList.remove("show");
    });
    
    // Close modal when clicking outside
    aboutModal.addEventListener("click", function(e) {
        if (e.target === aboutModal) {
            aboutModal.classList.remove("show");
        }
    });
    
    // New conversation button
    newConversationButton.addEventListener("click", async function() {
        if (confirm("Start a new conversation? This will reset the current chat and delete all saved family data.")) {
            try {
                // First, clear localStorage data
                if (window.saveManager && window.saveManager.localStorageManager) {
                    window.saveManager.localStorageManager.clearData();
                }
                
                // Then reset the conversation on the server
                const response = await fetch("/api/reset", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                
                if (response.ok) {
                    // Clear chat history
                    const chatHistory = document.getElementById("chat-history");
                    chatHistory.innerHTML = "";
                    
                    // Add initial greeting
                    const messageDiv = document.createElement("div");
                    messageDiv.className = "message assistant-message";
                    
                    const bubble = document.createElement("div");
                    bubble.className = "message-bubble";
                    bubble.textContent = "Hello! I'm here to help you explore and understand your family dynamics. Let's start by learning about your family members. Could you tell me who makes up your immediate family?";
                    
                    messageDiv.appendChild(bubble);
                    chatHistory.appendChild(messageDiv);
                }
            } catch (error) {
                console.error("Error resetting conversation:", error);
            }
        }
    });
    
    // Export data button
    exportDataButton.addEventListener("click", function() {
        if (window.saveManager && window.saveManager.localStorageManager) {
            window.saveManager.localStorageManager.exportData();
        } else {
            alert("Export functionality is not available");
        }
    });
    
    // Update phase based on server response
    const originalSendMessage = window.sendMessage;
    if (originalSendMessage) {
        window.sendMessage = async function(message) {
            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ message }),
                });
    
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
    
                const data = await response.json();
                
                return data.response;
            } catch (error) {
                console.error("Error:", error);
                return "Sorry, there was an error processing your message.";
            }
        };
    }
    
    // Override the save button visibility
    function enhanceSaveButton() {
        // Get the save button from our UI
        const saveButton = document.getElementById("save-conversation-button");
        
        if (saveButton && window.saveManager) {
            // Remove any existing event listeners to avoid duplicates
            saveButton.replaceWith(saveButton.cloneNode(true));
            
            // Get the fresh reference
            const freshSaveButton = document.getElementById("save-conversation-button");
            
            // Add event listener to trigger the save manager
            freshSaveButton.addEventListener("click", async function() {
                
                try {
                    // Use the existing save functionality from save_data.js
                    await window.saveManager.handleSaveButtonClick();
                } catch (error) {
                    console.error("Error during save:", error);
                    
                    // Update status manually if error
                    const saveStatus = document.getElementById("save-status");
                    if (saveStatus) {
                        saveStatus.textContent = "Error saving data";
                        saveStatus.className = "save-status error";
                        
                        // Clear after a delay
                        setTimeout(() => {
                            saveStatus.textContent = "";
                            saveStatus.className = "save-status";
                        }, 5000);
                    }
                }
            });
            
        } else {
            console.warn("Save button or save manager not available");
        }
    }
    
    // Call immediately and after a short delay to ensure save manager has initialized
    enhanceSaveButton();
    setTimeout(enhanceSaveButton, 1000);
    
    // Add keyboard shortcuts
    document.addEventListener("keydown", function(e) {
        // Ctrl+Enter or Cmd+Enter to send message
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            const sendButton = document.getElementById("send-button");
            if (sendButton) {
                sendButton.click();
                e.preventDefault();
            }
        }
        
        // Escape to close modal
        if (e.key === "Escape") {
            aboutModal.classList.remove("show");
        }
    });
});
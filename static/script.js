document.addEventListener("DOMContentLoaded", function () {
    const chatHistory = document.getElementById("chat-history");
    const userInput = document.getElementById("user-message");
    const sendButton = document.getElementById("send-button");
    const voicePrompt = document.getElementById("voice-prompt");

    // Function to add a message to the chat history
    function addMessage(content, isUser) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${
            isUser ? "user-message" : "assistant-message"
        }`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        bubble.textContent = content;

        messageDiv.appendChild(bubble);
        chatHistory.appendChild(messageDiv);

        // Scroll to the bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Function to send a message to the server
    async function sendMessage(message) {
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message }),
            });

            console.log("Response:", response);

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error("Error:", error);
            return "Sorry, there was an error processing your message.";
        }
    }

    // Event listener for send button
    sendButton.addEventListener("click", async function () {
        const message = userInput.value.trim();
        if (message) {
            // Add user message to chat
            addMessage(message, true);

            // Clear input field
            userInput.value = "";

            // Send to server and get response
            const response = await sendMessage(message);

            // Add assistant response to chat
            addMessage(response, false);
        }
    });

    // Event listener for Enter key (Ctrl+Enter or Cmd+Enter to send)
    userInput.addEventListener("keydown", function (e) {
        // Check for Ctrl+Enter or Cmd+Enter
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            sendButton.click();
            e.preventDefault(); // Prevent default to avoid adding a newline
        }
    });

    // Add initial greeting
    addMessage(
        "Hello! I'm here to help you explore and understand your family dynamics. Let's start by learning about your family members. Could you tell me who makes up your immediate family?",
        false
    );

    // Voice recognition
    const voiceButton = document.getElementById("voice-button") || document.createElement('button');
    
    if (!document.getElementById("voice-button")) {
        voiceButton.id = 'voice-button';
        voiceButton.innerHTML = '🎤';
        document.querySelector('.input-buttons').appendChild(voiceButton);
    }

    // Set up speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        let finalTranscript = '';
        
        recognition.onresult = function(event) {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            // Update the text area with both final and interim results
            userInput.value = finalTranscript + interimTranscript;
        };
        
        voiceButton.addEventListener('click', function() {
            if (voiceButton.classList.contains('listening')) {
                // If already listening, stop recognition
                recognition.stop();
            } else {
                // Start new recognition
                finalTranscript = '';
                userInput.value = '';
                recognition.start();
                voiceButton.classList.add('listening');
                voicePrompt.textContent = "Listening... Click microphone again when done speaking";
            }
        });
        
        recognition.onend = function() {
            voiceButton.classList.remove('listening');
            voicePrompt.textContent = "Click the microphone button to speak";
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            voiceButton.classList.remove('listening');
            voicePrompt.textContent = "Speech recognition error. Try again.";
            
            // Reset after a delay
            setTimeout(() => {
                voicePrompt.textContent = "Click the microphone button to speak";
            }, 3000);
        };
    } else {
        voiceButton.style.display = 'none';
        voicePrompt.style.display = 'none';
        console.log('Speech recognition not supported');
    }
});


document.addEventListener("DOMContentLoaded", function() {
    // Initialize the Save Conversation button
    initializeSaveButton();
});

function initializeSaveButton() {
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
    inputContainer.parentNode.insertBefore(saveButtonContainer, inputContainer);
    
    // Add save status indicator
    const saveStatus = document.createElement('span');
    saveStatus.id = 'save-status';
    saveStatus.className = 'save-status';
    saveButtonContainer.appendChild(saveStatus);
    
    // Add event listener
    saveButton.addEventListener('click', saveConversation);
}

function saveConversation() {
    // Show saving indicator
    const saveButton = document.getElementById('save-conversation-button');
    const saveStatus = document.getElementById('save-status');
    const originalText = saveButton.innerHTML;
    
    saveButton.disabled = true;
    saveButton.innerHTML = '⏳ Saving...';
    saveStatus.textContent = '';
    saveStatus.className = 'save-status';
    
    // Call the API to save the conversation
    fetch('/api/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
    console.log('Responseee:', response);
    return response.json();
    })
    .then(data => {
        // Reset button
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;

        console.log('Save response:', data);
        
        if (data.extraction_status == 'complete') {
            // Show success status
            saveStatus.textContent = '✓ Saved';
            saveStatus.className = 'save-status success';
            
            // Display extracted information summary
            if (data.summary) {
                showExtractionSummary(data.summary);
            }
        } else {
            // Show error status
            saveStatus.textContent = '✗ Failed';
            saveStatus.className = 'save-status error';
            
            // Handle redirect case (no active conversation)
            if (data.redirect) {
                window.location.reload();
            }
            
            console.error('Save failed:', data.error);
        }
        
        // Clear status after a delay
        setTimeout(() => {
            saveStatus.textContent = '';
        }, 5000);
    })
    .catch(error => {
        console.error('Error:', error);
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        
        saveStatus.textContent = '✗ Error';
        saveStatus.className = 'save-status error';
        
        // Clear status after a delay
        setTimeout(() => {
            saveStatus.textContent = '';
        }, 5000);
    });
}

function showExtractionSummary(summary) {
    // Create a summary dialog
    const overlay = document.createElement('div');
    overlay.className = 'summary-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'summary-dialog';
    
    const dialogContent = document.createElement('div');
    dialogContent.className = 'summary-content';
    
    // Add header
    const header = document.createElement('h3');
    header.textContent = 'Extracted Information Summary';
    dialogContent.appendChild(header);
    
    // Add summary text
    const summaryText = document.createElement('p');
    summaryText.textContent = summary;
    dialogContent.appendChild(summaryText);
    
    // Add explanation
    const explanation = document.createElement('p');
    explanation.className = 'summary-explanation';
    explanation.textContent = 'This information has been saved and will be available when you return to the conversation.';
    dialogContent.appendChild(explanation);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'summary-close-button';
    closeButton.textContent = 'Close';
    dialogContent.appendChild(closeButton);
    
    // Assemble the dialog
    dialog.appendChild(dialogContent);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Add event listener to close button
    closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Also close when clicking the overlay
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}
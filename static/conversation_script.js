document.addEventListener("DOMContentLoaded", function () {
    const chatHistory = document.getElementById("chat-history");
    const userInput = document.getElementById("user-message");
    const sendButton = document.getElementById("send-button");
    const voicePrompt = document.getElementById("voice-prompt");

    // Check for saved data and load it if available
    checkForSavedData();

    // Function to check for saved data
    async function checkForSavedData() {
        try {
            // Using the global saveManager
            if (window.saveManager && window.saveManager.localStorageManager.hasStoredData()) {
                console.log("Found saved conversation data");
                
                // Ask user if they want to continue the conversation
                showRestoreDialog();
            } else {
                // No saved data, proceed with initial greeting
                addInitialGreeting();
            }
        } catch (error) {
            console.error("Error checking for saved data:", error);
            // Proceed with initial greeting
            addInitialGreeting();
        }
    }

    // Function to show the restore dialog
    function showRestoreDialog() {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'restore-notification';
        
        const dialogContent = document.createElement('div');
        dialogContent.className = 'restore-content';
        
        dialogContent.innerHTML = `
            <h3>Welcome Back!</h3>
            <p>We found a saved conversation about your family dynamics. Would you like to continue where you left off?</p>
            <div class="restore-buttons">
                <button id="restore-yes" class="primary-button">Yes, continue</button>
                <button id="restore-no" class="secondary-button">No, start new</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialogContent);
        document.body.appendChild(dialogOverlay);
        
        // Add event listeners
        document.getElementById('restore-yes').addEventListener('click', async () => {
            document.body.removeChild(dialogOverlay);
            await loadSavedContext();
        });
        
        document.getElementById('restore-no').addEventListener('click', () => {
            document.body.removeChild(dialogOverlay);
            addInitialGreeting();
        });
    }

    // Function to load saved context
    async function loadSavedContext() {
        try {
            // Get saved data
            const savedData = window.saveManager.localStorageManager.loadData().data;
            
            if (!savedData) {
                console.error("No saved data found");
                addInitialGreeting();
                return;
            }
            
            // Send to backend
            const response = await fetch("/api/load_context", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    saved_data: savedData
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.response) {
                // Add the personalized greeting to the chat
                addMessage(result.response, false);
            } else {
                // Fall back to default greeting
                addInitialGreeting();
            }
            
        } catch (error) {
            console.error("Error loading saved context:", error);
            addInitialGreeting();
        }
    }

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

    // Function to add initial greeting
    function addInitialGreeting() {
        addMessage(
            "Hello! I'm here to help you explore and understand your family dynamics. Let's start by learning about your family members. Could you tell me who makes up your immediate family?",
            false
        );
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
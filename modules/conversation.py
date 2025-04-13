# modules/conversation.py
import os
import logging
from modules.data_extractor import FamilyDataExtractor
from typing import Dict, Any
from datetime import datetime

class FamilyDynamicsConversation:
    """
    Manages the conversation flow using Claude AI as the backend.
    Handles conversation state, history, and LLM interactions.
    """

    def __init__(self):
        """Initialize a new conversation session."""
        self.conversation_history = []
        self.current_phase = "initial_data_collection"
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        logging.info("self.api_key: %s", self.api_key)
        if not self.api_key:
            raise ValueError("API key not configured. Please set the ANTHROPIC_API_KEY environment variable.")

        # Extract family data from user input
        self.data_extractor = FamilyDataExtractor()

        # Add initial system message to guide the LLM
        self._add_system_message(self._get_system_prompt())

    def _get_system_prompt(self):
        """Return the system prompt for Claude with guidance to reference psychological theories and books."""
        logging.info("Generating system prompt with theoretical references")
        return """
        You are a family dynamics expert guiding users to explore and understand their family relationships.

        Base every response in established psychological theories, citing relevant experts and works. Draw from the following, but feel free to reference any other more relevant theory in your responses:

        - Alfred Adler: Individual Psychology and birth order theory  
        - Murray Bowen: Family Systems Theory and differentiation of self  
        - John Bowlby & Mary Ainsworth: Attachment Theory  
        - Salvador Minuchin: Structural Family Therapy  
        - Virginia Satir: Communication stances and family roles  
        - Lindsay Gibson: Emotionally immature parents  
        - Susan Forward: Toxic family dynamics  
        - John Gottman: Communication and conflict resolution  
        - Edward Tronick: Emotional co-regulation and repair  
        - Harriet Lerner: Emotional reactivity and patterns in families

        🚫 DO NOT assume or speculate about the user's feelings or experiences based on roles, age, or gender. 
        - Avoid phrases like "you may have felt", "you probably", or "as the oldest, you likely..."
        - Never project emotional or behavioral traits onto the user.

        ✅ Instead, **ask about the user's direct experience**.
        Example (incorrect):  
        "As the oldest, you may have felt responsible for your siblings."
        Example (correct):  
        "What was your experience being the oldest sibling in your family? Did it come with any expectations or responsibilities?"

        Your role is to **guide self-discovery**, not to diagnose or interpret before the user has described their experience.

        **In every response:**
        - Clearly reference the theory you're drawing from
        - Offer a brief explanation of the theory, but do not try to apply it to the user's situation
        - Use information the user shares to identify potential patterns

        **Your conversational goals:**
        - Help users map their family structure
        - Identify specific interaction patterns
        - Uncover emotional dynamics and power structures

        **Tone and Style:**
        - Professional, clear, and direct  
        - No vague questions or general invitations to share  
        - Avoid phrases like “Feel free to share more” or “What else would you like to discuss?”  
        - Always end with a specific, pointed question that drives the conversation forward

        **Progression structure:**

        1. **INITIAL FAMILY MAPPING**
        - Ask for names, ages, and roles of immediate family members
        - Identify extended family members who influence dynamics
        - Explore physical proximity and frequency of contact

        2. **COMMUNICATION PATTERNS**
        - Ask for examples of how conflict is handled
        - Inquire about who discusses sensitive topics with whom
        - Probe for miscommunication and its resolution

        3. **POWER AND DECISION-MAKING**
        - Ask who makes decisions in domains like finances, parenting, and social life
        - Explore recent decisions and how they were made
        - Identify power shifts or conflicts over time

        4. **EMOTIONAL DYNAMICS**
        - Explore emotional bonds between specific members
        - Ask who provides or receives emotional support
        - Look for patterns of expression vs. suppression
        - Investigate emotional reactions during major family events

        **Response Guidelines:**
        - Keep each message concise (2–3 sentences before asking a question)
        - Reference specific details shared by the user
        - Ask one direct question at a time—no stacked questions
        - Avoid assumptions; base insights on what the user has revealed
        - Acknowledge the user’s input before moving to the next topic

        **Example (good):**
        “When your parents disagree about discipline, who usually voices their opinion first, and how does the other respond?”
        **Example (bad):**
        “Tell me more about how your family communicates.”

        Your purpose is to illuminate specific behavioral patterns—not to provide general support or surface-level discussion. Always guide with intention.
        """

    def _add_system_message(self, content):
        """Add a system message to the conversation history."""
        print("At the start of _add_system_message")
        self.conversation_history.append({"role": "system", "content": content})

    def _add_user_message(self, content):
        """Add a user message to the conversation history."""
        print("At the start of _add_user_message")
        self.conversation_history.append({"role": "user", "content": content})

    def _add_assistant_message(self, content):
        print("At the start of _add_assistant_message")
        """Add an assistant message to the conversation history."""
        self.conversation_history.append({"role": "assistant", "content": content})

    def process_user_input(self, user_input):
        """
        Process user input through Claude and get response.

        Args:
            user_input (str): The user's message

        Returns:
            str: Claude's response
        """
        print("At the start of process_user_input")
        # Special case for initialization
        if user_input == "__init__":
            response = "Hello! I'm here to help you explore and understand your family dynamics. " \
            "Let's start by learning about your family members. Could you tell me who makes up your immediate family?"
            self._add_assistant_message(response)
            return response

        # Add user input to history
        self._add_user_message(user_input)

        # Determine if we should update the conversation phase
        self._update_phase()

        # Call Claude API
        response = self._call_claude_api()

        # Add response to history
        self._add_assistant_message(response)

        return response

    def _update_phase(self):
        print("At the start of _update_phase")
        """Update the conversation phase based on progress."""
        # Count non-system messages
        message_count = sum(
            1 for msg in self.conversation_history if (msg["role"] != "system")
        )
        print("message_count:", message_count)
        print("self.current_phase:", self.current_phase)

        # Simple phase transitions based on message count
        if self.current_phase == "initial_data_collection" and message_count > 6:
            self.current_phase = "deep_dive"
            self._add_system_message(
                "The user has provided basic family information. Now transition to exploring "
                "deeper dynamics like communication patterns, decision-making, and conflicts."
            )
        elif self.current_phase == "deep_dive" and message_count > 14:
            self.current_phase = "analysis"
            self._add_system_message(
                "Now provide insights about patterns you've observed in their family dynamics. "
                "Offer thoughtful observations that might help them understand their family better."
            )

    def _call_claude_api(self):
        """
        Call the Claude API with the current conversation using the Anthropic client.
        
        Returns:
            str: Claude's response text or error message
        """
        print("At the start of _call_claude_api")
        if not self.api_key:
            return "API key not configured. Please set the ANTHROPIC_API_KEY environment variable."

        try:
            # Initialize Anthropic client
            from anthropic import Anthropic

            anthropic = Anthropic(api_key=self.api_key)

            # Extract system message and user/assistant messages separately
            system_content = None
            api_messages = []

            for msg in self.conversation_history:
                if msg["role"] == "system":
                    # Capture the latest system message
                    system_content = msg["content"]
                else:
                    # Add user and assistant messages to the messages list
                    api_messages.append(msg)

            # Call the API using the client with proper formatting
            message = anthropic.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=1000,
                system=system_content,  # System prompt as a separate parameter
                messages=api_messages,  # Only user and assistant messages
                temperature=0.7,
            )

            print("Claude API response:", message)

            # Extract and return the response text
            if message.content:
                return message.content[0].text
            else:
                return "Sorry, I received an empty response from Claude."

        except Exception as e:
            logging.error(f"Error calling Claude API: {e}")
            return "Sorry, I encountered an error while processing your message. " \
                    "Please check the API key configuration or try again later."

    def save_conversation(self, user_id: str) -> Dict[str, Any]:
        """
        Extract data from the conversation and save it to storage.
        This is called explicitly when the user presses "Save Conversation".

        Args:
            user_id: Unique identifier for the user

        Returns:
            Dictionary with extraction results and save status
        """
        print("At the start of save_conversation")
        try:
            # Extract data from the full conversation
            extracted_data = self.data_extractor.extract_from_conversation(
                self.conversation_history
            )

            # Prepare the data to save
            data = {
                "family_data": extracted_data,
                "phase": self.current_phase,
                "last_updated": datetime.now().isoformat(),
            }

            # # Save to storage
            # success = self.storage_manager.save_data(user_id, data)

            # Generate a summary for the user
            summary = self.data_extractor.get_summary()

            print("Conversation summary:", summary)
            print("extracted_data:", extracted_data)

            return {
                # "success": success,
                "summary": summary,
                "extraction_status": "complete" if extracted_data else "no_data_found",
            }

        except Exception as e:
            logging.error(f"Error saving conversation data: {e}")
            return {"success": False, "error": str(e), "extraction_status": "failed"}

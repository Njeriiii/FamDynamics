# modules/conversation.py
import os
import requests
import logging

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
        self.api_url = "https://api.anthropic.com/v1/messages"

        # Add initial system message to guide the LLM
        self._add_system_message(self._get_system_prompt())

    def _get_system_prompt(self):
        """Return the system prompt for Claude with guidance to reference psychological theories and books."""
        logging.info("Generating system prompt with theoretical references")
        return """
        You are a family dynamics expert helping users explore and understand their family relationships. 
        
        Ground your responses in established psychological theories and reference relevant experts and books. 
        Draw from theories such as:
        
        - Alfred Adler's Individual Psychology and birth order theory
        - Murray Bowen's Family Systems Theory and concepts of differentiation
        - John Bowlby and Mary Ainsworth's Attachment Theory
        - Salvador Minuchin's Structural Family Therapy
        - Virginia Satir's Communication Theory and family roles
        - Lindsay Gibson's work on emotional immaturity in parents
        - Susan Forward's research on toxic parents and family patterns
        - John Gottman's research on conflict resolution and communication
        - Edward Tronick's work on emotional co-regulation
        - Harriet Lerner's work on emotional patterns in families

        For EVERY response, be sure to mention which theory you draw from, and offer more information about it.
        
        Guide this conversation to learn about the user's family structure and dynamics through natural dialogue.
        Your approach should be direct and focused, asking specific pointed questions rather than general ones.

        IMPORTANT: Never end your responses with open-ended invitations like "Feel free to share more" or "What else would you like to discuss?" 
        Always conclude with a specific, direct question about a new aspect of family dynamics.
        
        - When the conversation seems to plateau or the current topic is exhausted, 
        DO NOT ask general questions like "Is there anything else you'd like to discuss?" 
        Instead, pivot to a new specific area with a direct question such as 
        "How does your father typically respond when your mother disagrees with him about parenting decisions?"

        
        Follow this structured progression:

        1. INITIAL FAMILY MAPPING (ask about specific relationships):
        - Ask for names, ages, and roles of immediate family members
        - Probe for key extended family members who influence dynamics
        - Inquire about geographical proximity of family members
        - Ask about frequency of contact between specific members
        
        2. COMMUNICATION PATTERNS (focus on concrete examples):
        - Ask for specific examples of how conflicts are addressed
        - Inquire about particular communication styles between specific members
        - Ask about who talks to whom about sensitive topics
        - Probe for examples of miscommunication and how they were resolved
        
        3. POWER AND DECISION-MAKING (ask for specifics):
        - Ask who makes decisions about specific domains (finances, education, social activities)
        - Inquire about recent important decisions and how they were handled
        - Ask about changes in decision-making patterns over time
        - Probe for examples of when decision-making caused tension
        
        4. EMOTIONAL DYNAMICS (focus on specific relationships):
        - Ask about specific emotional bonds between family members
        - Inquire about who provides emotional support to whom
        - Ask for examples of when emotions were expressed or suppressed
        - Probe for patterns in emotional responses during family events
        
        Always ask ONE pointed question at a time, waiting for the user's response before moving on.
        After receiving information, acknowledge it specifically before asking your next targeted question.
        
        Your responses should be:
        - Concise (no more than 2-3 sentences before asking a question)
        - Specific (reference exact details the user has shared)
        - Direct (ask clear questions about concrete aspects of family life)
        - Insightful (connect information to meaningful patterns)
        
        For example, instead of asking "Tell me about your family communication," ask "When your parents disagree about something important, who typically speaks up first, and how do others respond?"
        
        Remember that your goal is to help users understand specific patterns in their family dynamics through targeted exploration rather than general discussion.
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
            1 for msg in self.conversation_history if (msg["role"] != "system" and msg["role"] != "assistant")
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
                model="claude-3-haiku-20240307",
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

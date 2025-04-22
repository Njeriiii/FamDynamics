# modules/data_extractor.py
import logging
import json
from typing import Dict, Any
import os

class FamilyDataExtractor:
    """
    Extracts and manages structured family data from conversations.
    Works with the conversation manager to identify and store only key information.
    """

    def __init__(self):
        """Initialize the data extractor."""
        # Core data structure for family information
        self.family_data = {
            "family_members": [],  # List of people with attributes
            "relationships": [],  # Connections between people
            "dynamics": [],  # Patterns of interaction
            "events": [],  # Significant family events
        }
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError(
                "API key not configured. Please set the ANTHROPIC_API_KEY environment variable."
            )

    def extract_from_conversation(self, conversation_history: str) -> Dict[str, Any]:
        """
        Extract family information from a user conversation history using the LLM.

        Args:
            conversation_history: The user's complete conversation history

        Returns:
            Dict containing any newly extracted information
        """

        try:
            # Create a specialized extraction prompt
            extraction_prompt = self._create_extraction_prompt(conversation_history)

            # Get structured data from LLM
            extraction_response = self._call_claude_api(extraction_prompt)

            # Parse the extraction results
            new_data = self._parse_extraction_response(extraction_response)

            # Update the internal family data
            self._update_family_data(new_data)

            print("new_data", new_data)
            return new_data

        except Exception as e:
            logging.error(f"Error extracting family data: {e}")
            return {}

    def _create_extraction_prompt(self, conversation_history: str) -> str:
        """
        Create a prompt specialized for information extraction.

        Args:
            user_message: The user's input message

        Returns:
            Prompt for the LLM to extract structured data
        """
        # Format the conversation history
        formatted_conversation = ""
        for msg in conversation_history:
            if msg["role"] == "user":
                formatted_conversation += f"USER: {msg['content']}\n\n"
            elif msg["role"] == "assistant":
                formatted_conversation += f"ASSISTANT: {msg['content']}\n\n"

        return f"""
        Extract structured information about family relationships from this message. 
        Focus ONLY on concrete facts, not interpretations or assumptions.
        
        USER MESSAGE: {conversation_history}
        
        Identify and extract ONLY the following (if present):
        1. Family members mentioned (names, roles, ages, etc.)
        2. Relationships between people (marriages, siblings, parent-child, etc.)
        3. Family dynamics (communication patterns, decision-making, etc.)
        4. Significant events (divorces, births, deaths, moves, conflicts, etc.)
        
        Format your response as JSON with these categories. Include ONLY what is EXPLICITLY stated.
        If uncertain about any information, exclude it.
        
        Example format:
        {{
            "family_members": [
            {{"role": "father", "name": "John", "age": 45, "attributes": ["works long hours", "quiet"]}}
            ],
            "relationships": [
            {{"type": "marriage", "members": ["mother", "father"], "quality": "tense", "duration": "20 years"}}
            ],
            "dynamics": [
            {{"type": "communication", "pattern": "father rarely speaks at dinner", "members": ["father"]}}
            ],
            "events": [
            {{"type": "conflict", "description": "argument about college", "members": ["mother", "daughter"]}}
            ]
        }}
        
        RESPONSE (JSON ONLY):
        """

    def _call_claude_api(self, extraction_prompt) -> Dict[str, Any]:
        """
        Extract family information from a user message using Claude.
        
        Args:
            user_message: The user's input message
            
        Returns:
            Dict containing any newly extracted information
        """

        try:
            if not self.api_key:
                logging.error(
                    "API key not configured. Please set the ANTHROPIC_API_KEY environment variable"
                )
                return {}

            # Initialize Anthropic client
            from anthropic import Anthropic
            anthropic = Anthropic(api_key=self.api_key)

            # Format messages for Claude
            messages = [{"role": "user", "content": extraction_prompt}]

            # Call the API using the client with proper formatting
            response = anthropic.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=1000,
                system=extraction_prompt,
                messages=messages,
                temperature=0.2,  # Lower temperature for more consistent extraction
            )

            # Extract the response text
            extraction_response = ""
            if response.content:
                extraction_response = response.content[0].text

            print("extraction_response", extraction_response)
            return extraction_response

        except Exception as e:
            logging.error(f"Error extracting family data: {e}")
            return {}

    def _parse_extraction_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the LLM's extraction response into structured data.

        Args:
            response: The LLM's response to the extraction prompt

        Returns:
            Parsed data dictionary
        """
        try:
            # Try to parse the JSON response
            # Strip any non-JSON text that might be in the response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)

                # Validate the data structure
                valid_data = {
                    "family_members": [],
                    "relationships": [],
                    "dynamics": [],
                    "events": [],
                }

                # Copy only valid keys
                for key in valid_data:
                    if key in data and isinstance(data[key], list):
                        valid_data[key] = data[key]

                return valid_data

            return {}

        except json.JSONDecodeError as e:
            logging.error(f"JSON parse error in extraction: {e}")
            return {}
        except Exception as e:
            logging.error(f"Error parsing extraction: {e}")
            return {}

    def _update_family_data(self, new_data: Dict[str, Any]) -> None:
        """
        Update the internal family data with new information.
        Merges new data with existing data, avoiding duplicates.

        Args:
            new_data: Newly extracted family information
        """
        # For each category of data
        for category in self.family_data:
            if category in new_data:
                # Process each new item
                for new_item in new_data[category]:
                    # For family members, check if we already have this person
                    if category == "family_members":
                        self._merge_family_member(new_item)
                    # For other categories, avoid exact duplicates
                    else:
                        if new_item not in self.family_data[category]:
                            self.family_data[category].append(new_item)


    def _merge_family_member(self, new_member: Dict[str, Any]) -> None:
        """
        Merge a newly extracted family member with existing records.
        Updates existing records with new attributes if the member already exists.

        Args:
            new_member: Newly extracted family member data
        """
        # Try to find matching member by name first
        if "name" in new_member and new_member["name"]:
            name = new_member["name"]
            for i, member in enumerate(self.family_data["family_members"]):
                if member.get("name", "") == name:
                    # Merge attributes, but don't overwrite existing ones
                    for key, value in new_member.items():
                        if key not in member:
                            self.family_data["family_members"][i][key] = value
                        elif key == "attributes" and isinstance(value, list):
                            # For attributes, merge the lists without duplicates
                            current_attrs = set(member.get("attributes", []))
                            new_attrs = set(value)
                            self.family_data["family_members"][i]["attributes"] = list(
                                current_attrs | new_attrs
                            )
                    return

        # If no match by name, try to match by role
        if "role" in new_member and new_member["role"]:
            role = new_member["role"]
            for i, member in enumerate(self.family_data["family_members"]):
                if member.get("role", "") == role and "name" not in member:
                    # Found a match by role, merge the records
                    for key, value in new_member.items():
                        if key not in member:
                            self.family_data["family_members"][i][key] = value
                        elif key == "attributes" and isinstance(value, list):
                            current_attrs = set(member.get("attributes", []))
                            new_attrs = set(value)
                            self.family_data["family_members"][i]["attributes"] = list(
                                current_attrs | new_attrs
                            )
                    return

        # If no match found, add as a new member
        self.family_data["family_members"].append(new_member)

    def get_data(self) -> Dict[str, Any]:
        """
        Get the current family data.

        Returns:
            The complete family data structure
        """
        return self.family_data

    def set_data(self, data: Dict[str, Any]) -> None:
        """
        Set the family data from an external source.

        Args:
            data: Family data to set
        """
        # Validate the data structure
        valid_data = {
            "family_members": [],
            "relationships": [],
            "dynamics": [],
            "events": [],
        }

        # Copy only valid keys and ensure they are lists
        for key in valid_data:
            if key in data and isinstance(data[key], list):
                valid_data[key] = data[key]

        self.family_data = valid_data

    def clear_data(self) -> None:
        """Clear all family data."""
        self.family_data = {
            "family_members": [],
            "relationships": [],
            "dynamics": [],
            "events": [],
        }

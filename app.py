# app.py - Main Flask application file
from flask import Flask, render_template, request, jsonify, session
import uuid
import json
import os
import logging
from datetime import timedelta

# Import custom modules
from modules.conversation import FamilyDynamicsConversation

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev_key_for_testing")
# Set session to be permanent with a longer lifetime
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=24)

# Initialize conversation sessions dictionary
# Using a global variable for sessions (consider a proper DB for production)
sessions = {}


@app.route("/")
def index():
    """Render the main page of the application."""
    logger.info("Rendering index page")

    # Make session permanent to extend its lifetime
    session.permanent = True

    # Create a unique session ID if not exists
    if "session_id" not in session:
        session_id = str(uuid.uuid4())
        session["session_id"] = session_id
        logger.info(f"Creating new session: {session_id}")

        # Initialize a new conversation for this session
        sessions[session_id] = FamilyDynamicsConversation()

        # Initialize the conversation with a greeting
        sessions[session_id].process_user_input("__init__")
    else:
        session_id = session["session_id"]
        logger.info(f"Using existing session: {session_id}")

        # Make sure the session exists in our sessions dictionary
        if session_id not in sessions:
            logger.warning(f"Recreating missing session: {session_id}")
            sessions[session_id] = FamilyDynamicsConversation()
            # Initialize the conversation with a greeting
            sessions[session_id].process_user_input("__init__")

    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """Process user messages and return AI responses."""
    data = request.json
    user_input = data.get("message", "")
    session_id = session.get("session_id")

    logger.info(f"Chat endpoint - Session ID: {session_id}")
    logger.info(f"User input: {user_input}")

    # Check if session exists
    if not session_id:
        logger.warning("No session ID found in request")
        # Create a new session
        session_id = str(uuid.uuid4())
        session["session_id"] = session_id
        session.permanent = True
        sessions[session_id] = FamilyDynamicsConversation()
    elif session_id not in sessions:
        logger.warning(f"Session ID {session_id} not found in sessions dictionary")
        # Recreate the session
        sessions[session_id] = FamilyDynamicsConversation()

    try:
        # Process the message with the conversation manager
        conversation = sessions[session_id]
        response = conversation.process_user_input(user_input)

        logger.info(f"AI response for session {session_id}: {response[:30]}...")
        return jsonify({"response": response, "phase": conversation.current_phase})
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}")
        return (
            jsonify(
                {
                    "response": "Sorry, there was an error processing your message.",
                    "error": str(e),
                }
            ),
            500,
        )


@app.route("/api/save", methods=["POST"])
def save_conversation():
    """Explicitly save the conversation data."""

    session_id = session.get("session_id")
    logger.info(f"Save endpoint - Session ID: {session_id}")

    try:
        # Ensure user has a session ID
        if not session_id:
            logger.warning("No session ID found in request")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "No active conversation found",
                        "redirect": True,  # Signal to client to redirect to starting page
                    }
                ),
                404,
            )

        # Save the conversation data
        result = sessions[session_id].save_conversation(session_id)
        logger.info(f"Save result: {result}")
        return jsonify(result)

    except Exception as e:
        logging.error(f"Error saving conversation: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/load_context", methods=["POST"])
def load_context():
    """
    Load saved conversation data into the current session.
    This endpoint is called by the frontend when saved data is detected.
    """
    session_id = session.get("session_id")
    logger.info(f"Load context endpoint - Session ID: {session_id}")

    try:
        # Get the saved data from the request
        data = request.json
        saved_data = data.get("saved_data")

        if not saved_data:
            logger.warning("No saved data provided in request")
            return jsonify({"success": False, "error": "No saved data provided"})

        logger.info(f"Loading saved data into session {session_id}")

        # Create a new conversation with the saved data
        sessions[session_id] = FamilyDynamicsConversation(saved_data=saved_data)

        # Get the initial greeting which will be personalized
        response = sessions[session_id].process_user_input("__init__")

        return jsonify(
            {
                "success": True,
                "message": "Context loaded successfully",
                "response": response,
                "phase": sessions[session_id].current_phase,
            }
        )

    except Exception as e:
        logger.error(f"Error loading context: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/reset", methods=["POST"])
def reset_conversation():
    """Reset the current conversation."""
    session_id = session.get("session_id")

    if session_id:
        # Create a new conversation instance
        sessions[session_id] = FamilyDynamicsConversation()
        # Initialize the conversation with a greeting
        sessions[session_id].process_user_input("__init__")
        logger.info(f"Reset session: {session_id}")

    return jsonify({"status": "success"})


# Add a session cleanup route for development
@app.route("/api/debug/sessions", methods=["GET"])
def debug_sessions():
    """Debug route to see active sessions."""
    if app.debug:
        return jsonify(
            {
                "session_cookie": session.get("session_id"),
                "active_sessions": list(sessions.keys()),
                "session_count": len(sessions),
            }
        )
    return jsonify({"error": "Debug mode is not enabled"}), 403


if __name__ == "__main__":
    app.run(debug=True)

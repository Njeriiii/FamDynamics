# Family Dynamics Analyzer

An interactive conversational application that helps users explore and understand their family dynamics through guided conversation powered by Claude AI.

## Project Overview

The Family Dynamics Analyzer is a web-based chatbot that conducts a structured interview about a user's family relationships and dynamics. Using Claude AI, the application guides users through a conversation that systematically explores:

- Family composition and relationships
- Communication patterns
- Decision-making processes
- Conflict resolution styles
- Emotional connections and support networks

The application analyzes user responses to identify patterns in family relationships and provides personalized insights based on established psychological frameworks such as Bowen Family Systems Theory, Attachment Theory, and Structural Family Therapy.

## Features

- **Interactive chat interface**: Natural conversation with the AI assistant
- **Voice input support**: Speak responses using your device microphone
- **Structured exploration**: Guided interview through different phases of family dynamics
- **Psychological frameworks**: Analysis based on established family therapy models
- **Data extraction**: Captures and organizes family information from conversations
- **Local storage**: Save progress and extracted information for future reference

## Technical Architecture

The system consists of several interconnected components:

- **Frontend**: HTML/CSS/JavaScript web interface
- **Backend**: Flask Python application
- **AI Integration**: Anthropic Claude API for natural language conversation
- **Storage**: Local browser storage for saving conversation data

## Dependencies

- Python 3.8+
- Flask 3.1.0+
- Anthropic Python SDK 0.45.2+

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/family-dynamics-analyzer.git
   cd family-dynamics-analyzer
   ```

2. Create a virtual environment and install dependencies:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   Create a `.env` file in the project root with the following:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. Run the application:
   ```
   flask --app app.py --debug run
   ```

5. Access the application at `http://localhost:5000` in your web browser

## Project Structure

```
family-dynamics-analyzer/
├── app.py                     # Main Flask application
├── modules/
│   ├── __init__.py
│   ├── conversation.py        # Manages conversation with Claude
│   └── data_extractor.py      # Extracts and processes family data
├── static/
│   ├── conversation_script.js # Handles chat interface logic
│   ├── local_storage.js       # Manages browser storage
│   ├── save_data.js           # Handles saving conversation data
│   └── style.css              # Application styling
├── templates/
│   └── index.html             # Main application page
├── .gitignore
├── README.md
└── requirements.txt           # Python dependencies
```

## How It Works

1. **Conversation Flow**:
   - The application presents a chat interface where users interact with the AI assistant
   - Claude guides the conversation through three phases:
     - Initial data collection about family members
     - Deep dive into communication patterns and dynamics
     - Analysis of patterns and insights

2. **Data Extraction**:
   - As users share information, the system extracts structured data about:
     - Family members (names, roles, ages, attributes)
     - Relationships between people
     - Family dynamics (communication patterns, decision-making)
     - Significant events (conflicts, transitions)

3. **Theoretical Framework**:
   - The AI assistant draws from established psychological theories to offer insights
   - Responses reference Adler, Bowen, Bowlby, Minuchin, and other family systems theorists
   - Information is presented in an educational, non-diagnostic manner

## Usage
1. Start a conversation by describing your immediate family members
2. Follow the AI assistant's prompts to explore different aspects of your family dynamics
3. The conversation will naturally progress through different phases of exploration
4. You can use the "Save Conversation" button to store the extracted family data
5. Return to the application later to continue where you left off


## Privacy and Data Security
- All conversation data is processed using Claude AI through the Anthropic API
- Family information can be stored locally in your browser but is not sent to any third-party servers
- No user accounts or persistent identifiers are required
- The application does not collect or store analytics data

## Development Notes
- Flask debug mode enables auto-reloading for development
- The conversation system is designed to maintain context across multiple exchanges
- Session handling uses Flask's session management with extended lifetime

## Credits

- This project uses [Anthropic's Claude AI](https://www.anthropic.com/) for natural language processing
- Psychological frameworks based on established family systems theories
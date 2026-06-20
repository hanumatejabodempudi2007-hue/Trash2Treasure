# Trash to Treasure – Dynamic Inventory & Smart Sales Agent

An AI-powered full-stack inventory management application that identifies slow-moving or dead inventory, audits market pricing gaps, and automatically generates pricing markdowns and copywriting strategies using Python (FastAPI) and an intelligent, dual-mode AI agent (supporting Google Gemini or local rule-based generators).

---

## 📁 Folder Structure

```
trash-to-treasure/
│
├── backend/
│   ├── main.py              # FastAPI core server, upload parsing, and metric auditing
│   ├── agent.py             # Dual-mode AI agent (Gemini API or local fallback engine)
│   ├── requirements.txt     # Python dependencies list
│   └── .env.example         # Template for environment configuration variables
│
├── frontend/
│   ├── index.html           # Main frontend single-page interface
│   ├── styles.css           # Custom dark-mode glassmorphic stylesheet
│   ├── app.js               # Client API bindings, routing, and Chart.js mappings
│   ├── pdf-generator.js      # PDF print generator using html2pdf.js
│   └── sample-data.js        # Static default inventory catalog for testing
│
└── README.md                # System documentation, design decisions, and setup guide
```

---

## 🛠️ Architecture & Design Decisions

### 1. Unified Auditing Rules
All product processing is performed on the backend (`backend/main.py`) using **Pandas** rather than client-side parsing. Moving file parsing, data conversions, and algorithms (Velocity, Turnover Rate, and Dead Stock Risk Score) to the Python layer ensures robust column-header matching, standardizes missing records, and improves processing speeds for large spreadsheets.

### 2. Dual-Mode AI Agent
To prevent API configuration blocks, the AI agent in `backend/agent.py` operates in two modes:
*   **Generative AI Mode**: Activated automatically when a `GEMINI_API_KEY` is present in the environment variables. It calls the Gemini API to analyze products and write context-aware marketing copy.
*   **Local Rule Mode (Fallback)**: If no key is set, the system processes items using a deterministic, rule-based template engine. This ensures the app is fully functional out of the box with zero external APIs or tokens.

### 3. Log Stream Animation
While the Python backend completes audits in fractions of a second, the frontend `app.js` parses the results and feeds them into a typewriter log queue. This keeps the premium AI console animation experience intact, visualising competitor price checks, bundle setups, and copywriting drafts sequentially.

### 4. Client-Side Charting & PDF Exports
We chose to keep Chart.js and PDF generation (`html2pdf.js`) client-side. This leverages the browser's native canvas capabilities and print wrappers to generate beautiful multi-page PDF reports that align perfectly with the UI's responsive typography, avoiding heavy server-side image processing.

---

## 🚀 Setup & Run Instructions

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Installation Steps
Open your command prompt or terminal in the project directory:

```bash
# Navigate to the backend directory
cd trash-to-treasure/backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install the required libraries
pip install -r requirements.txt
```

### 3. Optional: Configure Gemini API Key
To enable real generative copywriting:
1.  Duplicate `.env.example` and rename it to `.env`.
2.  Open `.env` and paste your Google AI studio API key:
    ```env
    GEMINI_API_KEY=AIzaSy...yourKeyHere
    ```

### 4. Running the Application
Start the FastAPI server:

```bash
# From the backend folder:
python main.py
```

FastAPI will spin up a local development server at:
👉 **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**

Open this address in your web browser. The FastAPI server will automatically host the frontend files, compile endpoints, and handle file uploads.
## Demo Video

YouTube (Unlisted):
https://youtu.be/R9OaxFgEvpM?si=uTJDdZ-tvBpLcM-1

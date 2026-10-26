# BigQuery Release Hub 🚀

A modern, high-fidelity web dashboard that fetches, parses, segments, and displays Google BigQuery release notes. The application includes a custom Tweet Composer to help you select individual updates and compose text and open Twitter/X sharing intents.

Built with **Python Flask** for the backend, and **Vanilla HTML5, CSS3, and JavaScript** for the frontend.

---

## Key Features

- **Granular Update Segmentation**: Daily release logs (which Google groups in the feed by day) are split into individual feature, bug fix, issue, or deprecation cards, allowing you to browse and share specific updates.
- **Dynamic Stats Board**: Computes metrics in real time (e.g. Total Releases, Features, Issues, and Deprecations) directly from the live feed.
- **Rich Aesthetics**: Premium deep obsidian dark mode with glassmorphism blurs, HSL custom properties, interactive hover effects, and micro-animations.
- **Search & Pill Filtering**: Instant keyword search matching across categories, dates, and update text, plus animated pill buttons to filter categories.
- **Tweet Composer Modal**: Preview, edit, and copy pre-templated tweets. Includes character limit warnings (> 250 characters) and automatically prevents posting if it exceeds 280 characters.
- **Smooth Refresh States**: Active loading spinners and shimmer skeleton screens to prevent layout shifting during content retrieval.

---

## File Structure

```
bq-release-notes/
├── app.py                      # Flask server & XML feed parsing engine
├── requirements.txt            # Python dependencies
├── .gitignore                  # Excluded folders from version control
├── templates/
│   └── index.html              # HTML5 dashboard markup
└── static/
    ├── css/
    │   └── styles.css          # Vanilla CSS layout, styles, variables, and typography
    └── js/
        └── app.js              # State logic, API fetching, filtering, and Twitter intent composer
```

---

## Setup & Run Instructions

Ensure you have **Python 3** installed on your system.

### 1. Set Up Virtual Environment & Dependencies
In your terminal, navigate to the project directory and run:

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# Windows (Command Prompt)
.\venv\Scripts\activate.bat
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Run the Server
Launch the Flask development server:

```bash
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## Technical Details

### Backend Feed Parser (`app.py`)
The backend uses standard library tools to fetch and parse the Atom feed at `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`:
- Fetches the XML feed with custom browser user-agents to avoid scrapers block.
- Parses the root `{http://www.w3.org/2005/Atom}feed` and traverses entries.
- Segments daily release blocks by splitting the entry's HTML content by `<h3>` tags (e.g. `<h3>Feature</h3>`, `<h3>Issue</h3>`) using regex patterns.
- Strips tags cleanly to generate plain text snippets used in the Twitter composer.

### Web Sharing Intent (`app.js`)
Twitter sharing uses **Twitter Web Intents** to avoid requiring developer API keys or server configuration:
- Formulates a custom pre-composed text:
  ```text
  📢 BigQuery Update (Date): [Type] TruncatedText...
  Read more: https://cloud.google.com/bigquery/docs/release-notes
  #BigQuery #GoogleCloud
  ```
- Safe-truncates the text dynamically so the entire tweet content never exceeds the 280-character limit.
- Clicking **Tweet Now** opens a clean popup window redirecting to `https://twitter.com/intent/tweet?text=...`.


## Checks and service behavior

Use Python 3.11+ and install `pytest` alongside `requirements.txt`, then run `python -m pytest -q`. Tests cover heading segmentation, HTML entities, the Flask page, cache expiry, explicit refresh and upstream failures without contacting Google. The feed cache expires after 15 minutes; `?refresh=true` bypasses it. Upstream failures return HTTP 502 with a generic message. Local debug mode is off by default; use `flask --app app run --debug` only for local debugging.

The live feed requires internet access. Cached data is per process, not a persistent shared store. Tweet composition does not authenticate with X or send posts automatically. Feed HTML originates from Google's configured feed; this is not an arbitrary-URL fetch API.

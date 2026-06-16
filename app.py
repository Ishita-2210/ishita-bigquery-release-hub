import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from html.parser import HTMLParser

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed release notes
cache = {
    "data": None,
}

class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text = []
    
    def handle_data(self, d):
        self.text.append(d)
        
    def get_data(self):
        return ''.join(self.text)

def strip_tags(html_content):
    try:
        s = MLStripper()
        s.feed(html_content)
        return s.get_data()
    except Exception:
        return re.sub(r'<[^>]*>', '', html_content)

def parse_entry_content(content_html):
    """
    Splits the HTML content of a daily entry into individual updates by <h3> tags.
    """
    if not content_html:
        return []
        
    pattern = re.compile(r'<h3>(.*?)</h3>', re.IGNORECASE)
    matches = list(pattern.finditer(content_html))
    updates = []
    
    for i, match in enumerate(matches):
        update_type = match.group(1).strip()
        start_idx = match.end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(content_html)
        
        update_html = content_html[start_idx:end_idx].strip()
        plain_text = strip_tags(update_html)
        # Normalize spaces/newlines
        plain_text = re.sub(r'\s+', ' ', plain_text).strip()
        
        updates.append({
            "type": update_type,
            "html": update_html,
            "text": plain_text
        })
        
    # If no <h3> tag is found, treat the entire block as one update
    if not updates and content_html.strip():
        plain_text = strip_tags(content_html)
        plain_text = re.sub(r'\s+', ' ', plain_text).strip()
        updates.append({
            "type": "Update",
            "html": content_html,
            "text": plain_text
        })
        
    return updates

def fetch_and_parse_feed():
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    atom_ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('.//atom:entry', atom_ns)
    
    parsed_entries = []
    for entry_idx, entry in enumerate(entries):
        title_elem = entry.find('atom:title', atom_ns)
        updated_elem = entry.find('atom:updated', atom_ns)
        id_elem = entry.find('atom:id', atom_ns)
        content_elem = entry.find('atom:content', atom_ns)
        
        title = title_elem.text if title_elem is not None else "Unknown Date"
        updated = updated_elem.text if updated_elem is not None else ""
        entry_id = id_elem.text if id_elem is not None else f"entry-{entry_idx}"
        content_html = content_elem.text if content_elem is not None else ""
        
        # Segment html content by <h3>
        raw_updates = parse_entry_content(content_html)
        
        updates = []
        for update_idx, u in enumerate(raw_updates):
            updates.append({
                "id": f"{entry_id}-u{update_idx}",
                "type": u["type"],
                "html": u["html"],
                "text": u["text"]
            })
            
        parsed_entries.append({
            "id": entry_id,
            "title": title,
            "updated": updated,
            "updates": updates
        })
        
    return parsed_entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or cache["data"] is None:
        try:
            cache["data"] = fetch_and_parse_feed()
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Failed to fetch release notes: {str(e)}"
            }), 500
            
    return jsonify({
        "status": "success",
        "data": cache["data"]
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)

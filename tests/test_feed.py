import time
from unittest.mock import patch
import app as module

def test_segmentation_handles_heading_attributes_and_entities():
    updates = module.parse_entry_content('<h3 class="kind"><b>Feature</b></h3><p>A &amp; B</p><h3>Issue</h3><p>Fix</p>')
    assert [u["type"] for u in updates] == ["Feature", "Issue"]
    assert updates[0]["text"] == "A & B"
    assert module.parse_entry_content("") == []
    assert module.parse_entry_content("<p>No heading</p>")[0]["type"] == "Update"

def test_cache_refresh_and_failure():
    module.cache.update(data=None, fetched_at=0.)
    with module.app.test_client() as client:
        with patch.object(module,"fetch_and_parse_feed",return_value=[{"id":"fixture"}]) as fetch:
            assert client.get("/").status_code == 200
            assert client.get("/api/release-notes").json["data"] == [{"id":"fixture"}]
            client.get("/api/release-notes")
            assert fetch.call_count == 1
            client.get("/api/release-notes?refresh=true")
            assert fetch.call_count == 2
            module.cache["fetched_at"] = time.monotonic()-901
            client.get("/api/release-notes")
            assert fetch.call_count == 3
        with patch.object(module,"fetch_and_parse_feed",side_effect=OSError("private details")):
            response=client.get("/api/release-notes?refresh=true")
            assert response.status_code == 502
            assert "private details" not in response.get_data(as_text=True)

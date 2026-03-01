"""
ZIP Batch Import API Tests - Iteration 9
Tests for: POST /api/articles/import-batch endpoint
New feature: Import multiple documents from a ZIP file
"""

import pytest
import requests
import os
import tempfile
import zipfile
import io

BASE_URL = os.environ.get('VITE_BACKEND_URL', 'https://star-trek-kb.preview.emergentagent.com')


class TestBatchImportAuth:
    """Test authentication requirements for batch import"""
    
    def test_batch_import_requires_auth(self):
        """Test that batch import endpoint requires authentication"""
        # Create a minimal ZIP
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("test.md", "# Test Content")
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            files={"file": ("test.zip", zip_buffer, "application/zip")}
        )
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✓ Batch import correctly requires authentication")
    
    def test_batch_import_requires_captain_role(self):
        """Test that only captain role can use batch import"""
        # Login as nummer_eins (not captain)
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "nummer1", "password": "makeitso"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Create a minimal ZIP
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("test.md", "# Test Content")
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test.zip", zip_buffer, "application/zip")}
        )
        
        # Should be 403 Forbidden for non-captain role
        assert response.status_code == 403, f"Expected 403, got: {response.status_code} - {response.text}"
        print("✓ Batch import correctly requires captain role")


class TestBatchImportValidation:
    """Test input validation for batch import"""
    
    @pytest.fixture
    def captain_token(self):
        """Get captain auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "captain", "password": "engage"}
        )
        return response.json()["token"]
    
    def test_batch_import_rejects_non_zip(self, captain_token):
        """Test that non-ZIP files are rejected"""
        # Try to upload a .txt file
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("test.txt", b"plain text content", "text/plain")}
        )
        
        assert response.status_code == 400, f"Expected 400, got: {response.status_code}"
        error = response.json()
        assert "ZIP" in error.get("detail", ""), f"Error message should mention ZIP: {error}"
        print("✓ Non-ZIP files correctly rejected")
    
    def test_batch_import_rejects_invalid_zip(self, captain_token):
        """Test that corrupt/invalid ZIP files are rejected"""
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("test.zip", b"this is not a zip file", "application/zip")}
        )
        
        assert response.status_code == 400, f"Expected 400, got: {response.status_code}"
        print("✓ Invalid ZIP files correctly rejected")


class TestBatchImportFunctionality:
    """Test core batch import functionality"""
    
    @pytest.fixture
    def captain_token(self):
        """Get captain auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "captain", "password": "engage"}
        )
        return response.json()["token"]
    
    def test_batch_import_md_files(self, captain_token):
        """Test importing multiple .md files from ZIP"""
        # Create a ZIP with multiple markdown files
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("TEST_doc1.md", """# Windows VPN Setup Guide
            
Instructions for setting up VPN on Windows computers.
Check firewall and network settings.""")
            
            zf.writestr("TEST_doc2.md", """# MacOS Outlook Configuration

Steps to configure Outlook email client on macOS.
Ensure Exchange connection is stable.""")
        
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("test_batch.zip", zip_buffer, "application/zip")}
        )
        
        assert response.status_code == 200, f"Batch import failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_files" in data
        assert "imported_count" in data
        assert "skipped_count" in data
        assert "error_count" in data
        assert "results" in data
        
        # Verify both files were imported
        assert data["imported_count"] == 2, f"Expected 2 imported, got: {data['imported_count']}"
        assert data["total_files"] == 2, f"Expected 2 total, got: {data['total_files']}"
        
        # Verify results structure
        assert "imported" in data["results"]
        assert "skipped" in data["results"]
        assert "errors" in data["results"]
        
        # Verify imported file details
        for imported in data["results"]["imported"]:
            assert "file" in imported
            assert "title" in imported
            assert "category" in imported
            assert "article_id" in imported
        
        print(f"✓ Batch import successful - {data['imported_count']} files imported")
        print(f"  Imported files: {[i['file'] for i in data['results']['imported']]}")
    
    def test_batch_import_html_files(self, captain_token):
        """Test importing .html files from ZIP"""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("TEST_guide.html", """<!DOCTYPE html>
<html>
<head><title>Network Troubleshooting</title></head>
<body>
<h1>Netzwerk Troubleshooting Guide</h1>
<p>Steps to diagnose network issues with WLAN and Drucker connectivity.</p>
</body>
</html>""")
        
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("html_batch.zip", zip_buffer, "application/zip")}
        )
        
        assert response.status_code == 200, f"HTML import failed: {response.text}"
        data = response.json()
        
        assert data["imported_count"] == 1
        print(f"✓ HTML file import successful")
    
    def test_batch_import_skips_unsupported_formats(self, captain_token):
        """Test that unsupported formats (.docx, .xlsx) are skipped with reason"""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # One valid file
            zf.writestr("TEST_valid.md", "# Valid Markdown Content")
            # Unsupported formats
            zf.writestr("TEST_invalid.docx", "fake docx content")
            zf.writestr("TEST_invalid.xlsx", "fake xlsx content")
            zf.writestr("TEST_invalid.pptx", "fake pptx content")
        
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("mixed_batch.zip", zip_buffer, "application/zip")}
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # Should import 1, skip 3
        assert data["imported_count"] == 1, f"Expected 1 imported, got: {data['imported_count']}"
        assert data["skipped_count"] >= 3, f"Expected at least 3 skipped, got: {data['skipped_count']}"
        
        # Verify skip reasons
        for skipped in data["results"]["skipped"]:
            assert "file" in skipped
            assert "reason" in skipped
            assert "Format nicht unterstuetzt" in skipped["reason"] or "format" in skipped["reason"].lower()
        
        print(f"✓ Unsupported formats correctly skipped with reasons")
        print(f"  Skipped files: {[s['file'] + ': ' + s['reason'] for s in data['results']['skipped']]}")
    
    def test_batch_import_auto_categorizes_from_filename(self, captain_token):
        """Test auto-categorization from [KATEGORIE]-Titel.ext filename pattern"""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("[TROUBLESHOOTING] - TEST_Drucker Problem.md", "# Drucker Problem\n\nDrucker druckt nicht")
            zf.writestr("[ANLEITUNG] - TEST_iPad Setup.md", "# iPad Setup\n\nIntune Konfiguration fuer iPad")
            zf.writestr("[PROZESS] - TEST_Backup Workflow.md", "# Backup Prozess\n\nTaegliche Backup Routine")
        
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("categorized_batch.zip", zip_buffer, "application/zip")}
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        assert data["imported_count"] == 3, f"Expected 3 imported, got: {data['imported_count']}"
        
        # Verify categories were parsed correctly
        categories = {i["file"]: i["category"] for i in data["results"]["imported"]}
        
        # Check troubleshooting
        ts_file = [f for f in categories.keys() if "Drucker" in f][0]
        assert categories[ts_file] == "troubleshooting", f"Expected troubleshooting, got: {categories[ts_file]}"
        
        # Check anleitung
        an_file = [f for f in categories.keys() if "iPad" in f][0]
        assert categories[an_file] == "anleitung", f"Expected anleitung, got: {categories[an_file]}"
        
        # Check prozess
        pr_file = [f for f in categories.keys() if "Backup" in f][0]
        assert categories[pr_file] == "prozess", f"Expected prozess, got: {categories[pr_file]}"
        
        print(f"✓ Auto-categorization from filename pattern working")
        print(f"  Categories: {categories}")
    
    def test_batch_import_generates_claude_summary(self, captain_token):
        """Test that Claude summary is generated for each file"""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("TEST_summary_test.md", """# Exchange Server Konfiguration

## Uebersicht
Diese Anleitung beschreibt die Konfiguration des Exchange Servers.

## Schritte
1. Server Rollen installieren
2. Datenbank erstellen
3. Postfaecher konfigurieren

## Wichtig
Backup vor Aenderungen durchfuehren.""")
        
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("summary_test.zip", zip_buffer, "application/zip")}
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        assert data["imported_count"] == 1
        article_id = data["results"]["imported"][0]["article_id"]
        
        # Fetch the created article to verify summary
        article_response = requests.get(f"{BASE_URL}/api/articles/{article_id}")
        assert article_response.status_code == 200
        article = article_response.json()
        
        # Verify summary exists and is not empty
        assert "summary" in article
        assert len(article["summary"]) > 10, f"Summary too short: {article['summary']}"
        
        print(f"✓ Claude summary generated: {article['summary'][:100]}...")
    
    def test_batch_import_skips_macosx_folders(self, captain_token):
        """Test that __MACOSX system folders are skipped"""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("TEST_valid_doc.md", "# Valid Document")
            zf.writestr("__MACOSX/TEST_valid_doc.md", "mac metadata")
            zf.writestr("__MACOSX/._TEST_valid_doc.md", "more mac metadata")
        
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("macosx_test.zip", zip_buffer, "application/zip")}
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # Should only import the valid file, not the MACOSX ones
        assert data["imported_count"] == 1
        assert data["results"]["imported"][0]["file"] == "TEST_valid_doc.md"
        
        print(f"✓ __MACOSX folders correctly skipped")
    
    def test_batch_import_empty_zip(self, captain_token):
        """Test handling of empty ZIP files"""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            pass  # Empty ZIP
        
        zip_buffer.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/articles/import-batch",
            headers={"Authorization": f"Bearer {captain_token}"},
            files={"file": ("empty.zip", zip_buffer, "application/zip")}
        )
        
        assert response.status_code == 200  # Should not fail, just have 0 imports
        data = response.json()
        
        assert data["imported_count"] == 0
        assert data["total_files"] == 0
        
        print(f"✓ Empty ZIP handled gracefully")


class TestSingleFileImportStillWorks:
    """Verify single file import still works after batch import feature"""
    
    @pytest.fixture
    def captain_token(self):
        """Get captain auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "captain", "password": "engage"}
        )
        return response.json()["token"]
    
    def test_single_file_import_works(self, captain_token):
        """Test that POST /api/articles/import still accepts single files"""
        md_content = """# TEST Single Import Document

This document tests that single file import still works.
Contains information about WLAN and network troubleshooting.
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(md_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = requests.post(
                    f"{BASE_URL}/api/articles/import",
                    headers={"Authorization": f"Bearer {captain_token}"},
                    files={"file": ("TEST_single_import.md", f, "text/markdown")}
                )
            
            assert response.status_code == 200, f"Single import failed: {response.text}"
            data = response.json()
            
            assert "article_id" in data
            assert "title" in data
            assert "summary" in data
            assert "wlan" in data["tags"]
            
            print(f"✓ Single file import still works - Title: {data['title']}")
            
        finally:
            os.unlink(temp_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

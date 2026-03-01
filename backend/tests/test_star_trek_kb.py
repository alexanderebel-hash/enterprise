"""
Star Trek Knowledge Base API Tests
Tests for: Auth (ENV credentials migration), Dashboard, Articles, Categories,
Enterprise Map/Locations, and the new Scribe-Import feature.
"""

import pytest
import requests
import os
import tempfile

BASE_URL = os.environ.get('VITE_BACKEND_URL', 'https://star-trek-kb.preview.emergentagent.com')

class TestHealth:
    """Health check tests - run first"""
    
    def test_health_endpoint(self):
        """Verify backend is online"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "stardate" in data
        assert data["ship"] == "USS Enterprise NCC-1701-D"
        print(f"✓ Health check passed - Ship: {data['ship']}")


class TestAuthCredentialsMigration:
    """Test login with ENV-based credentials (migrated from hardcoded)"""
    
    def test_captain_login(self):
        """Test Captain P login with password 'engage' from SEED_CAPTAIN_PASSWORD env var"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "captain", "password": "engage"}
        )
        assert response.status_code == 200, f"Captain login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "captain"
        assert data["user"]["role"] == "captain"
        assert data["user"]["display_name"] == "Captain P"
        print(f"✓ Captain login successful - Role: {data['user']['role']}")
        return data["token"]
    
    def test_nummer_eins_login(self):
        """Test Nummer Eins login with password 'makeitso' from SEED_NUMMER_EINS_PASSWORD env var"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "nummer1", "password": "makeitso"}
        )
        assert response.status_code == 200, f"Nummer Eins login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "nummer1"
        assert data["user"]["role"] == "nummer_eins"
        assert data["user"]["display_name"] == "Nummer Eins"
        print(f"✓ Nummer Eins login successful - Role: {data['user']['role']}")
    
    def test_invalid_login(self):
        """Test that invalid credentials are rejected"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "captain", "password": "wrong_password"}
        )
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_get_me_with_token(self):
        """Test /api/auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "captain", "password": "engage"}
        )
        token = login_response.json()["token"]
        
        # Then get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "captain"
        print(f"✓ /api/auth/me returned user: {data['display_name']}")


class TestDashboard:
    """Dashboard stats endpoint tests"""
    
    def test_dashboard_stats(self):
        """Test dashboard stats returns expected data structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_articles" in data
        assert "total_categories" in data
        assert "category_stats" in data
        assert "recent_articles" in data
        
        # Verify data types
        assert isinstance(data["total_articles"], int)
        assert isinstance(data["total_categories"], int)
        assert isinstance(data["category_stats"], list)
        assert isinstance(data["recent_articles"], list)
        
        print(f"✓ Dashboard stats: {data['total_articles']} articles, {data['total_categories']} categories")


class TestCategories:
    """Category endpoint tests"""
    
    def test_get_categories(self):
        """Test getting all categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 5  # Seeded categories
        
        # Verify category structure
        for cat in data:
            assert "category_id" in cat
            assert "name" in cat
            assert "description" in cat
        
        category_ids = [c["category_id"] for c in data]
        expected_ids = ["troubleshooting", "anleitung", "prozess", "konfiguration", "aufzeichnung"]
        for eid in expected_ids:
            assert eid in category_ids, f"Missing category: {eid}"
        
        print(f"✓ Got {len(data)} categories")


class TestArticles:
    """Article CRUD endpoint tests"""
    
    def test_get_articles(self):
        """Test getting all articles"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1  # At least seeded articles
        
        # Verify article structure
        for art in data:
            assert "article_id" in art
            assert "title" in art
            assert "content" in art
            assert "category_id" in art
        
        print(f"✓ Got {len(data)} articles")
    
    def test_get_articles_by_category(self):
        """Test filtering articles by category"""
        response = requests.get(f"{BASE_URL}/api/articles?category=anleitung")
        assert response.status_code == 200
        data = response.json()
        
        # All returned should be in anleitung category
        for art in data:
            assert art["category_id"] == "anleitung"
        
        print(f"✓ Got {len(data)} articles in 'anleitung' category")
    
    def test_search_articles(self):
        """Test article search"""
        response = requests.get(f"{BASE_URL}/api/articles?search=Scribe")
        assert response.status_code == 200
        data = response.json()
        
        # Should find articles mentioning Scribe
        assert len(data) >= 1, "Should find at least one article with 'Scribe'"
        print(f"✓ Search found {len(data)} articles matching 'Scribe'")


class TestScribeImport:
    """Test the new Scribe-Import feature - POST /api/articles/import"""
    
    @pytest.fixture
    def captain_token(self):
        """Get captain auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "captain", "password": "engage"}
        )
        return response.json()["token"]
    
    def test_import_markdown_file(self, captain_token):
        """Test importing a .md file returns article with title, category, summary, tags"""
        # Create a test markdown file
        md_content = """# Windows Server Troubleshooting Guide

## Problem: Server Not Responding

When the Windows server stops responding, follow these steps:

1. Check network connectivity
2. Verify server processes
3. Review event logs
4. Restart critical services

## Solution

Run the diagnostic script and check the firewall settings.
Ensure VPN connections are stable.
"""
        
        # Create temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(md_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = requests.post(
                    f"{BASE_URL}/api/articles/import",
                    headers={"Authorization": f"Bearer {captain_token}"},
                    files={"file": ("test_doc.md", f, "text/markdown")}
                )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            
            # Verify response structure
            assert "article_id" in data
            assert "title" in data
            assert "content" in data
            assert "summary" in data
            assert "category_id" in data
            assert "tags" in data
            
            # Verify content was extracted
            assert len(data["content"]) > 100
            assert "Windows" in data["content"]
            
            # Verify auto-tags were detected
            assert isinstance(data["tags"], list)
            assert "windows" in data["tags"], f"Expected 'windows' tag, got: {data['tags']}"
            
            print(f"✓ Import successful - Title: {data['title']}")
            print(f"  Summary: {data['summary'][:100]}...")
            print(f"  Tags: {data['tags']}")
            print(f"  Category: {data['category_id']}")
            
        finally:
            os.unlink(temp_path)
    
    def test_import_with_category_in_filename(self, captain_token):
        """Test [KATEGORIE] - Titel.ext filename pattern parsing"""
        md_content = """# Test Document

This is test content for the TROUBLESHOOTING category.
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(md_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = requests.post(
                    f"{BASE_URL}/api/articles/import",
                    headers={"Authorization": f"Bearer {captain_token}"},
                    files={"file": ("[TROUBLESHOOTING] - Drucker Fehler beheben.md", f, "text/markdown")}
                )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            
            # Verify category was parsed from filename
            assert data["category_id"] == "troubleshooting", f"Expected 'troubleshooting', got: {data['category_id']}"
            
            # Verify title was extracted from filename
            assert "Drucker Fehler beheben" in data["title"], f"Expected title from filename, got: {data['title']}"
            
            print(f"✓ Filename pattern parsed - Category: {data['category_id']}, Title: {data['title']}")
            
        finally:
            os.unlink(temp_path)
    
    def test_import_requires_auth(self):
        """Test that import endpoint requires authentication"""
        md_content = "# Test"
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(md_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = requests.post(
                    f"{BASE_URL}/api/articles/import",
                    files={"file": ("test.md", f, "text/markdown")}
                )
            
            assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
            print("✓ Import correctly requires authentication")
            
        finally:
            os.unlink(temp_path)
    
    def test_import_invalid_format_rejected(self, captain_token):
        """Test that unsupported file formats are rejected"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.docx', delete=False) as f:
            f.write("test content")
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = requests.post(
                    f"{BASE_URL}/api/articles/import",
                    headers={"Authorization": f"Bearer {captain_token}"},
                    files={"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
                )
            
            assert response.status_code == 400, f"Expected 400 for invalid format, got: {response.status_code}"
            print("✓ Invalid format correctly rejected")
            
        finally:
            os.unlink(temp_path)


class TestLocationsAndTickets:
    """Enterprise Map locations and tickets endpoint tests"""
    
    def test_get_locations(self):
        """Test getting all ship locations"""
        response = requests.get(f"{BASE_URL}/api/locations")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 8  # Seeded locations
        
        # Verify location structure
        for loc in data:
            assert "location_id" in loc
            assert "name" in loc
            assert "ship_section" in loc
            assert "open_tickets" in loc
        
        print(f"✓ Got {len(data)} locations")
    
    def test_get_location_detail(self):
        """Test getting a specific location with tickets"""
        response = requests.get(f"{BASE_URL}/api/locations/bruecke")
        assert response.status_code == 200
        data = response.json()
        
        assert data["location_id"] == "bruecke"
        assert data["name"] == "Baumschulenstr. 24"
        assert "tickets" in data
        
        print(f"✓ Got location detail: {data['name']}")
    
    def test_get_tickets(self):
        """Test getting tickets list"""
        response = requests.get(f"{BASE_URL}/api/tickets")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # Verify ticket structure if tickets exist
        if len(data) > 0:
            assert "ticket_id" in data[0]
            assert "title" in data[0]
            assert "location_id" in data[0]
            assert "status" in data[0]
        
        print(f"✓ Got {len(data)} tickets")


class TestStardate:
    """Stardate calculator endpoint test"""
    
    def test_get_stardate(self):
        """Test stardate endpoint returns valid format"""
        response = requests.get(f"{BASE_URL}/api/stardate")
        assert response.status_code == 200
        data = response.json()
        
        assert "stardate" in data
        assert "earth_date" in data
        
        # Stardate should be a number string like "44123.5"
        stardate = float(data["stardate"])
        assert stardate > 40000  # TNG era stardates
        
        print(f"✓ Current stardate: {data['stardate']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

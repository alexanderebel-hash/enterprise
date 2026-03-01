#!/usr/bin/env python3
"""
Backend API Tests for LCARS Knowledge Database
Tests all API endpoints with proper authentication and data validation
"""
import requests
import sys
import json
from datetime import datetime

class LCARSAPITester:
    def __init__(self):
        self.base_url = "https://2c4ae1be-ee19-4b31-b304-079672acd46d.preview.emergentagent.com"
        self.captain_token = None
        self.nummer_eins_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_articles = []
        
    def log(self, message, success=None):
        """Log test results with emoji indicators"""
        if success is True:
            print(f"✅ {message}")
        elif success is False:
            print(f"❌ {message}")
        else:
            print(f"🔍 {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test and return success status and response"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
                
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"Passed - {name} (Status: {response.status_code})", True)
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                self.log(f"Failed - {name} (Expected {expected_status}, got {response.status_code})", False)
                try:
                    error_data = response.json()
                    self.log(f"Error details: {error_data}")
                except:
                    self.log(f"Response text: {response.text}")
                return False, {}
                
        except Exception as e:
            self.log(f"Failed - {name} (Error: {str(e)})", False)
            return False, {}

    def test_health_endpoint(self):
        """Test health endpoint"""
        success, response = self.run_test("Health Check", "GET", "/api/health", 200)
        if success:
            self.log(f"Ship status: {response.get('ship', 'Unknown')}")
            self.log(f"Status: {response.get('status', 'Unknown')}")
        return success

    def test_login_captain(self):
        """Test Captain P login"""
        success, response = self.run_test(
            "Captain P Login", 
            "POST", 
            "/api/auth/login",
            200,
            {"username": "captain", "password": "engage"}
        )
        if success and "token" in response:
            self.captain_token = response["token"]
            user_info = response.get("user", {})
            self.log(f"Captain logged in: {user_info.get('display_name')} (Role: {user_info.get('role')})")
            return True
        return False

    def test_login_nummer_eins(self):
        """Test Nummer Eins login"""
        success, response = self.run_test(
            "Nummer Eins Login", 
            "POST", 
            "/api/auth/login",
            200,
            {"username": "nummer1", "password": "makeitso"}
        )
        if success and "token" in response:
            self.nummer_eins_token = response["token"]
            user_info = response.get("user", {})
            self.log(f"Nummer Eins logged in: {user_info.get('display_name')} (Role: {user_info.get('role')})")
            return True
        return False

    def test_auth_me_endpoints(self):
        """Test /auth/me endpoint for both users"""
        captain_success, captain_data = self.run_test(
            "Captain Auth Me", "GET", "/api/auth/me", 200, token=self.captain_token
        )
        
        nummer_success, nummer_data = self.run_test(
            "Nummer Eins Auth Me", "GET", "/api/auth/me", 200, token=self.nummer_eins_token
        )
        
        return captain_success and nummer_success

    def test_categories_endpoints(self):
        """Test categories endpoints"""
        # Test getting categories (public endpoint)
        success, categories = self.run_test("Get Categories", "GET", "/api/categories", 200)
        
        if success:
            self.log(f"Found {len(categories)} categories")
            expected_categories = ["TROUBLESHOOTING", "ANLEITUNG", "PROZESS", "KONFIGURATION", "AUFZEICHNUNG"]
            category_names = [cat.get("name") for cat in categories]
            
            for expected in expected_categories:
                if expected in category_names:
                    self.log(f"Category found: {expected}", True)
                else:
                    self.log(f"Category missing: {expected}", False)
                    success = False
                    
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, stats = self.run_test("Dashboard Stats", "GET", "/api/dashboard/stats", 200)
        
        if success:
            total_articles = stats.get("total_articles", 0)
            total_categories = stats.get("total_categories", 0) 
            category_stats = stats.get("category_stats", [])
            recent_articles = stats.get("recent_articles", [])
            
            self.log(f"Dashboard stats - Articles: {total_articles}, Categories: {total_categories}")
            
            # Verify expected counts
            if total_articles >= 6:
                self.log(f"Articles count OK: {total_articles}", True)
            else:
                self.log(f"Articles count low: {total_articles} (expected >= 6)", False)
                success = False
                
            if total_categories >= 5:
                self.log(f"Categories count OK: {total_categories}", True)
            else:
                self.log(f"Categories count low: {total_categories} (expected >= 5)", False)
                success = False
                
        return success

    def test_articles_endpoints(self):
        """Test articles CRUD operations"""
        # Test getting all articles
        success, articles = self.run_test("Get All Articles", "GET", "/api/articles", 200)
        
        if success:
            self.log(f"Found {len(articles)} articles")
            
            # Test getting articles by category
            if articles:
                first_article_category = articles[0].get("category_id")
                if first_article_category:
                    cat_success, cat_articles = self.run_test(
                        f"Get Articles by Category ({first_article_category})", 
                        "GET", 
                        f"/api/articles?category={first_article_category}", 
                        200
                    )
                    success = success and cat_success
                    
                # Test search functionality
                search_success, search_results = self.run_test(
                    "Search Articles", "GET", "/api/articles?search=Scribe", 200
                )
                success = success and search_success
                
                # Test getting specific article
                if articles:
                    article_id = articles[0].get("article_id")
                    if article_id:
                        article_success, article_data = self.run_test(
                            "Get Specific Article", "GET", f"/api/articles/{article_id}", 200
                        )
                        success = success and article_success
                        
        return success

    def test_article_creation_captain(self):
        """Test article creation as Captain (should succeed)"""
        if not self.captain_token:
            self.log("No captain token available for article creation test", False)
            return False
            
        test_article = {
            "title": "Test Artikel - API Test",
            "content": "# Test Content\n\nDies ist ein Test-Artikel erstellt während der API-Tests.",
            "summary": "Test-Artikel für API-Validierung",
            "category_id": "troubleshooting",
            "tags": ["test", "api", "validation"]
        }
        
        success, response = self.run_test(
            "Create Article (Captain)", 
            "POST", 
            "/api/articles",
            201,
            test_article,
            self.captain_token
        )
        
        if success and "article_id" in response:
            self.test_articles.append(response["article_id"])
            self.log(f"Test article created with ID: {response['article_id']}")
            
        return success

    def test_article_creation_nummer_eins(self):
        """Test article creation as Nummer Eins (should fail with 403)"""
        if not self.nummer_eins_token:
            self.log("No Nummer Eins token available for article creation test", False)
            return False
            
        test_article = {
            "title": "Test Artikel - Unauthorized",
            "content": "This should fail",
            "summary": "Should be forbidden",
            "category_id": "troubleshooting",
            "tags": ["unauthorized"]
        }
        
        # This should fail with 403 Forbidden
        success, _ = self.run_test(
            "Create Article (Nummer Eins - should fail)", 
            "POST", 
            "/api/articles",
            403,
            test_article,
            self.nummer_eins_token
        )
        
        return success

    def test_chat_functionality(self):
        """Test AI computer chat functionality"""
        if not self.captain_token:
            self.log("No captain token for chat test", False)
            return False
            
        test_message = {
            "message": "Hallo Computer, welche Tools gibt es für Prozess-Aufzeichnung?",
            "session_id": f"test-session-{datetime.now().strftime('%H%M%S')}"
        }
        
        success, response = self.run_test(
            "AI Computer Chat", 
            "POST", 
            "/api/chat",
            200,
            test_message,
            self.captain_token
        )
        
        if success:
            chat_response = response.get("response", "")
            session_id = response.get("session_id", "")
            self.log(f"Chat response length: {len(chat_response)} characters")
            self.log(f"Session ID: {session_id}")
            
            # Test chat history
            history_success, history = self.run_test(
                "Get Chat History",
                "GET",
                f"/api/chat/history?session_id={session_id}",
                200,
                token=self.captain_token
            )
            success = success and history_success
            
        return success

    def cleanup_test_data(self):
        """Clean up test articles created during testing"""
        for article_id in self.test_articles:
            cleanup_success, _ = self.run_test(
                f"Delete Test Article {article_id[:8]}", 
                "DELETE", 
                f"/api/articles/{article_id}",
                200,
                token=self.captain_token
            )

    def run_all_tests(self):
        """Run complete test suite"""
        print("=" * 60)
        print("🚀 LCARS KNOWLEDGE DATABASE - API TEST SUITE")
        print("=" * 60)
        
        # Health check first
        if not self.test_health_endpoint():
            self.log("❌ Health check failed - stopping tests", False)
            return False
            
        # Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 40)
        captain_login = self.test_login_captain()
        nummer_login = self.test_login_nummer_eins()
        
        if not (captain_login and nummer_login):
            self.log("❌ Login tests failed - stopping tests", False)
            return False
            
        auth_me = self.test_auth_me_endpoints()
        
        # Data endpoints
        print("\n📊 DATA ENDPOINT TESTS")
        print("-" * 40)
        categories = self.test_categories_endpoints()
        dashboard = self.test_dashboard_stats()
        articles = self.test_articles_endpoints()
        
        # Authorization tests
        print("\n🛡️ AUTHORIZATION TESTS")
        print("-" * 40)
        article_create_captain = self.test_article_creation_captain()
        article_create_nummer = self.test_article_creation_nummer_eins()
        
        # AI Integration tests
        print("\n🤖 AI INTEGRATION TESTS")
        print("-" * 40)
        chat_test = self.test_chat_functionality()
        
        # Cleanup
        print("\n🧹 CLEANUP")
        print("-" * 40)
        self.cleanup_test_data()
        
        # Results
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT - All major functionality working!")
            return True
        elif success_rate >= 70:
            print("⚠️  GOOD - Minor issues detected")
            return False
        else:
            print("🚨 CRITICAL - Major functionality broken")
            return False

def main():
    tester = LCARSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
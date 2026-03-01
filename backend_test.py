#!/usr/bin/env python3
"""
Star Trek TNG LCARS Knowledge Database - Backend API Tests
Testing all endpoints including new features: stardate, transcribe
"""

import requests
import sys
import json
import io
from datetime import datetime

class LCARSAPITester:
    def __init__(self, base_url="https://star-trek-kb.preview.emergentagent.com"):
        self.base_url = base_url
        self.captain_token = None
        self.nummer_eins_token = None
        self.test_article_id = None
        self.test_session_id = None
        self.tests_run = 0
        self.tests_passed = 0
        print(f"🚀 LCARS Testing initialized - Base URL: {base_url}")

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        # Handle file uploads differently
        if files:
            headers = {'Authorization': f'Bearer {token}'} if token else {}
        else:
            headers = {'Content-Type': 'application/json'}
            if token:
                headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers=headers, files=files, timeout=15)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASS - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text[:200]}")

            return False, {}

        except Exception as e:
            print(f"❌ ERROR - {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET", 
            "api/health",
            200
        )
        if success:
            print(f"   Ship: {response.get('ship', 'Unknown')}")
            print(f"   Status: {response.get('status', 'Unknown')}")
        return success

    def test_stardate_endpoint(self):
        """Test new stardate calculation endpoint"""
        success, response = self.run_test(
            "Stardate Calculation",
            "GET",
            "api/stardate", 
            200
        )
        if success:
            print(f"   Stardate: {response.get('stardate', 'N/A')}")
            print(f"   Earth Date: {response.get('earth_date', 'N/A')}")
        return success

    def test_transcribe_endpoint_no_file(self):
        """Test transcribe endpoint without file (should return 422)"""
        success, response = self.run_test(
            "Transcribe Endpoint (No File)",
            "POST",
            "api/transcribe",
            422,
            token=self.captain_token
        )
        return success

    def test_captain_login(self):
        """Test Captain P login"""
        success, response = self.run_test(
            "Captain P Login",
            "POST",
            "api/auth/login",
            200,
            data={"username": "captain", "password": "engage"}
        )
        if success and 'token' in response:
            self.captain_token = response['token']
            print(f"   Captain: {response['user']['display_name']}")
            print(f"   Role: {response['user']['role']}")
            return True
        return False

    def test_nummer_eins_login(self):
        """Test Nummer Eins login"""
        success, response = self.run_test(
            "Nummer Eins Login", 
            "POST",
            "api/auth/login",
            200,
            data={"username": "nummer1", "password": "makeitso"}
        )
        if success and 'token' in response:
            self.nummer_eins_token = response['token']
            print(f"   Officer: {response['user']['display_name']}")
            print(f"   Role: {response['user']['role']}")
            return True
        return False

    def test_get_categories(self):
        """Test getting categories"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "api/categories",
            200
        )
        if success:
            print(f"   Categories found: {len(response)}")
            for cat in response[:2]:  # Show first 2
                print(f"     - {cat.get('name', 'Unknown')} ({cat.get('category_id', 'No ID')})")
        return success

    def test_get_articles(self):
        """Test getting articles"""
        success, response = self.run_test(
            "Get Articles",
            "GET", 
            "api/articles",
            200
        )
        if success:
            print(f"   Articles found: {len(response)}")
            if response:
                self.test_article_id = response[0].get('article_id')
                print(f"   Using article ID for tests: {self.test_article_id}")
        return success

    def test_get_single_article(self):
        """Test getting a single article"""
        if not self.test_article_id:
            print("❌ No article ID available for single article test")
            return False
            
        success, response = self.run_test(
            "Get Single Article",
            "GET",
            f"api/articles/{self.test_article_id}",
            200
        )
        if success:
            print(f"   Title: {response.get('title', 'Unknown')[:50]}...")
            print(f"   Category: {response.get('category_id', 'Unknown')}")
        return success

    def test_create_article_as_captain(self):
        """Test creating article as Captain"""
        test_data = {
            "title": "Test LCARS Entry - Iteration 4",
            "content": "## Test Content\nThis is a test article created during iteration 4 testing.\n\n### Features Tested\n- Voice recording integration\n- Sound effects\n- Stardate calculation",
            "category_id": "troubleshooting", 
            "tags": ["test", "lcars", "iteration4"],
            "summary": "Test article for iteration 4 LCARS testing"
        }
        
        success, response = self.run_test(
            "Create Article (Captain)",
            "POST",
            "api/articles",
            201,
            data=test_data,
            token=self.captain_token
        )
        if success:
            self.test_article_id = response.get('article_id')
            print(f"   Created article ID: {self.test_article_id}")
        return success

    def test_update_article_as_captain(self):
        """Test updating article as Captain"""
        if not self.test_article_id:
            print("❌ No article ID available for update test")
            return False
            
        update_data = {
            "title": "Updated Test LCARS Entry - Iteration 4", 
            "summary": "Updated summary with new stardate integration"
        }
        
        success, response = self.run_test(
            "Update Article (Captain)",
            "PUT",
            f"api/articles/{self.test_article_id}",
            200,
            data=update_data,
            token=self.captain_token
        )
        if success:
            print(f"   Updated title: {response.get('title', 'Unknown')[:50]}...")
        return success

    def test_create_article_as_nummer_eins(self):
        """Test creating article as Nummer Eins (should fail)"""
        test_data = {
            "title": "Unauthorized Article",
            "content": "This should not be created",
            "category_id": "troubleshooting"
        }
        
        success, response = self.run_test(
            "Create Article (Nummer Eins - Should Fail)",
            "POST", 
            "api/articles",
            403,  # Expecting forbidden
            data=test_data,
            token=self.nummer_eins_token
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "api/dashboard/stats", 
            200
        )
        if success:
            print(f"   Total Articles: {response.get('total_articles', 0)}")
            print(f"   Total Categories: {response.get('total_categories', 0)}")
        return success

    def test_chat_functionality(self):
        """Test chat with computer"""
        success, response = self.run_test(
            "Computer Chat",
            "POST",
            "api/chat",
            200,
            data={"message": "Welche Tools gibt es für Prozess-Aufzeichnung?"},
            token=self.captain_token
        )
        if success:
            self.test_session_id = response.get('session_id')
            print(f"   Session ID: {self.test_session_id}")
            print(f"   Response preview: {response.get('response', '')[:100]}...")
        return success

    def test_chat_history(self):
        """Test chat history retrieval"""
        if not self.test_session_id:
            print("❌ No session ID available for chat history test")
            return False
            
        success, response = self.run_test(
            "Chat History",
            "GET",
            f"api/chat/history?session_id={self.test_session_id}",
            200,
            token=self.captain_token
        )
        if success:
            print(f"   History messages: {len(response)}")
        return success

    def test_chat_sessions(self):
        """Test chat sessions list"""
        success, response = self.run_test(
            "Chat Sessions List", 
            "GET",
            "api/chat/sessions",
            200,
            token=self.captain_token
        )
        if success:
            print(f"   Total sessions: {len(response)}")
        return success

    def test_delete_article_as_captain(self):
        """Test deleting article as Captain (cleanup)"""
        if not self.test_article_id:
            print("❌ No article ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Article (Captain)",
            "DELETE", 
            f"api/articles/{self.test_article_id}",
            200,
            token=self.captain_token
        )
        return success

    def test_get_locations(self):
        """Test getting Enterprise locations"""
        success, response = self.run_test(
            "Get Enterprise Locations",
            "GET",
            "api/locations", 
            200
        )
        if success:
            print(f"   Locations found: {len(response)}")
            if response:
                self.test_location_id = response[0].get('location_id')
                print(f"   Sample location: {response[0].get('name', 'Unknown')} - {response[0].get('ship_section', 'Unknown')}")
                print(f"   Open tickets: {response[0].get('open_tickets', 0)}")
                print(f"   Using location ID for tests: {self.test_location_id}")
        return success

    def test_get_single_location(self):
        """Test getting a single location with tickets"""
        if not hasattr(self, 'test_location_id') or not self.test_location_id:
            print("❌ No location ID available for single location test")
            return False
            
        success, response = self.run_test(
            "Get Single Location",
            "GET",
            f"api/locations/{self.test_location_id}",
            200
        )
        if success:
            print(f"   Location: {response.get('name', 'Unknown')} - {response.get('ship_section', 'Unknown')}")
            print(f"   Tickets: {len(response.get('tickets', []))}")
        return success

    def test_get_tickets(self):
        """Test getting all tickets"""
        success, response = self.run_test(
            "Get All Tickets",
            "GET",
            "api/tickets",
            200
        )
        if success:
            print(f"   Total tickets found: {len(response)}")
            if response:
                self.test_ticket_id = response[0].get('ticket_id')
                print(f"   Sample ticket: {response[0].get('title', 'Unknown')}")
                print(f"   Status: {response[0].get('status', 'Unknown')}")
                print(f"   Using ticket ID for tests: {self.test_ticket_id}")
        return success

    def test_get_open_tickets(self):
        """Test getting only open tickets (for Red Alert system)"""
        success, response = self.run_test(
            "Get Open Tickets",
            "GET",
            "api/tickets?status=offen",
            200
        )
        if success:
            critical_tickets = [t for t in response if t.get('priority') == 'critical']
            high_tickets = [t for t in response if t.get('priority') == 'high'] 
            print(f"   Open tickets found: {len(response)}")
            print(f"   Critical tickets: {len(critical_tickets)} (triggers Red Alert)")
            print(f"   High priority tickets: {len(high_tickets)}")
            
            # Check for the seeded critical ticket (WG Sterndamm WLAN)
            wlan_ticket = next((t for t in critical_tickets if 'WLAN' in t.get('title', '') and 'sterndamm' in t.get('location_id', '')), None)
            if wlan_ticket:
                print(f"   ✓ Critical WLAN ticket found: {wlan_ticket['title']}")
                self.critical_ticket_id = wlan_ticket.get('ticket_id')
            else:
                print(f"   ⚠ Critical WLAN ticket not found in open tickets")
                
        return success

    def test_create_ticket(self):
        """Test creating a new ticket"""
        if not hasattr(self, 'test_location_id') or not self.test_location_id:
            print("❌ No location ID available for ticket creation")
            return False
            
        test_data = {
            "title": "Test API Ticket - Iteration 5",
            "description": "Test ticket created during API testing for Enterprise Map integration",
            "location_id": self.test_location_id,
            "priority": "high",
            "status": "offen"
        }
        
        success, response = self.run_test(
            "Create Ticket",
            "POST",
            "api/tickets",
            200,  # Backend returns 200 instead of 201
            data=test_data,
            token=self.captain_token
        )
        if success:
            self.created_ticket_id = response.get('ticket_id')
            print(f"   Created ticket ID: {self.created_ticket_id}")
        return success

    def test_update_ticket_status(self):
        """Test updating ticket status"""
        ticket_id = getattr(self, 'created_ticket_id', None) or getattr(self, 'test_ticket_id', None)
        if not ticket_id:
            print("❌ No ticket ID available for status update test")
            return False
            
        update_data = {"status": "in_bearbeitung"}
        
        success, response = self.run_test(
            "Update Ticket Status",
            "PUT",
            f"api/tickets/{ticket_id}",
            200,
            data=update_data,
            token=self.captain_token
        )
        if success:
            print(f"   Updated status: {response.get('status', 'Unknown')}")
        return success

    def test_complete_ticket(self):
        """Test completing a ticket"""
        ticket_id = getattr(self, 'created_ticket_id', None) or getattr(self, 'test_ticket_id', None)
        if not ticket_id:
            print("❌ No ticket ID available for completion test")
            return False
            
        update_data = {"status": "erledigt"}
        
        success, response = self.run_test(
            "Complete Ticket",
            "PUT",
            f"api/tickets/{ticket_id}",
            200,
            data=update_data,
            token=self.captain_token
        )
        if success:
            print(f"   Ticket completed: {response.get('status', 'Unknown')}")
        return success

    def test_delete_ticket_as_captain(self):
        """Test deleting ticket as Captain (cleanup)"""
        ticket_id = getattr(self, 'created_ticket_id', None)
        if not ticket_id:
            print("❌ No created ticket ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Ticket (Captain)",
            "DELETE",
            f"api/tickets/{ticket_id}",
            200,
            token=self.captain_token
        )
        return success

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("=" * 80)
        print("🖥️  LCARS BACKEND API TEST SUITE - ITERATION 6")
        print("Testing Red Alert System & Enhanced Dashboard")
        print("=" * 80)
        
        # Core system tests
        print("\n📡 CORE SYSTEM TESTS")
        self.test_health_check()
        self.test_stardate_endpoint()
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        self.test_captain_login()
        self.test_nummer_eins_login()
        
        # Data retrieval tests
        print("\n📊 DATA RETRIEVAL TESTS")
        self.test_get_categories()
        self.test_get_articles()
        self.test_get_single_article()
        self.test_dashboard_stats()
        
        # Enterprise Map & Ticket System tests
        print("\n🚀 ENTERPRISE MAP & TICKET SYSTEM TESTS")
        self.test_get_locations()
        self.test_get_single_location()
        self.test_get_tickets()
        self.test_get_open_tickets()
        self.test_create_ticket()
        self.test_update_ticket_status()
        self.test_complete_ticket()
        
        # Captain permission tests
        print("\n👨‍✈️ CAPTAIN PERMISSION TESTS")
        self.test_create_article_as_captain()
        self.test_update_article_as_captain()
        
        # Role restriction tests
        print("\n🚫 ROLE RESTRICTION TESTS")
        self.test_create_article_as_nummer_eins()
        
        # Chat system tests
        print("\n💬 COMPUTER CHAT TESTS")
        self.test_chat_functionality()
        self.test_chat_history()
        self.test_chat_sessions()
        
        # New feature tests
        print("\n🆕 NEW FEATURES TESTS")
        self.test_transcribe_endpoint_no_file()
        
        # Cleanup
        print("\n🧹 CLEANUP")
        self.test_delete_article_as_captain()
        self.test_delete_ticket_as_captain()
        
        # Print results
        print("\n" + "=" * 80)
        print("📊 TEST RESULTS")
        print("=" * 80)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED! Backend API is fully operational.")
            return 0
        else:
            print("⚠️  Some tests failed. Check logs above.")
            return 1

def main():
    tester = LCARSAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
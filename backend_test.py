import requests
import sys
import json
from datetime import datetime, timedelta

class CRMAPITester:
    def __init__(self, base_url="https://bridge-hospitality.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'hotels': [],
            'operators': [],
            'bookings': [],
            'commissions': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'id' in response_data:
                        print(f"   Response ID: {response_data['id']}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_login(self):
        """Test authentication login"""
        print("\n🔐 Testing Authentication...")
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@hotelbridge.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_hotels_crud(self):
        """Test Hotels CRUD operations"""
        print("\n🏨 Testing Hotels Module...")
        
        # Test GET all hotels
        success, hotels = self.run_test("Get All Hotels", "GET", "hotels/", 200)
        if not success:
            return False
        
        # Test CREATE hotel
        hotel_data = {
            "name": "Test Grand Hotel",
            "city": "Paris",
            "country": "France",
            "contactPerson": "John Doe",
            "email": "john@testhotel.com",
            "phone": "+33123456789",
            "rooms": 150,
            "starCategory": 5,
            "contractType": "exclusive",
            "commission": 12.5,
            "ratesLow": 200.0,
            "ratesMid": 300.0,
            "ratesHigh": 450.0,
            "blackoutDates": [],
            "status": "active",
            "notes": "Test hotel for API testing"
        }
        
        success, hotel = self.run_test("Create Hotel", "POST", "hotels/", 201, data=hotel_data)
        if not success:
            return False
        
        hotel_id = hotel.get('id')
        if hotel_id:
            self.created_ids['hotels'].append(hotel_id)
            
            # Test GET specific hotel
            success, _ = self.run_test(f"Get Hotel {hotel_id}", "GET", f"hotels/{hotel_id}", 200)
            if not success:
                return False
            
            # Test UPDATE hotel
            update_data = {
                "name": "Updated Test Grand Hotel",
                "commission": 15.0
            }
            success, _ = self.run_test(f"Update Hotel {hotel_id}", "PUT", f"hotels/{hotel_id}", 200, data=update_data)
            if not success:
                return False
        
        return True

    def test_operators_crud(self):
        """Test Operators CRUD operations"""
        print("\n👥 Testing Operators Module...")
        
        # Test GET all operators
        success, operators = self.run_test("Get All Operators", "GET", "operators/", 200)
        if not success:
            return False
        
        # Test CREATE operator
        operator_data = {
            "companyName": "Test Travel Agency",
            "contactPerson": "Jane Smith",
            "country": "Germany",
            "type": "dmc",
            "email": "jane@testagency.com",
            "phone": "+49123456789",
            "businessPotential": "high",
            "notes": "Test operator for API testing"
        }
        
        success, operator = self.run_test("Create Operator", "POST", "operators/", 201, data=operator_data)
        if not success:
            return False
        
        operator_id = operator.get('id')
        if operator_id:
            self.created_ids['operators'].append(operator_id)
            
            # Test GET specific operator
            success, _ = self.run_test(f"Get Operator {operator_id}", "GET", f"operators/{operator_id}", 200)
            if not success:
                return False
            
            # Test UPDATE operator
            update_data = {
                "businessPotential": "medium"
            }
            success, _ = self.run_test(f"Update Operator {operator_id}", "PUT", f"operators/{operator_id}", 200, data=update_data)
            if not success:
                return False
        
        return True

    def test_bookings_crud(self):
        """Test Bookings CRUD operations"""
        print("\n📅 Testing Bookings Module...")
        
        # Test GET all bookings
        success, bookings = self.run_test("Get All Bookings", "GET", "bookings/", 200)
        if not success:
            return False
        
        # Need hotel and operator IDs for booking
        if not self.created_ids['hotels'] or not self.created_ids['operators']:
            print("❌ Cannot test bookings without hotel and operator IDs")
            return False
        
        hotel_id = self.created_ids['hotels'][0]
        operator_id = self.created_ids['operators'][0]
        
        # Test CREATE booking
        check_in = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        check_out = (datetime.now() + timedelta(days=35)).strftime('%Y-%m-%d')
        
        booking_data = {
            "groupName": "Test Corporate Group",
            "operatorId": operator_id,
            "operatorName": "Test Travel Agency",
            "destination": "Paris",
            "hotelId": hotel_id,
            "hotelName": "Test Grand Hotel",
            "checkIn": check_in,
            "checkOut": check_out,
            "nights": 5,
            "rooms": 10,
            "ratePerRoom": 250.0,
            "status": "confirmed",
            "notes": "Test booking for API testing"
        }
        
        success, booking = self.run_test("Create Booking", "POST", "bookings/", 201, data=booking_data)
        if not success:
            return False
        
        booking_id = booking.get('id')
        if booking_id:
            self.created_ids['bookings'].append(booking_id)
            
            # Verify total revenue calculation
            expected_revenue = 10 * 5 * 250.0  # rooms * nights * rate
            actual_revenue = booking.get('totalRevenue')
            if actual_revenue == expected_revenue:
                print(f"✅ Revenue calculation correct: €{actual_revenue}")
            else:
                print(f"❌ Revenue calculation incorrect: expected €{expected_revenue}, got €{actual_revenue}")
            
            # Test GET specific booking
            success, _ = self.run_test(f"Get Booking {booking_id}", "GET", f"bookings/{booking_id}", 200)
            if not success:
                return False
            
            # Test UPDATE booking
            update_data = {
                "rooms": 12,
                "ratePerRoom": 275.0
            }
            success, updated_booking = self.run_test(f"Update Booking {booking_id}", "PUT", f"bookings/{booking_id}", 200, data=update_data)
            if success:
                # Verify updated revenue calculation
                expected_revenue = 12 * 5 * 275.0
                actual_revenue = updated_booking.get('totalRevenue')
                if actual_revenue == expected_revenue:
                    print(f"✅ Updated revenue calculation correct: €{actual_revenue}")
                else:
                    print(f"❌ Updated revenue calculation incorrect: expected €{expected_revenue}, got €{actual_revenue}")
        
        return True

    def test_commissions_crud(self):
        """Test Commissions CRUD operations"""
        print("\n💰 Testing Commissions Module...")
        
        # Test GET all commissions
        success, commissions = self.run_test("Get All Commissions", "GET", "commissions/", 200)
        if not success:
            return False
        
        # Need booking ID for commission
        if not self.created_ids['bookings']:
            print("❌ Cannot test commissions without booking ID")
            return False
        
        booking_id = self.created_ids['bookings'][0]
        
        # Test CREATE commission
        commission_data = {
            "bookingId": booking_id,
            "groupName": "Test Corporate Group",
            "totalBookingValue": 16500.0,
            "marginPerRoom": 25.0,
            "totalMargin": 300.0,
            "commissionPercent": 12.0,
            "commissionAmount": 1980.0,
            "paymentStatus": "pending",
            "paymentDueDate": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        }
        
        success, commission = self.run_test("Create Commission", "POST", "commissions/", 201, data=commission_data)
        if not success:
            return False
        
        commission_id = commission.get('id')
        if commission_id:
            self.created_ids['commissions'].append(commission_id)
            
            # Test GET specific commission
            success, _ = self.run_test(f"Get Commission {commission_id}", "GET", f"commissions/{commission_id}", 200)
            if not success:
                return False
            
            # Test GET commission by booking
            success, _ = self.run_test(f"Get Commission by Booking {booking_id}", "GET", f"commissions/booking/{booking_id}", 200)
            if not success:
                return False
            
            # Test UPDATE commission (payment status)
            update_data = {
                "paymentStatus": "paid",
                "paidDate": datetime.now().strftime('%Y-%m-%d')
            }
            success, _ = self.run_test(f"Update Commission {commission_id}", "PUT", f"commissions/{commission_id}", 200, data=update_data)
            if not success:
                return False
        
        return True

    def test_dashboard_endpoints(self):
        """Test Dashboard endpoints"""
        print("\n📊 Testing Dashboard Module...")
        
        # Test dashboard stats
        success, stats = self.run_test("Get Dashboard Stats", "GET", "dashboard/stats", 200)
        if not success:
            return False
        
        # Verify stats structure
        expected_fields = ['totalRevenue', 'totalRoomNights', 'totalCommission', 'pendingPayments', 
                          'confirmedBookings', 'totalHotels', 'totalOperators']
        for field in expected_fields:
            if field not in stats:
                print(f"❌ Missing field in stats: {field}")
                return False
        print(f"✅ Dashboard stats structure correct")
        
        # Test monthly revenue
        success, monthly = self.run_test("Get Monthly Revenue", "GET", "dashboard/monthly-revenue", 200)
        if not success:
            return False
        
        # Test top hotels
        success, top_hotels = self.run_test("Get Top Hotels", "GET", "dashboard/top-hotels", 200)
        if not success:
            return False
        
        # Test top operators
        success, top_operators = self.run_test("Get Top Operators", "GET", "dashboard/top-operators", 200)
        if not success:
            return False
        
        return True

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete in reverse order due to dependencies
        for commission_id in self.created_ids['commissions']:
            self.run_test(f"Delete Commission {commission_id}", "DELETE", f"commissions/{commission_id}", 200)
        
        for booking_id in self.created_ids['bookings']:
            self.run_test(f"Delete Booking {booking_id}", "DELETE", f"bookings/{booking_id}", 200)
        
        for operator_id in self.created_ids['operators']:
            self.run_test(f"Delete Operator {operator_id}", "DELETE", f"operators/{operator_id}", 200)
        
        for hotel_id in self.created_ids['hotels']:
            self.run_test(f"Delete Hotel {hotel_id}", "DELETE", f"hotels/{hotel_id}", 200)

def main():
    print("🚀 Starting CRM API Testing...")
    tester = CRMAPITester()
    
    try:
        # Test authentication first (optional - may not be implemented yet)
        # tester.test_auth_login()
        
        # Test all modules
        if not tester.test_hotels_crud():
            print("❌ Hotels module tests failed")
            return 1
        
        if not tester.test_operators_crud():
            print("❌ Operators module tests failed")
            return 1
        
        if not tester.test_bookings_crud():
            print("❌ Bookings module tests failed")
            return 1
        
        if not tester.test_commissions_crud():
            print("❌ Commissions module tests failed")
            return 1
        
        if not tester.test_dashboard_endpoints():
            print("❌ Dashboard module tests failed")
            return 1
        
        # Clean up test data
        tester.cleanup_test_data()
        
        # Print final results
        print(f"\n📊 Final Results:")
        print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
        print(f"   Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
        
        if tester.tests_passed == tester.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1
            
    except Exception as e:
        print(f"❌ Testing failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
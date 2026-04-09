import asyncio
from database import db
from datetime import datetime

async def seed_data():
    """Seed initial data into the database"""
    
    # Clear existing data
    await db.hotels.delete_many({})
    await db.operators.delete_many({})
    await db.bookings.delete_many({})
    await db.commissions.delete_many({})
    
    print("Cleared existing data...")
    
    # Seed Hotels
    hotels = [
        {
            "name": "Grand Hotel Europa",
            "city": "Rome",
            "country": "Italy",
            "contactPerson": "Marco Rossi",
            "email": "marco.rossi@grandeuropa.com",
            "phone": "+39 06 1234 5678",
            "rooms": 120,
            "starCategory": 4,
            "contractType": "commission",
            "commission": 12,
            "ratesLow": 80,
            "ratesMid": 120,
            "ratesHigh": 180,
            "blackoutDates": ["2025-12-24", "2025-12-31"],
            "status": "active",
            "notes": "Excellent property in central Rome. Preferred partner for Indian groups.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "name": "Château de Luxe",
            "city": "Paris",
            "country": "France",
            "contactPerson": "Sophie Laurent",
            "email": "sophie@chateaudeluxe.fr",
            "phone": "+33 1 4567 8901",
            "rooms": 85,
            "starCategory": 4,
            "contractType": "net",
            "commission": 15,
            "ratesLow": 100,
            "ratesMid": 150,
            "ratesHigh": 220,
            "blackoutDates": ["2025-07-14"],
            "status": "active",
            "notes": "Boutique hotel near Eiffel Tower. Great for high-end groups.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "name": "Alpine Resort",
            "city": "Interlaken",
            "country": "Switzerland",
            "contactPerson": "Hans Mueller",
            "email": "hans@alpineresort.ch",
            "phone": "+41 33 123 4567",
            "rooms": 200,
            "starCategory": 3,
            "contractType": "commission",
            "commission": 10,
            "ratesLow": 90,
            "ratesMid": 130,
            "ratesHigh": 190,
            "blackoutDates": [],
            "status": "active",
            "notes": "Large property, excellent for groups. Mountain views.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    ]
    
    hotels_result = await db.hotels.insert_many(hotels)
    print(f"Seeded {len(hotels_result.inserted_ids)} hotels")
    
    # Seed Operators
    operators = [
        {
            "companyName": "Nexus DMC India",
            "contactPerson": "Raj Kumar",
            "country": "India",
            "type": "DMC",
            "email": "raj@nexusdmc.in",
            "phone": "+91 11 2345 6789",
            "businessPotential": "high",
            "notes": "Top DMC, 500+ groups annually. Excellent payment record.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "companyName": "Global Tours & Travels",
            "contactPerson": "Priya Sharma",
            "country": "India",
            "type": "operator",
            "email": "priya@globaltours.in",
            "phone": "+91 22 3456 7890",
            "businessPotential": "high",
            "notes": "Specializes in European tours. Very professional.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "companyName": "Wanderlust Travel Agency",
            "contactPerson": "Amit Patel",
            "country": "India",
            "type": "agent",
            "email": "amit@wanderlust.in",
            "phone": "+91 79 4567 8901",
            "businessPotential": "medium",
            "notes": "Growing agency, focus on honeymoon packages.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    ]
    
    operators_result = await db.operators.insert_many(operators)
    operator_ids = [str(id) for id in operators_result.inserted_ids]
    hotel_ids = [str(id) for id in hotels_result.inserted_ids]
    print(f"Seeded {len(operator_ids)} operators")
    
    # Seed Bookings
    bookings = [
        {
            "groupName": "Mumbai Corporate Incentive",
            "operatorId": operator_ids[0],
            "operatorName": "Nexus DMC India",
            "destination": "Rome",
            "hotelId": hotel_ids[0],
            "hotelName": "Grand Hotel Europa",
            "checkIn": "2025-03-15",
            "checkOut": "2025-03-18",
            "nights": 3,
            "rooms": 40,
            "ratePerRoom": 150,
            "totalRevenue": 18000,
            "status": "confirmed",
            "notes": "Corporate incentive group. Breakfast included.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "groupName": "Delhi Wedding Group",
            "operatorId": operator_ids[1],
            "operatorName": "Global Tours & Travels",
            "destination": "Paris",
            "hotelId": hotel_ids[1],
            "hotelName": "Château de Luxe",
            "checkIn": "2025-04-10",
            "checkOut": "2025-04-14",
            "nights": 4,
            "rooms": 25,
            "ratePerRoom": 180,
            "totalRevenue": 18000,
            "status": "confirmed",
            "notes": "Wedding group, special dinner arrangement needed.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "groupName": "Bangalore Cultural Tour",
            "operatorId": operator_ids[0],
            "operatorName": "Nexus DMC India",
            "destination": "Interlaken",
            "hotelId": hotel_ids[2],
            "hotelName": "Alpine Resort",
            "checkIn": "2025-05-20",
            "checkOut": "2025-05-24",
            "nights": 4,
            "rooms": 50,
            "ratePerRoom": 140,
            "totalRevenue": 28000,
            "status": "confirmed",
            "notes": "Cultural tour group, vegetarian meals required.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "groupName": "Pune Senior Citizens",
            "operatorId": operator_ids[2],
            "operatorName": "Wanderlust Travel Agency",
            "destination": "Rome",
            "hotelId": hotel_ids[0],
            "hotelName": "Grand Hotel Europa",
            "checkIn": "2025-06-05",
            "checkOut": "2025-06-09",
            "nights": 4,
            "rooms": 30,
            "ratePerRoom": 130,
            "totalRevenue": 15600,
            "status": "quoted",
            "notes": "Awaiting confirmation from client.",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    ]
    
    bookings_result = await db.bookings.insert_many(bookings)
    booking_ids = [str(id) for id in bookings_result.inserted_ids]
    print(f"Seeded {len(booking_ids)} bookings")
    
    # Seed Commissions
    commissions = [
        {
            "bookingId": booking_ids[0],
            "groupName": "Mumbai Corporate Incentive",
            "totalBookingValue": 18000,
            "marginPerRoom": 30,
            "totalMargin": 3600,
            "commissionPercent": 12,
            "commissionAmount": 2160,
            "paymentStatus": "received",
            "paymentDueDate": "2025-04-15",
            "paidDate": "2025-04-10",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "bookingId": booking_ids[1],
            "groupName": "Delhi Wedding Group",
            "totalBookingValue": 18000,
            "marginPerRoom": 40,
            "totalMargin": 4000,
            "commissionPercent": 15,
            "commissionAmount": 2700,
            "paymentStatus": "pending",
            "paymentDueDate": "2025-05-14",
            "paidDate": None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "bookingId": booking_ids[2],
            "groupName": "Bangalore Cultural Tour",
            "totalBookingValue": 28000,
            "marginPerRoom": 25,
            "totalMargin": 5000,
            "commissionPercent": 10,
            "commissionAmount": 2800,
            "paymentStatus": "pending",
            "paymentDueDate": "2025-06-24",
            "paidDate": None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    ]
    
    commissions_result = await db.commissions.insert_many(commissions)
    print(f"Seeded {len(commissions_result.inserted_ids)} commissions")
    
    print("\n✅ Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())

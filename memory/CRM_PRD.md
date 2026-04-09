# HotelBridge CRM System - Product Requirements Document

## Project Overview
**System Name:** HotelBridge CRM  
**Project Type:** Full-featured Customer Relationship Management System  
**Industry:** Hotel Sales Representation & Group Travel  
**Integration:** Connected to HotelBridge main website

## Original Requirements
Build a comprehensive CRM web application for managing hotel partnerships, DMC/operators, group bookings, revenue tracking, and commission tracking. System includes AI chatbot powered by OpenAI GPT-4o for natural language data operations.

## Technology Stack
- **Frontend:** React 19, React Router v7, Recharts
- **UI Components:** Shadcn/UI
- **Styling:** Tailwind CSS (Navy blue, white, gold theme)
- **Backend:** FastAPI (Python) - to be implemented
- **Database:** MongoDB - to be implemented
- **AI Integration:** OpenAI GPT-4o (via Emergent LLM key) - to be implemented

## User Personas
1. **Sales Manager (Primary)**
   - Daily booking management
   - Revenue tracking
   - Commission monitoring

2. **Admin (Primary)**
   - Hotel contract management
   - Operator relationship management
   - Full system access

3. **Finance Team (Secondary)**
   - Commission payment tracking
   - Financial reporting

## What's Been Implemented (Phase 1 - Frontend)

### ✅ Authentication System
- Login page with demo credentials
- Protected routes for CRM
- Session-based authentication (localStorage)
- Demo: admin@hotelbridge.com / admin123

### ✅ CRM Layout & Navigation
- Sidebar navigation with icons
- Header with user info and logout
- Mobile responsive sidebar
- Clean corporate design with navy/white/gold theme

### ✅ Dashboard Module
- **6 KPI Cards:**
  - Total Confirmed Revenue: €64,000
  - Total Room Nights: 420
  - Total Commission: €7,660
  - Pending Payments: €5,500
  - Active Hotels: 3
  - Partner Operators: 3

- **Charts (Recharts):**
  - Monthly Revenue & Commission line chart
  - Top Performing Hotels bar chart
  - Top Operators by Revenue table

- **Recent Activity:**
  - Latest bookings display
  - Status indicators

### ✅ Hotels Module
- **List View:**
  - Grid layout with hotel cards
  - Search/filter by name, city, country
  - Hotel details display:
    * Name, city, country
    * Contact person, email, phone
    * Star category (visual stars)
    * Total rooms
    * Contract type (commission/net)
    * Commission percentage
    * Status badge
    * Notes section
  - Mock data: 3 hotels (Rome, Paris, Interlaken)

### ✅ Operators/DMC Module
- **List View:**
  - Grid layout with operator cards
  - Search/filter functionality
  - Operator details:
    * Company name
    * Contact person, email, phone
    * Country
    * Type (DMC/operator/agent)
    * Business potential (high/medium/low)
    * Notes
  - Mock data: 3 operators

### ✅ Group Bookings Module
- **List View:**
  - Booking cards with full details
  - Search/filter by group, hotel, destination
  - Booking information:
    * Group name
    * Linked operator
    * Hotel & destination
    * Check-in/check-out dates
    * Number of nights & rooms
    * Rate per room
    * **Auto-calculated total revenue**
    * Status (confirmed/quoted/cancelled)
    * Notes
  - Mock data: 4 bookings

### ✅ Revenue & Commission Module
- **Summary Cards:**
  - Total Booking Value
  - Total Commission
  - Received Payments
  - Pending Payments

- **Commission Table:**
  - Group name
  - Booking value
  - Margin per room & total margin
  - Commission percentage
  - Commission amount
  - Due date
  - Payment status
  - Paid date
  - Mock data: 3 commission records

### ✅ AI Assistant Module
- **Chat Interface:**
  - Conversational UI with message history
  - User & assistant message bubbles
  - Timestamp display
  - Loading indicator
  - Enter key support

- **Quick Commands:**
  - Pre-written query templates
  - Click to populate input

- **Mock AI Capabilities (to be replaced with real OpenAI):**
  - Add new group bookings
  - Show business summaries
  - Show pending commissions
  - Business insights

- **Note:** Currently using simulated responses, real OpenAI GPT-4o integration pending backend implementation

### ✅ Mock Data
Complete mock data sets for all modules with realistic business scenarios

## Prioritized Backlog

### P0 - Backend Implementation (Next Phase)
- [ ] MongoDB Models:
  - Hotel model (with rates, blackout dates, commission)
  - Operator model
  - Booking model (with auto-calculations)
  - Commission model (linked to bookings)
  - User model (authentication)
  - ChatHistory model (for AI assistant)

- [ ] API Endpoints:
  - Hotels CRUD (/api/hotels)
  - Operators CRUD (/api/operators)
  - Bookings CRUD (/api/bookings) with revenue calculations
  - Commission tracking (/api/commissions)
  - Dashboard analytics (/api/dashboard/stats)
  - Authentication (/api/auth/login, /api/auth/logout)

- [ ] OpenAI GPT-4o Integration:
  - Chat endpoint (/api/ai/chat)
  - Function calling for CRM operations
  - Natural language booking creation
  - Data queries and insights
  - Chat history persistence

- [ ] Excel Export:
  - Hotels export
  - Operators export
  - Bookings export
  - Commission reports
  - Combined revenue reports

### P1 - Enhanced Features
- [ ] Add/Edit Forms for all modules
- [ ] Detail view pages for hotels, operators, bookings
- [ ] Date range filters for bookings/revenue
- [ ] Advanced search with multiple filters
- [ ] Bulk operations
- [ ] Email notifications for pending payments
- [ ] Calendar view for bookings
- [ ] Document uploads (hotel contracts, etc.)

### P2 - Advanced Features
- [ ] Multi-user roles (Admin, Sales, Finance, View-only)
- [ ] User management dashboard
- [ ] Activity logs and audit trail
- [ ] Advanced analytics and forecasting
- [ ] WhatsApp/Email integration for reminders
- [ ] Mobile app (React Native)
- [ ] API rate limiting and security
- [ ] Data backup and recovery

## AI Assistant Capabilities (To Be Implemented)

### Natural Language Commands:
1. **Booking Management:**
   - "Add new group with 30 rooms in Paris for 2 nights at 100 euro from Nexus DMC"
   - "Update booking #123 to confirmed"
   - "Cancel booking for Mumbai group"

2. **Data Queries:**
   - "Show total confirmed business this month"
   - "Show pending commission payments"
   - "List top performing hotels"
   - "Show all bookings in Paris"

3. **Updates:**
   - "Update Grand Hotel Europa commission to 15%"
   - "Mark payment received for booking #456"
   - "Add blackout dates Dec 24-31 for Alpine Resort"

4. **Insights:**
   - "Which operator brings most revenue?"
   - "What's the average booking value?"
   - "Show revenue trend for last 6 months"

## Next Action Items
1. Implement MongoDB models and database connections
2. Create FastAPI endpoints for all CRUD operations
3. Implement OpenAI GPT-4o integration for AI assistant
4. Add Excel export functionality
5. Build Add/Edit forms for all modules
6. Test end-to-end with real data
7. Deploy to production

## Success Metrics
- Professional agency-quality CRM design ✅
- Fast and intuitive data entry
- Real-time business insights
- AI-powered automation
- Comprehensive financial tracking

## Notes
- All frontend modules completed with MOCK data
- Backend and AI integration pending
- Login credentials: admin@hotelbridge.com / admin123
- CRM accessible from main website header
- Design follows luxury hospitality theme

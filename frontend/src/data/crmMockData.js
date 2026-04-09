// Mock data for CRM system

export const mockHotels = [
  {
    id: 1,
    name: "Grand Hotel Europa",
    city: "Rome",
    country: "Italy",
    contactPerson: "Marco Rossi",
    email: "marco.rossi@grandeuropa.com",
    phone: "+39 06 1234 5678",
    rooms: 120,
    starCategory: 4,
    contractType: "commission",
    commission: 12,
    ratesLow: 80,
    ratesMid: 120,
    ratesHigh: 180,
    blackoutDates: ["2025-12-24", "2025-12-31"],
    status: "active",
    notes: "Excellent property in central Rome. Preferred partner for Indian groups."
  },
  {
    id: 2,
    name: "Château de Luxe",
    city: "Paris",
    country: "France",
    contactPerson: "Sophie Laurent",
    email: "sophie@chateaudeluxe.fr",
    phone: "+33 1 4567 8901",
    rooms: 85,
    starCategory: 4,
    contractType: "net",
    commission: 15,
    ratesLow: 100,
    ratesMid: 150,
    ratesHigh: 220,
    blackoutDates: ["2025-07-14"],
    status: "active",
    notes: "Boutique hotel near Eiffel Tower. Great for high-end groups."
  },
  {
    id: 3,
    name: "Alpine Resort",
    city: "Interlaken",
    country: "Switzerland",
    contactPerson: "Hans Mueller",
    email: "hans@alpineresort.ch",
    phone: "+41 33 123 4567",
    rooms: 200,
    starCategory: 3,
    contractType: "commission",
    commission: 10,
    ratesLow: 90,
    ratesMid: 130,
    ratesHigh: 190,
    blackoutDates: [],
    status: "active",
    notes: "Large property, excellent for groups. Mountain views."
  }
];

export const mockOperators = [
  {
    id: 1,
    companyName: "Nexus DMC India",
    contactPerson: "Raj Kumar",
    country: "India",
    type: "DMC",
    email: "raj@nexusdmc.in",
    phone: "+91 11 2345 6789",
    businessPotential: "high",
    notes: "Top DMC, 500+ groups annually. Excellent payment record."
  },
  {
    id: 2,
    companyName: "Global Tours & Travels",
    contactPerson: "Priya Sharma",
    country: "India",
    type: "operator",
    email: "priya@globaltours.in",
    phone: "+91 22 3456 7890",
    businessPotential: "high",
    notes: "Specializes in European tours. Very professional."
  },
  {
    id: 3,
    companyName: "Wanderlust Travel Agency",
    contactPerson: "Amit Patel",
    country: "India",
    type: "agent",
    email: "amit@wanderlust.in",
    phone: "+91 79 4567 8901",
    businessPotential: "medium",
    notes: "Growing agency, focus on honeymoon packages."
  }
];

export const mockBookings = [
  {
    id: 1,
    groupName: "Mumbai Corporate Incentive",
    operatorId: 1,
    operatorName: "Nexus DMC India",
    destination: "Rome",
    hotelId: 1,
    hotelName: "Grand Hotel Europa",
    checkIn: "2025-03-15",
    checkOut: "2025-03-18",
    nights: 3,
    rooms: 40,
    ratePerRoom: 150,
    totalRevenue: 18000,
    status: "confirmed",
    notes: "Corporate incentive group. Breakfast included."
  },
  {
    id: 2,
    groupName: "Delhi Wedding Group",
    operatorId: 2,
    operatorName: "Global Tours & Travels",
    destination: "Paris",
    hotelId: 2,
    hotelName: "Château de Luxe",
    checkIn: "2025-04-10",
    checkOut: "2025-04-14",
    nights: 4,
    rooms: 25,
    ratePerRoom: 180,
    totalRevenue: 18000,
    status: "confirmed",
    notes: "Wedding group, special dinner arrangement needed."
  },
  {
    id: 3,
    groupName: "Bangalore Cultural Tour",
    operatorId: 1,
    operatorName: "Nexus DMC India",
    destination: "Interlaken",
    hotelId: 3,
    hotelName: "Alpine Resort",
    checkIn: "2025-05-20",
    checkOut: "2025-05-24",
    nights: 4,
    rooms: 50,
    ratePerRoom: 140,
    totalRevenue: 28000,
    status: "confirmed",
    notes: "Cultural tour group, vegetarian meals required."
  },
  {
    id: 4,
    groupName: "Pune Senior Citizens",
    operatorId: 3,
    operatorName: "Wanderlust Travel Agency",
    destination: "Rome",
    hotelId: 1,
    hotelName: "Grand Hotel Europa",
    checkIn: "2025-06-05",
    checkOut: "2025-06-09",
    nights: 4,
    rooms: 30,
    ratePerRoom: 130,
    totalRevenue: 15600,
    status: "quoted",
    notes: "Awaiting confirmation from client."
  }
];

export const mockCommissions = [
  {
    id: 1,
    bookingId: 1,
    groupName: "Mumbai Corporate Incentive",
    totalBookingValue: 18000,
    marginPerRoom: 30,
    totalMargin: 3600,
    commissionPercent: 12,
    commissionAmount: 2160,
    paymentStatus: "received",
    paymentDueDate: "2025-04-15",
    paidDate: "2025-04-10"
  },
  {
    id: 2,
    bookingId: 2,
    groupName: "Delhi Wedding Group",
    totalBookingValue: 18000,
    marginPerRoom: 40,
    totalMargin: 4000,
    commissionPercent: 15,
    commissionAmount: 2700,
    paymentStatus: "pending",
    paymentDueDate: "2025-05-14",
    paidDate: null
  },
  {
    id: 3,
    bookingId: 3,
    groupName: "Bangalore Cultural Tour",
    totalBookingValue: 28000,
    marginPerRoom: 25,
    totalMargin: 5000,
    commissionPercent: 10,
    commissionAmount: 2800,
    paymentStatus: "pending",
    paymentDueDate: "2025-06-24",
    paidDate: null
  }
];

export const getDashboardStats = () => {
  const confirmedBookings = mockBookings.filter(b => b.status === 'confirmed');
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalRevenue, 0);
  const totalRoomNights = confirmedBookings.reduce((sum, b) => sum + (b.rooms * b.nights), 0);
  const totalCommission = mockCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const pendingPayments = mockCommissions
    .filter(c => c.paymentStatus === 'pending')
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  return {
    totalRevenue,
    totalRoomNights,
    totalCommission,
    pendingPayments,
    confirmedBookings: confirmedBookings.length,
    totalHotels: mockHotels.length,
    totalOperators: mockOperators.length
  };
};

export const getMonthlyRevenue = () => {
  return [
    { month: 'Jan', revenue: 45000, commission: 5400 },
    { month: 'Feb', revenue: 52000, commission: 6240 },
    { month: 'Mar', revenue: 64000, commission: 7680 },
    { month: 'Apr', revenue: 58000, commission: 6960 },
    { month: 'May', revenue: 71000, commission: 8520 },
    { month: 'Jun', revenue: 48000, commission: 5760 }
  ];
};

export const getTopHotels = () => {
  return mockHotels.slice(0, 3).map(hotel => ({
    name: hotel.name,
    city: hotel.city,
    bookings: Math.floor(Math.random() * 20) + 5
  }));
};

export const getTopOperators = () => {
  return mockOperators.slice(0, 3).map(op => ({
    name: op.companyName,
    bookings: Math.floor(Math.random() * 15) + 10,
    revenue: Math.floor(Math.random() * 50000) + 30000
  }));
};

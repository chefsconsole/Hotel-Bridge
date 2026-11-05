/* ------------------------------------------------------------------ *
 * REAL partner hotels — every email, name, address and rate below was
 * taken from the hotel's own reply in info@hotelbridge.co (Nov 2026).
 * Nothing here is invented. Unknown facts are left empty, not guessed.
 * Loaded by `npm run load:partners` (idempotent: matched by slug).
 * ------------------------------------------------------------------ */

export type OnRequestPartner = {
  name: string; city: string; country: string;
  email: string; reservationsEmail?: string; contactName?: string;
  address?: string; starRating?: number; collectionHotels?: string[];
  /** Internal only — what the hotel agreed, for the team. Never shown to agents. */
  terms: string;
};

const ON_REQUEST_DESC = 'Best rate on request: send your dates and rooms and the hotel quotes its best available B2B rate for your stay. Group enquiries are also handled on request.';
export const onRequestDescription = ON_REQUEST_DESC;

/** Hotels that said: no fixed contract, but best rates on request for FIT and groups. */
export const ON_REQUEST: OnRequestPartner[] = [
  // Pattaya
  { name: 'Royal Cliff Beach Hotel', city: 'Pattaya', country: 'Thailand', email: 'kruekaew@royalcliff.com', contactName: 'Kruekaew Kunnafay (Kaew), Sales Executive – Indian & Middle East', address: '353 Phra Tamnuk Road, Pattaya, Chonburi 20150', terms: '4 Nov: send all FIT and group enquiries to kruekaew@; best net rates case by case.' },
  { name: 'Royal Cliff Grand Hotel', city: 'Pattaya', country: 'Thailand', email: 'kruekaew@royalcliff.com', contactName: 'Kruekaew Kunnafay (Kaew), Sales Executive – Indian & Middle East', address: '353 Phra Tamnuk Road, Pattaya, Chonburi 20150', terms: '4 Nov: send all FIT and group enquiries to kruekaew@; best net rates case by case.' },
  { name: 'Holiday Inn Express Pattaya Central', city: 'Pattaya', country: 'Thailand', email: 'nitcha.runthawin@ihg.com', contactName: 'Nitcha Runthawin', terms: 'IHG: rates case by case. Live group with payment pending.' },
  // Bangkok
  { name: 'Mandarin Oriental, Bangkok', city: 'Bangkok', country: 'Thailand', email: 'nisachon@mohg.com', contactName: 'Nisa A., Director of Business Development', terms: '2 Nov: dynamic rates, case by case, standard 10% commission.' },
  // Phuket — Deevana cluster (one sales team for all three)
  { name: 'Deevana Plaza Phuket Patong', city: 'Phuket', country: 'Thailand', email: 'ados.clusterphuket@deevanahotels.com', reservationsEmail: 'sales.clusterphuket@deevanahotels.com', contactName: 'Sasiwan Warndee, Cluster Assistant Director of Sales', terms: '3 Nov: case by case by dates. Collection (one rate for 3 hotels) proposed by Ronak 3 Nov — awaiting answer.' },
  { name: 'Deevana Patong Resort & Spa', city: 'Phuket', country: 'Thailand', email: 'ados.clusterphuket@deevanahotels.com', reservationsEmail: 'sales.clusterphuket@deevanahotels.com', contactName: 'Sasiwan Warndee, Cluster Assistant Director of Sales', terms: 'As Deevana Plaza Phuket Patong.' },
  { name: 'Ramada by Wyndham Phuket Deevana', city: 'Phuket', country: 'Thailand', email: 'ados.clusterphuket@deevanahotels.com', reservationsEmail: 'sales.clusterphuket@deevanahotels.com', contactName: 'Sasiwan Warndee, Cluster Assistant Director of Sales', terms: 'As Deevana Plaza Phuket Patong.' },
  // Krabi
  { name: 'Centara Ao Nang Beach Resort & Spa Krabi', city: 'Krabi', country: 'Thailand', email: 'salescnk@chr.co.th', reservationsEmail: 'cnk@chr.co.th', contactName: 'Chardbanoo Nisakul (Nadia), Sales Coordinator', address: 'Moo 1, Tambon Ao Nang, Amphur Muang, Krabi 81180', terms: '3 Nov: no contract rates; best available rates case by case.' },
  { name: 'Sofitel Krabi Phokeethra Golf & Spa Resort', city: 'Krabi', country: 'Thailand', email: 'walaiporn.buapakham@sofitel.com', contactName: 'Walaiporn Buapakham, Director of Sales – Leisure', terms: 'Accor policy: net rates case by case; will review a contract after a period of business.' },
  // Bali
  { name: 'Bali Dynasty Resort', city: 'Bali', country: 'Indonesia', email: 'dos@bdr.pphotels.com', reservationsEmail: 'reservations@bdr.pphotels.com', contactName: 'Dayu Hayati, Director of Sales Asia', address: 'Jln Kartika, Tuban, South Kuta, Bali 80361', terms: '4 Nov: no B2B contract; ad hoc = 10% off the rates on bdr.pphotels.com. Payment by secure link or VCC. Reply-all (reservations@ in copy).' },
  // Hong Kong
  { name: 'Dorsett Mongkok', city: 'Hong Kong', country: 'Hong Kong', email: 'jeremy.choi@dorsetthotels.com', contactName: 'Jeremy Choi, Director of Sales', address: '88 Tai Kok Tsui Road, Kowloon, Hong Kong', terms: '3 Nov: no static B2B rates or API; send room enquiries to Jeremy directly.' },
  { name: 'Dorsett Kai Tak', city: 'Hong Kong', country: 'Hong Kong', email: 'jeremy.choi@dorsetthotels.com', contactName: 'Jeremy Choi, Director of Sales', address: '43 Shing Kai Road, Kai Tak, Kowloon, Hong Kong', terms: 'As Dorsett Mongkok.' },
  // Maldives
  { name: 'Bandos Maldives', city: 'Maldives', country: 'Maldives', email: 'sales@bandos.com.mv', contactName: 'Masha Shuaib, Assistant Sales Manager', terms: '3 Nov: direct FIT rates case by case; direct contract reviewed at year end on production.' },
  // India
  { name: 'The Kenilworth Resort & Spa Goa', city: 'Goa', country: 'India', email: 'resv.goa@kenilworthhotels.com', contactName: 'Reservations / Sales Goa', terms: 'Dynamic pricing, no static rates; send each query (Goa & Kolkata).' },
  { name: 'Fragrant Nature Munnar', city: 'Munnar', country: 'India', email: 'sales6@fragrantnature.com', contactName: 'Shari, Sales', starRating: 5, terms: 'Sent Winter 2026–27 rate sheet (PDF, 3 Nov) — load as contract once the PDF is read. Until then: on request.' },
  { name: 'Fragrant Nature Kochi', city: 'Kochi', country: 'India', email: 'sales6@fragrantnature.com', contactName: 'Shari, Sales', starRating: 5, terms: 'As Fragrant Nature Munnar (Fort Kochi / Mattancherry).' },
  { name: 'Fragrant Nature Kollam', city: 'Kollam', country: 'India', email: 'sales6@fragrantnature.com', contactName: 'Shari, Sales', starRating: 4, terms: 'As Fragrant Nature Munnar.' },
  // Europe
  { name: 'President Hotel Airport', city: 'Amsterdam', country: 'Netherlands', email: 'daria.yemets@presidenthotelairport.com', contactName: 'Daria Yemets, Sales & Marketing Manager', terms: '3 Nov: no FIT contract; happy to quote individual enquiries and groups on request.' },
  { name: 'Hotel Metropole Interlaken', city: 'Interlaken', country: 'Switzerland', email: 'reservation@metropole-interlaken.ch', contactName: 'Laura Schilling', terms: 'Send requests and they quote.' },
  { name: 'DORMERO Hotel Wien', city: 'Vienna', country: 'Austria', email: 'convention.9@dormero.com', terms: 'Send each date and they offer.' },
  { name: 'Hotel Duo', city: 'Prague', country: 'Czech Republic', email: 'group.supervisor@janhotels.cz', contactName: 'Lucie Kosová, Group Reservation Supervisor (Jan Hotels)', terms: '3 Nov: all pricing ad hoc per date / stay.' },
];

/* --------------------------- fixed-rate contracts --------------------------- */

/** Muong Thanh Luxury Da Nang — 2027 static rates, email of 3 Nov 2026 (confirmed as best rates the same day).
 *  VND per room per night, single/double, breakfast, 5% service and VAT included, NET (no commission). */
export const MUONG_THANH = {
  hotel: {
    name: 'Muong Thanh Luxury Da Nang', city: 'Da Nang', country: 'Vietnam',
    address: '270 Vo Nguyen Giap Street, Ngu Hanh Son Ward, Da Nang',
    email: 'sales3@luxurydanang.muongthanh.com', groupsEmail: 'salesgroup@luxurydanang.muongthanh.com',
    contactName: 'Dang Thi Van Anh, Sales Executive',
    summary: 'On My Khe Beach (47 m walk), 5 km from Da Nang airport and the city centre.',
    description: 'Set along My Khe Beach, a 47-metre walk from the sand; Da Nang International Airport and the city centre are 5 km away.\nRates include breakfast, the swimming pool, fitness centre, Wi-Fi, and tea, coffee and two bottles of water in the room daily.\nPlease note: an external construction project near the hotel may cause daytime noise (08:00–12:00, 14:00–18:00) and partly affect the sea view from some rooms.',
    facilities: ['Swimming pool', 'Fitness centre', 'Wi-Fi', 'Breakfast included', 'Tea & coffee in room'],
    transport: '5 km from Da Nang International Airport; 47 m walk to My Khe Beach.',
    checkInTime: '14:00', checkOutTime: '12:00',
  },
  contract: {
    reference: 'MTLDN-2027', currency: 'VND', validTo: '2027-12-31',
    internalNotes: 'Source: Van Anh email 3 Nov 2026 (confirmed best rates). NET, no commission, 5% service + VAT included. Check-in 15:00 from 1 May–31 Aug 2027. Weekend (Fri/Sat, 1 Jun–31 Jul) and public-holiday rates exist but amounts were not given — those dates are closed until the hotel sends them. Cancellation terms not yet given. Early check-in / late check-out: 30–100% of a night.',
  },
  rooms: [
    { name: 'Deluxe King/Twin City View', bedding: 'King or two singles', sizeSqm: 33, low: 1_850_000, high: 2_000_000 },
    { name: 'Deluxe King/Twin Ocean View', bedding: 'King or two singles', sizeSqm: 33, low: 2_150_000, high: 2_300_000 },
    { name: 'Grand Suite (ocean view)', bedding: 'King', sizeSqm: 89, low: 3_400_000, high: 3_500_000 },
  ],
  extraBed: 600_000, // per night incl. breakfast, max 1 per room
  child6to11: 250_000, // under 6 sharing: free breakfast
  highSeason: ['2027-06-01', '2027-07-31'] as const,
  /** Holiday surcharge dates (amounts not given) — closed until the hotel sends them. */
  holidays: [
    ['2027-01-01', '2027-01-02', 'New Year'], ['2027-02-06', '2027-02-10', 'Tet'], ['2027-04-16', '2027-04-17', 'Hung Kings'],
    ['2027-04-29', '2027-05-02', 'Reunification / Labour Day'], ['2027-09-02', '2027-09-04', 'National Day'],
  ] as const,
};

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
  { name: 'Phuket Graceland Resort & Spa', city: 'Phuket', country: 'Thailand', email: 'saleshkt@phuketgraceland.com', reservationsEmail: 'rsvn@phuketgraceland.com', contactName: 'Netnapat Ngamsong (Maymii), Sales Coordinator', terms: '5 Nov: not adding contracted accounts; rates and availability case by case.' },
  // Phuket — Ashlee Group (5 Nov: agreed to sign; 2026–27 special promotion rate agreements sent as PDFs, one per hotel,
  // awaiting Ronak's countersignature). On request until the PDF rates are loaded as contracts.
  { name: 'ASHLEE Plaza Patong Hotel & Spa', city: 'Phuket', country: 'Thailand', email: 'contracting@ashleehub.com', reservationsEmail: 'rsvn@ashleeplaza.com', contactName: 'Nadia, Sales Coordinator (Ashlee Group)', terms: 'Contract agreed 5 Nov — countersign PDF and load its rates.' },
  { name: 'ASHLEE Hub Hotel Patong', city: 'Phuket', country: 'Thailand', email: 'contracting@ashleehub.com', reservationsEmail: 'rsvn@ashleehub.com', contactName: 'Nadia, Sales Coordinator (Ashlee Group)', terms: 'As ASHLEE Plaza Patong.' },
  { name: 'ASHLEE Heights Hotel Patong', city: 'Phuket', country: 'Thailand', email: 'contracting@ashleehub.com', reservationsEmail: 'rsvn@ashleeheights.com', contactName: 'Nadia, Sales Coordinator (Ashlee Group)', terms: 'As ASHLEE Plaza Patong.' },
  { name: 'Bel Aire Patong Resort', city: 'Phuket', country: 'Thailand', email: 'contracting@ashleehub.com', reservationsEmail: 'rsvn@belaire-phuket.com', contactName: 'Nadia, Sales Coordinator (Ashlee Group)', terms: 'As ASHLEE Plaza Patong.' },
  { name: "Fishermen's Harbour Urban Resort", city: 'Phuket', country: 'Thailand', email: 'contracting@ashleehub.com', reservationsEmail: 'rsvn@fishermensharbour.com', contactName: 'Nadia, Sales Coordinator (Ashlee Group)', terms: 'As ASHLEE Plaza Patong.' },
  // Sri Lanka — Jetwing: rates on enquiry; properties not yet named, so one listing for the group.
  { name: 'Jetwing Hotels (any Sri Lanka property)', city: 'Sri Lanka', country: 'Sri Lanka', email: 'vinuja@jetwinghotels.com', contactName: 'Vinuja Silva, Sales Executive', address: 'Jetwing House II, 46/26 Nawam Mawatha, Colombo 02 (head office)', terms: '5 Nov: rates on an inquiry basis — send each enquiry. Ask for a preferred-partner commission.' },
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
  { name: 'SHG Hotel Antonella', city: 'Rome', country: 'Italy', email: 'manager@shghotelantonella.com', reservationsEmail: 'prenotazioni@shghotelantonella.com', contactName: 'Nello Monteforte, Hotel Manager', address: 'Via Pontina km 28, 00071 Pomezia (Roma)', terms: '4 Nov 2027 Rome group-series offer (BB, VAT incl., city tax extra): low Feb–Apr, Jul, Aug, Nov, Dec — SGL 80 / DBL 96 / TPL 126 EUR; high May, Jun, Sep, Oct — 87 / 110 / 147. EUR 7,000 rolling deposit; 30% at 30 days, 70% at 14 days; 30% charge 29–15 days, 100% within 14. FOC 1 per 20 paying; coach parking free. Negotiate the deposit before accepting.' },
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

/* ------------------------- Ashlee Group 2026–27 contracts ------------------------- */
/* Source: "HOTELBRIDGE (…) - SPECIAL PROMOTION FOR OVERSEAS AGENT 2026 - 2027.pdf", issued 5 Nov 2026
 * (Drive folder 1vOnJRUxKgo6Qx4t4OZNRsOdLO3xswGs8). THB per room per night, NET, government taxes and
 * service charge INCLUDED, non-commissionable. FIT 1–7 rooms only. RO = room only, BB = with breakfast.
 * Extra bed / third person 1,200 THB (adult or child). Child 4–11 sharing: breakfast 250 THB. */

export const ASHLEE_PERIODS = [
  ['2026-11-01', '2026-12-23'], ['2026-12-24', '2027-01-09'], ['2027-01-10', '2027-02-03'], ['2027-02-04', '2027-02-14'],
  ['2027-02-15', '2027-02-28'], ['2027-03-01', '2027-03-31'], ['2027-04-01', '2027-10-31'],
] as const;

export type ContractRoom = {
  name: string; bedding?: string; sizeSqm?: number;
  /** Adults the room rate already covers (2 = double; 3 = triple room; 4 = family). */
  includedAdults: number; maxAdults: number; maxChildren: number;
  extraBed: boolean; ro: number[]; bb: number[];
};
export type RateContract = {
  hotelName: string; city: string; address: string; reference: string; validTo: string;
  rooms: ContractRoom[]; checkInTime: string; checkOutTime: string;
};

const ASHLEE_NOTES = 'Ashlee Group 2026–27 special promotion for overseas agents (PDF of 5 Nov 2026) — COUNTERSIGN AND RETURN WITHIN 30 DAYS or it is void. Net, taxes + service included, non-commissionable, FIT 1–7 rooms; groups (8+) on request: 5,000 THB deposit, 1 FOC per 15 paying. Cancellation: 1 Nov–23 Dec, 10 Jan–31 Oct — charges inside 7 days; PEAK 24 Dec–9 Jan — charges inside 14 days; no-show = full stay. Full prepayment 7 days before arrival (14 in peak). No check-out on 31 Dec or 1 Jan. Mandatory NYE gala 31 Dec 2026: 2,500 THB adult / 1,250 child (loaded as a 5,000 THB per room supplement for 2 adults). Rates not for B2C/online consumer sale — confirm in writing that a closed B2B agent portal is fine. Rates reviewable every 6 months.';
export const ashleeNotes = ASHLEE_NOTES;

const r = (s: string) => s.split(' ').map(Number);
export const ASHLEE: RateContract[] = [
  { hotelName: 'ASHLEE Plaza Patong Hotel & Spa', city: 'Phuket', address: '34/50-57 Prachanukhro Road, Patong, Phuket 83150', reference: 'ASHLEE-PLAZA-2627', validTo: '2027-10-31', checkInTime: '14:00', checkOutTime: '12:00', rooms: [
    { name: 'Superior Room', bedding: 'King or twin', sizeSqm: 28, includedAdults: 2, maxAdults: 3, maxChildren: 1, extraBed: true, ro: r('3200 4200 3700 4200 3700 3200 2500'), bb: r('3700 4700 4200 4700 4200 3700 3000') },
    { name: 'Deluxe Room', bedding: 'King or twin', sizeSqm: 30, includedAdults: 2, maxAdults: 3, maxChildren: 1, extraBed: true, ro: r('3700 4700 4200 4700 4200 3700 3000'), bb: r('4200 5200 4700 5200 4700 4200 3500') },
    { name: 'Family Room with Bunk Bed', bedding: 'King + bunk bed (2 adults + 2 children)', sizeSqm: 59, includedAdults: 2, maxAdults: 2, maxChildren: 2, extraBed: false, ro: r('5000 6000 5500 6000 5500 5000 4000'), bb: r('6000 7000 6500 7000 6500 6000 5000') },
  ] },
  { hotelName: 'ASHLEE Hub Hotel Patong', city: 'Phuket', address: '237/23 Rat-U-Thit Song Roi Pee Road, Patong, Kathu, Phuket 83150', reference: 'ASHLEE-HUB-2627', validTo: '2027-10-31', checkInTime: '14:00', checkOutTime: '12:00', rooms: [
    { name: 'Deluxe Room', bedding: 'King or twin', sizeSqm: 42, includedAdults: 2, maxAdults: 3, maxChildren: 1, extraBed: true, ro: r('3500 4500 4000 4500 4000 3500 3000'), bb: r('4000 5000 4500 5000 4500 4000 3500') },
  ] },
  { hotelName: 'ASHLEE Heights Hotel Patong', city: 'Phuket', address: '160/36 Phang Muang Sai Kor Road, Soi Nanai Ruamjai (Nanai Soi 8), Patong, Phuket 83150', reference: 'ASHLEE-HEIGHTS-2627', validTo: '2027-10-31', checkInTime: '14:00', checkOutTime: '12:00', rooms: [
    { name: 'Superior Room', bedding: 'King or twin', sizeSqm: 30, includedAdults: 2, maxAdults: 2, maxChildren: 1, extraBed: false, ro: r('3500 4500 4000 4500 4000 3500 3000'), bb: r('4000 5000 4500 5000 4500 4000 3500') },
    { name: 'Deluxe Room', bedding: 'King', sizeSqm: 36, includedAdults: 2, maxAdults: 3, maxChildren: 1, extraBed: true, ro: r('4000 5000 4500 5000 4500 4000 3500'), bb: r('4500 5500 5000 5500 5000 4500 4000') },
    { name: 'Premier Triple', bedding: 'King + single', sizeSqm: 54, includedAdults: 3, maxAdults: 3, maxChildren: 1, extraBed: false, ro: r('5000 6000 5500 6000 5500 5000 4500'), bb: r('5750 6750 6250 6750 6250 5750 5250') },
    { name: '2-Bedroom Family (up to 4 adults)', bedding: 'King + twin', sizeSqm: 96, includedAdults: 3, maxAdults: 3, maxChildren: 2, extraBed: false, ro: r('7000 9000 8500 9000 8500 7000 6500'), bb: r('8000 10000 9500 10000 9500 8000 7500') },
  ] },
  { hotelName: 'Bel Aire Patong Resort', city: 'Phuket', address: '59/1-3 Sainamyen Road, Kathu, Phuket 83150', reference: 'ASHLEE-BELAIRE-2627', validTo: '2027-10-31', checkInTime: '14:00', checkOutTime: '12:00', rooms: [
    { name: 'Superior Room', bedding: 'King or twin', sizeSqm: 36, includedAdults: 2, maxAdults: 3, maxChildren: 1, extraBed: true, ro: r('2700 3700 3200 3700 3200 2700 2200'), bb: r('3200 4200 3700 4200 3700 3200 2700') },
    { name: 'Superior Triple Room', bedding: 'King + single', sizeSqm: 40, includedAdults: 3, maxAdults: 3, maxChildren: 1, extraBed: false, ro: r('3700 4700 4200 4700 4200 3700 3200'), bb: r('4450 5450 4950 5450 4950 4450 3950') },
    { name: 'Family Room (up to 4 adults)', bedding: 'Two kings', sizeSqm: 45, includedAdults: 3, maxAdults: 3, maxChildren: 2, extraBed: false, ro: r('4700 5700 5200 5700 5200 4700 4200'), bb: r('5700 6700 6200 6700 6200 5700 5200') },
  ] },
  { hotelName: "Fishermen's Harbour Urban Resort", city: 'Phuket', address: '2/21 Siriraj Road, Patong, Kathu, Phuket 83150', reference: 'ASHLEE-FMH-2627', validTo: '2027-10-31', checkInTime: '14:00', checkOutTime: '12:00', rooms: [
    { name: 'Deluxe Room', includedAdults: 2, maxAdults: 3, maxChildren: 1, extraBed: true, ro: r('4000 5000 4500 5000 4500 4000 3500'), bb: r('4500 5500 5000 5500 5000 4500 4000') },
    { name: 'Deluxe Plus Room', includedAdults: 2, maxAdults: 3, maxChildren: 1, extraBed: true, ro: r('4300 5300 4800 5300 4800 4300 3800'), bb: r('4800 5800 5300 5800 5300 4800 4300') },
    { name: 'Premier Deluxe', includedAdults: 2, maxAdults: 3, maxChildren: 1, extraBed: true, ro: r('4500 5500 5000 5500 5000 4500 4000'), bb: r('5000 6000 5500 6000 5500 5000 4500') },
    { name: 'Deluxe Family (3 adults)', includedAdults: 3, maxAdults: 3, maxChildren: 1, extraBed: false, ro: r('5000 6000 5500 6000 5500 5000 4500'), bb: r('5750 6750 6250 6750 6250 5750 5250') },
    { name: 'Family Suite with Bunk Bed', bedding: '2 adults + 2 children', includedAdults: 2, maxAdults: 2, maxChildren: 2, extraBed: false, ro: r('6500 7500 7000 7500 7000 6500 6000'), bb: r('7500 8500 8000 8500 8000 7500 7000') },
    { name: 'Honeymoon Pool Suite', includedAdults: 2, maxAdults: 2, maxChildren: 0, extraBed: false, ro: r('7000 8000 7500 8000 7500 7000 6000'), bb: r('7500 8500 8000 8500 8000 7500 6500') },
  ] },
];
export const ASHLEE_EXTRA_BED = 1200;
export const ASHLEE_CHILD_BREAKFAST = 250;
export const ASHLEE_NYE_SUPPLEMENT_PER_ROOM = 5000;

/* ------------------------------ Ashlee Group extras ------------------------------ */
/* Net THB from the same 2026–27 agreements ("Special request", "Activity at Thailand Mountain
 * Phuket", "Meal Rates"). Agents see these with the extras markup. Valid 1 Nov 2026 – 31 Oct 2027. */
export type Extra = {
  name: string; category: 'dining' | 'activity' | 'spa' | 'meal_plan' | 'celebration' | 'other';
  unit: 'per_person' | 'per_couple' | 'per_room' | 'per_stay'; price: number; child?: number;
  note?: string; compulsory?: boolean; validFrom?: string; validTo?: string;
};

const ACTIVITIES: Extra[] = [
  { name: 'Kayak at Thailand Mountain Phuket', category: 'activity', unit: 'per_person', price: 420, child: 210 },
  { name: 'Fishing at Thailand Mountain Phuket', category: 'activity', unit: 'per_person', price: 490, child: 245 },
  { name: 'Zipline at Thailand Mountain Phuket', category: 'activity', unit: 'per_person', price: 1750, child: 875 },
];
const mealsAt = (venue: string): Extra[] => [
  { name: 'Buffet breakfast', category: 'dining', unit: 'per_person', price: 500, child: 250, note: `${venue}; children 0–3 free` },
  { name: 'Set lunch', category: 'dining', unit: 'per_person', price: 550, child: 350, note: `${venue}; drinks not included; children 0–3 free` },
  { name: 'Set dinner', category: 'dining', unit: 'per_person', price: 650, child: 400, note: `${venue}; drinks not included; children 0–3 free` },
];
const NYE: Extra = { name: "New Year's Eve gala dinner", category: 'celebration', unit: 'per_person', price: 2500, child: 1250, compulsory: true, validFrom: '2026-12-31', validTo: '2026-12-31', note: 'Compulsory for guests in house on 31 Dec 2026, non-refundable. Already included in room prices for 2 adults on that night; children are extra.' };
const JOINER: Extra = { name: 'Visitor staying overnight (not on the booking)', category: 'other', unit: 'per_person', price: 1000, note: 'Per person per night, charged by the hotel; ID card required at the front desk' };

const ASHLEE_STANDARD: Extra[] = [
  { name: 'Candle-light dinner', category: 'dining', unit: 'per_couple', price: 3500 },
  { name: 'Floating breakfast', category: 'dining', unit: 'per_couple', price: 499 },
  { name: 'Wellness day pass', category: 'spa', unit: 'per_person', price: 590 },
  ...ACTIVITIES, ...mealsAt('Dip on the Roof, ASHLEE Plaza Patong'), NYE, JOINER,
];

export const ASHLEE_EXTRAS: Record<string, Extra[]> = {
  'ASHLEE Plaza Patong Hotel & Spa': ASHLEE_STANDARD,
  'ASHLEE Hub Hotel Patong': ASHLEE_STANDARD,
  'ASHLEE Heights Hotel Patong': ASHLEE_STANDARD,
  'Bel Aire Patong Resort': ASHLEE_STANDARD,
  "Fishermen's Harbour Urban Resort": [
    { name: 'Candle-light dinner', category: 'dining', unit: 'per_couple', price: 2990 },
    { name: 'Floating breakfast', category: 'dining', unit: 'per_couple', price: 499 },
    { name: 'Afternoon tea', category: 'dining', unit: 'per_couple', price: 400 },
    { name: 'Thai massage (1 hour)', category: 'spa', unit: 'per_person', price: 500 },
    { name: 'Thai cooking class', category: 'activity', unit: 'per_person', price: 1500 },
    { name: 'Half board (add dinner or lunch)', category: 'meal_plan', unit: 'per_person', price: 700, note: 'Per person per night, on top of a breakfast rate' },
    { name: 'Full board (add lunch and dinner)', category: 'meal_plan', unit: 'per_person', price: 1100, note: 'Per person per night, on top of a breakfast rate' },
    ...ACTIVITIES, ...mealsAt('Thailand Mountain Phuket Restaurant'), NYE, JOINER,
  ],
};

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
  /** Sales contact's direct numbers, and every other address or number they gave. Saved on the hotel's outreach record. */
  phone?: string; otherContacts?: string;
  /** Name of its existing outreach record, when that differs from the hotel name. */
  outreachName?: string;
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
  // Hotels that have already quoted HotelBridge for real groups (Oct–Nov 2026) — on request for FIT and groups.
  { name: 'Garner Hotel Pattaya Central', city: 'Pattaya', country: 'Thailand', email: 'pimnika.yiamweha@ihg.com', contactName: 'Pimnika (Jessica) Yiamweha, Sales (IHG)', terms: 'Quoted group 22–24 Nov 2026 (client booked elsewhere). Keen for business.' },
  { name: 'Holiday Inn Express Bangkok Sukhumvit 11', city: 'Bangkok', country: 'Thailand', email: 'anirut.jankrajang@ihg.com', reservationsEmail: 'rsvn.bkkex@ihg.com', contactName: 'Anirut Jankrajang (IHG)', terms: 'Quoted group 20–22 Nov 2026; could not meet THB 1,700 budget in high demand.' },
  { name: 'Mercure Phuket Patong JourneyHub', city: 'Phuket', country: 'Thailand', email: 'rawinpat.phunphu@accor.com', reservationsEmail: 'hc543@accor.com', contactName: 'Rawinpat Phunphu (Bow), Cluster Sales Manager (also Mövenpick Resort Phuket Kamala Beach)', terms: 'Group 26–28 Nov 2026 confirmed (#655375) at THB 2,000 net Classic Room. Net rates only — no commission contract.' },
  { name: 'Cassia Phuket', city: 'Phuket', country: 'Thailand', email: 'kamonrat.a@cassia.com', reservationsEmail: 'friends@cassia.com', contactName: 'Kamonrat Aunkhom, Sales Manager', terms: 'Quoted THB 4,000 for group 26–28 Nov 2026 (above budget). Follows up actively.' },
  { name: 'Radisson RED Phuket Patong', city: 'Phuket', country: 'Thailand', email: 'salesindia@destination-hospitality.com', contactName: 'Indian Wholesale desk, Destination Hospitality (4 Phuket hotels)', terms: 'Sent winter promo rates (to end Nov) and a Diwali deal; group budget THB 2,200 too low for them.' },
  { name: 'Holiday Inn Resort Krabi Ao Nang Beach', city: 'Krabi', country: 'Thailand', email: 'thewikan.sangthong@ihg.com', reservationsEmail: 'hikb.rsvn@ihg.com', contactName: 'Thewikan Sangthong (IHG)', terms: 'Quoted THB 4,900 with breakfast for 10 rooms 24–26 Nov 2026 (above budget). Follows up actively.' },
  { name: 'Campanile PRIME Villejuif', city: 'Paris', country: 'France', email: 'commercial.villejuif@campanile.fr', reservationsEmail: 'villejuif@campanile.fr', contactName: 'Commercial team, Campanile PRIME Villejuif (Louvre Hotels; key account Ida Tamborrino)', terms: 'Hosted our 28-room group 17–19 Oct 2026, paid commission on invoice. Louvre Hotels want group payment before arrival.' },
  { name: 'Rokeby Manor', city: 'Mussoorie', country: 'India', email: 'reservations@rokebymanor.com', contactName: 'Reservations, Rokeby Manor & Rokeby Villas', terms: 'Quoted New Year group 30 Dec 2026 – 1 Jan 2027.' },
  { name: 'Taj Rishikesh Resort & Spa', city: 'Rishikesh', country: 'India', email: 'reservations.rishikesh@tajhotels.com', contactName: 'Reservations, Taj Rishikesh', terms: 'Quoted group 27–30 Dec 2026.' },
  { name: 'SeaShell Neil', city: 'Neil Island (Andaman)', country: 'India', email: 'info@seashellhotels.net', contactName: 'SeaShell Hotels & Resorts reservations', terms: 'Quoted 2 rooms 25–26 Dec 2026; holds only against same-day payment in peak.' },
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
  // Replies to the 5–7 Nov 2026 outreach — willing to quote directly (on request)
  { name: 'The Savoy', city: 'London', country: 'United Kingdom', email: 'Arti.PUNDIR@fairmont.com', reservationsEmail: 'savoy@fairmont.com', contactName: 'Arti Pundir', terms: '5 Nov: delighted to start a cooperation — send each enquiry.' },
  { name: 'Mercure London Hyde Park', city: 'London', country: 'United Kingdom', email: 'herminie.b@lth-hotels.com', reservationsEmail: 'stay@mercurehydepark.com', contactName: 'Herminie Balmer, Director of Sales, London Town Hotels', terms: '5 Nov: DOS for Mercure Hyde Park, Mercure Paddington and Hotel Indigo Paddington — send enquiries to her.' },
  { name: 'Mercure London Paddington', city: 'London', country: 'United Kingdom', email: 'herminie.b@lth-hotels.com', reservationsEmail: 'stay@mercurepaddington.com', contactName: 'Herminie Balmer, Director of Sales, London Town Hotels', terms: 'As Mercure London Hyde Park.' },
  { name: 'Novotel Genève Centre', city: 'Geneva', country: 'Switzerland', email: 'Pauline.MANCHERON@accor.com', reservationsEmail: 'H3133@accor.com', contactName: 'Pauline Mancheron', terms: '6 Nov: no static FIT rates (Accor policy); happy to welcome our guests — rates case by case.' },
  { name: 'Hotel Aeschi Interlaken – Handwritten Collection', city: 'Interlaken', country: 'Switzerland', email: 'HC6L3@accor.com', terms: '6 Nov: delighted to be considered as a partner — send each enquiry.' },
  { name: 'Sofitel Singapore City Centre', city: 'Singapore', country: 'Singapore', email: 'Liling.LEONG@sofitel.com', reservationsEmail: 'HA152@sofitel.com', contactName: 'Leong Li Ling', terms: '6 Nov: no static transient contract; happy to work on ad hoc requests.' },
  { name: 'Novotel Bangkok Platinum Pratunam', city: 'Bangkok', country: 'Thailand', email: 'Supawan.SUPANTEE@accor.com', contactName: 'Supawan (Kik) Supantee — dedicated HotelBridge contact', terms: '6 Nov: assigned a dedicated contact — send enquiries to Kik.' },
  { name: 'Paripas Patong Resort', city: 'Phuket', country: 'Thailand', email: 'info@paripaspatong.com', terms: '6 Nov: demand-based pricing, no promotional rates; rates case by case.' },
  { name: 'Holiday Inn Express Phuket Patong Beach Central', city: 'Phuket', country: 'Thailand', email: 'Panjarat.Leelarujiwong1@ihg.com', contactName: 'Panjarat Leelarujiwong (IHG)', terms: '6 Nov: no fixed FIT contract rate; will quote case by case.' },
  { name: 'Grand Mercure Hanoi', city: 'Hanoi', country: 'Vietnam', email: 'Trang.NGUYENHUYEN@accor.com', reservationsEmail: 'H6936@accor.com', contactName: 'Trang Nguyen Huyen', terms: '6 Nov: no annual contract; handles each request case by case.' },
  { name: 'Swissôtel Al Ghurair', city: 'Dubai', country: 'United Arab Emirates', email: 'floraida.anives@swissotel.com', contactName: 'Floraida Anives, Groups & Events Manager', terms: '6 Nov: FIT only through Accor wholesalers (EPS, Hotelbeds, WebBeds); groups, MICE and events direct with Floraida.' },
  { name: 'Mövenpick Hotel Jumeirah Beach', city: 'Dubai', country: 'United Arab Emirates', email: 'Salka.ESSARHAYAR@movenpick.com', reservationsEmail: 'hotel.jumeirahbeach@movenpick.com', contactName: 'Salka Essarhayar', terms: '6 Nov: keen on groups, MICE and events; sent a Nov–Dec 2026 group offer.' },
  { name: 'Hotel Clarks Shiraz', city: 'Agra', country: 'India', email: 'sales@hotelclarks.in', terms: '6 Nov: special rates valid to 31 Mar 2027 (e.g. single Rs 7,000 + tax, CP, superior) — full sheet in the reply.' },
  { name: 'Radisson Hotel Varanasi', city: 'Varanasi', country: 'India', email: 'rhvsales@radissonvns.com', reservationsEmail: 'reservations@radissonvns.com', contactName: 'U. Yogendra Prasad, Sales', terms: '6 Nov: sent winter FIT/GIT rates valid 1 Oct 2026 – 31 Mar 2027 (in the reply).' },
  { name: 'Radisson Blu Plaza Hotel Mysore', city: 'Mysore', country: 'India', email: 'sales1@rdmysore.com', terms: '6 Nov: offers tailor-made rates on request.' },
  { name: 'Fortune Resort Sullivan Court', city: 'Ooty', country: 'India', email: 'sullivancourt@fortunehotels.in', terms: '5 Nov: 15% off the Best Available Rate; no static tariff.' },
  { name: 'Timber Trail Resort', city: 'Parwanoo', country: 'India', email: 'reservations@timbertrail.in', terms: '5 Nov: 10% off the Best Available Rate for B2B bookings.' },
  { name: 'Mayfair Spa Resort & Casino', city: 'Gangtok', country: 'India', email: 'madhuri.dixit@mayfairhotels.com', reservationsEmail: 'reservations@mayfairhotels.com', contactName: 'Madhuri Dixit', terms: '6 Nov: dynamic FIT rates — send the exact requirement for a quote.' },
  { name: 'The LaLiT Grand Palace Srinagar', city: 'Srinagar', country: 'India', email: 'srinagar@thelalit.com', reservationsEmail: 'megha.rawat@thelalit.com', contactName: 'Megha Rawat', terms: '5 Nov: shared a quotation (in the reply) — send each enquiry.' },
  // Perfect Stayz group (perfectstayzgroup.com), loaded 11 Nov 2026 at Ronak's request. Details from each hotel's own page.
  { name: "Perfectstayz Koko Maya, Morjim", city: "Goa", country: "India", email: "perfectstayz.kokomaya@gmail.com", address: "jpqh+m45, mo0rjim, Morjim, Goa 403512, India", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/koko-maya-resort-in-morjim/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Luxe Mall Road, Mussoorie", city: "Mussoorie", country: "India", email: "perfectstayzluxe.mussoorie@gmail.com", address: "Camel Back Road, Ambedkar Chowk, Nearby Library Chowk, Mussoorie, Dehradun, Uttarakhand - 248179", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/luxe-mall-road-mussoorie-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Luxe Kapilaz, Bhimtal", city: "Bhimtal", country: "India", email: "perfectstayzpremium.kapilaz33@gmail.com", address: "Harish Chandra Kapil Kapilaz Tower, Mehragaon, Bhimtal, Mahargaon, Uttarakhand - 263136", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/perfectstayz-luxe-kapilaz-bhimtal-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium AIIMS, Rishikesh", city: "Rishikesh", country: "India", email: "aims.perfectstayz@gmail.com", address: "AIIMS MBBS Hostel Road Street, 6, Virbhadra Road, Near Seema Dental College, Rishikesh, Uttarakhand - 249203", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-aiims-rishikesh-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium At Mall Road (Hotel Super), Mussoorie", city: "Mussoorie", country: "India", email: "perfectstayzpremium.mussoorie@gmail.com", address: "2, Mall Road, Mussoorie, Uttarakhand - 248179", phone: "+91 73 5315 0111 · +91 81 7184 6141", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-at-mall-road-hotel-super-mussoorie/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Aurevva, Dehradun", city: "Dehradun", country: "India", email: "perfectstayzpremium.aurevva@gmail.com", address: "Mussoorie Road, Near DIT College, Salan Gaon, Bhagwant Pur, Makka Wala, Dehradun, Uttarakhand - 248009", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-aurevva-dehradun/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Luxe Suites, Marra", city: "Goa", country: "India", email: "perfectstayz.carnivalsuites@gmail.com", address: "GQCX+RVW, Marra, Goa - 403511", phone: "+91 73 5315 0111 · +91 81 7184 6141", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-carnival-suites-marra-goa/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Grand Inn, Goa", city: "Goa", country: "India", email: "perfectstayz.premiumgrandinn@gmail.com", address: "St. Alex Church Naika Vaddo, Near Bardez, Calangute, Goa - 403516", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-grand-inn-goa/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium at Har Ki Pauri Road (Ganga Heights), Haridwar", city: "Haridwar", country: "India", email: "perfectstayzpremium@gmail.com", address: "Safe Parking, Modi Bhavan, Neeranjani Akhara to Har Ki Pauri Road, Near Pilibhit House, Haridwar, Uttarakhand - 249401", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-har-ki-pauri-road-haridwar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Kaashin, Varanasi", city: "Varanasi", country: "India", email: "perfectstayz.kaashin@gmail.com", address: "Mahesh Nagar, Nagwa Lanka, Varanasi, Uttar Pradesh - 221005", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-kaashin-varanasi-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Krish Crown, Vrindavan", city: "Vrindavan", country: "India", email: "perfectstayzgroup@gmail.com", address: "Subrata Road, Raman Reiti, Sunrakh Bangar, Vrindavan, Mathura, Uttar Pradesh - 281121", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-krish-crown-vrindavan/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Krishna Abode, Vrindavan", city: "Vrindavan", country: "India", email: "perfectstayzpremium.vrindavan26@gmail.com", address: "Plot 110, Near Gol Chakkar, Sector 2, Rukmini Vihar, Vrindavan, Uttar Pradesh - 281121", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-krishna-abode-vrindavan/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Lavender, Varanasi", city: "Varanasi", country: "India", email: "perfectstayzpremium.levender@gmail.com", address: "Saket Nagar Colony, Lanka, Varanasi, Uttar Pradesh - 221005", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-lavender-varanasi/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Laxmi Heritage, Rishikesh", city: "Rishikesh", country: "India", email: "perfectstayz.laxmiheritage@gmail.com", address: "Ghutgyani Talli, Near Neem Beach, Tapovan, Rishikesh, Uttarakhand - 249202", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-laxmi-heritage-rishikesh-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Mahadev Regency, Katra", city: "Katra", country: "India", email: "perfectstayz.katra@gmail.com", address: "1, Railway Road, Katra, Reasi, Jammu and Kashmir - 182301", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-mahadev-regency-katra-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Mystic Falls, Rishikesh", city: "Rishikesh", country: "India", email: "perfectstayzhill@gmail.com", address: "Deccan Valley Road, Upper Tapovan, Rishikesh, Uttarakhand - 249192", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-mystic-falls-rishikesh-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Pinaaki - Ganges View, Rishikesh", city: "Rishikesh", country: "India", email: "perfectstayzpremium.pinaaki@gmail.com", address: "Near Hotel Nagraja, Tapovan, Rishikesh, Uttarakhand - 249192", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-pinaaki-ganges-view-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Seraine, Varanasi", city: "Varanasi", country: "India", email: "perfectstayzpremium.seraine@gmail.com", address: "21/84A, Varanasi, Uttar Pradesh - 221010", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-seraine-varanasi/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Seven Oaks, Mussoorie", city: "Mussoorie", country: "India", email: "perfectstayz.sevenoaks@gmail.com", address: "Camels Back Road, The Mall Road, Mussoorie, Uttarakhand - 248179", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-seven-oaks-mussoorie-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Shanti Heritage, Haridwar", city: "Haridwar", country: "India", email: "perfectstayz.shantiheritage@gmail.com", address: "2, Saptrishi Chungi, Near Shantikunj Gate, Haridwar-Dehradun Road, Haridwar, Uttarakhand - 249410", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-shanti-heritage-haridwar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Shree Narayana, Ujjain", city: "Ujjain", country: "India", email: "perfectstayz.shreenarayana30@gmail.com", address: "Triveni Vihar, A-21/26, Indore Road, Pawapuri Colony, Ujjain, Madhya Pradesh - 456010", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-shree-narayana-ujjain-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium The Pride, Mussoorie", city: "Mussoorie", country: "India", email: "perfectstayzpride.mussoorie@gmail.com", address: "F32J+2WM, Chamba - Mussoorie Rd, The Mall Road, Mussoorie, Uttarakhand 248179, India", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-the-pride-mussoorie-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Udaipur By The Lake", city: "Udaipur", country: "India", email: "perfectstayz.udaipur@gmail.com", address: "Near Govardhan Sagar Lake and Govardhan Vilas, Sector 14, Hiran Magri, Udaipur, Rajasthan - 313001", phone: "+91 73 5315 0111 · +91 81 7184 6141", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-udaipur-by-the-lake-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Varanasi", city: "Varanasi", country: "India", email: "perfectstayz.varanasi@gmail.com", address: "Mahmoorganj, Varanasi, Uttar Pradesh - 221010", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-varanasi-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Vrindavan", city: "Vrindavan", country: "India", email: "perfectstayz.babapalace@gmail.com", address: "Gol Chakar, Sector 2, Rukmini Vihar, Vrindavan, Mathura, Uttar Pradesh - 281121", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-vrindavan-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Premium Westend Mall Road, Mussoorie", city: "Mussoorie", country: "India", email: "perfectstayzwestend@gmail.com", address: "Mall Road, Near Ambedkar Chowk, Mussoorie, Uttarakhand - 248179", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/premium-westend-mall-road-mussoorie-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Sukoon by the Ganges, Haridwar", city: "Haridwar", country: "India", email: "sukoonbyganges@gmail.com", address: "Village Jagjeetpur, Opposite Bijli Ghar, Musthakam, Kankhal, Haridwar, Uttarakhand - 249408", phone: "+91 73 5315 0111 · +91 95 2085 5362", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/sukoon-by-the-ganges-haridwar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz The Jungle Resort, Rishikesh", city: "Rishikesh", country: "India", email: "perfectstayz.resort@gmail.com", address: "Badal, Shivpuri, Rishikesh, Uttarakhand - 249192", phone: "+91 70 7894 5362 · +91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/the-jungle-resort-rishikesh/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Aalaya Suites, Haridwar", city: "Haridwar", country: "India", email: "perfectstayz.aalayasuites@gmail.com", address: "Near Neelkanth Dham, Satyam Vihar Colony, Bhoopatwala, Haridwar, Motichur Range, Uttarakhand - 249410", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-aalaya-suites-haridwar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Dhruv Nanda, Haridwar", city: "Haridwar", country: "India", email: "perfectstayz.dhruv@gmail.com", address: "Shiv Murti Lane, Samaj Gali, Near Bannu Biradri, Sharvan Nath Nagar, Haridwar, Uttarakhand - 249401", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-dhruv-nanda-haridwar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Dwarkesh, Haridwar", city: "Haridwar", country: "India", email: "perfectstayzdwarkesh@gmail.com", address: "Shiva Murti, Gali, Jassa Ram Road, Opp. Bannu Biradri Dharamshala, Sharvan Nath Nagar, Haridwar, Uttarakhand - 249401", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-dwarkesh-haridwar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Grey Castle, Haridwar", city: "Haridwar", country: "India", email: "hotelgreycastle.haridwar@gmail.com", address: "Shivmurti Lane, Near Gurjat Samaj, Devpura, Haridwar, Uttarakhand - 249401", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-grey-castle-haridwar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Hills, Rishikesh", city: "Rishikesh", country: "India", email: "perfectstayzhill@gmail.com", address: "Badrinath Road Main, Near Laxman Jhula, Ghugtyani Talli, Tapovan, Rishikesh, Uttarakhand - 249201", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-hills-rishikesh-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Om Palace, Vrindavan", city: "Vrindavan", country: "India", email: "perfectstayz.ompalace@gmail.com", address: "Sunrakh Road, Near Hare Krishna Orchid, Rajpur Khadar, Vrindavan, Uttar Pradesh - 281121", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-om-palace-vrindavan-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Sagar, Amritsar", city: "Amritsar", country: "India", email: "perfectstayzsagar@gmail.com", address: "Outside Hall Gate and Maharaja Travels, Near Bhandari Bridge, Amritsar, Punjab - 143001", phone: "+91 73 5315 0111 · +91 81 7184 6141", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-sagar-amritsar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Shimla (Namah Retreat)", city: "Shimla", country: "India", email: "namahbyperfectstayz@gmail.com", address: "Police Line Road to Annadale, Kaithu, Shimla, Himachal Pradesh - 171003", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-shimla-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Umra Grace, Haridwar", city: "Haridwar", country: "India", email: "hotelumragrace@gmail.com", address: "Shiv Murti Gali, Jassa Ram Road, Near Gujarati Samaj, Haridwar, Uttarakhand - 249401", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-umra-grace-haridwar-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  { name: "Perfectstayz Value Valley Vista, Mussoorie", city: "Mussoorie", country: "India", email: "perfectstayz.valleyvista@gmail.com", address: "33/2, Landour, Mussoorie, Dehradun, Uttarakhand - 248179", phone: "+91 73 5315 0111", otherContacts: "Group office: info@perfectstayzgroup.com, +91 73 5315 0111, 101 Above Sandoz Restaurant, Ishwar Nagar, Okhla, New Delhi 110044. Hotel page: perfectstayzgroup.com/value-valley-vista-mussoorie-hotel/", terms: "Not yet agreed with the group. Loaded from their website on request; confirm B2B rates and who answers rate requests (property email or info@perfectstayzgroup.com)." },
  // Added 11 Nov 2026: replies to the 5–6 Nov outreach, all "best rate case by case".
  { name: 'Best Western Amsterdam', city: 'Amsterdam', country: 'Netherlands', email: 'res@bestwesternamsterdam.nl', contactName: 'Hedia, Reservations', address: 'Voorburgstraat 250, 1059 VD Amsterdam', phone: '+31 85 273 35 68 (reservations; they say they answer by email only)', otherContacts: 'Mark (earlier contact). Web: bestwesternamsterdam.nl', terms: '6 Nov: chose option 2, best rate on request. Send group enquiries by email with dates and rooms. Email only, no phone.' },
  { name: 'Garrya Tongsai Bay Samui', city: 'Koh Samui', country: 'Thailand', email: 'Suthanan.Manyam@garrya.com', reservationsEmail: 'Reservations-Tongsaibay@garrya.com', contactName: 'Ann (Suthanan Manyam), Senior Sales Manager – Leisure & MICE (Bangkok office)', address: '84 Moo 5, Bophut, Koh Samui, Surat Thani 84320', phone: '+66 2 027 7884 (Bangkok sales & reservations office)', otherContacts: 'Samui office +66 77 913 750. Reservations: Reservations-Tongsaibay@garrya.com. Bangkok office: 1035/12 71 Sport Club Building, 4th floor, Soi Pridi Banomyong 41, Sukhumvit 71, Bangkok 10110', terms: '9 Nov: special room rate case by case.' },
  { name: 'Angsana Laguna Phuket', city: 'Phuket', country: 'Thailand', email: 'Sutthimon.Yomrueng@angsana.com', reservationsEmail: 'Reservations-LagunaPhuket@angsana.com', contactName: 'Tom (Sutthimon Yomrueng), Director of Sales', address: '10 Moo 4 Srisoonthorn Road, Cherngtalay, Thalang, Phuket 83110', phone: 'Mobile +66 65 550 0546 · Hotel +66 76 358 500', otherContacts: 'Jittima Takarnkit: Jittima.T@angsana.com. Sales: Sales-Lagunaphuket@angsana.com. MICE: MICE-Lagunaphuket@angsana.com. Reservations: Reservations-LagunaPhuket@angsana.com. Bangkok sales office: 12th floor, Thai Wah Tower 1, 21/31 South Sathorn Road, Bangkok 10120', terms: '9 Nov: no annual contract (allocations set by corporate). FIT and GIT rates case by case. Copy Sales-Lagunaphuket@angsana.com.' },
  { name: 'Avani Ao Nang Cliff Krabi Resort', city: 'Krabi', country: 'Thailand', email: 'nuttanan_la@avanihotels.com', contactName: 'Tookta (Nuttanan Laoyodtrakool), Cluster Director of Sales (also Avani+ Koh Lanta)', phone: 'Mobile +66 62 463 6154 · Office +66 2 365 7500', otherContacts: 'Chaloemwut Ponsamritinan: chaloemwut.ponsamrit@avanihotels.com. Sales: sales.vank@avanihotels.com. Hotel: aonang.krabi@avanihotels.com. Minor Hotels, 12th floor, 88 The PARQ, Ratchadaphisek Road, Bangkok 10110', terms: '7 Nov: no fixed FIT rates for new partners without booking history; rates case by case. Open to groups, weddings and MICE. Copy sales.vank@avanihotels.com.' },
  { name: 'Alaya Resort Ubud', city: 'Bali', country: 'Indonesia', email: 'salescoordinator.ubud@alayahotels.com', reservationsEmail: 'reservation.ubud@alayahotels.com', contactName: 'Dayu Tri Santika, Sales Executive', address: 'Jl. Hanoman, Ubud, Bali 80571', phone: 'Mobile +62 812 3919 0072 · Hotel +62 361 972200 / +62 361 8468925', otherContacts: 'Sales admin: salesadmin.ubud@alayahotels.com. Sales: sales2.ubud@alayahotels.com, sales@alayahotels.com. Reservations: reservation.ubud@alayahotels.com', terms: '9 Nov: no contract rate (limited inventory); ad hoc rate for each enquiry.' },
  { name: 'Pullman Bali Legian Beach', city: 'Bali', country: 'Indonesia', email: 'Elyna.TRISIANI@accor.com', reservationsEmail: 'H6556@accor.com', contactName: 'Elyna Trisiani, Sales Manager', address: 'Jl. Melasti No. 1, Legian, Kuta, Badung, Bali 80361', phone: 'Mobile +62 812 383 6611 (Elyna asked us to call her directly) · Hotel +62 361 762 500', otherContacts: 'Hotel: H6556@accor.com. Also copied: Anggita.PRAMUDYANINGTYAS@accor.com, Ikadek.NARENA@accor.com, Agus.KARTIKA@accor.com, Kristina.TJAHJANI@accor.com, Putu.SUKMANINGSIH@accor.com, Nikken.BERLIANA@accor.com, Gustiayu.APRILIANA@accor.com', terms: '10 Nov: dynamic rates; quotes the best available rate for each enquiry.' },
  { name: 'Mercure Sydney', city: 'Sydney', country: 'Australia', email: 'Dina.ELZAYAT@accor.com', reservationsEmail: 'H2073@accor.com', contactName: 'Dina El Zayat, Inbound & Wholesale Account Manager (also ibis Sydney World Square)', phone: 'Mobile +61 423 333 298 · Office +61 2 9217 6637', otherContacts: 'Savio Anthony Fernandes: Savio-anthony.FERNANDES@accor.com. Hotel: H2073@accor.com. Dina offered a hotel visit if Ronak is in Sydney', terms: '10 Nov: no FIT rate; ad hoc by dates and group size. Send dates and rooms for her best available rate.' },
  { name: 'Hyatt Regency Danang Resort and Spa', outreachName: 'Hyatt Regency Danang Resort', city: 'Da Nang', country: 'Vietnam', email: 'Thanh.TranThiUyen@hyatt.com', reservationsEmail: 'reservation.danang@hyatt.com', contactName: 'Tani (Thanh Tran), Assistant Sales Manager', address: '5 Truong Sa Street, Ngu Hanh Son Ward, Da Nang', phone: 'Mobile +84 777 962 444 · Hotel +84 236 398 1234 ext. 8414', otherContacts: 'Dung Huynh: dung.huynh@hyatt.com. Reservations: reservation.danang@hyatt.com. Hotel: danangregency@hyatt.com', terms: '6 Nov: no fixed FIT. Under 10 rooms: Hyatt member BB rate less 10%, through reservations. 10+ rooms: Tani quotes best rate plus 10% commission. 9 Nov: wedding offer for 15–25 Feb 2027 from VND 4,000,000 net (single, BB, 10% commission on the base rate).' },
  { name: 'Amari Bangkok', city: 'Bangkok', country: 'Thailand', email: 'sales.bangkok@amari.com', reservationsEmail: 'reservations.bangkok@amari.com', contactName: 'June (Vorrawalan Teunsuriwong), Sales', address: '847 Phetchaburi Road, Bangkok 10400', phone: '+66 2 653 9000 ext. 5110', otherContacts: 'Pornnapa Lertpitaksit: pornnapa.l@amari.com. Janistar Duangpukdee (first contact): janistar.d@amari.com. Reservations: reservations.bangkok@amari.com. Catering: catering.bangkok@amari.com', terms: '10 Nov: FIT through their B2B booking link (net, 15% off public rates; link in the reply). Groups of 8+ rooms by email to sales.bangkok@.' },
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
/** Ashlee enquiries come to us — we quote from the contract instead of asking the hotel each time. */
export const ASHLEE_QUOTES_TO = 'info@hotelbridge.co';
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

/* ------------------------------ Fragrant Nature 2026–27 ------------------------------ */
/* Source: "Winter Rates 2026-27 for Fragrant Nature Munnar, Kochi and Kollam.pdf" (Drive folder
 * 1oZ_bQA1PFhZ44JIu6R8J0begJMCJczqG; emailed 3 Nov 2026 by sales6@fragrantnature.com).
 * INR per room per night, single or double, CP (breakfast), the "CPAI" figure = GST INCLUDED.
 * Net, non-commissionable. Child under 6 free; 12+ is an adult. On request — enquiries come to us. */
export type FlatContract = {
  hotelName: string; city: string; reference: string; currency: string; validTo: string; quotesTo: string;
  checkInTime: string; checkOutTime: string; extraAdult: number; extraChild: number;
  freeCancelDays: number; notes: string;
  rooms: { name: string; maxAdults: number; maxChildren: number; maxOccupancy: number; periods: [string, string, number][] }[];
  /** Compulsory gala nights, charged per room for 2 adults. */
  supplements: [string, number, string][];
  extras: Extra[];
};

const FN_NOTES = 'Fragrant Nature winter 2026–27 rate sheet (PDF, 3 Nov 2026). INR, GST included (CPAI column), net, non-commissionable. FIT cancellation: free until 15 days before arrival, 50% from 15 days, 100% within 7 days / no-show (GIT: 45/30/20 days). Reconfirm FIT with exchange order or full prepayment 30 days before arrival (GIT 45). Child under 6 free sharing; 6–12 extra child rate; 12+ adult. Includes welcome, in-room tea/coffee, pool, gym, Wi-Fi. Rates loaded as single/double; extra adult and child per night as listed. Contact: Edson Thomas, Sales Manager, sales2@fragrantnature.com.';
const span = (a: string, b: string, rate: number): [string, string, number] => [a, b, rate];
const gala = (date: string, adult: number, child: number, label: string): Extra =>
  ({ name: label, category: 'celebration', unit: 'per_person', price: adult, child, compulsory: true, validFrom: date, validTo: date, note: 'Compulsory for guests in house, gala dinner with live music. Included in room prices for 2 adults that night; children are extra.' });

export const FRAGRANT_NATURE: FlatContract[] = [
  { hotelName: 'Fragrant Nature Kollam', city: 'Kollam', reference: 'FN-KOLLAM-W2627', currency: 'INR', validTo: '2027-03-31', quotesTo: ASHLEE_QUOTES_TO,
    checkInTime: '14:00', checkOutTime: '12:00', extraAdult: 1750, extraChild: 1250, freeCancelDays: 15, notes: FN_NOTES,
    rooms: [
      { name: 'Premium Lake View Room', maxAdults: 3, maxChildren: 1, maxOccupancy: 4, periods: [span('2026-10-01', '2027-03-31', 6350)] },
      { name: 'Premium Lake View Villa', maxAdults: 3, maxChildren: 1, maxOccupancy: 4, periods: [span('2026-10-01', '2027-03-31', 7850)] },
      { name: 'Premium Lake View Private Pool Villa', maxAdults: 3, maxChildren: 1, maxOccupancy: 4, periods: [span('2026-10-01', '2027-03-31', 15000)] },
      { name: 'Twin Bedroom Lake View Pool Villa (up to 6 guests)', maxAdults: 3, maxChildren: 3, maxOccupancy: 6, periods: [span('2026-10-01', '2027-03-31', 23000)] },
    ],
    supplements: [['2026-12-24', 5500, 'Compulsory Christmas Eve gala (2 adults × 2,750)'], ['2026-12-31', 7000, 'Compulsory New Year gala (2 adults × 3,500)']],
    extras: [
      { name: 'Breakfast', category: 'dining', unit: 'per_person', price: 350, child: 200, note: 'For room-only add-ons and extra guests' },
      { name: 'Lunch or dinner', category: 'dining', unit: 'per_person', price: 1200, child: 500 },
      gala('2026-12-24', 2750, 1500, 'Christmas Eve gala dinner'), gala('2026-12-31', 3500, 2000, "New Year's Eve gala dinner"),
    ] },
  { hotelName: 'Fragrant Nature Kochi', city: 'Kochi', reference: 'FN-KOCHI-W2627', currency: 'INR', validTo: '2027-03-31', quotesTo: ASHLEE_QUOTES_TO,
    checkInTime: '14:00', checkOutTime: '12:00', extraAdult: 3000, extraChild: 2500, freeCancelDays: 15, notes: FN_NOTES,
    rooms: ([['Duke’s Chamber', 11800, 12800, 16000], ['Ocean Blue', 16000, 18500, 23000], ['Royal Dutch', 27000, 28500, 30000]] as const).map(([name, a, b, peak]) => ({
      name, maxAdults: 3, maxChildren: 1, maxOccupancy: 4,
      periods: [span('2026-10-01', '2026-11-30', a), span('2026-12-01', '2026-12-20', b), span('2026-12-21', '2027-01-10', peak), span('2027-01-11', '2027-02-28', b), span('2027-03-01', '2027-03-31', a)],
    })),
    supplements: [['2026-12-24', 7000, 'Compulsory Christmas Eve gala (2 adults × 3,500)'], ['2026-12-31', 10000, 'Compulsory New Year gala (2 adults × 5,000)']],
    extras: [
      { name: 'Candle-light dinner', category: 'dining', unit: 'per_couple', price: 5500, note: 'Bay View Terrace, with cake and badam milk' },
      { name: 'Clock Tower dinner', category: 'dining', unit: 'per_couple', price: 10000, note: '5-course dinner, with cake and badam milk' },
      { name: 'Fisherman seafood dinner', category: 'dining', unit: 'per_person', price: 2500, note: 'Minimum 15 guests' },
      { name: 'Breakfast', category: 'dining', unit: 'per_person', price: 500, child: 300, note: 'For extra guests' },
      { name: 'Lunch or dinner', category: 'dining', unit: 'per_person', price: 1500, child: 750 },
      gala('2026-12-24', 3500, 2000, 'Christmas Eve gala dinner'), gala('2026-12-31', 5000, 2500, "New Year's Eve gala dinner"),
    ] },
  { hotelName: 'Fragrant Nature Munnar', city: 'Munnar', reference: 'FN-MUNNAR-W2627', currency: 'INR', validTo: '2027-05-30', quotesTo: ASHLEE_QUOTES_TO,
    checkInTime: '14:00', checkOutTime: '12:00', extraAdult: 2500, extraChild: 2000, freeCancelDays: 15, notes: FN_NOTES,
    rooms: ([['Tropic Green', 9850, 12500], ['Moonlight Bliss', 12200, 14000], ['Wild Orchid Suite', 28000, 28000], ['Royal Fragrant Suite', 33000, 33000]] as const).map(([name, a, peak]) => ({
      name, maxAdults: 3, maxChildren: 1, maxOccupancy: 4,
      periods: [span('2026-10-01', '2026-12-20', a), span('2026-12-21', '2027-01-10', peak), span('2027-01-11', '2027-05-30', a)],
    })),
    supplements: [['2026-12-24', 6000, 'Compulsory Christmas Eve gala (2 adults × 3,000)'], ['2026-12-31', 8000, 'Compulsory New Year gala (2 adults × 4,000)']],
    extras: [
      { name: 'Candle-light dinner', category: 'dining', unit: 'per_couple', price: 5500, note: 'At the Glass House restaurant, with cake and badam milk' },
      { name: 'Moonlight Bliss terrace dinner', category: 'dining', unit: 'per_couple', price: 7000, note: 'Candle-light dinner on the terrace with a butler, cake and badam milk' },
      { name: 'Breakfast', category: 'dining', unit: 'per_person', price: 400, child: 250, note: 'For extra guests' },
      { name: 'Lunch or dinner', category: 'dining', unit: 'per_person', price: 1300, child: 600 },
      gala('2026-12-24', 3000, 1500, 'Christmas Eve gala dinner'), gala('2026-12-31', 4000, 2000, "New Year's Eve gala dinner"),
    ] },
];

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { FlightCard } from './components/FlightCard';
import { FeatureCards } from './components/FeatureCards';
import { AiConcierge } from './components/AiConcierge';
import { BookingModal } from './components/BookingModal';
import { OperationsConsole } from './components/OperationsConsole';
import { AuthModal } from './components/AuthModal';
import { WaitlistModal } from './components/WaitlistModal';
import { ProfileModal, CustomerProfileData } from './components/ProfileModal';
import { MyBookingsModal, CustomerBooking } from './components/MyBookingsModal';
import { INITIAL_FLIGHTS } from './data/mockFlights';
import {
  Flight,
  BookingResponse,
  fetchFlightsApi,
  searchFlightsApi,
  fetchCustomerBookingsApi,
  joinWaitlistApi,
} from './services/api';
import { authService } from './services/authService';
import { Radar, CheckCircle2, Info } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'b2c' | 'b2b'>('b2c');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);

  // Authenticated Passenger Session (Persisted in localStorage, null if unauthenticated)
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: 'customer' | 'admin' } | null>(() => {
    const saved = localStorage.getItem('aeronexus_customer_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Airline Standard Passenger Profile (Persisted in localStorage)
  const [userProfile, setUserProfile] = useState<CustomerProfileData>(() => {
    const saved = localStorage.getItem('aeronexus_customer_profile');
    return saved ? JSON.parse(saved) : {
      title: 'Mr',
      firstName: 'Syed Taseer',
      lastName: 'Abbas',
      dob: '1998-05-15',
      gender: 'Male',
      nationality: 'Pakistani',
      email: 'passenger@aeronexus.com',
      phone: '+92 300 1234567',
      emergencyName: 'Fatima Abbas (Spouse)',
      emergencyPhone: '+92 321 9876543',
      docType: 'PASSPORT',
      docNumber: 'PK8829104A',
      countryOfIssuance: 'Pakistan',
      docExpiryDate: '2030-11-20',
      mealPreference: 'Halal',
      seatPreference: 'Window',
      wheelchair: false,
      frequentFlyerNumber: 'AERO-PK-9281',
    };
  });

  // Active Passenger Bookings (Loaded from backend or localStorage)
  const [userBookings, setUserBookings] = useState<CustomerBooking[]>(() => {
    const saved = localStorage.getItem('aeronexus_customer_bookings');
    if (saved) return JSON.parse(saved);
    const now = new Date();
    return [
      {
        id: 'bk-101',
        pnr: 'PK794A',
        flightNumber: 'AP-104',
        origin: 'JFK',
        destination: 'LHR',
        departureTime: new Date(now.getTime() + 28 * 60 * 60 * 1000).toISOString(),
        arrivalTime: new Date(now.getTime() + 35 * 60 * 60 * 1000).toISOString(),
        cabinClass: 'BUSINESS',
        status: 'CONFIRMED',
        passengerName: 'Syed Taseer Abbas',
        totalPriceUSD: 2450,
      },
    ];
  });

  // Refresh live flights and bookings on mount
  useEffect(() => {
    fetchFlightsApi().then((live) => {
      if (live && live.length > 0) {
        setFlights(live);
      }
    });

    fetchCustomerBookingsApi(currentUser?.name).then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const mapped: CustomerBooking[] = data.map((b: any) => ({
          id: b.id,
          pnr: b.pnr || 'PK' + b.id.slice(0, 4).toUpperCase(),
          flightNumber: b.flightNo || 'AP-104',
          origin: b.origin || 'JFK',
          destination: b.destination || 'LHR',
          departureTime: b.departure_time || new Date().toISOString(),
          arrivalTime: b.arrival_time || new Date().toISOString(),
          cabinClass: (b.seat_class?.toUpperCase() || 'BUSINESS') as any,
          status: b.status === 'confirmed' ? 'CONFIRMED' : (b.status === 'cancelled' ? 'CANCELLED_BY_CUSTOMER' : 'HELD'),
          passengerName: b.passenger_name || currentUser?.name || 'Syed Taseer Abbas',
          totalPriceUSD: b.totalPaid || 1890,
        }));
        setUserBookings(mapped);
        localStorage.setItem('aeronexus_customer_bookings', JSON.stringify(mapped));
      }
    });
  }, [currentUser]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await authService.cancelBooking(bookingId);
      triggerToast('Booking cancelled on airline database.');
    } catch {
      triggerToast('Cancelled locally under self-service allowance.');
    }
    setUserBookings((prev) => {
      const updated = prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'CANCELLED_BY_CUSTOMER' as const } : b
      );
      localStorage.setItem('aeronexus_customer_bookings', JSON.stringify(updated));
      return updated;
    });
    // Refresh live flights to show released seat inventory
    fetchFlightsApi().then((live) => {
      if (live.length > 0) setFlights(live);
    });
  };

  const handleSaveProfile = (updated: CustomerProfileData) => {
    setUserProfile(updated);
    localStorage.setItem('aeronexus_customer_profile', JSON.stringify(updated));
  };

  const handleAuthSuccess = (user: { email: string; name: string; role: 'customer' | 'admin' }) => {
    setCurrentUser(user);
    localStorage.setItem('aeronexus_customer_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    localStorage.removeItem('aeronexus_customer_user');
    triggerToast('Signed out of passenger session.');
  };

  // Flight data
  const [flights, setFlights] = useState<Flight[]>(INITIAL_FLIGHTS);
  const [sortOption, setSortOption] = useState<'lowest' | 'duration' | 'departure'>('lowest');

  // Search parameters
  const [tripType, setTripType] = useState<'round' | 'oneway' | 'multi'>('round');
  const [origin, setOrigin] = useState('New York, USA (JFK)');
  const [destination, setDestination] = useState('London Heathrow, UK (LHR)');
  const [travelDates, setTravelDates] = useState('Oct 14, 2026 - Oct 22, 2026');
  const [cabin, setCabin] = useState('business');
  const [directOnly, setDirectOnly] = useState(true);
  const [flexibleDates, setFlexibleDates] = useState(false);

  // Quick flight status checker input
  const [statusFlightQuery, setStatusFlightQuery] = useState('');

  // Booking Modal
  const [bookingMode, setBookingMode] = useState<'hold' | 'confirm' | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  // Waitlist Modal
  const [waitlistFlight, setWaitlistFlight] = useState<Flight | null>(null);

  // AI Concierge
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live UTC Clock
  const [utcTime, setUtcTime] = useState('00:00:00 UTC');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3800);
  };

  const handleSwapAirports = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    triggerToast('Origin and Destination sectors swapped.');
  };

  const extractIata = (str: string): string => {
    const match = str.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : str.slice(0, 3).toUpperCase();
  };

  const handleFlightSearch = async () => {
    const origCode = extractIata(origin);
    const destCode = extractIata(destination);

    triggerToast(`Querying live GDS flights for ${origCode} → ${destCode}...`);
    try {
      const results = await searchFlightsApi({ origin: origCode, destination: destCode });
      if (results && results.length > 0) {
        setFlights(results);
        triggerToast(`Found ${results.length} live scheduled flight(s) from database!`);
      } else {
        triggerToast(`No exact flights found for ${origCode} → ${destCode}. Showing all active flights.`);
        const all = await fetchFlightsApi();
        if (all.length > 0) setFlights(all);
      }
    } catch {
      triggerToast('Using local flight schedule.');
    }

    const resultsEl = document.getElementById('results-section');
    if (resultsEl) {
      resultsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHoldFare = (flight: Flight) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      triggerToast('🔒 Please Sign In or Create an Account to hold flight seats.');
      return;
    }
    setSelectedFlight(flight);
    setBookingMode('hold');
  };

  const handleConfirmTicket = (flight: Flight) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      triggerToast('🔒 Please Sign In or Create an Account to book flight tickets.');
      return;
    }
    setSelectedFlight(flight);
    setBookingMode('confirm');
  };

  const handleBookingSuccess = (res: BookingResponse) => {
    // Add to user bookings
    const newB: CustomerBooking = {
      id: res.pnr ? `bk-${res.pnr}` : `bk-${Date.now()}`,
      pnr: res.pnr,
      flightNumber: res.flightNo,
      origin: extractIata(res.sector.split('→')[0] || 'JFK'),
      destination: extractIata(res.sector.split('→')[1] || 'LHR'),
      departureTime: new Date(Date.now() + 24 * 3600000).toISOString(),
      arrivalTime: new Date(Date.now() + 32 * 3600000).toISOString(),
      cabinClass: (res.cabin?.toUpperCase().includes('FIRST') ? 'FIRST' : 'BUSINESS') as any,
      status: res.status === 'HOLD' ? 'HELD' : 'CONFIRMED',
      passengerName: res.passengerName,
      totalPriceUSD: res.totalPaid || 1890,
    };

    setUserBookings((prev) => {
      const updated = [newB, ...prev];
      localStorage.setItem('aeronexus_customer_bookings', JSON.stringify(updated));
      return updated;
    });

    // Refresh flight seats from backend
    fetchFlightsApi().then((live) => {
      if (live.length > 0) setFlights(live);
    });
  };

  const handleQuickFlightStatusCheck = () => {
    const query = statusFlightQuery.trim().toUpperCase();
    if (!query) {
      triggerToast('Please enter a flight number (e.g. AP-104 or AP-882)');
      return;
    }
    const match = flights.find((f) => f.flightNo.toUpperCase() === query);
    if (match) {
      triggerToast(
        `${match.flightNo} (${match.originCode}→${match.destinationCode}): Status ${match.status} at Gate ${match.gate}`
      );
    } else {
      triggerToast(`Transponder ${query} not detected in active North Atlantic sector.`);
    }
  };

  // Cabin pricing config — multipliers relative to Business Suite base
  const CABIN_CONFIG: Record<string, { label: string; priceMultiplier: number; strikeMult: number }> = {
    economy:  { label: 'Economy Standard',      priceMultiplier: 0.254, strikeMult: 0.345 },
    premium:  { label: 'Premium Economy',        priceMultiplier: 0.471, strikeMult: 0.608 },
    business: { label: 'Business Suite',         priceMultiplier: 1.0,   strikeMult: 1.296 },
    first:    { label: 'First Class Flagship',   priceMultiplier: 1.825, strikeMult: 2.222 },
  };

  // Sort flights
  const sortedFlights = [...flights].sort((a, b) => {
    if (sortOption === 'lowest') return a.basePrice - b.basePrice;
    if (sortOption === 'departure') return a.depTime.localeCompare(b.depTime);
    return a.duration.localeCompare(b.duration);
  });

  // Apply selected cabin pricing to each flight for display
  const cabinKey = (cabin || 'business').toLowerCase();
  const cabinCfg = CABIN_CONFIG[cabinKey] ?? CABIN_CONFIG['business'];
  const displayFlights = sortedFlights.map((f) => ({
    ...f,
    cabin: cabinCfg.label,
    basePrice: Math.round(f.basePrice * cabinCfg.priceMultiplier),
    strikePrice: Math.round(f.basePrice * cabinCfg.strikeMult),
  }));

  return (
    <div className="bg-[#f9f9f8] min-h-screen flex flex-col text-[#1a1c1c] selection:bg-[#d7e3ff] selection:text-[#001b3e]">
      {/* Shared Navigation Header */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        utcTime={utcTime}
        isAdminAuth={isAdminAuth}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => {
          if (!currentUser) {
            setIsAuthModalOpen(true);
            triggerToast('🔒 Please Sign In to access your passenger profile.');
            return;
          }
          setIsProfileOpen(true);
        }}
        onOpenMyBookings={() => {
          if (!currentUser) {
            setIsAuthModalOpen(true);
            triggerToast('🔒 Please Sign In to view your airline bookings.');
            return;
          }
          setIsMyBookingsOpen(true);
        }}
        onLogout={handleLogout}
        bookingsCount={userBookings.filter((b) => !b.status.startsWith('CANCELLED')).length}
        onShowToast={triggerToast}
        onOpenAiConcierge={(prompt) => {
          setAiInitialPrompt(prompt);
          setIsAiOpen(true);
        }}
      />

      {/* Guest Passenger Notice Banner */}
      {!currentUser && (
        <div className="bg-[#001b3e] text-white px-4 py-2.5 text-xs border-b border-[#005cba]/30 animate-in fade-in duration-200">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
              <span>
                <strong>Passenger Account Required:</strong> Sign In or Create an Account to book live flights, hold fares for 15 minutes, and manage your boarding passes.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1 bg-[#005cba] hover:bg-[#004b99] text-white rounded font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs whitespace-nowrap"
            >
              Sign In / Register
            </button>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 z-50 bg-[#0a2540] text-white px-3 sm:px-4 py-2.5 rounded shadow-xl flex items-center gap-2 sm:gap-3 text-xs font-medium border border-[#74777e]/30 animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm sm:max-w-md">
          <Info className="w-4 h-4 text-[#5095fe] flex-shrink-0" />
          <span className="line-clamp-3">{toastMsg}</span>
        </div>
      )}

      {/* VIEW 1: B2C PUBLIC BOOKING PORTAL */}
      {currentView === 'b2c' ? (
        <main className="flex-1 flex flex-col">
          {/* Hero Banner with Surgical Architectural Accent */}
          <section className="relative bg-white border-b border-[#c4c6ce] pt-6 sm:pt-10 pb-8 sm:pb-12 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#d7e3ff] text-[#001b3e] text-[10px] sm:text-xs font-semibold font-label-caps uppercase mb-3">
                    <span className="material-symbols-outlined text-[14px]">format_image_left</span>
                    <span className="hidden sm:inline">IATA Registered Fleet • 99.98% Telemetry Dispatch</span>
                    <span className="sm:hidden">IATA Fleet • 99.98% Dispatch</span>
                  </div>
                  <h1 className="font-display-hero text-2xl sm:text-4xl md:text-5xl text-[#000f22] font-semibold tracking-tight leading-tight">
                    Next-Generation Flight Booking &amp;
                    <br className="hidden md:inline" /> Aviation Operations
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-[#43474d] mt-2 max-w-2xl leading-relaxed">
                    Engineered with sub-second live cabin inventory, algorithmic fare holds, and real-time transponder route fidelity.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#f3f4f3] border border-[#c4c6ce] hover:border-[#74777e] text-[#000f22] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    onClick={() => {
                      const el = document.getElementById('results-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <Radar className="w-4 h-4 text-[#005cba]" />
                    <span>Track Live Route</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Flight Search Bento Card */}
              <SearchBar
                tripType={tripType}
                setTripType={setTripType}
                origin={origin}
                setOrigin={setOrigin}
                destination={destination}
                setDestination={setDestination}
                travelDates={travelDates}
                setTravelDates={setTravelDates}
                cabin={cabin}
                setCabin={setCabin}
                directOnly={directOnly}
                setDirectOnly={setDirectOnly}
                flexibleDates={flexibleDates}
                setFlexibleDates={setFlexibleDates}
                onSearch={handleFlightSearch}
                onSwap={handleSwapAirports}
              />
            </div>
          </section>

          {/* Flight Search Results Section */}
          <section className="py-6 sm:py-10 px-4 sm:px-6 max-w-6xl mx-auto w-full" id="results-section">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-[#c4c6ce] mb-6 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline text-lg sm:text-xl text-[#000f22] font-semibold">
                    Available Sectors: JFK ⇄ LHR
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-[#eeeeed] border border-[#c4c6ce] text-[11px] font-label-caps text-[#43474d] font-bold">
                    {sortedFlights.filter((f) => f.route.includes('JFK') || f.originCode === 'JFK').length} MATCHES FOUND
                  </span>
                </div>
                <p className="text-xs text-[#43474d] mt-0.5">
                  Showing scheduled line-haul operations verified with live ICAO transponder telemetry.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#43474d] font-medium">Sort By:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="text-xs border border-[#c4c6ce] rounded py-1 px-2.5 bg-white text-[#000f22] outline-none cursor-pointer"
                >
                  <option value="lowest">Lowest Price First</option>
                  <option value="duration">Shortest Flight Duration</option>
                  <option value="departure">Earliest Departure</option>
                </select>
              </div>
            </div>

            {/* Real-Time Flight Cards Stack */}
            <div className="space-y-4">
              {displayFlights
                .filter((f) => f.originCode === 'JFK' || f.route.includes('JFK'))
                .map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    onHold={handleHoldFare}
                    onConfirm={handleConfirmTicket}
                  />
                ))}
            </div>
          </section>

          {/* Why Fly With AeroNexus Feature Grid */}
          <FeatureCards />

          {/* Flight Status Quick Checker */}
          <section className="py-6 sm:py-10 px-4 sm:px-6 max-w-6xl mx-auto w-full">
            <div className="bg-white border border-[#c4c6ce] rounded-xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-xs">
              <div>
                <h4 className="font-headline text-base text-[#000f22] font-semibold">
                  Need Instant Flight Status?
                </h4>
                <p className="text-xs text-[#43474d] mt-1">
                  Check today's active flight plan, boarding gate, and estimated runway touchdown.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="e.g. AP-104 or AP-882"
                  value={statusFlightQuery}
                  onChange={(e) => setStatusFlightQuery(e.target.value)}
                  className="text-xs px-3 py-2 border border-[#c4c6ce] rounded font-code-telemetry uppercase text-[#000f22] focus:ring-1 focus:ring-[#005cba] w-full md:w-48 outline-none"
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-[#000f22] text-white text-xs font-semibold rounded hover:bg-[#162538] transition-colors whitespace-nowrap cursor-pointer"
                  onClick={handleQuickFlightStatusCheck}
                >
                  Verify Status
                </button>
              </div>
            </div>
          </section>
        </main>
      ) : (
        /* VIEW 2: B2B OPERATIONS CONSOLE (ADMIN) */
        <OperationsConsole
          flights={flights}
          onUpdateStatus={(flightNo, newStatus) => {
            setFlights((prev) =>
              prev.map((f) => (f.flightNo === flightNo ? { ...f, status: newStatus } : f))
            );
            triggerToast(`Status broadcast: ${flightNo} updated to ${newStatus}`);
          }}
          onAddFlight={(newFlight) => {
            setFlights((prev) => [newFlight, ...prev]);
          }}
          onOpenWaitlist={(f) => setWaitlistFlight(f)}
          onShowToast={triggerToast}
        />
      )}

      {/* Shared Footer */}
      <footer className="bg-white text-[#000f22] border-t border-[#c4c6ce] mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 sm:px-8 py-4 sm:py-6 gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <span className="font-headline text-base font-bold text-[#000f22]">
              AeroNexus
            </span>
            <span className="text-[10px] sm:text-xs text-[#43474d]">
              © 2026 AeroNexus Systems Inc.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs font-label-caps text-[#43474d]">
            <button
              type="button"
              className="hover:text-[#000f22] transition-colors cursor-pointer"
              onClick={() =>
                triggerToast(
                  'AeroNexus operates under strict FAA Part 121 and EASA third-country operator compliance.'
                )
              }
            >
              Operational Safety
            </button>
            <button
              type="button"
              className="hover:text-[#000f22] transition-colors cursor-pointer"
              onClick={() => triggerToast('Route network: 142 Active Oceanic Waypoints synchronized.')}
            >
              Route Network
            </button>
            <button
              type="button"
              className="hover:text-[#000f22] transition-colors cursor-pointer"
              onClick={() =>
                triggerToast('GDS API v2.4 (Amadeus/Sabre) Status: Operational (Latency 12ms)')
              }
            >
              GDS API
            </button>
          </div>
        </div>
      </footer>

      {/* Booking & Passenger Modal */}
      <BookingModal
        mode={bookingMode}
        flight={selectedFlight}
        onClose={() => {
          setBookingMode(null);
          setSelectedFlight(null);
        }}
        onSuccess={handleBookingSuccess}
        onShowToast={triggerToast}
      />

      {/* Waitlist Modal */}
      <WaitlistModal
        flight={waitlistFlight}
        onClose={() => setWaitlistFlight(null)}
        onAddStandby={(flightNo, _passengerName) => {
          setFlights((prev) =>
            prev.map((f) =>
              f.flightNo === flightNo
                ? { ...f, waitlistCount: (f.waitlistCount || 0) + 1 }
                : f
            )
          );
        }}
        onShowToast={triggerToast}
      />

      {/* Security Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onShowToast={triggerToast}
      />

      {/* Airline Passenger Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
        onSave={handleSaveProfile}
        onShowToast={triggerToast}
      />

      {/* Passenger My Bookings & 4-Hour Cancellation Modal */}
      <MyBookingsModal
        isOpen={isMyBookingsOpen}
        onClose={() => setIsMyBookingsOpen(false)}
        bookings={userBookings}
        onCancelBooking={handleCancelBooking}
        onShowToast={triggerToast}
      />

      {/* Floating AI Concierge Widget */}
      <AiConcierge
        isOpen={isAiOpen}
        onToggle={() => setIsAiOpen((prev) => !prev)}
        initialPrompt={aiInitialPrompt}
      />
    </div>
  );
}

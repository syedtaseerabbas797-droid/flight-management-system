import axios, { AxiosInstance } from 'axios';
import {
  Flight,
  WaitlistPassenger,
  BookingHoldRequest,
  BookingHoldResponse,
  BookingConfirmRequest,
  BookingConfirmResponse,
  WaitlistJoinRequest,
  WaitlistJoinResponse,
  AdminFlightCreateRequest,
} from '../types/aviation';
import { INITIAL_FLIGHTS, INITIAL_WAITLIST } from '../data/mockData';

// API Configuration pointing to required endpoint
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Aviation Data Store connected to FastAPI backend
function mapBackendFlightToAdmin(bf: any): Flight {
  const orig = bf.origin?.toUpperCase() || 'JFK';
  const dest = bf.destination?.toUpperCase() || 'LHR';
  const depDate = bf.departure_time ? new Date(bf.departure_time) : new Date();
  const arrDate = bf.arrival_time ? new Date(bf.arrival_time) : new Date(depDate.getTime() + 7.5 * 3600000);

  const std = `${String(depDate.getUTCHours()).padStart(2, '0')}:${String(depDate.getUTCMinutes()).padStart(2, '0')}`;
  const sta = `${String(arrDate.getUTCHours()).padStart(2, '0')}:${String(arrDate.getUTCMinutes()).padStart(2, '0')}`;

  let totalBooked = 0;
  let totalCap = bf.total_capacity || 300;
  let firstBooked = 0, firstCap = 12;
  let bizBooked = 0, bizCap = 48;
  let ecoBooked = 0, ecoCap = 240;

  if (Array.isArray(bf.seat_inventories) && bf.seat_inventories.length > 0) {
    totalCap = 0;
    bf.seat_inventories.forEach((inv: any) => {
      totalBooked += inv.booked_seats || 0;
      totalCap += inv.total_seats || 0;
      if (inv.seat_class === 'First') {
        firstBooked = inv.booked_seats || 0;
        firstCap = inv.total_seats || 12;
      } else if (inv.seat_class === 'Business') {
        bizBooked = inv.booked_seats || 0;
        bizCap = inv.total_seats || 48;
      } else {
        ecoBooked = inv.booked_seats || 0;
        ecoCap = inv.total_seats || 240;
      }
    });
  }

  const pct = totalCap > 0 ? Math.round((totalBooked / totalCap) * 1000) / 10 : 0;

  return {
    id: bf.id,
    flightNumber: bf.flight_number,
    aircraft: orig === 'SFO' ? 'B787-9' : 'A350-900',
    tailNumber: `N${bf.flight_number.replace(/[^0-9]/g, '') || '904'}AP`,
    engineSpecs: 'ETOPS 370',
    origin: orig,
    originName: `${orig} Station`,
    originGate: 'Gate B22',
    destination: dest,
    destinationName: `${dest} Terminal`,
    destinationTerminal: 'Term 5',
    stdUtc: std,
    etdUtc: std,
    staUtc: sta,
    etaUtc: sta,
    status: bf.status === 'scheduled' ? 'SCHEDULED / ON-TIME' : (bf.status === 'cancelled' ? 'MAINTENANCE HOLD' : 'AIRBORNE / EN ROUTE'),
    statusColor: bf.status === 'cancelled' ? 'rose' : (pct >= 90 ? 'amber' : 'emerald'),
    cabinLoad: {
      booked: totalBooked,
      capacity: totalCap,
      percentage: pct,
      breakdown: {
        first: `${Math.round((firstBooked / (firstCap || 1)) * 100)}%`,
        club: `${Math.round((bizBooked / (bizCap || 1)) * 100)}%`,
        main: `${Math.round((ecoBooked / (ecoCap || 1)) * 100)}%`,
      },
    },
    waitlistCount: 2,
    vipWaitlistCount: 1,
    priceUSD: 1420,
    coordinates: { lat: 40.71, lng: -74.0 },
  };
}

class AviationDataStore {
  private flights: Flight[] = [...INITIAL_FLIGHTS];
  private waitlist: WaitlistPassenger[] = [...INITIAL_WAITLIST];
  private activeHolds: Map<string, BookingHoldResponse> = new Map();
  private confirmedBookings: Map<string, BookingConfirmResponse> = new Map();
  public isConnectedToBackend = false;

  constructor() {
    this.checkBackendHealth();
  }

  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get('/admin/flights', { timeout: 3500 });
      this.isConnectedToBackend = response.status >= 200 && response.status < 300;
      return this.isConnectedToBackend;
    } catch {
      this.isConnectedToBackend = false;
      return false;
    }
  }

  // GET /admin/flights
  async getAdminFlights(): Promise<Flight[]> {
    try {
      const res = await apiClient.get<any[]>('/admin/flights');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        this.isConnectedToBackend = true;
        this.flights = res.data.map(mapBackendFlightToAdmin);
        return this.flights;
      }
    } catch {
      this.isConnectedToBackend = false;
    }
    return [...this.flights];
  }

  // POST /admin/flights
  async createAdminFlight(flightData: AdminFlightCreateRequest): Promise<Flight> {
    const orig = flightData.originIcao.replace(/^K|^E/, '').slice(0, 3).toUpperCase() || 'JFK';
    const dest = flightData.destinationIcao.replace(/^K|^E/, '').slice(0, 3).toUpperCase() || 'LHR';
    const dep = new Date(Date.now() + 24 * 3600000).toISOString();
    const arr = new Date(Date.now() + 32 * 3600000).toISOString();
    const firstS = Number(flightData.firstSeats) || 12;
    const clubS = Number(flightData.clubSeats) || 48;
    const mainS = Number(flightData.mainSeats) || 240;
    const totalC = firstS + clubS + mainS;

    const payload = {
      flight_number: flightData.flightNumber.toUpperCase(),
      origin: orig,
      destination: dest,
      departure_time: dep,
      arrival_time: arr,
      total_capacity: totalC,
      seat_allocations: [
        { seat_class: 'First', total_seats: firstS },
        { seat_class: 'Business', total_seats: clubS },
        { seat_class: 'Economy', total_seats: mainS },
      ],
    };

    try {
      const res = await apiClient.post<any>('/admin/flights', payload);
      if (res.data) {
        this.isConnectedToBackend = true;
        const mapped = mapBackendFlightToAdmin(res.data);
        this.flights = [mapped, ...this.flights];
        return mapped;
      }
    } catch (err) {
      console.warn('Failed to post /admin/flights to backend, utilizing local store:', err);
    }

    const fallbackFlight = mapBackendFlightToAdmin({
      id: `f-${flightData.flightNumber.toLowerCase()}-${Date.now()}`,
      flight_number: flightData.flightNumber.toUpperCase(),
      origin: orig,
      destination: dest,
      departure_time: dep,
      arrival_time: arr,
      total_capacity: totalC,
      status: 'scheduled',
      seat_inventories: payload.seat_allocations,
    });
    this.flights = [fallbackFlight, ...this.flights];
    return fallbackFlight;
  }

  // GET /flights/search
  async searchFlights(params: {
    origin?: string;
    destination?: string;
    date?: string;
    cabin?: string;
  }): Promise<Flight[]> {
    try {
      const res = await apiClient.get<any[]>('/flights/search', { params });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        this.isConnectedToBackend = true;
        return res.data.map(mapBackendFlightToAdmin);
      }
    } catch {
      this.isConnectedToBackend = false;
    }

    let results = [...this.flights];
    if (params.origin && params.origin !== 'ALL') {
      const o = params.origin.toUpperCase();
      results = results.filter((f) => f.origin === o || f.originName.toUpperCase().includes(o));
    }
    if (params.destination && params.destination !== 'ALL') {
      const d = params.destination.toUpperCase();
      results = results.filter((f) => f.destination === d || f.destinationName.toUpperCase().includes(d));
    }
    return results;
  }

  // POST /bookings/hold
  async holdBooking(req: BookingHoldRequest): Promise<BookingHoldResponse> {
    const flight = this.flights.find((f) => f.flightNumber === req.flightNumber) || this.flights[0];
    const holdPayload = {
      flight_id: flight.id.includes('-') && flight.id.length > 10 ? flight.id : undefined,
      flightNo: flight.flightNumber,
      passenger_name: req.passengerName,
      email: req.email,
      cabin: req.cabinClass,
    };

    try {
      const res = await apiClient.post<any>('/bookings/hold', holdPayload);
      if (res.data) {
        this.isConnectedToBackend = true;
        const d = res.data;
        const holdData: BookingHoldResponse = {
          holdId: d.id || d.booking_id || `hld-${Date.now()}`,
          pnr: d.pnr || '#' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          flightNumber: flight.flightNumber,
          cabinClass: req.cabinClass,
          passengerName: req.passengerName,
          email: req.email,
          seats: req.seats || 1,
          priceTotal: d.totalPaid || 1420,
          expiresAt: d.expiresAt || new Date(Date.now() + 900000).toISOString(),
          secondsRemaining: 900,
        };
        this.activeHolds.set(holdData.holdId, holdData);
        return holdData;
      }
    } catch (err) {
      console.warn('Axios POST /bookings/hold backend fallback:', err);
    }

    const pnr = '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const holdId = `hld-${Date.now()}`;
    const holdData: BookingHoldResponse = {
      holdId,
      pnr,
      flightNumber: flight.flightNumber,
      cabinClass: req.cabinClass,
      passengerName: req.passengerName,
      email: req.email,
      seats: req.seats || 1,
      priceTotal: 1420,
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      secondsRemaining: 900,
    };
    this.activeHolds.set(holdId, holdData);
    return holdData;
  }

  // POST /bookings/confirm
  async confirmBooking(req: BookingConfirmRequest): Promise<BookingConfirmResponse> {
    const hold = this.activeHolds.get(req.holdId);
    const flight = this.flights.find((f) => f.flightNumber === hold?.flightNumber) || this.flights[0];

    try {
      const res = await apiClient.post<any>('/bookings/confirm', {
        holdId: req.holdId,
        pnr: req.pnr || hold?.pnr,
        fullName: req.passengerDetails.fullName,
        flightNo: flight.flightNumber,
      });
      if (res.data) {
        this.isConnectedToBackend = true;
        const d = res.data;
        const confirmData: BookingConfirmResponse = {
          confirmationNumber: d.ticketNumber || `AP-ETKT-${Date.now()}`,
          pnr: d.pnr || req.pnr || '#CONFIRMED',
          status: 'CONFIRMED',
          flightNumber: flight.flightNumber,
          passengerName: req.passengerDetails.fullName,
          cabinClass: hold?.cabinClass || 'Club Suite',
          seatAssignment: d.seatAssigned || '04A',
          gate: flight.originGate || 'Gate B22',
          boardingTimeUtc: flight.stdUtc || '14:15 UTC',
          qrCodeToken: `AERO-ETKT-${flight.flightNumber}`,
          issuedAtUtc: new Date().toISOString(),
        };
        this.confirmedBookings.set(confirmData.confirmationNumber, confirmData);
        return confirmData;
      }
    } catch (err) {
      console.warn('Axios POST /bookings/confirm backend fallback:', err);
    }

    const confirmData: BookingConfirmResponse = {
      confirmationNumber: `AP-ETKT-${Math.floor(100000 + Math.random() * 900000)}`,
      pnr: req.pnr || hold?.pnr || '#CF8992',
      status: 'CONFIRMED',
      flightNumber: flight.flightNumber,
      passengerName: req.passengerDetails.fullName,
      cabinClass: hold?.cabinClass || 'Club Suite',
      seatAssignment: '04A',
      gate: flight.originGate || 'Gate B22',
      boardingTimeUtc: flight.stdUtc || '14:15 UTC',
      qrCodeToken: `AERO-ETKT-${Date.now()}`,
      issuedAtUtc: new Date().toISOString(),
    };
    this.confirmedBookings.set(confirmData.confirmationNumber, confirmData);
    return confirmData;
  }

  // POST /waitlist/join
  async joinWaitlist(req: WaitlistJoinRequest): Promise<WaitlistJoinResponse> {
    const flight = this.flights.find((f) => f.flightNumber === req.flightNumber) || this.flights[0];
    const pnr = req.pnr || '#' + Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const res = await apiClient.post<any>('/waitlist/join', {
        flight_id: flight.id.includes('-') && flight.id.length > 10 ? flight.id : undefined,
        flightNumber: flight.flightNumber,
        passengerName: req.passengerName,
        tier: req.tier,
        cabinClass: req.cabinClass,
      });
      if (res.data) {
        this.isConnectedToBackend = true;
        const d = res.data;
        const newPassenger: WaitlistPassenger = {
          id: d.id || `w-${Date.now()}`,
          pnr: d.pnr || pnr,
          name: req.passengerName,
          tier: req.tier,
          score: d.priorityScore || 85.0,
          flightNumber: flight.flightNumber,
          cabinRequested: req.cabinClass.toUpperCase(),
          waitDuration: 'Just joined',
          cleared: false,
        };
        this.waitlist.push(newPassenger);
        flight.waitlistCount += 1;
        return {
          pnr: d.pnr || pnr,
          flightNumber: flight.flightNumber,
          passengerName: req.passengerName,
          tier: req.tier,
          priorityScore: d.priorityScore || 85.0,
          waitlistPosition: d.waitlistPosition || 1,
          status: 'QUEUED',
          estimatedClearChance: d.estimatedClearChance || '85% Likelihood',
        };
      }
    } catch (err) {
      console.warn('Axios POST /waitlist/join fallback:', err);
    }

    const newPassenger: WaitlistPassenger = {
      id: `w-${Date.now()}`,
      pnr,
      name: req.passengerName,
      tier: req.tier,
      score: 85.0,
      flightNumber: flight.flightNumber,
      cabinRequested: req.cabinClass.toUpperCase(),
      waitDuration: '1m',
      cleared: false,
    };
    this.waitlist.push(newPassenger);
    flight.waitlistCount += 1;
    return {
      pnr,
      flightNumber: flight.flightNumber,
      passengerName: req.passengerName,
      tier: req.tier,
      priorityScore: 85.0,
      waitlistPosition: 1,
      status: 'QUEUED',
      estimatedClearChance: '85% Likelihood',
    };
  }

  // POST /support/chat (AI Concierge — Groq LLM)
  async askSupport(prompt: string, conversationHistory?: {role: string, content: string}[]): Promise<{ reply: string; suggestions?: string[]; relatedFlight?: string }> {
    try {
      const res = await apiClient.post<{ reply: string; suggestions?: string[] }>('/support/chat', {
        message: prompt,
        conversation_history: conversationHistory || [],
      });
      if (res.data && res.data.reply) {
        this.isConnectedToBackend = true;
        return res.data;
      }
    } catch {
      this.isConnectedToBackend = false;
    }

    // Domain-grounded high fidelity Aviation Concierge response generator
    return this.generateSimulatedAiResponse(prompt);
  }

  private generateSimulatedAiResponse(prompt: string): { reply: string; suggestions?: string[]; relatedFlight?: string } {
    const p = prompt.toLowerCase();

    if (p.includes('104') || p.includes('jfk') || p.includes('london') || p.includes('lhr')) {
      return {
        reply: `**Flight AP-104 (JFK ➔ LHR)** is currently **AIRBORNE / EN ROUTE** at FL390 (39,000 ft) over waypoint NAT-FOXTROT at Mach 0.85.\n\n• **Departure:** 14:15 UTC (On-Time)\n• **Estimated Arrival:** 21:42 UTC (8 minutes ahead of schedule)\n• **Cabin Status:** 284/300 seats booked (94.6% load factor).\n• **Waitlist Queue:** 7 passengers queued (2 C-Class seats currently available for clearing).`,
        suggestions: ['Clear top waitlist passenger', 'View AP-104 telemetries', 'Inspect passenger manifest'],
        relatedFlight: 'AP-104',
      };
    }

    if (p.includes('882') || p.includes('sfo') || p.includes('tokyo') || p.includes('hnd') || p.includes('delay')) {
      return {
        reply: `**Flight AP-882 (SFO ➔ HND)** is under an active **GATE DELAY (+24M)** at San Francisco SFO Gate G94 due to heavy oceanic traffic sequencing.\n\n• **STD / ETD:** 15:00 UTC ➔ revised 15:24 UTC\n• **Aircraft:** Boeing 787-9 (Tail N782AP • GE-GEnx engines)\n• **Cabin Load:** 100% full (260/260 seats)\n• **Standby Status:** 4 passengers holding standby with 1 VIP ticket requested.`,
        suggestions: ['Issue passenger delay notifications', 'Check aircraft turnaround', 'Review SFO ATC restrictions'],
        relatedFlight: 'AP-882',
      };
    }

    if (p.includes('waitlist') || p.includes('clear') || p.includes('algo') || p.includes('score')) {
      return {
        reply: `**AeroNexus Automated Waitlist Protocol (AWP V2.4)**:\n\n1. **Scoring Index:** Calculated via Medallion Tier weight (Diamond VIP: 98–100, Platinum: 90–95, Gold: 80–89, General: <80) combined with fare basis and wait elapsed time.\n2. **Current Focus Sector:** Sector AP-104 currently has 2 First/Club seats eligible for release.\n3. **Top Queue:** Lord H. Sterling (Score 99.4) & Dr. E. Thorne (Score 94.1) are ranked highest for immediate seat release.`,
        suggestions: ['Execute Auto-Clear top 2', 'View waitlist clearing desk', 'Roll passenger to next sector'],
      };
    }

    if (p.includes('baggage') || p.includes('luggage') || p.includes('policy')) {
      return {
        reply: `**AeroNexus Baggage Allowances:**\n\n• **First Suite (A350/B777):** 3 checked bags up to 32kg (70lbs) each + 2 carry-ons with priority valet delivery.\n• **Club Suite (Business):** 2 checked bags up to 32kg (70lbs) each + 1 carry-on + 1 personal item.\n• **Main Cabin:** 1 checked bag up to 23kg (50lbs) on transatlantic/transpacific sectors.\n• **Oversized / Sporting:** Golf bags & ski equipment fly complimentary for Platinum & Diamond VIP members.`,
        suggestions: ['Check hold baggage fees', 'Add excess baggage to PNR', 'View carry-on dimensions'],
      };
    }

    if (p.includes('hold') || p.includes('book') || p.includes('reserve')) {
      return {
        reply: `You can place a guaranteed **15-minute Price Freeze** on any available cabin with our \`POST /bookings/hold\` service.\n\nOnce held, your PNR is secured without price escalation while you finalize passport and payment details in the Client Portal!`,
        suggestions: ['Switch to Client Portal', 'Search JFK to LHR flights', 'View active holds'],
      };
    }

    return {
      reply: `AeroNexus Operations Concierge online. I can assist with flight status monitoring, automated waitlist clearing, seat holds, Sabre GDS manifest lookups, or transcontinental route updates.\n\nHow may I assist your flight operations?`,
      suggestions: ['Flight status AP-104', 'Waitlist clearing rules', 'De-icing restrictions at LHR', 'Book transpacific flight'],
    };
  }

  // Get current local waitlist
  getWaitlist(flightNumber?: string): WaitlistPassenger[] {
    if (flightNumber) {
      return this.waitlist.filter((w) => w.flightNumber === flightNumber);
    }
    return [...this.waitlist];
  }

  // Clear single passenger
  clearWaitlistPassenger(id: string, seat: string): { success: boolean; passenger?: WaitlistPassenger } {
    const passenger = this.waitlist.find((w) => w.id === id);
    if (!passenger) return { success: false };

    passenger.cleared = true;
    passenger.assignedSeat = seat;

    const flight = this.flights.find((f) => f.flightNumber === passenger.flightNumber);
    if (flight) {
      flight.waitlistCount = Math.max(0, flight.waitlistCount - 1);
      if (passenger.tier === 'DIAMOND VIP' || passenger.tier === 'PLATINUM') {
        flight.vipWaitlistCount = Math.max(0, flight.vipWaitlistCount - 1);
      }
    }
    return { success: true, passenger };
  }

  // Auto-clear top N passengers
  autoClearTopPassengers(flightNumber: string, count = 2): WaitlistPassenger[] {
    const uncleared = this.waitlist
      .filter((w) => w.flightNumber === flightNumber && !w.cleared)
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    const seatPool = ['2A', '8K', '3F', '11A'];
    uncleared.forEach((p, idx) => {
      p.cleared = true;
      p.assignedSeat = seatPool[idx] || `1${idx + 2}B`;
    });

    const flight = this.flights.find((f) => f.flightNumber === flightNumber);
    if (flight) {
      flight.waitlistCount = Math.max(0, flight.waitlistCount - uncleared.length);
      flight.vipWaitlistCount = Math.max(0, flight.vipWaitlistCount - uncleared.length);
    }
    return uncleared;
  }
}

export const aviationStore = new AviationDataStore();

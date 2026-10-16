export type SectorStatus =
  | 'AIRBORNE / EN ROUTE'
  | 'GATE DELAY +24M'
  | 'FINAL BOARDING (G14)'
  | 'SCHEDULED / ON-TIME'
  | 'MAINTENANCE HOLD';

export interface CabinLoad {
  booked: number;
  capacity: number;
  percentage: number;
  breakdown: {
    first: string;
    club: string;
    main: string;
  };
}

export interface Flight {
  id: string;
  flightNumber: string;
  aircraft: string;
  tailNumber: string;
  engineSpecs: string;
  origin: string;
  originName: string;
  originGate?: string;
  destination: string;
  destinationName: string;
  destinationTerminal?: string;
  stdUtc: string;
  etdUtc: string;
  staUtc: string;
  etaUtc: string;
  status: SectorStatus | string;
  statusColor: 'emerald' | 'amber' | 'indigo' | 'rose' | 'sky';
  cabinLoad: CabinLoad;
  waitlistCount: number;
  vipWaitlistCount: number;
  priceUSD: number;
  altitude?: number;
  speedKnots?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export type FrequentFlyerTier = 'DIAMOND VIP' | 'PLATINUM' | 'GOLD' | 'GENERAL Y';

export interface WaitlistPassenger {
  id: string;
  pnr: string;
  name: string;
  cnicOrPassport?: string;
  tier: FrequentFlyerTier;
  score: number;
  flightNumber: string;
  cabinRequested: string;
  waitDuration: string;
  assignedSeat?: string;
  cleared: boolean;
}

export interface BookingHoldRequest {
  flightNumber: string;
  cabinClass: 'First' | 'Club Suite' | 'Main Cabin';
  passengerName: string;
  email: string;
  phone?: string;
  seats?: number;
}

export interface BookingHoldResponse {
  holdId: string;
  pnr: string;
  flightNumber: string;
  cabinClass: string;
  passengerName: string;
  email: string;
  seats: number;
  priceTotal: number;
  expiresAt: string;
  secondsRemaining: number;
}

export interface BookingConfirmRequest {
  holdId: string;
  pnr: string;
  passengerDetails: {
    fullName: string;
    passportNumber?: string;
    nationality?: string;
    frequentFlyerNumber?: string;
  };
  paymentMethod: {
    cardNumberMasked: string;
    cardHolder: string;
  };
}

export interface BookingConfirmResponse {
  confirmationNumber: string;
  pnr: string;
  status: 'CONFIRMED' | 'TICKET_ISSUED';
  flightNumber: string;
  passengerName: string;
  cabinClass: string;
  seatAssignment: string;
  gate: string;
  boardingTimeUtc: string;
  qrCodeToken: string;
  issuedAtUtc: string;
}

export interface WaitlistJoinRequest {
  flightNumber: string;
  passengerName: string;
  email: string;
  phone?: string;
  tier: FrequentFlyerTier;
  cabinClass: string;
  pnr?: string;
}

export interface WaitlistJoinResponse {
  pnr: string;
  flightNumber: string;
  passengerName: string;
  tier: FrequentFlyerTier;
  priorityScore: number;
  waitlistPosition: number;
  status: 'QUEUED';
  estimatedClearChance: string;
}

export interface AdminFlightCreateRequest {
  flightNumber: string;
  tailNumber: string;
  aircraftType: string;
  originIcao: string;
  originGate: string;
  destinationIcao: string;
  destinationTerminal: string;
  stdUtc: string;
  staUtc: string;
  firstSeats: number;
  clubSeats: number;
  mainSeats: number;
  broadcastGds: boolean;
}

export interface TelemetryEvent {
  id: string;
  timestampUtc: string;
  sector: string;
  channel: 'ACARS' | 'ADS-B' | 'GDS-AMADEUS' | 'SABRE-CORE' | 'DISPATCH';
  severity: 'INFO' | 'WARN' | 'CRIT' | 'SUCCESS';
  message: string;
}

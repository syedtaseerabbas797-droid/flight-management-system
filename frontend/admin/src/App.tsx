import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SubNav, AdminTab } from './components/SubNav';
import { KpiStrip } from './components/KpiStrip';
import { OperationsGrid } from './components/OperationsGrid';
import { WaitlistDesk } from './components/WaitlistDesk';
import { RadarViewport } from './components/RadarViewport';
import { TelemetryStream } from './components/TelemetryStream';
import { ScheduleFlightModal } from './components/ScheduleFlightModal';
import { ManifestModal } from './components/ManifestModal';
import { ClientPortal } from './components/ClientPortal';
import { AiConcierge } from './components/AiConcierge';
import { AuditDesk } from './components/AuditDesk';
import { Flight } from './types/aviation';
import { aviationStore, API_BASE_URL } from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState<'admin' | 'client'>('admin');
  const [activeTab, setActiveTab] = useState<AdminTab>('grid');

  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  // Modals & UI Layout States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [manifestFlight, setManifestFlight] = useState<Flight | null>(null);
  const [isKpiCollapsed, setIsKpiCollapsed] = useState(false);

  // Load flights from store
  const loadFlights = async () => {
    const list = await aviationStore.getAdminFlights();
    setFlights(list);
    if (!selectedFlight && list.length > 0) {
      setSelectedFlight(list[0]);
    } else if (selectedFlight) {
      const refreshed = list.find((f) => f.id === selectedFlight.id) || list[0];
      setSelectedFlight(refreshed);
    }
  };

  useEffect(() => {
    loadFlights();

    const handleCustomTelemetry = () => {
      setActiveTab('telemetry');
    };
    window.addEventListener('aeronexus:open-telemetry', handleCustomTelemetry);
    return () => window.removeEventListener('aeronexus:open-telemetry', handleCustomTelemetry);
  }, []);

  return (
    <div className="h-full flex flex-col font-body text-[#1a1c1c] bg-[#f9f9f8] antialiased overflow-hidden select-text">
      {/* ================= TOP OPERATIONS MASTER HEADER ================= */}
      <Header
        currentView={currentView}
        onToggleView={(view) => setCurrentView(view)}
      />

      {/* Main Screen Router: Admin Console vs Client Portal */}
      {currentView === 'client' ? (
        <ClientPortal onBackToConsole={() => setCurrentView('admin')} />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ================= SUB-NAV SYSTEM & WORKSPACE HEADER ================= */}
          <SubNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

          {/* ================= MASTER MAIN WORKSPACE ================= */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Operations Canvas */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#f9f9f8]">
              {/* 1. KPI Telemetry Summary Strip (Collapsible) */}
              <KpiStrip
                airborneCount={flights.filter((f) => f.status.includes('AIRBORNE')).length || 42}
                totalSectors={48}
                loadFactor={88.6}
                waitlistPax={19}
                waitlistSectors={4}
                holdsCount={flights.filter((f) => f.status.includes('HOLD') || f.status.includes('DELAY')).length || 2}
                revenueHeldUSD={148200}
                isCollapsed={isKpiCollapsed}
                onToggleCollapse={() => setIsKpiCollapsed(!isKpiCollapsed)}
              />

              {/* View Router based on Tab */}
              {activeTab === 'grid' && (
                <OperationsGrid
                  flights={flights}
                  selectedFlightId={selectedFlight?.id || 'f-104'}
                  onSelectFlight={(f) => setSelectedFlight(f)}
                  onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
                  onOpenManifestModal={(f) => setManifestFlight(f)}
                />
              )}

              {activeTab === 'radar' && (
                <RadarViewport
                  flights={flights}
                  onSelectFlight={(f) => setSelectedFlight(f)}
                />
              )}

              {activeTab === 'waitlist' && (
                <div className="flex-1 p-3 flex flex-col overflow-hidden">
                  <div className="p-3 bg-white border border-[#c4c6ce] rounded-t flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-[#000f22]">
                      CENTRAL GDS STANDBY &amp; MEDALLION WAITLIST DIRECTORY
                    </span>
                    <span className="text-[#005cba] font-bold">
                      ACTIVE SECTORS WITH QUEUED PASSENGERS: 4
                    </span>
                  </div>
                  <div className="flex-1 bg-white border-x border-b border-[#c4c6ce] rounded-b overflow-y-auto custom-scroll p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {flights
                        .filter((f) => f.waitlistCount > 0)
                        .map((f) => (
                          <div
                            key={f.id}
                            className="p-3 border border-[#c4c6ce] hover:border-[#005cba] rounded bg-[#f9f9f8] cursor-pointer"
                            onClick={() => {
                              setSelectedFlight(f);
                              setActiveTab('grid');
                            }}
                          >
                            <div className="flex items-center justify-between font-mono mb-2">
                              <span className="font-bold text-[#005cba] text-sm">{f.flightNumber}</span>
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold">
                                {f.waitlistCount} PAX QUEUED
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 font-body">
                              Route: {f.origin} ➔ {f.destination} ({f.originName} to {f.destinationName})
                            </p>
                            <p className="text-[11px] text-gray-500 font-mono mt-1">
                              Cabin Load: {f.cabinLoad.booked}/{f.cabinLoad.capacity} ({f.cabinLoad.percentage}%) • VIP: {f.vipWaitlistCount}
                            </p>
                            <button className="mt-2.5 w-full py-1 bg-[#0a2540] hover:bg-[#162538] text-white rounded text-xs font-semibold">
                              Inspect Sector Clearing Desk
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'telemetry' && <TelemetryStream />}
              {activeTab === 'audit' && <AuditDesk />}
            </div>

            {/* ================= RIGHT DOCKS / REAL-TIME WAITLIST QUICK-MANAGER PANEL ================= */}
            {selectedFlight && (
              <WaitlistDesk
                selectedFlight={selectedFlight}
                onRefreshData={loadFlights}
              />
            )}
          </div>
        </div>
      )}

      {/* ================= MASTER FOOTER BAR ================= */}
      <footer className="flex flex-col md:flex-row justify-between items-center w-full px-4 py-2 bg-white border-t border-[#c4c6ce] z-10 shrink-0 font-mono text-[11px] text-[#43474d]">
        <div className="flex items-center space-x-3 mb-1 md:mb-0">
          <span className="font-headline text-[13px] font-semibold text-[#000f22]">
            AeroNexus
          </span>
          <span className="text-[#c4c6ce]">|</span>
          <span>© 2026 AeroNexus Systems Inc. Aviation Telemetry &amp; Operations Infrastructure.</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => alert('AeroNexus Operational Safety Manual: ETOPS 370 Certification Active.')}
            className="hover:text-[#000f22] transition-colors"
          >
            Operational Safety
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className="hover:text-[#000f22] transition-colors"
          >
            Route Network
          </button>
          <button
            onClick={() => aviationStore.checkBackendHealth().then((s) => alert(s ? `Connected to ${API_BASE_URL}` : 'API Bridge operating in simulated resilient mode.'))}
            className="hover:text-[#000f22] transition-colors"
          >
            GDS API Integration
          </button>
          <button
            onClick={() => alert('Baggage Policy: First Suite 3x32kg, Club Suite 2x32kg, Main 1x23kg.')}
            className="hover:text-[#000f22] transition-colors"
          >
            Baggage Policy
          </button>
          <button
            onClick={() => alert('Regulatory: ICAO / FAA Part 121 Flag Operations.')}
            className="hover:text-[#000f22] transition-colors"
          >
            Privacy &amp; Regulatory
          </button>
          <span className="text-emerald-700 font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>System Status (UTC): ALL SYSTEMS NOMINAL</span>
          </span>
        </div>
      </footer>

      {/* ================= MODALS & OVERLAYS ================= */}
      {/* Schedule Flight Modal (POST /admin/flights) */}
      <ScheduleFlightModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onFlightCreated={loadFlights}
      />

      {/* Flight Manifest Modal */}
      <ManifestModal
        flight={manifestFlight}
        isOpen={!!manifestFlight}
        onClose={() => setManifestFlight(null)}
      />

      {/* ================= FLOATING AI CONCIERGE WIDGET ================= */}
      <AiConcierge />
    </div>
  );
}

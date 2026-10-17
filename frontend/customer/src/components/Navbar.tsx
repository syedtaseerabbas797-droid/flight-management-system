import React, { useState } from 'react';
import { Plane, Ticket, Terminal, User, LogOut, Clock, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentView: 'b2c' | 'b2b';
  setCurrentView: (view: 'b2c' | 'b2b') => void;
  utcTime: string;
  isAdminAuth: boolean;
  currentUser: { email: string; name: string; role: 'customer' | 'admin' } | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenMyBookings: () => void;
  onLogout: () => void;
  onShowToast: (msg: string) => void;
  onOpenAiConcierge: (prompt?: string) => void;
  bookingsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  utcTime,
  isAdminAuth,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenMyBookings,
  onLogout,
  onShowToast,
  onOpenAiConcierge,
  bookingsCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOpsClick = () => {
    if (isAdminAuth) {
      setCurrentView('b2b');
    } else {
      onShowToast('Operations Console requires Admin clearance. Use Admin Console on Port 3001.');
      setCurrentView('b2b');
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white text-[#000f22] sticky top-0 z-40 border-b border-[#c4c6ce] w-full shadow-xs">
        <div className="flex justify-between items-center px-4 sm:px-6 h-14">
          {/* Brand Anchor */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => { setCurrentView('b2c'); setMobileMenuOpen(false); }}
            >
              <div className="w-8 h-8 rounded-lg bg-[#000f22] text-white flex items-center justify-center font-bold shadow-xs group-hover:bg-[#005cba] transition-colors">
                <Plane className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-base sm:text-lg font-bold tracking-tight text-[#000f22] leading-none">
                  AeroNexus
                </span>
                <span className="font-label-caps text-[9px] tracking-widest text-[#43474d] uppercase font-semibold">
                  DUAL-CORE SUITE
                </span>
              </div>
            </div>

            {/* Desktop Portal Switcher Tabs */}
            <nav className="hidden md:flex items-center bg-[#f3f4f3] p-1 rounded-lg border border-[#c4c6ce]/60 ml-2">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  currentView === 'b2c'
                    ? 'bg-white text-[#005cba] shadow-xs'
                    : 'text-[#43474d] hover:text-[#000f22]'
                }`}
                onClick={() => setCurrentView('b2c')}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Book Flight</span>
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  currentView === 'b2b'
                    ? 'bg-white text-[#005cba] shadow-xs font-semibold'
                    : 'text-[#43474d] hover:text-[#000f22]'
                }`}
                onClick={handleOpsClick}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Ops Radar</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </nav>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* UTC Clock — Desktop only */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eeeeed] border border-[#c4c6ce] text-[#000f22] font-mono text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-[#74777e]" />
              <span>{utcTime}</span>
            </div>

            {/* Help / AI — Desktop */}
            <button
              type="button"
              title="AeroNexus AI Support"
              className="hidden sm:flex p-1.5 hover:bg-[#f3f4f3] hover:text-[#000f22] rounded transition-colors"
              onClick={() => onOpenAiConcierge('How does the 4-Hour flight cancellation policy work?')}
            >
              <span className="material-symbols-outlined text-[20px] text-[#43474d]">help</span>
            </button>

            {/* User Account Controls — Desktop */}
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenMyBookings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c4c6ce] text-xs font-semibold text-[#000f22] hover:bg-[#f3f4f3] transition-colors bg-white cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5 text-[#005cba]" />
                  <span className="hidden sm:inline">My Bookings</span>
                  {bookingsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#005cba] text-white font-bold">
                      {bookingsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#000f22] text-white text-xs font-semibold hover:bg-[#162538] transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{currentUser.name}</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg border border-[#c4c6ce] text-[#74777e] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#005cba] text-white text-xs font-semibold hover:bg-[#004b99] transition-all shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="sm:hidden p-2 rounded-lg border border-[#c4c6ce] text-[#000f22] hover:bg-[#f3f4f3] transition-colors"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-[#c4c6ce] px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {/* UTC Clock */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#f3f4f3] rounded-lg border border-[#c4c6ce] text-[#000f22] font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-[#74777e]" />
              <span>{utcTime} UTC</span>
            </div>

            {/* Nav Tabs */}
            <button
              type="button"
              className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                currentView === 'b2c'
                  ? 'bg-[#000f22] text-white'
                  : 'bg-[#f3f4f3] text-[#43474d] border border-[#c4c6ce]'
              }`}
              onClick={() => { setCurrentView('b2c'); setMobileMenuOpen(false); }}
            >
              <Ticket className="w-4 h-4" />
              Book Flight
            </button>
            <button
              type="button"
              className={`w-full px-3 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                currentView === 'b2b'
                  ? 'bg-[#000f22] text-white'
                  : 'bg-[#f3f4f3] text-[#43474d] border border-[#c4c6ce]'
              }`}
              onClick={handleOpsClick}
            >
              <Terminal className="w-4 h-4" />
              Ops Radar
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-auto"></span>
            </button>

            <div className="border-t border-[#c4c6ce] pt-2 space-y-2">
              {/* AI Help */}
              <button
                type="button"
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg bg-[#f3f4f3] text-[#43474d] border border-[#c4c6ce] flex items-center gap-2"
                onClick={() => { onOpenAiConcierge(); setMobileMenuOpen(false); }}
              >
                <span className="material-symbols-outlined text-[18px]">help</span>
                Ask AeroAI
              </button>

              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => { onOpenMyBookings(); setMobileMenuOpen(false); }}
                    className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg bg-[#f3f4f3] text-[#000f22] border border-[#c4c6ce] flex items-center gap-2"
                  >
                    <Ticket className="w-4 h-4 text-[#005cba]" />
                    My Bookings
                    {bookingsCount > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] bg-[#005cba] text-white font-bold">
                        {bookingsCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onOpenProfile(); setMobileMenuOpen(false); }}
                    className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg bg-[#000f22] text-white flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    {currentUser.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                    className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
                  className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg bg-[#005cba] text-white flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

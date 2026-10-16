import React from 'react';

interface KpiStripProps {
  airborneCount?: number;
  totalSectors?: number;
  loadFactor?: number;
  waitlistPax?: number;
  waitlistSectors?: number;
  holdsCount?: number;
  revenueHeldUSD?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  airborneCount = 42,
  totalSectors = 48,
  loadFactor = 88.6,
  waitlistPax = 19,
  waitlistSectors = 4,
  holdsCount = 2,
  revenueHeldUSD = 148200,
  isCollapsed,
  onToggleCollapse,
}) => {
  // Collapsed Mode: Sleek 1-line Ticker Bar (Maximizes Flight Grid Height)
  if (isCollapsed) {
    return (
      <section className="px-3 py-1.5 bg-[#f3f4f3] border-b border-[#c4c6ce] flex items-center justify-between gap-3 text-xs shrink-0 font-mono shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap overflow-hidden text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[#43474d] font-semibold">AIRBORNE:</span>
            <strong className="text-[#000f22]">{airborneCount}/{totalSectors}</strong>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
              98.4% OTP
            </span>
          </div>

          <span className="text-[#c4c6ce]">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[#43474d] font-semibold">LOAD FACTOR:</span>
            <strong className="text-[#005cba]">{loadFactor}%</strong>
            <span className="text-[10px] text-blue-700 bg-blue-50 px-1 rounded">+3.2%</span>
          </div>

          <span className="text-[#c4c6ce]">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[#43474d] font-semibold">WAITLIST:</span>
            <strong className="text-amber-800">{waitlistPax} Pax</strong>
            <span className="text-[#74777e]">({waitlistSectors} Sectors)</span>
          </div>

          <span className="text-[#c4c6ce]">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[#43474d] font-semibold">DELAYS:</span>
            <strong className="text-amber-700">{holdsCount} Holds</strong>
          </div>

          <span className="text-[#c4c6ce]">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-[#43474d] font-semibold">REVENUE HELD:</span>
            <strong className="text-emerald-700">${revenueHeldUSD.toLocaleString()}</strong>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">ALGO</span>
          </div>
        </div>

        <button
          onClick={onToggleCollapse}
          className="px-2 py-0.5 rounded bg-white border border-[#c4c6ce] hover:bg-[#eeeeed] text-[#005cba] text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
          title="Expand full KPI analytics cards"
        >
          <span className="material-symbols-outlined text-[14px]">expand_more</span>
          <span>Show KPI Cards</span>
        </button>
      </section>
    );
  }

  // Expanded Mode: Full 5 Analytics Cards with Collapse Control
  return (
    <div className="relative shrink-0">
      <div className="px-3 pt-2 pb-0 flex items-center justify-between text-xs">
        <span className="font-mono text-[10px] uppercase font-bold text-[#74777e] tracking-wider">
          Operations KPI Telemetry
        </span>
        <button
          onClick={onToggleCollapse}
          className="px-2 py-0.5 rounded bg-white border border-[#c4c6ce] hover:bg-[#eeeeed] text-[#43474d] hover:text-[#000f22] text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
          title="Collapse KPIs to maximize table view"
        >
          <span className="material-symbols-outlined text-[14px]">expand_less</span>
          <span>Collapse KPIs (Maximize Flights Table)</span>
        </button>
      </div>

      <section className="p-3 pt-1.5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 shrink-0">
        {/* KPI 1 */}
        <div className="p-2.5 rounded bg-white border border-[#c4c6ce]/70 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-[#43474d] uppercase tracking-wider">
              Airborne Sectors
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-headline text-[22px] font-bold text-[#000f22] tracking-tight">
              {airborneCount}{' '}
              <span className="text-sm font-normal text-[#43474d]">/ {totalSectors}</span>
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
              98.4% OTP
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#43474d] mt-0.5 truncate">
            En route transcontinental
          </span>
        </div>

        {/* KPI 2 */}
        <div className="p-2.5 rounded bg-white border border-[#c4c6ce]/70 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-[#43474d] uppercase tracking-wider">
              Fleet Load Factor
            </span>
            <span className="material-symbols-outlined text-[14px] text-[#005cba]">
              airline_seat_recline_extra
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-headline text-[22px] font-bold text-[#000f22] tracking-tight">
              {loadFactor}%
            </span>
            <span className="font-mono text-[10px] font-bold text-[#005cba] bg-blue-50 border border-blue-200 px-1 py-0.5 rounded">
              +3.2% vs WK
            </span>
          </div>
          <div className="w-full bg-[#eeeeed] h-1.5 rounded mt-1 overflow-hidden">
            <div
              className="bg-[#005cba] h-full rounded transition-all duration-500"
              style={{ width: `${loadFactor}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-2.5 rounded bg-white border border-[#c4c6ce]/70 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-[#43474d] uppercase tracking-wider">
              Waitlist Queue
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-headline text-[22px] font-bold text-amber-800 tracking-tight">
              {waitlistPax}{' '}
              <span className="text-sm font-normal text-[#43474d]">Pax</span>
            </span>
            <span className="font-mono text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded">
              {waitlistSectors} Sectors
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#43474d] mt-0.5 truncate">
            8 Medallion / VIP held
          </span>
        </div>

        {/* KPI 4 */}
        <div className="p-2.5 rounded bg-white border border-[#c4c6ce]/70 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-[#43474d] uppercase tracking-wider">
              Turnaround Delays
            </span>
            <span className="material-symbols-outlined text-[14px] text-amber-600">
              warning
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-headline text-[22px] font-bold text-[#000f22] tracking-tight">
              {holdsCount}{' '}
              <span className="text-sm font-normal text-[#43474d]">Holds</span>
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
              0 Cancels
            </span>
          </div>
          <span className="font-mono text-[10px] text-amber-800 mt-0.5 truncate">
            LHR T5 de-icing restriction
          </span>
        </div>

        {/* KPI 5 */}
        <div className="p-2.5 rounded bg-white border border-[#c4c6ce]/70 flex flex-col justify-between shadow-xs col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-[#43474d] uppercase tracking-wider">
              Revenue Held
            </span>
            <span className="material-symbols-outlined text-[14px] text-emerald-600">
              lock_clock
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-headline text-[22px] font-bold text-[#000f22] tracking-tight">
              ${revenueHeldUSD.toLocaleString()}
            </span>
            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">
              ALGO
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#43474d] mt-0.5 truncate">
            Dynamic overbook active
          </span>
        </div>
      </section>
    </div>
  );
};

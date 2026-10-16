import React, { useState } from 'react';
import { Shield, Search, Filter, History, CheckCircle2, AlertOctagon, Terminal, UserCheck } from 'lucide-react';

export interface AuditRecord {
  id: string;
  timestamp: string;
  adminEmail: string;
  adminRole: 'SUPER_ADMIN' | 'DISPATCH_OFFICER' | 'CHIEF_PILOT';
  action: 'LOGIN_SUCCESS' | '2FA_VERIFIED' | 'FLIGHT_CREATED' | 'FLIGHT_DELAYED' | 'FARE_OVERRIDE' | 'BOOKING_FORCE_CANCELLED' | 'SEAT_ALLOCATED';
  resourceId: string;
  details: string;
  ipAddress: string;
  status: 'SUCCESS' | 'DENIED' | 'FLAGGED';
}

const INITIAL_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 'aud-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    adminEmail: 'admin@aeronexus.com',
    adminRole: 'SUPER_ADMIN',
    action: '2FA_VERIFIED',
    resourceId: 'AUTH-SESSION-9921',
    details: 'Hardware Authenticator TOTP token verified. Session clearance granted L4.',
    ipAddress: '192.168.1.45',
    status: 'SUCCESS',
  },
  {
    id: 'aud-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    adminEmail: 'ops.dispatch@aeronexus.com',
    adminRole: 'DISPATCH_OFFICER',
    action: 'FLIGHT_DELAYED',
    resourceId: 'AP-104 (JFK-LHR)',
    details: 'Oceanic clearance delayed by +45m due to Shanwick FIR weather front.',
    ipAddress: '10.0.4.112',
    status: 'SUCCESS',
  },
  {
    id: 'aud-003',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    adminEmail: 'admin@aeronexus.com',
    adminRole: 'SUPER_ADMIN',
    action: 'BOOKING_FORCE_CANCELLED',
    resourceId: 'PNR: DXB88C',
    details: 'Administrative force-cancel executed per regulatory directive. Passenger notified.',
    ipAddress: '192.168.1.45',
    status: 'SUCCESS',
  },
  {
    id: 'aud-004',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    adminEmail: 'captain.hassan@aeronexus.com',
    adminRole: 'CHIEF_PILOT',
    action: 'FLIGHT_CREATED',
    resourceId: 'AP-309 (DXB-SIN)',
    details: 'Scheduled Boeing 787-9 Dreamliner revenue sector with 280 seats.',
    ipAddress: '172.16.0.8',
    status: 'SUCCESS',
  },
  {
    id: 'aud-005',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    adminEmail: 'ops.dispatch@aeronexus.com',
    adminRole: 'DISPATCH_OFFICER',
    action: 'FARE_OVERRIDE',
    resourceId: 'AP-204 (LHR-DXB)',
    details: 'Yield algorithm manual override: Business class floor raised +12% for surge demand.',
    ipAddress: '10.0.4.112',
    status: 'SUCCESS',
  },
];

export const AuditDesk: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>(INITIAL_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const getBadgeStyle = (action: AuditRecord['action']) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
      case '2FA_VERIFIED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FLIGHT_CREATED':
      case 'SEAT_ALLOCATED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FLIGHT_DELAYED':
      case 'FARE_OVERRIDE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'BOOKING_FORCE_CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex-1 p-4 flex flex-col overflow-hidden bg-[#f9f9f8]">
      {/* Top Controls Header */}
      <div className="bg-white p-3.5 border border-[#c4c6ce] rounded-t-lg flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#000f22] text-white flex items-center justify-center">
            <History className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-headline text-sm font-bold text-[#000f22]">
              Administrative Operations Audit Trail
            </h3>
            <p className="text-[11px] text-[#43474d]">
              Immutable audit ledger of all admin logins, 2FA verifications, cancellations, and flight modifications
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2 text-xs">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search admin, PNR, flight..."
              className="pl-8 pr-3 py-1.5 border border-[#c4c6ce] rounded text-xs outline-none focus:border-[#005cba] w-48 sm:w-60"
            />
            <Search className="w-3.5 h-3.5 text-[#74777e] absolute left-2.5 top-2.5" />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="border border-[#c4c6ce] rounded px-2.5 py-1.5 bg-white text-xs text-[#000f22] outline-none"
          >
            <option value="ALL">All Event Types</option>
            <option value="2FA_VERIFIED">2FA Verified Logins</option>
            <option value="FLIGHT_CREATED">Flight Schedule Additions</option>
            <option value="FLIGHT_DELAYED">Operational Delays</option>
            <option value="BOOKING_FORCE_CANCELLED">Admin Cancellations</option>
            <option value="FARE_OVERRIDE">Fare Adjustments</option>
          </select>
        </div>
      </div>

      {/* KPI mini strip for Audit */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 bg-[#f3f4f3] px-3.5 border-x border-[#c4c6ce] text-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#005cba]" />
          <div>
            <span className="text-[10px] uppercase text-[#74777e] font-bold block">Ledger Records</span>
            <span className="font-mono font-bold text-[#000f22]">{logs.length} Logged Events</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-[10px] uppercase text-[#74777e] font-bold block">Active Super Admins</span>
            <span className="font-mono font-bold text-[#000f22]">3 Cleared Accounts</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#43474d]" />
          <div>
            <span className="text-[10px] uppercase text-[#74777e] font-bold block">Security Status</span>
            <span className="font-mono font-bold text-emerald-700">100% 2FA ENFORCED</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-[10px] uppercase text-[#74777e] font-bold block">Tamper Protocol</span>
            <span className="font-mono font-bold text-[#000f22]">SHA-256 HASHED</span>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="flex-1 bg-white border border-[#c4c6ce] rounded-b-lg overflow-y-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8f9fa] border-b border-[#c4c6ce] sticky top-0 text-[10px] uppercase text-[#43474d] font-bold">
            <tr>
              <th className="py-2.5 px-3">Timestamp (UTC)</th>
              <th className="py-2.5 px-3">Admin Email &amp; Role</th>
              <th className="py-2.5 px-3">Action Event</th>
              <th className="py-2.5 px-3">Target Resource</th>
              <th className="py-2.5 px-3">Modification Details</th>
              <th className="py-2.5 px-3">IP Address</th>
              <th className="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eeeeed] font-sans">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[#74777e]">
                  No audit trail records matched your filter criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#f8f9fa] transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#000f22] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <p className="font-semibold text-[#000f22]">{log.adminEmail}</p>
                    <span className="text-[9px] uppercase font-bold text-[#74777e] bg-[#eeeeed] px-1.5 py-0.2 rounded">
                      {log.adminRole.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeStyle(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#005cba] whitespace-nowrap">
                    {log.resourceId}
                  </td>
                  <td className="py-2.5 px-3 text-[#43474d] max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#74777e] text-[11px] whitespace-nowrap">
                    {log.ipAddress}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

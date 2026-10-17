import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { adminAuthService, AdminUser } from '../services/adminAuthService';

interface AdminAuthModalProps {
  isOpen: boolean;
  onSuccess: (admin: AdminUser) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onSuccess }) => {
  const [step, setStep] = useState<'LOGIN' | '2FA'>('LOGIN');
  const [email, setEmail] = useState('admin@aeronexus.com');
  const [password, setPassword] = useState('Admin@123');
  const [tempSessionToken, setTempSessionToken] = useState('');

  // 6-digit TOTP state
  const [otp, setOtp] = useState(['8', '4', '2', '9', '1', '5']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === '2FA') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  if (!isOpen) return null;

  // Step 1: Submit Email + Password
  const handlePrimaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await adminAuthService.login(email.trim(), password);
      if (res.requires2FA && res.tempSessionToken) {
        setTempSessionToken(res.tempSessionToken);
        setStep('2FA');
      } else if (res.accessToken && res.admin) {
        onSuccess(res.admin);
      } else {
        // Fallback safety
        setStep('2FA');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid administrative credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit 6-digit TOTP code
  const handleVerify2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join('').trim();
    if (code.length !== 6) {
      setErrorMsg('Please enter a complete 6-digit TOTP passcode.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await adminAuthService.verify2FA(tempSessionToken, code);
      if (res.success && res.admin) {
        onSuccess(res.admin);
      } else {
        setErrorMsg('2FA verification failed. Please check your passcode.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid 2FA token. Ensure time is synced or use backup override (842915).');
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP digit change
  const handleOtpChange = (val: string, idx: number) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[idx] = cleanVal;
    setOtp(nextOtp);

    // Auto-advance
    if (cleanVal && idx < 5) {
      otpInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      nextOtp[i] = pasted[i] || '';
    }
    setOtp(nextOtp);
    if (pasted.length === 6) {
      otpInputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000f22]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#c4c6ce] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header Security Banner */}
        <div className="bg-[#0a2540] text-white p-5 border-b border-[#162538] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#005cba] flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                  L4 SECURITY CLEARANCE
                </span>
                <span className="text-[11px] font-mono text-[#c4c6ce]">ICAO SEC-04</span>
              </div>
              <h2 className="font-headline text-lg font-bold tracking-tight text-white mt-0.5">
                AeroNexus Operations Gate
              </h2>
            </div>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="px-5 py-2.5 bg-[#f3f4f3] border-b border-[#c4c6ce] text-[11px] text-[#43474d] flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#005cba] shrink-0" />
          <span>Restricted to Authorized Flight Dispatch Officers &amp; Super Admins.</span>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'LOGIN' ? (
            /* STEP 1: PRIMARY CREDENTIALS FORM */
            <form onSubmit={handlePrimaryLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#43474d] font-bold mb-1">
                  Officer Identity (Email)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aeronexus.com"
                    className="w-full text-xs font-mono px-3 py-2.5 border border-[#c4c6ce] rounded-lg text-[#000f22] bg-white focus:outline-none focus:ring-2 focus:ring-[#005cba]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#43474d] font-bold mb-1">
                  Master Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs font-mono px-3 py-2.5 border border-[#c4c6ce] rounded-lg text-[#000f22] bg-white focus:outline-none focus:ring-2 focus:ring-[#005cba]"
                  />
                </div>
              </div>

              {/* Convenience Quick Credentials Banner */}
              <div className="p-2.5 bg-[#f3f4f3] rounded-lg border border-[#c4c6ce]/70 text-[11px] text-[#43474d]">
                <div className="font-semibold text-[#000f22] mb-0.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Provisioned Super Admin Credentials:</span>
                </div>
                <div className="font-mono text-[10px] text-[#005cba]">
                  admin@aeronexus.com <span className="text-[#74777e]">•</span> Admin@123
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0a2540] hover:bg-[#162538] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Identity...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to 2FA Challenge</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: 2FA HARDWARE TOTP VERIFICATION */
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-2">
                  <KeyRound className="w-6 h-6 text-amber-600 animate-pulse" />
                </div>
                <h3 className="font-headline text-base font-bold text-[#000f22]">
                  Two-Factor Authentication
                </h3>
                <p className="text-xs text-[#43474d] mt-1">
                  Enter 6-digit TOTP code from Google Authenticator or emergency bypass token.
                </p>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="flex justify-center gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-12 text-center text-lg font-mono font-bold border border-[#c4c6ce] rounded-lg focus:border-[#005cba] focus:ring-2 focus:ring-[#005cba]/20 text-[#000f22] bg-white outline-none"
                  />
                ))}
              </div>

              {/* System Override Token Hint */}
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between">
                <span className="font-medium">Emergency Bypass Token:</span>
                <button
                  type="button"
                  onClick={() => setOtp(['8', '4', '2', '9', '1', '5'])}
                  className="font-mono font-bold text-[#005cba] underline hover:text-[#004285] cursor-pointer"
                >
                  842915 (Auto-Fill)
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('LOGIN');
                    setErrorMsg(null);
                  }}
                  className="px-4 py-2.5 border border-[#c4c6ce] text-xs font-semibold rounded-lg text-[#43474d] hover:bg-[#f3f4f3] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#005cba] hover:bg-[#004a96] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Token...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify &amp; Enter Console</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Audit Notice */}
        <div className="px-6 py-3 bg-[#f9f9f8] border-t border-[#c4c6ce] text-[10px] font-mono text-[#74777e] flex items-center justify-between">
          <span>IP ADDRESS: LOGGED &amp; HASHED</span>
          <span>PROTOCOL: SHA-256</span>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, User, Phone, FileText, Settings2, ShieldCheck, Save } from 'lucide-react';

export interface CustomerProfileData {
  title: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  docType: 'PASSPORT' | 'CNIC';
  docNumber: string;
  countryOfIssuance: string;
  docExpiryDate: string;
  mealPreference: string;
  seatPreference: string;
  wheelchair: boolean;
  frequentFlyerNumber: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CustomerProfileData;
  onSave: (updated: CustomerProfileData) => void;
  onShowToast: (msg: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<CustomerProfileData>(profile);
  const [activeTab, setActiveTab] = useState<'basic' | 'documents' | 'preferences'>('basic');

  if (!isOpen) return null;

  const handleChange = (field: keyof CustomerProfileData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onShowToast('✅ Airline Passenger Profile updated successfully.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000f22]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#c4c6ce] max-w-2xl w-full shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#c4c6ce] flex items-center justify-between bg-[#f8f9fa]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#005cba] text-white flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-[#000f22]">
                Airline Passenger Profile
              </h3>
              <p className="text-[11px] text-[#43474d]">
                IATA &amp; CAA standard traveler profile for automated flight check-ins
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#74777e] hover:text-[#000f22] rounded-md hover:bg-[#eeeeed] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#c4c6ce] px-3 sm:px-5 bg-white text-xs font-semibold gap-3 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'basic'
                ? 'border-[#005cba] text-[#005cba]'
                : 'border-transparent text-[#74777e] hover:text-[#000f22]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Basic &amp; Contact</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'documents'
                ? 'border-[#005cba] text-[#005cba]'
                : 'border-transparent text-[#74777e] hover:text-[#000f22]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Travel Documents (Passport/CNIC)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'preferences'
                ? 'border-[#005cba] text-[#005cba]'
                : 'border-transparent text-[#74777e] hover:text-[#000f22]'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Flight Preferences</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Title
                  </label>
                  <select
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded bg-white text-[#000f22] focus:border-[#005cba] outline-none"
                  >
                    <option value="Mr">Mr.</option>
                    <option value="Ms">Ms.</option>
                    <option value="Mrs">Mrs.</option>
                    <option value="Dr">Dr.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="e.g. Tariq"
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="e.g. Khan"
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded bg-white text-[#000f22] focus:border-[#005cba] outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Undisclosed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nationality}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    placeholder="e.g. Pakistani / American"
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#c4c6ce]/60">
                <h4 className="text-[11px] font-bold text-[#000f22] mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#005cba]" />
                  <span>Contact &amp; Emergency Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                      Phone Number (with Country Code)
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                      Email Address (Synced)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={formData.email}
                      className="w-full px-3 py-2 border border-[#c4c6ce] rounded bg-[#eeeeed] text-[#74777e] outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyName}
                      onChange={(e) => handleChange('emergencyName', e.target.value)}
                      placeholder="e.g. Fatima Khan (Spouse)"
                      className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                      placeholder="+92 321 9876543"
                      className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#e8f1fc] border border-[#005cba]/30 rounded-lg flex items-center gap-2 text-[#005cba]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Your travel documents are encrypted in AeroNexus security vault for seamless international boarding.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Document Type
                  </label>
                  <select
                    value={formData.docType}
                    onChange={(e) => handleChange('docType', e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded bg-white text-[#000f22] focus:border-[#005cba] outline-none"
                  >
                    <option value="PASSPORT">International Passport</option>
                    <option value="CNIC">National ID / CNIC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Document / Passport Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.docNumber}
                    onChange={(e) => handleChange('docNumber', e.target.value)}
                    placeholder="e.g. PK89210459"
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] font-mono focus:border-[#005cba] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Country of Issuance
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.countryOfIssuance}
                    onChange={(e) => handleChange('countryOfIssuance', e.target.value)}
                    placeholder="e.g. Pakistan"
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.docExpiryDate}
                    onChange={(e) => handleChange('docExpiryDate', e.target.value)}
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] focus:border-[#005cba] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Meal Preference
                  </label>
                  <select
                    value={formData.mealPreference}
                    onChange={(e) => handleChange('mealPreference', e.target.value)}
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded bg-white text-[#000f22] focus:border-[#005cba] outline-none"
                  >
                    <option value="Halal">Halal Meal (Standard)</option>
                    <option value="Vegetarian">Asian Vegetarian</option>
                    <option value="Vegan">Strict Vegan</option>
                    <option value="Kosher">Kosher</option>
                    <option value="Diabetic">Diabetic Friendly</option>
                    <option value="Child">Child Meal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Seat Preference
                  </label>
                  <select
                    value={formData.seatPreference}
                    onChange={(e) => handleChange('seatPreference', e.target.value)}
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded bg-white text-[#000f22] focus:border-[#005cba] outline-none"
                  >
                    <option value="Window">Window Seat</option>
                    <option value="Aisle">Aisle Seat</option>
                    <option value="ExtraLegroom">Extra Legroom (Exit Row)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#43474d] mb-1">
                    Frequent Flyer Number
                  </label>
                  <input
                    type="text"
                    value={formData.frequentFlyerNumber}
                    onChange={(e) => handleChange('frequentFlyerNumber', e.target.value)}
                    placeholder="e.g. SKY-98214-GOLD"
                    className="w-full px-3 py-2 border border-[#c4c6ce] rounded text-[#000f22] font-mono focus:border-[#005cba] outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.wheelchair}
                      onChange={(e) => handleChange('wheelchair', e.target.checked)}
                      className="w-4 h-4 text-[#005cba] rounded border-[#c4c6ce] focus:ring-[#005cba]"
                    />
                    <span className="text-[#000f22] font-medium">
                      Special Assistance / Wheelchair Required
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#c4c6ce] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#43474d] hover:text-[#000f22] rounded hover:bg-[#f3f4f3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#005cba] text-white rounded text-xs font-semibold hover:bg-[#004b99] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Airline Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

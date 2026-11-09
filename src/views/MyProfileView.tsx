import React, { useState } from 'react';
import { 
  User, 
  GraduationCap, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Edit3, 
  BookOpen, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MyProfileView: React.FC = () => {
  const { currentUser, profile, updateProfile, addToast, profileCompletion } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'personal' | 'academic'>('personal');

  // Form local states
  const [formData, setFormData] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (!isEditing) {
      setFormData(profile);
    }
  }, [profile, isEditing]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
    setIsEditing(false);
  };

  const resetForm = () => {
    setFormData(profile);
    setIsEditing(false);
    addToast('Changes discarded', 'info');
  };

  const userDisplayName = profile.personalInfo.fullName?.trim() || currentUser?.fullName?.trim() || 'Candidate Profile';
  const userInitials = userDisplayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Profile Header & Summary */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={userDisplayName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-indigo-50 border border-slate-200 shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold text-xl sm:text-2xl flex items-center justify-center ring-4 ring-indigo-50 border border-indigo-200 shrink-0 shadow-sm">
              {userInitials}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{userDisplayName}</h2>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                currentUser?.isVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{currentUser?.isVerified ? 'DigiLocker Verified' : 'Standard Candidate Profile'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Candidate ID: <span className="font-mono text-slate-700">{profile.id || currentUser?.id}</span> · Stream: {profile.academicInfo.class12.stream || 'Not Specified'} {profile.academicInfo.class12.board ? `(${profile.academicInfo.class12.board} ${profile.academicInfo.class12.passingYear || ''})` : ''}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {profile.personalInfo.email || currentUser?.email || 'Not provided'}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {profile.personalInfo.phoneNumber || 'Phone not provided'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All Changes</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('personal')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeSubTab === 'personal'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Personal Information</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">100%</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('academic')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeSubTab === 'academic'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Academic Information</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">100%</span>
        </button>
      </div>

      {/* Tab Content Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {activeSubTab === 'personal' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                Candidate Demographics
              </h3>
              <p className="text-xs text-slate-500">
                Official details as registered in your Secondary School Certificate (Class 10).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name (as per 10th Certificate) *
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.personalInfo.fullName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, fullName: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  disabled={!isEditing}
                  value={formData.personalInfo.dob}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, dob: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gender *
                </label>
                <select
                  disabled={!isEditing}
                  value={formData.personalInfo.gender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, gender: e.target.value as any },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nationality *
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.personalInfo.nationality}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, nationality: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Social Category / Reservation *
                </label>
                <select
                  disabled={!isEditing}
                  value={formData.personalInfo.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, category: e.target.value as any },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                >
                  <option value="General">General / Open (GEN)</option>
                  <option value="OBC-NCL">Other Backward Classes (OBC-NCL)</option>
                  <option value="SC">Scheduled Caste (SC)</option>
                  <option value="ST">Scheduled Tribe (ST)</option>
                  <option value="EWS">Economically Weaker Section (GEN-EWS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Father's / Guardian's Name
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.personalInfo.fathersName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, fathersName: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mother's Name
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.personalInfo.mothersName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, mothersName: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address (Official OTP) *
                </label>
                <input
                  type="email"
                  disabled={!isEditing}
                  value={formData.personalInfo.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, email: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number (NTA SMS Verified) *
                </label>
                <input
                  type="tel"
                  disabled={!isEditing}
                  value={formData.personalInfo.phoneNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, phoneNumber: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium font-mono"
                  required
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Residential Address</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.personalInfo.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo,
                          address: { ...formData.personalInfo.address, street: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.personalInfo.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo,
                          address: { ...formData.personalInfo.address, city: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.personalInfo.address.pincode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalInfo: {
                          ...formData.personalInfo,
                          address: { ...formData.personalInfo.address, pincode: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'academic' && (
          <div className="space-y-6">
            {/* Class 10 Record */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Secondary Examination (Class 10)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Used across all national portals to verify birthdate and foundational qualifications.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                  Verified Marksheet
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Board *</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.academicInfo.class10.board}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicInfo: {
                          ...formData.academicInfo,
                          class10: { ...formData.academicInfo.class10, board: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Passing Year *</label>
                  <input
                    type="number"
                    disabled={!isEditing}
                    value={formData.academicInfo.class10.passingYear}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicInfo: {
                          ...formData.academicInfo,
                          class10: { ...formData.academicInfo.class10, passingYear: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Percentage / CGPA *</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isEditing}
                    value={formData.academicInfo.class10.percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicInfo: {
                          ...formData.academicInfo,
                          class10: { ...formData.academicInfo.class10, percentage: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.academicInfo.class10.rollNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicInfo: {
                          ...formData.academicInfo,
                          class10: { ...formData.academicInfo.class10, rollNumber: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Class 12 Record */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Senior Secondary Examination (Class 12 / 10+2)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Primary criteria for JEE, NEET, CUET, and BITSAT eligibility evaluation.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                  {formData.academicInfo.class12.status} ({formData.academicInfo.class12.percentage}%)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Board *</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.academicInfo.class12.board}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicInfo: {
                          ...formData.academicInfo,
                          class12: { ...formData.academicInfo.class12, board: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Stream *</label>
                  <select
                    disabled={!isEditing}
                    value={formData.academicInfo.class12.stream}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicInfo: {
                          ...formData.academicInfo,
                          class12: { ...formData.academicInfo.class12, stream: e.target.value as any },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium"
                  >
                    <option value="PCM">PCM (Physics, Chemistry, Maths)</option>
                    <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                    <option value="PCMB">PCMB (Both Maths & Biology)</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Arts">Humanities / Arts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Passing Year *</label>
                  <input
                    type="number"
                    disabled={!isEditing}
                    value={formData.academicInfo.class12.passingYear}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicInfo: {
                          ...formData.academicInfo,
                          class12: { ...formData.academicInfo.class12, passingYear: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Aggregate % *</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!isEditing}
                    value={formData.academicInfo.class12.percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicInfo: {
                          ...formData.academicInfo,
                          class12: { ...formData.academicInfo.class12, percentage: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Subjects Studied (comma-separated)
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.academicInfo.class12.subjects.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      academicInfo: {
                        ...formData.academicInfo,
                        class12: {
                          ...formData.academicInfo.class12,
                          subjects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Current Qualification Status
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.academicInfo.currentQualification}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      academicInfo: {
                        ...formData.academicInfo,
                        currentQualification: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white disabled:bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 transition-all font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save & Verify Profile</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

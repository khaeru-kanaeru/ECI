import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Department } from '../types';
import { X, Lock, User as UserIcon, Building2, Briefcase, KeyRound, Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const DEPARTMENTS: Department[] = [
  'Produksi Export',
  'HA Export',
  'VCFP Export',
  'QAM',
  'Engineering',
  'Staff',
  'Administration',
  'Human Resource',
];

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalActionReason,
    authModalTab,
    login,
    signup,
    resetPassword,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'reset-password'>('login');
  
  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupFullName, setSignupFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupDepartment, setSignupDepartment] = useState<Department>('Produksi Export');
  const [signupRole, setSignupRole] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Reset password form
  const [resetUsername, setResetUsername] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // Status feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveTab(authModalTab);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isAuthModalOpen, authModalTab]);

  if (!isAuthModalOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginUsername.trim()) {
      setErrorMessage('Silakan masukkan username Anda.');
      return;
    }

    const res = login(loginUsername, loginPassword);
    if (!res.success) {
      setErrorMessage(res.error || 'Gagal masuk.');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!signupFullName.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }
    if (!signupUsername.trim()) {
      setErrorMessage('Username unik wajib diisi.');
      return;
    }
    if (signupPassword.length < 4) {
      setErrorMessage('Kata sandi minimal 4 karakter.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    const res = signup({
      fullName: signupFullName,
      username: signupUsername,
      department: signupDepartment,
      role: signupRole || `Spesialis ${signupDepartment}`,
      password: signupPassword,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Gagal mendaftar.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!resetUsername.trim()) {
      setErrorMessage('Masukkan username yang ingin diganti kata sandinya.');
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 4) {
      setErrorMessage('Kata sandi baru minimal 4 karakter.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    const res = resetPassword(resetUsername, resetNewPassword);
    if (res.success) {
      setSuccessMessage(`Kata sandi untuk @${resetUsername.replace(/^@/, '')} berhasil diperbarui! Anda dapat langsung masuk sekarang.`);
      setResetNewPassword('');
      setResetConfirmPassword('');
      setTimeout(() => {
        setLoginUsername(resetUsername);
        setActiveTab('login');
      }, 1500);
    } else {
      setErrorMessage(res.error || 'Gagal memperbarui kata sandi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-zinc-200/80 overflow-hidden">
        {/* Header */}
        <div className="relative p-5 pb-4 border-b border-zinc-200/80 bg-white">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            <span>Portal Internal Perusahaan</span>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
            Autentikasi Karyawan
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {authModalActionReason}
          </p>

          {/* Tab Navigation */}
          <div className="flex bg-zinc-100 p-1 rounded-lg mt-3 text-xs font-normal text-zinc-600">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-zinc-900 font-medium shadow-2xs'
                  : 'hover:text-zinc-900'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-white text-zinc-900 font-medium shadow-2xs'
                  : 'hover:text-zinc-900'
              }`}
            >
              Buat Akun
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('reset-password'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'reset-password'
                  ? 'bg-white text-zinc-900 font-medium shadow-2xs'
                  : 'hover:text-zinc-900'
              }`}
            >
              Ganti Sandi
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-3.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-3.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div>
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Username Karyawan
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 font-normal text-xs">
                      @
                    </span>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="contoh: budi_eng atau siti_hr"
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-zinc-700">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('reset-password'); setErrorMessage(''); }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-800 cursor-pointer"
                    >
                      Ganti sandi tanpa sandi lama?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Masuk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: SIGNUP */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Username Akun (Dibuat Sendiri)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 font-normal text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="contoh: fauzi_dev"
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800 font-mono text-[11px]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Departemen
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                    <select
                      value={signupDepartment}
                      onChange={(e) => setSignupDepartment(e.target.value as Department)}
                      className="w-full pl-8 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Jabatan / Role
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value)}
                      placeholder="Frontend Eng"
                      className="w-full pl-8 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min 4 karakter"
                      className="w-full pl-8 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Konfirmasi Sandi
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi"
                      className="w-full pl-8 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                Daftarkan Akun
              </button>
            </form>
          )}

          {/* TAB 3: RESET PASSWORD WITHOUT OLD PASSWORD */}
          {activeTab === 'reset-password' && (
            <div>
              <div className="p-3 mb-3.5 rounded-lg bg-zinc-50 border border-zinc-200/80 text-zinc-600 text-xs leading-relaxed">
                <span className="font-medium text-zinc-900">Mekanisme Ganti Sandi Langsung:</span> Masukkan username akun dan kata sandi baru Anda, <strong>tanpa memerlukan kata sandi lama</strong>.
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Username Akun yang Ingin Diganti
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 font-normal text-xs">
                      @
                    </span>
                    <input
                      type="text"
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      placeholder="contoh: budi_eng atau siti_hr"
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Sandi baru"
                        className="w-full pl-8 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Konfirmasi Sandi
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        placeholder="Ulangi sandi"
                        className="w-full pl-8 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-medium rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Perbarui Kata Sandi</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

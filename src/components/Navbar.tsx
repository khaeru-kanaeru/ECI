import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Plus,
  MessageSquare,
  LogOut,
  LogIn,
  Search,
  Building2,
  KeyRound,
  ChevronDown,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  onGoHome: () => void;
  onOpenCreatePost: () => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAtHome?: boolean;
  myPostsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onGoHome,
  onOpenCreatePost,
  onOpenChat,
  onOpenProfile,
  searchQuery,
  onSearchChange,
  isAtHome = true,
  myPostsCount = 0,
}) => {
  const { currentUser, openAuthModal, logout, requireAuth } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleCreatePostClick = () => {
    requireAuth('membuat postingan baru', onOpenCreatePost);
  };

  const handleChatClick = () => {
    requireAuth('membuka chat internal', onOpenChat);
  };

  const handleProfileClick = () => {
    requireAuth('melihat profil dan postingan Anda', onOpenProfile);
  };

  const handleLogoutClick = () => {
    logout();
    setShowProfileMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#dddfe2] shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand / Logo (ECI - Electronic Central Information) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
            title="Kembali ke Beranda ECI"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs group-hover:bg-[#166fe5] transition-colors">
              <span>ECI</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="font-extrabold text-lg text-[#1877F2] tracking-tight block">
                ECI
              </span>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                Electronic Central Information
              </span>
            </div>
          </button>
        </div>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-sm sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari di ECI (@rekan, topik, departemen)..."
              className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] hover:bg-[#e4e6eb] focus:bg-white border border-transparent focus:border-[#1877F2] rounded-full text-xs text-zinc-800 placeholder-zinc-500 focus:outline-hidden transition-all"
            />
          </div>
        </div>

        {/* Primary Navigation Bar (Beranda, Profil Saya, New Post, Chat, Keluar) */}
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1. BERANDA */}
          <button
            type="button"
            onClick={onGoHome}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isAtHome
                ? 'text-[#1877F2] bg-blue-50/80 border-b-2 border-[#1877F2]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-[#f0f2f5]'
            }`}
            title="Beranda ECI"
          >
            <Home className="w-4.5 h-4.5" />
            <span className="hidden md:inline">Beranda</span>
          </button>

          {/* 2. PROFIL SAYA */}
          <button
            type="button"
            onClick={handleProfileClick}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 hover:text-[#1877F2] hover:bg-blue-50/60 transition-all cursor-pointer"
            title="Lihat Profil Saya & Postingan Yang Saya Upload"
          >
            <UserIcon className="w-4.5 h-4.5 text-zinc-600" />
            <span className="hidden md:inline">Profil Saya</span>
            {currentUser && myPostsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#1877F2] text-white text-[10px] font-bold">
                {myPostsCount}
              </span>
            )}
          </button>

          {/* 3. NEW POST */}
          <button
            type="button"
            onClick={handleCreatePostClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-xs transition-all cursor-pointer"
            title="Buat Postingan Baru"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Post</span>
          </button>

          {/* 4. CHAT */}
          <button
            type="button"
            onClick={handleChatClick}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-[#f0f2f5] transition-all cursor-pointer"
            title="Buka Chat Internal"
          >
            <MessageSquare className="w-4.5 h-4.5 text-zinc-600" />
            <span className="hidden md:inline">Chat</span>
            {currentUser && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1877F2] rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* 5. KELUAR / MASUK */}
          {currentUser ? (
            <div className="flex items-center gap-1">
              <button
                id="navbar-logout-btn"
                type="button"
                onClick={handleLogoutClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Keluar dari akun Anda"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="inline">Keluar</span>
              </button>

              {/* Profile Avatar Pill with Menu */}
              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="p-1 rounded-full hover:ring-2 hover:ring-[#1877F2]/40 transition-all cursor-pointer flex items-center gap-1"
                  title="Menu Profil"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 hidden sm:block" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-zinc-200 py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-zinc-100">
                      <div className="font-semibold text-xs text-zinc-900">{currentUser.fullName}</div>
                      <div className="text-[11px] font-mono text-[#1877F2]">@{currentUser.username}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {currentUser.role} • {currentUser.department}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenProfile();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-[#1877F2] hover:bg-blue-50/60 flex items-center gap-2 cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                        <span>Profil Saya &amp; Postingan Saya</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          openAuthModal('Ganti kata sandi akun Anda', 'reset-password');
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-[#f0f2f5] flex items-center gap-2 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Ganti Kata Sandi</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Keluar Akun</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('Masuk untuk berinteraksi')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-zinc-600" />
              <span>Masuk</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};


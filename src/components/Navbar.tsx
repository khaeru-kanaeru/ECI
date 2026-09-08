import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storageService';
import { FirestoreService } from '../services/firestoreService';
import { AppNotification } from '../types';
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
  Bell,
  AtSign,
  CheckCheck,
  Check,
  ExternalLink,
} from 'lucide-react';

interface NavbarProps {
  onGoHome: () => void;
  onOpenCreatePost: () => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
  onSelectPost?: (postId: string) => void;
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
  onSelectPost,
  searchQuery,
  onSearchChange,
  isAtHome = true,
  myPostsCount = 0,
}) => {
  const { currentUser, openAuthModal, logout, requireAuth } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    currentUser ? StorageService.getNotifications(currentUser.username) : []
  );
  const [unreadChatCount, setUnreadChatCount] = useState<number>(() =>
    currentUser ? StorageService.getUnreadChatCount(currentUser.id, currentUser.username) : 0
  );

  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setShowNotificationsMenu(false);
      }
    };
    if (showNotificationsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotificationsMenu]);

  // Subscribe to live notifications for currentUser
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadChatCount(0);
      return;
    }

    // 1. Initial cached notifications
    setNotifications(StorageService.getNotifications(currentUser.username));

    // 2. Real-time Firestore subscription to notifications
    const unsubNotifs = FirestoreService.subscribeToUserNotifications(
      currentUser.username,
      (liveNotifs) => {
        setNotifications(liveNotifs);
      }
    );

    // 3. Real-time Firestore subscription to chat messages (for unread badge count)
    const unsubChats = FirestoreService.subscribeToUserMessages(
      currentUser.id,
      currentUser.username,
      () => {
        const count = StorageService.getUnreadChatCount(currentUser.id, currentUser.username);
        setUnreadChatCount(count);
      }
    );

    return () => {
      unsubNotifs();
      unsubChats();
    };
  }, [currentUser]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleCreatePostClick = () => {
    requireAuth('membuat postingan baru', onOpenCreatePost);
  };

  const handleChatClick = () => {
    requireAuth('membuka chat internal', () => {
      setUnreadChatCount(0);
      onOpenChat();
    });
  };

  const handleProfileClick = () => {
    requireAuth('melihat profil dan postingan Anda', onOpenProfile);
  };

  const handleLogoutClick = () => {
    logout();
    setShowProfileMenu(false);
    setShowNotificationsMenu(false);
  };

  const handleMarkAsRead = (notif: AppNotification) => {
    FirestoreService.markNotificationAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setShowNotificationsMenu(false);

    if (notif.postId) {
      onSelectPost?.(notif.postId);
    }
  };

  const handleMarkAllAsRead = () => {
    if (!currentUser) return;
    FirestoreService.markAllNotificationsAsRead(currentUser.username);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatNotificationTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
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

        {/* Primary Navigation Bar (Beranda, Profil Saya, New Post, Chat, Notifikasi, Keluar) */}
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

          {/* 4. CHAT INTERNAL */}
          <button
            type="button"
            onClick={handleChatClick}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-[#f0f2f5] transition-all cursor-pointer"
            title="Buka Chat Internal Rekan Kerja"
          >
            <MessageSquare className="w-4.5 h-4.5 text-zinc-600" />
            <span className="hidden md:inline">Chat</span>
            {currentUser && unreadChatCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#1877F2] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            ) : currentUser ? (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" title="Terkoneksi" />
            ) : null}
          </button>

          {/* 5. PEMBERITAHUAN & TAG PROFIL */}
          {currentUser && (
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  showNotificationsMenu
                    ? 'text-[#1877F2] bg-blue-50/80'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-[#f0f2f5]'
                }`}
                title="Pemberitahuan & Tag Profil Anda"
              >
                <Bell className="w-4.5 h-4.5 text-zinc-600" />
                <span className="hidden md:inline">Notifikasi</span>
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotificationsMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-zinc-200 py-2 z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#1877F2]" />
                      <h4 className="font-semibold text-xs text-zinc-900">
                        Pemberitahuan &amp; Tag Profil
                      </h4>
                      {unreadNotifCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          {unreadNotifCount} baru
                        </span>
                      )}
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] text-[#1877F2] hover:underline font-medium cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Tandai dibaca</span>
                      </button>
                    )}
                  </div>

                  {/* Notifications list */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 px-4 text-center text-xs text-zinc-400">
                        <AtSign className="w-8 h-8 mx-auto mb-2 text-zinc-300 stroke-[1.5]" />
                        <p className="font-medium text-zinc-600 mb-1">Belum ada tag atau notifikasi</p>
                        <p className="text-[11px] text-zinc-400">
                          Ketika rekan kerja menandai profil @{currentUser.username} dalam postingan atau komentar, Anda akan diberitahu di sini.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isMentionPost = notif.type === 'mention_post';
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleMarkAsRead(notif)}
                            className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                              notif.read ? 'hover:bg-zinc-50 opacity-80' : 'bg-blue-50/40 hover:bg-blue-50/80 font-medium'
                            }`}
                          >
                            <img
                              src={notif.senderAvatar}
                              alt={notif.senderName}
                              className="w-8 h-8 rounded-full object-cover border border-zinc-200 shrink-0 mt-0.5"
                            />
                            <div className="flex-1 min-w-0 text-xs">
                              <div className="text-zinc-900 leading-snug">
                                <span className="font-semibold text-[#050505]">{notif.senderName}</span>{' '}
                                <span className="text-[#1877F2] font-mono text-[11px]">@{notif.senderUsername}</span>{' '}
                                {isMentionPost ? (
                                  <span className="text-zinc-700">menandai Anda dalam postingan baru:</span>
                                ) : (
                                  <span className="text-zinc-700">menandai profil Anda dalam komentar:</span>
                                )}
                              </div>

                              {notif.snippet && (
                                <p className="text-[11px] text-zinc-600 mt-1 line-clamp-2 italic bg-white/80 p-1.5 rounded border border-zinc-200/60">
                                  "{notif.snippet}"
                                </p>
                              )}

                              <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-400">
                                <span>{formatNotificationTime(notif.createdAt)}</span>
                                <span className="text-[#1877F2] flex items-center gap-0.5 hover:underline font-medium">
                                  <span>Lihat postingan</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              </div>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-[#1877F2] shrink-0 mt-1" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. KELUAR / MASUK */}
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


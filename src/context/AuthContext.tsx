import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Department } from '../types';
import { StorageService } from '../services/storageService';
import { FirestoreService } from '../services/firestoreService';
import { generateInitialsAvatar } from '../utils/avatarUtils';

interface AuthContextType {
  currentUser: User | null;
  usersList: User[];
  isAuthModalOpen: boolean;
  authModalActionReason: string;
  authModalTab: 'login' | 'signup' | 'reset-password';
  openAuthModal: (reason?: string, tab?: 'login' | 'signup' | 'reset-password') => void;
  closeAuthModal: () => void;
  login: (username: string, password?: string) => { success: boolean; error?: string };
  signup: (data: {
    fullName: string;
    username: string;
    department: Department;
    role: string;
    avatar?: string;
    password?: string;
  }) => { success: boolean; error?: string };
  updateProfile: (updates: Partial<Pick<User, 'fullName' | 'avatar' | 'bio' | 'department' | 'role'>>) => { success: boolean; error?: string };
  resetPassword: (username: string, newPassword: string) => { success: boolean; error?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  requireAuth: (actionName: string, onAuthorized: () => void) => void;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'enterprise_network_current_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    // Default to guest/null so the user immediately sees the public FYP feed without being forced to log in!
    return null;
  });

  const [usersList, setUsersList] = useState<User[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalActionReason, setAuthModalActionReason] = useState('Masuk ke akun perusahaan Anda');
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'reset-password'>('login');

  const refreshUsers = () => {
    const list = StorageService.getUsers();
    setUsersList(list);
  };

  useEffect(() => {
    StorageService.initialize();
    refreshUsers();
    const demoUsernames = new Set([
      'budi_prod', 'rian_ha', 'maya_vcfp', 'clara_qam',
      'hendra_eng', 'agus_staff', 'linda_admin', 'siti_hr'
    ]);
    if (currentUser && (demoUsernames.has(currentUser.username.toLowerCase()) || (typeof currentUser.id === 'string' && /^usr-[1-8]$/.test(currentUser.id)))) {
      setCurrentUser(null);
      localStorage.removeItem(CURRENT_USER_KEY);
    }

    // Subscribe to cloud Firestore users to keep accounts in sync across devices
    const unsubscribeUsers = FirestoreService.subscribeToUsers((cloudUsers) => {
      cloudUsers.forEach((u) => {
        try {
          const existing = StorageService.getUserById(u.id);
          if (!existing) {
            StorageService.createUser(u);
          } else {
            StorageService.updateUserProfile(u.id, u);
          }
        } catch {
          // ignore
        }
      });
      refreshUsers();
    });

    // Auto sync any local posts and users into Firestore
    FirestoreService.syncLocalDataToFirestore().catch(() => {});

    return () => {
      unsubscribeUsers();
    };
  }, []);

  const openAuthModal = (
    reason = 'Masuk ke akun perusahaan Anda',
    tab: 'login' | 'signup' | 'reset-password' = 'login'
  ) => {
    setAuthModalActionReason(reason);
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = (username: string, password?: string): { success: boolean; error?: string } => {
    const cleanUsername = username.trim().replace(/^@/, '');
    const user = StorageService.getUserByUsername(cleanUsername);

    if (!user) {
      return {
        success: false,
        error: `Karyawan dengan username @${cleanUsername} tidak ditemukan. Silakan periksa kembali atau buat akun baru.`,
      };
    }

    if (password && user.password && user.password !== password) {
      return {
        success: false,
        error: 'Kata sandi tidak sesuai. Jika lupa, Anda dapat menggunakan tombol "Ganti Kata Sandi" tanpa sandi lama.',
      };
    }

    setCurrentUser(user);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    closeAuthModal();
    return { success: true };
  };

  const signup = (data: {
    fullName: string;
    username: string;
    department: Department;
    role: string;
    avatar?: string;
    password?: string;
  }): { success: boolean; error?: string } => {
    const cleanUsername = data.username.trim().replace(/^@/, '').toLowerCase();
    
    if (!cleanUsername) {
      return { success: false, error: 'Username wajib diisi.' };
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return { success: false, error: 'Username hanya boleh huruf kecil, angka, dan underscore (_).' };
    }
    if (!data.fullName.trim()) {
      return { success: false, error: 'Nama lengkap wajib diisi.' };
    }

    // Use uploaded photo if provided, otherwise generate clean SVG initials avatar (NO placeholder photos!)
    const chosenAvatar = (data.avatar && data.avatar.trim())
      ? data.avatar.trim()
      : generateInitialsAvatar(data.fullName.trim(), data.department);

    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      fullName: data.fullName.trim(),
      department: data.department,
      role: data.role.trim() || 'Staf ' + data.department,
      avatar: chosenAvatar,
      password: data.password || 'password123',
      joinedAt: Date.now(),
      isOnline: true,
      bio: `Karyawan departemen ${data.department}`,
    };

    try {
      const created = StorageService.createUser(newUser);
      setCurrentUser(created);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(created));
      refreshUsers();
      closeAuthModal();
      // Sync new user to cloud Firestore
      FirestoreService.saveUser(created).catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal membuat akun.' };
    }
  };

  const updateProfile = (
    updates: Partial<Pick<User, 'fullName' | 'avatar' | 'bio' | 'department' | 'role'>>
  ): { success: boolean; error?: string } => {
    if (!currentUser) {
      return { success: false, error: 'Sesi akun tidak aktif.' };
    }
    try {
      const updated = StorageService.updateUserProfile(currentUser.id, updates);
      setCurrentUser(updated);
      refreshUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal memperbarui profil.' };
    }
  };

  // Direct reset without requiring previous password
  const resetPassword = (username: string, newPassword: string): { success: boolean; error?: string } => {
    const cleanUsername = username.trim().replace(/^@/, '');
    if (!cleanUsername) {
      return { success: false, error: 'Masukkan username yang ingin direset.' };
    }
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'Kata sandi baru minimal 4 karakter.' };
    }

    try {
      const updatedUser = StorageService.resetPassword(cleanUsername, newPassword);
      // If the current logged in user is this user, update session
      if (currentUser?.username.toLowerCase() === cleanUsername.toLowerCase()) {
        setCurrentUser(updatedUser);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
      }
      refreshUsers();
      // Sync password update to cloud Firestore
      FirestoreService.saveUser(updatedUser).catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mereset kata sandi.' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const switchUser = (userId: string) => {
    const user = StorageService.getUserById(userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
  };

  // Helper to guard interactive actions for guests
  const requireAuth = (actionName: string, onAuthorized: () => void) => {
    if (currentUser) {
      onAuthorized();
    } else {
      openAuthModal(`Untuk ${actionName}, Anda perlu masuk atau membuat akun terlebih dahulu.`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        usersList,
        isAuthModalOpen,
        authModalActionReason,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        signup,
        updateProfile,
        resetPassword,
        logout,
        switchUser,
        requireAuth,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

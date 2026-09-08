import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post, Comment, PostCategory } from '../types';
import { PostCard } from './PostCard';
import { StorageService } from '../services/storageService';
import {
  X,
  User as UserIcon,
  Building2,
  Calendar,
  FileText,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Plus,
  Search,
  Filter,
  Edit3,
  Check,
  Flame,
  AlertTriangle,
  Info,
  ShieldCheck,
  Share2,
  Camera,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { generateInitialsAvatar, compressAndReadImage } from '../utils/avatarUtils';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  onUpvote: (postId: string) => void;
  onAddComment: (postId: string, comment: Comment) => void;
  onDeletePost?: (postId: string) => void;
  onOpenCreatePost: () => void;
  onTagClick?: (username: string) => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  posts,
  onUpvote,
  onAddComment,
  onDeletePost,
  onOpenCreatePost,
  onTagClick,
}) => {
  const { currentUser, updateProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(currentUser?.bio || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Keep bioText synced if user changes
  React.useEffect(() => {
    if (currentUser?.bio !== undefined) {
      setBioText(currentUser.bio);
    }
  }, [currentUser]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoNotice({ type: 'error', message: 'Format file harus gambar (JPG, PNG, WEBP).' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoNotice({ type: 'error', message: 'Ukuran file maksimal 8 MB.' });
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoNotice(null);
    try {
      const dataUrl = await compressAndReadImage(file, 400, 0.88);
      const res = updateProfile({ avatar: dataUrl });
      if (res.success) {
        setPhotoNotice({ type: 'success', message: 'Foto profil berhasil diperbarui.' });
        setTimeout(() => setPhotoNotice(null), 3500);
      } else {
        setPhotoNotice({ type: 'error', message: res.error || 'Gagal menyimpan foto profil.' });
      }
    } catch (err: any) {
      setPhotoNotice({ type: 'error', message: err.message || 'Gagal memproses foto.' });
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleResetToInitials = () => {
    if (!currentUser) return;
    const initialsAvatar = generateInitialsAvatar(currentUser.fullName, currentUser.department);
    const res = updateProfile({ avatar: initialsAvatar });
    if (res.success) {
      setPhotoNotice({ type: 'success', message: 'Foto profil diganti menggunakan inisial nama.' });
      setTimeout(() => setPhotoNotice(null), 3500);
    }
  };

  // Filter posts uploaded by current user
  const myPosts = useMemo(() => {
    if (!currentUser) return [];
    return posts.filter(
      (p) =>
        p.authorId === currentUser.id ||
        p.authorUsername.toLowerCase() === currentUser.username.toLowerCase()
    );
  }, [posts, currentUser]);

  // Calculate stats for current user
  const totalUpvotes = useMemo(() => {
    return myPosts.reduce((sum, p) => sum + (p.upvotesCount || 0), 0);
  }, [myPosts]);

  const totalComments = useMemo(() => {
    return myPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);
  }, [myPosts]);

  // Filter displayed posts by category and search
  const displayedMyPosts = useMemo(() => {
    let list = [...myPosts];

    if (selectedCategory !== 'Semua') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const titleMatch = p.title?.toLowerCase().includes(q);
        const contentMatch = p.content.toLowerCase().includes(q);
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q.replace(/^#/, '')));
        return titleMatch || contentMatch || tagMatch;
      });
    }

    // Sort by latest by default
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [myPosts, selectedCategory, searchQuery]);

  if (!isOpen || !currentUser) return null;

  const handleSaveBio = () => {
    try {
      StorageService.updateUserBio(currentUser.id, bioText.trim());
      currentUser.bio = bioText.trim();
      updateProfile({ bio: bioText.trim() });
    } catch {
      // ignore
    }
    setIsEditingBio(false);
  };

  const formattedJoinDate = currentUser.joinedAt
    ? new Date(currentUser.joinedAt).toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      })
    : '2026';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#f0f2f5] rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Header Bar */}
        <div className="relative bg-gradient-to-r from-[#1877F2] via-[#166fe5] to-[#0d55b5] p-5 sm:p-6 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup Profil"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ECI • Electronic Central Information</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Profil Saya &amp; Riwayat Postingan
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
            Kelola data akun Anda dan tinjau seluruh postingan koordinasi ekspor yang telah Anda publikasikan ke jaringan.
          </p>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* User Identity Card */}
          <div className="bg-white rounded-2xl border border-[#dddfe2] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.fullName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-[#1877F2]/20 border-2 border-white shadow-md"
                  />
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" title="Online" />

                  {/* Hover Camera Overlay */}
                  <label
                    className="absolute inset-0 rounded-full bg-black/45 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-semibold"
                    title="Klik untuk ganti foto profil"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span>Ubah Foto</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-[#050505]">
                      {currentUser.fullName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 text-[#1877F2] border border-blue-100">
                      @{currentUser.username}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 font-medium mt-0.5">
                    {currentUser.role}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-zinc-800 bg-[#f0f2f5] px-2 py-0.5 rounded-md">
                      <Building2 className="w-3.5 h-3.5 text-[#1877F2]" />
                      {currentUser.department}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      Bergabung {formattedJoinDate}
                    </span>
                  </div>

                  {/* Photo Actions */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5 text-[#1877F2]" />
                      <span>{isUploadingPhoto ? 'Mengunggah...' : 'Ganti Foto Profil'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                        className="hidden"
                      />
                    </label>

                    {!currentUser.avatar.startsWith('data:image/svg+xml') && (
                      <button
                        type="button"
                        onClick={handleResetToInitials}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        title="Hapus foto kustom dan gunakan inisial nama"
                      >
                        <RefreshCw className="w-3 h-3 text-zinc-500" />
                        <span>Gunakan Inisial Nama</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action: Create Post Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreatePost();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Buat Postingan Baru</span>
              </button>
            </div>

            {/* Photo upload status notification */}
            {photoNotice && (
              <div
                className={`mt-3 p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border ${
                  photoNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{photoNotice.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoNotice(null)}
                  className="text-zinc-500 hover:text-zinc-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Bio Section */}
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Deskripsi Singkat / Bio:
                </span>
                {!isEditingBio ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Bio</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(false)}
                      className="text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166fe5] px-2.5 py-1 rounded-md cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Simpan</span>
                    </button>
                  </div>
                )}
              </div>

              {isEditingBio ? (
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  rows={2}
                  maxLength={180}
                  className="w-full p-2.5 text-xs bg-[#f0f2f5] border border-blue-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1877F2]/40"
                  placeholder="Tuliskan fokus pekerjaan atau catatan tanggung jawab Anda..."
                />
              ) : (
                <p className="text-xs text-zinc-600 italic">
                  "{currentUser.bio || 'Belum ada bio yang ditambahkan.'}"
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-[#dddfe2] p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 leading-none">
                  {myPosts.length}
                </div>
                <div className="text-[11px] font-medium text-zinc-500 mt-1">
                  Postingan Diupload
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#dddfe2] p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 leading-none">
                  {totalUpvotes}
                </div>
                <div className="text-[11px] font-medium text-zinc-500 mt-1">
                  Total Upvote Diterima
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#dddfe2] p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-zinc-900 leading-none">
                  {totalComments}
                </div>
                <div className="text-[11px] font-medium text-zinc-500 mt-1">
                  Total Komentar Diterima
                </div>
              </div>
            </div>
          </div>

          {/* Post Filter & Search Section */}
          <div className="bg-white rounded-xl border border-[#dddfe2] p-3 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1877F2]" />
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Postingan Yang Saya Upload ({myPosts.length})
                </h4>
              </div>

              {/* Search Inside My Posts */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari postingan saya..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#f0f2f5] border border-transparent focus:border-[#1877F2] rounded-lg text-xs text-zinc-800 placeholder-zinc-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-semibold text-zinc-500 mr-1 shrink-0">
                Kategori:
              </span>
              {['Semua', 'Regular/Information Only', 'Urgent', 'Top Urgent'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1877F2] text-white shadow-2xs font-semibold'
                      : 'bg-[#f0f2f5] text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Stream */}
          <div className="space-y-3.5">
            {displayedMyPosts.length > 0 ? (
              displayedMyPosts.map((post) => (
                <div key={post.id} className="relative group">
                  <div className="absolute top-2 right-3 z-10 hidden group-hover:flex items-center gap-1.5 bg-white/95 px-2 py-1 rounded-md shadow-xs border border-zinc-200">
                    <span className="text-[10px] font-semibold text-[#1877F2]">
                      Postingan Anda
                    </span>
                  </div>
                  <PostCard
                    post={post}
                    onUpvote={onUpvote}
                    onAddComment={onAddComment}
                    onTagClick={onTagClick}
                    onDeletePost={onDeletePost}
                    isMyPost={true}
                  />
                </div>
              ))
            ) : myPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#dddfe2] p-10 text-center shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-[#1877F2] mb-3">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                  Belum Ada Postingan Yang Anda Upload
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Anda belum mempublikasikan postingan apapun. Buat pengumuman departemen, SOP baru, atau info ekspor sekarang untuk berkoordinasi dengan tim.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreatePost();
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Buat Postingan Pertama Anda</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#dddfe2] p-8 text-center shadow-xs">
                <p className="text-xs text-zinc-500">
                  Tidak ditemukan postingan yang cocok dengan pencarian atau kategori ini.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Semua');
                  }}
                  className="mt-3 text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-[#dddfe2] flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span className="text-[11px]">
            Masuk sebagai <strong className="text-zinc-800">@{currentUser.username}</strong> ({currentUser.department})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#f0f2f5] hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

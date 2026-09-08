import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageService } from './services/storageService';
import { FirestoreService } from './services/firestoreService';
import { Post, Department, Comment } from './types';
import { Navbar } from './components/Navbar';
import { DepartmentFilter } from './components/DepartmentFilter';
import { PostCard } from './components/PostCard';
import { WorkplaceSidebar } from './components/WorkplaceSidebar';
import { CreatePostModal } from './components/CreatePostModal';
import { ChatDrawer } from './components/ChatDrawer';
import { AuthModal } from './components/AuthModal';
import { MyProfileModal } from './components/MyProfileModal';
import {
  TrendingUp,
  Clock,
  MessageSquare,
  Sparkles,
  Plus,
  Filter,
  X,
  ExternalLink,
  Image as ImageIcon,
  Copy,
  Check
} from 'lucide-react';

const MainWorkplaceFeed: React.FC = () => {
  const { currentUser, requireAuth, openAuthModal } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department>('Semua Departemen');
  const [sortBy, setSortBy] = useState<'recommendation' | 'latest' | 'most-commented'>('recommendation');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Drawers
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const [firestoreNotice, setFirestoreNotice] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesCopied, setRulesCopied] = useState(false);

  // Initialize storage & subscribe to Firestore live feed
  useEffect(() => {
    // Purge old local storage keys and legacy dummy posts
    FirestoreService.cleanLegacyPlaceholders().catch(() => {});
    StorageService.initialize();

    // Subscribe to Firestore live feed
    const unsubscribe = FirestoreService.subscribeToPosts(
      (livePosts) => {
        setPosts(livePosts);
        setFirestoreNotice(null);
      },
      (err) => {
        const msg = String(err?.message || err);
        if (msg.toLowerCase().includes('permission')) {
          setFirestoreNotice('Aturan Firestore (Rules) pada proyek eci-sys belum diatur untuk mengizinkan baca/tulis.');
        }
        const cached = FirestoreService.getCachedPosts();
        if (cached && cached.length > 0) {
          setPosts(cached);
        } else {
          setPosts(StorageService.getPosts());
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Calculate department post counts
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Semua Departemen': posts.length,
    };
    posts.forEach((p) => {
      counts[p.authorDepartment] = (counts[p.authorDepartment] || 0) + 1;
      if (p.targetDepartment !== 'Semua Departemen' && p.targetDepartment !== p.authorDepartment) {
        counts[p.targetDepartment] = (counts[p.targetDepartment] || 0) + 1;
      }
    });
    return counts;
  }, [posts]);

  // Filter & Sort Posts
  const displayedPosts = useMemo(() => {
    let list = [...posts];

    // 1. Filter by Department
    if (selectedDepartment !== 'Semua Departemen') {
      list = list.filter(
        (p) =>
          p.authorDepartment === selectedDepartment ||
          p.targetDepartment === selectedDepartment ||
          p.targetDepartment === 'Semua Departemen'
      );
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const titleMatch = p.title?.toLowerCase().includes(q);
        const contentMatch = p.content.toLowerCase().includes(q);
        const authorMatch = p.authorName.toLowerCase().includes(q) || p.authorUsername.toLowerCase().includes(q.replace(/^@/, ''));
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q.replace(/^#/, '')));
        const mentionMatch = p.mentions?.some((m) => m.toLowerCase().includes(q.replace(/^@/, '')));
        return titleMatch || contentMatch || authorMatch || tagMatch || mentionMatch;
      });
    }

    // 3. Sort Posts
    if (sortBy === 'recommendation') {
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0);
      });
    } else if (sortBy === 'latest') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'most-commented') {
      list.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }

    return list;
  }, [posts, selectedDepartment, searchQuery, sortBy]);

  // Calculate my posts count
  const myPostsCount = useMemo(() => {
    if (!currentUser) return 0;
    return posts.filter(
      (p) =>
        p.authorId === currentUser.id ||
        p.authorUsername.toLowerCase() === currentUser.username.toLowerCase()
    ).length;
  }, [posts, currentUser]);

  // Interactive Handlers
  const handleUpvote = async (postId: string) => {
    if (!currentUser) {
      requireAuth('memberikan Upvote (Follow Up)', () => {});
      return;
    }
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const upvotedBy = p.upvotedBy || [];
        const hasUpvoted = upvotedBy.includes(currentUser.id);
        const nextUpvotedBy = hasUpvoted
          ? upvotedBy.filter((id) => id !== currentUser.id)
          : [...upvotedBy, currentUser.id];
        return {
          ...p,
          upvotedBy: nextUpvotedBy,
          upvotesCount: nextUpvotedBy.length,
        };
      })
    );

    try {
      await FirestoreService.toggleUpvote(postId, currentUser.id);
    } catch (e) {
      console.warn('Sync upvote notice:', e);
    }
  };

  const handleAddComment = async (postId: string, comment: Comment) => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentComments = p.comments || [];
        return {
          ...p,
          comments: [...currentComments, comment],
          commentsCount: currentComments.length + 1,
        };
      })
    );

    try {
      await FirestoreService.addComment(postId, comment);
    } catch (e) {
      console.warn('Sync comment notice:', e);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  };

  const handleDeletePost = async (postId: string) => {
    // Optimistic UI update
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      await FirestoreService.deletePost(postId);
    } catch (e) {
      console.warn('Delete post notice:', e);
    }
  };

  const handleGoHome = () => {
    setSelectedDepartment('Semua Departemen');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagClick = (username: string) => {
    setSearchQuery(`@${username}`);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col font-sans text-[#050505]">
      {/* Facebook-Style Top Navigation */}
      <Navbar
        onGoHome={handleGoHome}
        onOpenCreatePost={() => requireAuth('membuat postingan baru', () => setIsCreatePostOpen(true))}
        onOpenChat={() => requireAuth('membuka chat internal', () => {
          setChatRecipientId(null);
          setIsChatOpen(true);
        })}
        onOpenProfile={() => requireAuth('melihat profil dan postingan Anda', () => setIsProfileOpen(true))}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isAtHome={selectedDepartment === 'Semua Departemen' && !searchQuery}
        myPostsCount={myPostsCount}
      />

      {/* Guest Notice Banner */}
      {!currentUser && (
        <div className="bg-white border-b border-[#dddfe2] py-2 px-4 sm:px-6 lg:px-8 text-xs shadow-2xs">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="w-2 h-2 rounded-full bg-[#1877F2] shrink-0" />
              <span className="text-zinc-600">
                <strong className="text-[#050505] font-semibold">Mode Penjelajah:</strong> Anda dapat bebas membaca seluruh beranda &amp; FYP. Masuk untuk memberikan Upvote (Follow Up), komentar, chat, atau posting.
              </span>
            </div>
            <button
              onClick={() => openAuthModal('Masuk untuk berinteraksi')}
              className="px-3 py-1 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold rounded-md text-xs transition-colors shrink-0 cursor-pointer"
            >
              Masuk / Daftar Akun
            </button>
          </div>
        </div>
      )}

      {/* Firebase Rules Notice Banner (if Firestore access is locked) */}
      {firestoreNotice && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 sm:px-6 lg:px-8 text-xs text-amber-900 shadow-2xs">
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1 sm:mt-0" />
              <span>
                <strong className="font-semibold">Sinkronisasi Cloud (eci-sys):</strong> {firestoreNotice}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md text-[11px] transition-colors cursor-pointer"
              >
                Cara Atur Rules Firebase
              </button>
              <button
                type="button"
                onClick={() => setFirestoreNotice(null)}
                className="p-1 hover:bg-amber-200/70 rounded text-amber-700 cursor-pointer"
                title="Tutup pemberitahuan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout (Full Width from Left to Right) */}
      <main className="w-full px-3 sm:px-5 lg:px-8 py-4 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
            <div className="sticky top-20">
              <WorkplaceSidebar
                selectedDepartment={selectedDepartment}
                onSelectDepartment={setSelectedDepartment}
                departmentCounts={departmentCounts}
                onOpenCreatePost={() => requireAuth('membuat postingan baru', () => setIsCreatePostOpen(true))}
                onOpenChat={() => requireAuth('membuka chat internal', () => {
                  setChatRecipientId(null);
                  setIsChatOpen(true);
                })}
                onOpenProfile={() => requireAuth('melihat profil dan postingan Anda', () => setIsProfileOpen(true))}
                myPostsCount={myPostsCount}
              />
            </div>
          </div>

          {/* Main Center Feed Column */}
          <div className="lg:col-span-9 xl:col-span-9 order-1 lg:order-2 space-y-3.5">
            {/* Facebook-style Quick Post Box */}
            <div className="bg-white rounded-xl border border-[#dddfe2] p-3.5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <img
                  src={
                    currentUser
                      ? currentUser.avatar
                      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border border-zinc-200 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    requireAuth('membuat postingan baru', () => setIsCreatePostOpen(true));
                  }}
                  className="flex-1 text-left px-4 py-2.5 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-zinc-500 rounded-full text-xs transition-colors cursor-pointer"
                >
                  {currentUser
                    ? `Apa yang ingin Anda bagikan ke departemen lain, ${currentUser.fullName.split(' ')[0]}?`
                    : 'Ingin posting untuk departemen lain? Masuk akun...'}
                </button>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#dddfe2] flex items-center justify-around gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    requireAuth('membuat postingan baru', () => setIsCreatePostOpen(true));
                  }}
                  className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-zinc-700 hover:bg-[#f0f2f5] font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#1877F2]" />
                  <span>Postingan Baru</span>
                </button>

                <div className="h-4 w-px bg-zinc-200" />

                <button
                  type="button"
                  onClick={() => {
                    requireAuth('mengunggah foto postingan', () => setIsCreatePostOpen(true));
                  }}
                  className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-zinc-700 hover:bg-[#f0f2f5] font-semibold transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>Foto / Gambar</span>
                </button>

                <div className="h-4 w-px bg-zinc-200" />

                <button
                  type="button"
                  onClick={() => {
                    requireAuth('membuat postingan baru', () => setIsCreatePostOpen(true));
                  }}
                  className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-zinc-700 hover:bg-[#f0f2f5] font-semibold transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-rose-500" />
                  <span>Action Link</span>
                </button>
              </div>
            </div>

            {/* Department Quick Filter */}
            <DepartmentFilter
              selectedDepartment={selectedDepartment}
              onSelectDepartment={setSelectedDepartment}
              departmentCounts={departmentCounts}
            />

            {/* Feed Sorting Controls */}
            <div className="bg-white rounded-xl border border-[#dddfe2] p-2 sm:p-2.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-zinc-600 w-full sm:w-auto">
                <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-zinc-400" />
                  Urutkan:
                </span>
                <div className="flex items-center gap-1 bg-[#f0f2f5] p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSortBy('recommendation')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      sortBy === 'recommendation'
                        ? 'bg-white text-[#1877F2] shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                    title="Algoritma Rekomendasi FYP (Upvote tertinggi)"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-[#1877F2]" />
                    <span>FYP (Upvote)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortBy('latest')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      sortBy === 'latest'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Terbaru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortBy('most-commented')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      sortBy === 'most-commented'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Diskusi</span>
                  </button>
                </div>
              </div>

              {/* Active Search Filter Chip */}
              {searchQuery && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-[#1877F2]">
                  <span>Pencarian: "{searchQuery}"</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 hover:bg-blue-100 rounded-full cursor-pointer"
                    title="Hapus filter pencarian"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Posts Feed Stream */}
            <div className="space-y-3.5">
              {displayedPosts.length > 0 ? (
                displayedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onUpvote={handleUpvote}
                    onAddComment={handleAddComment}
                    onTagClick={handleTagClick}
                    onDeletePost={handleDeletePost}
                    isMyPost={
                      currentUser
                        ? currentUser.id === post.authorId ||
                          currentUser.username.toLowerCase() === post.authorUsername.toLowerCase()
                        : false
                    }
                  />
                ))
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#dddfe2] p-10 text-center shadow-xs">
                  <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-[#1877F2] mb-3.5">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Feed Bersih & Siap Digunakan
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                    Semua data tiruan telah dibersihkan. Mulai bagikan pengumuman departemen, jadwal pengiriman ekspor, atau dokumentasi operasional pertama Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        openAuthModal('Masuk untuk membuat postingan pertama');
                      } else {
                        setIsCreatePostOpen(true);
                      }
                    }}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Postingan Pertama</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#dddfe2] p-10 text-center shadow-xs">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#f0f2f5] flex items-center justify-center text-zinc-400 mb-3">
                    <Filter className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800">
                    Tidak ada postingan yang sesuai
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? `Tidak ditemukan postingan dengan kata kunci "${searchQuery}".`
                      : `Belum ada postingan di departemen "${selectedDepartment}".`}
                  </p>
                  <button
                    type="button"
                    onClick={handleGoHome}
                    className="mt-4 px-4 py-2 bg-[#1877F2] text-white font-semibold text-xs rounded-lg hover:bg-[#166fe5] transition-colors cursor-pointer"
                  >
                    Kembali ke Beranda (FYP)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals and Drawers (No QuotaSaverDrawer) */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialRecipientId={chatRecipientId}
      />

      <MyProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        posts={posts}
        onUpvote={handleUpvote}
        onAddComment={handleAddComment}
        onDeletePost={handleDeletePost}
        onOpenCreatePost={() => {
          setIsProfileOpen(false);
          setIsCreatePostOpen(true);
        }}
        onTagClick={handleTagClick}
      />

      <AuthModal />

      {/* Firebase Rules Configuration Guide Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-lg w-full shadow-2xl border border-zinc-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">
                Panduan Pengaturan Rules Firebase (<span className="font-mono text-[#1877F2]">eci-sys</span>)
              </h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3 text-zinc-600 leading-relaxed">
              <p>
                Proyek Firebase Anda (<strong className="text-zinc-900">eci-sys</strong>) baru dibuat dan aturan Firestore-nya secara default mengunci akses baca/tulis (<code className="bg-zinc-100 px-1 py-0.5 rounded text-rose-600">allow read, write: if false;</code>).
              </p>
              
              <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                <div className="font-semibold text-zinc-800 mb-1">Langkah Mudah Mengaktifkan Cloud Sync:</div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-700">
                  <li>Buka <a href="https://console.firebase.google.com/project/eci-sys/firestore/rules" target="_blank" rel="noreferrer" className="text-[#1877F2] underline font-semibold">Firebase Console eci-sys Rules</a>.</li>
                  <li>Di menu kiri, klik <strong>Firestore Database</strong> &gt; tab <strong>Rules</strong>.</li>
                  <li>Ganti isinya dengan kode di bawah ini, lalu klik <strong>Publish</strong>.</li>
                </ol>
              </div>

              <div className="relative">
                <div className="text-[11px] font-semibold text-zinc-700 mb-1 flex items-center justify-between">
                  <span>Aturan Firestore:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const rules = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
                      navigator.clipboard.writeText(rules);
                      setRulesCopied(true);
                      setTimeout(() => setRulesCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] text-[#1877F2] hover:underline cursor-pointer font-medium"
                  >
                    {rulesCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{rulesCopied ? 'Tersalin!' : 'Salin Kode Rules'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-zinc-900 text-zinc-100 rounded-lg font-mono text-[11px] overflow-x-auto leading-normal">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                </pre>
              </div>

              <p className="text-[11px] text-zinc-500">
                *Sementara aturan belum diubah di Firebase Console, web app tetap beroperasi 100% normal dengan penyimpanan lokal browser Anda.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainWorkplaceFeed />
    </AuthProvider>
  );
}


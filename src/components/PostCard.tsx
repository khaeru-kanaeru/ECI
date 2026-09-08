import React, { useState, useEffect } from 'react';
import { Post, Comment, PostCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  MessageSquare,
  Share2,
  ExternalLink,
  Building2,
  Tag,
  Clock,
  Pin,
  CheckCircle2,
  Flame,
  Send,
  AtSign,
  ShieldCheck,
  Sparkles,
  X,
  ZoomIn,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';

interface PostCardProps {
  post: Post;
  onUpvote: (postId: string) => void;
  onAddComment: (postId: string, comment: Comment) => void;
  onTagClick?: (username: string) => void;
  onDeletePost?: (postId: string) => void;
  isMyPost?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onUpvote,
  onAddComment,
  onTagClick,
  onDeletePost,
  isMyPost,
}) => {
  const { currentUser, requireAuth, usersList } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const images: string[] =
    post.imageUrls && post.imageUrls.length > 0
      ? post.imageUrls
      : post.imageUrl
      ? [post.imageUrl]
      : [];

  const hasUpvoted = currentUser ? post.upvotedBy.includes(currentUser.id) : false;

  // Format relative time
  const formatTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m yang lalu`;
    if (diffHours < 24) return `${diffHours}j yang lalu`;
    if (diffDays < 30) return `${diffDays}h yang lalu`;
    return new Date(timestamp).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
  };

  const handleUpvoteClick = () => {
    requireAuth('memberikan Upvote (Follow Up)', () => {
      onUpvote(post.id);
    });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    requireAuth('menulis komentar', () => {
      if (!currentUser) return;

      // Extract mentions
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const foundMentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(commentText)) !== null) {
        foundMentions.push(match[1].toLowerCase());
      }

      const newComment: Comment = {
        id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        postId: post.id,
        authorId: currentUser.id,
        authorUsername: currentUser.username,
        authorName: currentUser.fullName,
        authorAvatar: currentUser.avatar,
        authorDepartment: currentUser.department,
        content: commentText.trim(),
        createdAt: Date.now(),
        mentions: foundMentions,
      };

      onAddComment(post.id, newComment);
      setCommentText('');
    });
  };

  // Robust share button with multi-fallback handling (Clipboard API + DOM fallback + Prompt)
  const handleShare = async () => {
    const postUrl = `${window.location.origin}${window.location.pathname}#${post.id}`;
    const shareData = {
      title: post.title || `Postingan oleh ${post.authorName}`,
      text: post.content.substring(0, 100),
      url: postUrl,
    };

    // Try Web Share API if supported
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        return;
      } catch {
        // Ignored, proceed to clipboard
      }
    }

    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(postUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      try {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = postUrl;
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.left = '-9999px';
        tempTextArea.style.top = '-9999px';
        document.body.appendChild(tempTextArea);
        tempTextArea.focus();
        tempTextArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(tempTextArea);
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      window.prompt('Salin tautan postingan ini:', postUrl);
      copied = true;
    }

    if (copied) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Keyboard navigation for image lightbox
  useEffect(() => {
    if (selectedImageIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImageIndex(null);
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
      }
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) =>
          prev !== null ? (prev - 1 + images.length) % images.length : null
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, images.length]);

  // Render caption with clickable `@username` tags
  const renderCaptionWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.substring(1);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onTagClick?.(username)}
            className="inline-flex items-center px-1.5 py-0.2 mx-0.5 text-xs font-medium text-blue-600 bg-blue-50/70 hover:bg-blue-100 rounded border border-blue-200/50 transition-colors cursor-pointer"
            title={`Lihat postingan @${username}`}
          >
            <span>{part}</span>
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Category Badge Render Helper
  const renderCategoryBadge = (cat: PostCategory | string) => {
    if (cat === 'Top Urgent') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0 shadow-2xs animate-pulse">
          <Flame className="w-3 h-3 text-rose-600 fill-rose-600" />
          Top Urgent
        </span>
      );
    }
    if (cat === 'Urgent') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Urgent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1877F2] border border-blue-200 shrink-0">
        <Info className="w-3 h-3 text-[#1877F2]" />
        Regular / Info
      </span>
    );
  };

  return (
    <article className="bg-white rounded-xl border border-[#dddfe2] shadow-xs overflow-hidden transition-all">
      {/* Top Banner for Pinned or High Recommendation Score (No mentions of cache/hemat) */}
      {(post.isPinned || post.recommendationScore >= 80) && (
        <div className="bg-blue-50/60 px-4 py-1.5 border-b border-blue-100/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {post.isPinned ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-900">
                <Pin className="w-3.5 h-3.5 text-[#1877F2]" /> Disematkan oleh Perusahaan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-900">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Rekomendasi FYP (Skor: {post.recommendationScore})
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#1877F2] font-medium">
            Departemen {post.authorDepartment}
          </span>
        </div>
      )}

      {/* Post Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-full object-cover border border-zinc-200"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-[#050505]">
                  {post.authorName}
                </span>
                <span className="text-xs text-[#1877F2] font-mono">
                  @{post.authorUsername}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[#1877F2]">
                  <Building2 className="w-3 h-3" />
                  {post.authorDepartment}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5 flex-wrap">
                <span>{post.authorRole}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  {formatTime(post.createdAt)}
                </span>
                <span>•</span>
                <span className="text-zinc-600">
                  Target: <strong className="font-medium text-zinc-800">{post.targetDepartment}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {renderCategoryBadge(post.category)}

            {(isMyPost || (currentUser && (currentUser.id === post.authorId || currentUser.username === post.authorUsername))) && onDeletePost && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Hapus postingan "${post.title || post.content.slice(0, 30)}..."?`)) {
                    onDeletePost(post.id);
                  }
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Hapus postingan Anda"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Post Title */}
        {post.title && (
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 mt-3 leading-snug tracking-tight">
            {post.title}
          </h3>
        )}

        {/* Post Caption / Content with Tag Mentions */}
        <div className="mt-2 text-xs sm:text-sm text-zinc-800 leading-relaxed break-words whitespace-pre-line">
          {renderCaptionWithMentions(post.content)}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium text-[#1877F2] bg-blue-50/80 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Uploaded Post Photos Gallery (Single or Multi-Photo Grid) */}
        {images.length > 0 && (
          <div className="mt-3 relative">
            {/* Multiple Photos indicator badge */}
            {images.length > 1 && (
              <div className="absolute top-2 right-2 z-10 bg-black/65 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs pointer-events-none">
                <span>{images.length} Foto</span>
              </div>
            )}

            {/* Case 1: Single Image */}
            {images.length === 1 && (
              <div
                onClick={() => setSelectedImageIndex(0)}
                className="relative rounded-2xl overflow-hidden border border-[#dddfe2] bg-zinc-900 group cursor-pointer"
              >
                <img
                  src={images[0]}
                  alt={post.title || 'Foto postingan'}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[480px] object-cover hover:scale-[1.01] transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute bottom-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5 transition-colors opacity-90 group-hover:opacity-100">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Perbesar</span>
                </div>
              </div>
            )}

            {/* Case 2: Exactly 2 Images */}
            {images.length === 2 && (
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-[#dddfe2]">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className="relative bg-zinc-900 h-64 sm:h-72 group cursor-pointer overflow-hidden"
                  >
                    <img
                      src={imgUrl}
                      alt={`Foto ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Case 3: Exactly 3 Images */}
            {images.length === 3 && (
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden border border-[#dddfe2] h-64 sm:h-80">
                <div
                  onClick={() => setSelectedImageIndex(0)}
                  className="col-span-2 relative bg-zinc-900 group cursor-pointer overflow-hidden"
                >
                  <img
                    src={images[0]}
                    alt="Foto 1"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="col-span-1 grid grid-rows-2 gap-1.5">
                  {images.slice(1, 3).map((imgUrl, idx) => (
                    <div
                      key={idx + 1}
                      onClick={() => setSelectedImageIndex(idx + 1)}
                      className="relative bg-zinc-900 group cursor-pointer overflow-hidden"
                    >
                      <img
                        src={imgUrl}
                        alt={`Foto ${idx + 2}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case 4: 4 or More Images */}
            {images.length >= 4 && (
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-[#dddfe2]">
                {images.slice(0, 4).map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className="relative bg-zinc-900 h-44 sm:h-52 group cursor-pointer overflow-hidden"
                  >
                    <img
                      src={imgUrl}
                      alt={`Foto ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* If more than 4, put dark overlay on the 4th item */}
                    {idx === 3 && images.length > 4 ? (
                      <div className="absolute inset-0 bg-black/60 hover:bg-black/70 transition-colors flex flex-col items-center justify-center text-white">
                        <span className="text-xl sm:text-2xl font-bold">
                          +{images.length - 3}
                        </span>
                        <span className="text-xs font-medium">Foto Lainnya</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Link Details Card (if configured) */}
        {post.actionButton && (
          <div className="mt-3 p-2.5 rounded-xl border border-rose-100 bg-rose-50/40 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 text-xs">
              <span className="font-semibold text-rose-900 block truncate">
                Tautan Aksi: {post.actionButton.label}
              </span>
              <span className="text-rose-600/80 text-[11px] font-mono truncate block">
                {post.actionButton.url}
              </span>
            </div>
            <a
              href={post.actionButton.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-colors shrink-0"
              title="Buka tautan di tab baru"
            >
              <span>Buka</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Upvote & Recommendation Stats Bar */}
      <div className="px-4 sm:px-5 py-2 bg-[#f0f2f5]/60 border-t border-b border-[#dddfe2]/60 flex items-center justify-between text-xs text-zinc-600">
        <div className="flex items-center gap-2">
          <span className="font-medium text-emerald-700 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            {post.upvotesCount} Upvote (Follow Up)
          </span>
          <span>•</span>
          <span className="text-[#1877F2] font-medium">
            {post.commentsCount} Komentar
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 font-medium">
          Skor FYP: <strong className="text-zinc-800">{post.recommendationScore}</strong>
        </div>
      </div>

      {/* 4 CIRCLE BUTTONS (Tinder-Inspired Action Dock) */}
      <div className="px-4 py-3 bg-white flex items-center justify-around gap-2">
        {/* BUTTON 1: UPVOTE (FOLLOW UP) - EMERALD GREEN */}
        <div className="flex flex-col items-center gap-1 text-center">
          <button
            type="button"
            onClick={handleUpvoteClick}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-150 transform active:scale-90 cursor-pointer ${
              hasUpvoted
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 ring-3 ring-emerald-300 ring-offset-1'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-xs hover:shadow-md hover:shadow-emerald-100'
            }`}
            title="Upvote (Follow Up): Semakin banyak upvote, semakin direkomendasikan di beranda/FYP"
          >
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </button>
          <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
            Upvote ({post.upvotesCount})
          </span>
        </div>

        {/* BUTTON 2: KOMEN - FACEBOOK / SKY BLUE */}
        <div className="flex flex-col items-center gap-1 text-center">
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-150 transform active:scale-90 cursor-pointer ${
              showComments
                ? 'bg-[#1877F2] text-white shadow-md shadow-blue-200 ring-3 ring-blue-300 ring-offset-1'
                : 'bg-blue-50 text-[#1877F2] border border-blue-200 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] shadow-xs hover:shadow-md hover:shadow-blue-100'
            }`}
            title="Lihat / Tulis Komentar"
          >
            <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          </button>
          <span className="text-[11px] font-semibold text-[#1877F2] whitespace-nowrap">
            Komen ({post.commentsCount})
          </span>
        </div>

        {/* BUTTON 3: SHARE - GOLD / AMBER */}
        <div className="flex flex-col items-center gap-1 text-center">
          <button
            type="button"
            onClick={handleShare}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-150 transform active:scale-90 cursor-pointer ${
              copiedLink
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200 ring-3 ring-amber-300 ring-offset-1'
                : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500 shadow-xs hover:shadow-md hover:shadow-amber-100'
            }`}
            title="Salin tautan postingan untuk dibagikan"
          >
            <Share2 className="w-5 h-5 stroke-[2.2]" />
          </button>
          <span className="text-[11px] font-semibold text-amber-700 whitespace-nowrap">
            {copiedLink ? 'Tersalin!' : 'Share'}
          </span>
        </div>

        {/* BUTTON 4: ACTION BUTTON - ROSE / CORAL */}
        <div className="flex flex-col items-center gap-1 text-center">
          <button
            type="button"
            onClick={() => {
              const url = post.actionButton?.url || window.location.href;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 shadow-xs hover:shadow-md hover:shadow-rose-100 transition-all duration-150 transform active:scale-90 cursor-pointer"
            title={
              post.actionButton
                ? `Buka: ${post.actionButton.label} (${post.actionButton.url})`
                : 'Buka tautan aksi di tab baru'
            }
          >
            <ExternalLink className="w-5 h-5 stroke-[2.2]" />
          </button>
          <span className="text-[11px] font-semibold text-rose-600 whitespace-nowrap max-w-[80px] truncate" title={post.actionButton?.label || 'Action Link'}>
            {post.actionButton?.label || 'Action Link'}
          </span>
        </div>
      </div>

      {/* EXPANDABLE COMMENTS SECTION */}
      {showComments && (
        <div className="px-4 sm:px-5 py-3 bg-zinc-50/60 border-t border-zinc-100 space-y-2.5">
          {/* New Comment Input */}
          <form onSubmit={handleCommentSubmit} className="flex items-start gap-2">
            <img
              src={
                currentUser
                  ? currentUser.avatar
                  : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              }
              alt="Avatar"
              className="w-7 h-7 rounded-full object-cover border border-zinc-200 mt-1"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  currentUser
                    ? 'Tulis komentar... Gunakan @username untuk tag'
                    : 'Masuk terlebih dahulu untuk berkomentar...'
                }
                className="w-full pl-3 pr-9 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer"
                title="Kirim Komentar"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Existing Comments List */}
          {post.comments && post.comments.length > 0 ? (
            <div className="space-y-2 pt-1">
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2 group">
                  <img
                    src={comment.authorAvatar}
                    alt={comment.authorName}
                    className="w-6 h-6 rounded-full object-cover border border-zinc-200 mt-0.5"
                  />
                  <div className="flex-1 bg-white p-2.5 rounded-lg border border-zinc-200/70 text-xs shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-zinc-900">{comment.authorName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">@{comment.authorUsername}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500">
                          {comment.authorDepartment}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                    <div className="text-zinc-700 leading-relaxed">
                      {renderCaptionWithMentions(comment.content)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-zinc-400">
              Belum ada komentar. Jadilah yang pertama memberikan tanggapan!
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for Photo Gallery */}
      {selectedImageIndex !== null && images[selectedImageIndex] && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-sm"
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* Top Bar: Counter & Close */}
          <div
            className="w-full max-w-5xl flex items-center justify-between py-2 px-1 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
                Foto {selectedImageIndex + 1} dari {images.length}
              </span>
              {images.length > 1 && (
                <span className="text-[11px] text-zinc-400 hidden sm:inline">
                  Gunakan tombol panah ⬅ ➡ keyboard untuk navigasi
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedImageIndex(null)}
              className="text-white hover:text-zinc-300 p-2 rounded-full cursor-pointer bg-white/10 hover:bg-white/20 transition-colors"
              title="Tutup Pratinjau Foto (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Photo View Area with Prev & Next buttons */}
          <div
            className="relative max-w-5xl max-h-[75vh] sm:max-h-[80vh] w-full flex items-center justify-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev !== null ? (prev - 1 + images.length) % images.length : 0
                  );
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer border border-white/20"
                title="Foto Sebelumnya (Panah Kiri)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={images[selectedImageIndex]}
              alt={`Foto ${selectedImageIndex + 1}`}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] sm:max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl transition-all"
            />

            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev !== null ? (prev + 1) % images.length : 0
                  );
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer border border-white/20"
                title="Foto Selanjutnya (Panah Kanan)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Thumbnail Strip at Bottom if multiple photos */}
          {images.length > 1 && (
            <div
              className="w-full max-w-2xl flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    idx === selectedImageIndex
                      ? 'border-white scale-105 shadow-md'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={thumb}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

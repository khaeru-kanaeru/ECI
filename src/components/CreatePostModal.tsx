import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Department, PostCategory, Post } from '../types';
import { StorageService } from '../services/storageService';
import { FirestoreService } from '../services/firestoreService';
import {
  X,
  Send,
  Link as LinkIcon,
  Tag,
  Building2,
  ExternalLink,
  AtSign,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Sparkles,
  Plus,
  Flame,
  Info,
} from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (newPost: Post) => void;
}

const DEPARTMENTS: Department[] = [
  'Semua Departemen',
  'Produksi Export',
  'HA Export',
  'VCFP Export',
  'QAM',
  'Engineering',
  'Staff',
  'Administration',
  'Human Resource',
];

const CATEGORIES: PostCategory[] = [
  'Regular/Information Only',
  'Urgent',
  'Top Urgent',
];

// Sample workplace presets for convenience
const PRESET_PHOTOS = [
  {
    label: 'Pabrik & Manufaktur',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Kontainer & Ekspor',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Inspeksi Mutu QAM',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
  },
  {
    label: 'Safety K3 & Tim',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&auto=format&fit=crop&q=80',
  },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onPostCreated }) => {
  const { currentUser, usersList } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetDepartment, setTargetDepartment] = useState<Department>('Semua Departemen');
  const [category, setCategory] = useState<PostCategory>('Regular/Information Only');
  
  // Multi-Photo Upload state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action Button config
  const [hasActionButton, setHasActionButton] = useState(false);
  const [actionButtonLabel, setActionButtonLabel] = useState('');
  const [actionButtonUrl, setActionButtonUrl] = useState('');
  const [actionButtonType, setActionButtonType] = useState<'primary' | 'secondary' | 'accent'>('primary');

  // Mention Suggestion state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !currentUser) return null;

  // Handle caption typing and detect `@` for auto-suggest
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    setContent(text);
    setCursorPosition(pos);

    // Look back from current cursor to find '@'
    const lastAtPos = text.lastIndexOf('@', pos - 1);
    if (lastAtPos !== -1) {
      const textAfterAt = text.substring(lastAtPos + 1, pos);
      // Only show suggestions if no space after '@'
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setMentionQuery(textAfterAt.toLowerCase());
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const insertMention = (username: string) => {
    if (!textareaRef.current) return;
    const text = content;
    const lastAtPos = text.lastIndexOf('@', cursorPosition - 1);
    if (lastAtPos !== -1) {
      const before = text.substring(0, lastAtPos);
      const after = text.substring(cursorPosition);
      const newText = `${before}@${username} ${after}`;
      setContent(newText);
      setShowMentionDropdown(false);

      // Re-focus textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = lastAtPos + username.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }
  };

  const filteredColleagues = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(mentionQuery) ||
      u.fullName.toLowerCase().includes(mentionQuery)
  );

  // Multi-File Upload Handlers (Drag & Drop + Click File Picker)
  const processFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    let hasInvalid = false;
    let hasOversized = false;

    fileList.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        hasInvalid = true;
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        hasOversized = true;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const res = event.target.result;
          setImageUrls((prev) => [...prev, res]);
          setErrorMessage('');
        }
      };
      reader.readAsDataURL(file);
    });

    if (hasInvalid) setErrorMessage('Beberapa file dilewati karena bukan file gambar valid.');
    if (hasOversized) setErrorMessage('Beberapa foto dilewati karena melebihi 8MB.');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!content.trim()) {
      setErrorMessage('Isi konten postingan tidak boleh kosong.');
      return;
    }

    // Validate Action Button if enabled
    if (hasActionButton) {
      if (!actionButtonLabel.trim()) {
        setErrorMessage('Teks label Action Button wajib diisi.');
        return;
      }
      if (!actionButtonUrl.trim()) {
        setErrorMessage('URL tujuan Action Button wajib diisi.');
        return;
      }
      if (!/^https?:\/\//i.test(actionButtonUrl.trim())) {
        setErrorMessage('URL Action Button harus diawali dengan http:// atau https://');
        return;
      }
    }

    // Extract all mentions
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const foundMentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      foundMentions.push(match[1].toLowerCase());
    }

    // Build the new post
    const initialScore = category === 'Top Urgent' ? 120 : category === 'Urgent' ? 60 : 15;
    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorId: currentUser.id,
      authorUsername: currentUser.username,
      authorName: currentUser.fullName,
      authorAvatar: currentUser.avatar,
      authorDepartment: currentUser.department,
      authorRole: currentUser.role,
      targetDepartment,
      category,
      title: title.trim() || undefined,
      content: content.trim(),
      imageUrl: imageUrls[0] || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      actionButton: hasActionButton
        ? {
            label: actionButtonLabel.trim(),
            url: actionButtonUrl.trim(),
            type: actionButtonType,
          }
        : undefined,
      tags: [category.replace(/[^a-zA-Z0-9]/g, ''), targetDepartment.replace(/[^a-zA-Z0-9]/g, '')],
      mentions: Array.from(new Set(foundMentions)),
      upvotesCount: 0,
      upvotedBy: [],
      commentsCount: 0,
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      recommendationScore: initialScore,
    };

    setIsSubmitting(true);
    try {
      // 1. Write to Firestore
      await FirestoreService.createPost(newPost);
      // 2. Also keep in StorageService as fallback
      StorageService.savePost(newPost);
      onPostCreated(newPost);
      onClose();
      // Reset form
      setTitle('');
      setContent('');
      setImageUrls([]);
      setHasActionButton(false);
      setActionButtonLabel('');
      setActionButtonUrl('');
    } catch (err: any) {
      console.error('Error creating post in Firestore:', err);
      // Fallback
      StorageService.savePost(newPost);
      onPostCreated(newPost);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#dddfe2] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header (Facebook-style) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dddfe2] bg-white">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.fullName}
              className="w-10 h-10 rounded-full object-cover border border-[#dddfe2]"
            />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Buat Postingan Baru
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {currentUser.fullName} (@{currentUser.username}) • <span className="text-[#1877F2] font-semibold">{currentUser.department}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Department and Category Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                Target Departemen
              </label>
              <select
                value={targetDepartment}
                onChange={(e) => setTargetDepartment(e.target.value as Department)}
                className="w-full px-3 py-2 bg-[#f0f2f5] hover:bg-[#e4e6eb] focus:bg-white border border-[#dddfe2] focus:border-[#1877F2] rounded-xl text-xs font-medium text-zinc-800 focus:outline-hidden transition-all"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === 'Semua Departemen' ? 'Semua Departemen (Publik)' : dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PostCategory)}
                className="w-full px-3 py-2 bg-[#f0f2f5] hover:bg-[#e4e6eb] focus:bg-white border border-[#dddfe2] focus:border-[#1877F2] rounded-xl text-xs font-medium text-zinc-800 focus:outline-hidden transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Judul Postingan (Opsional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Jadwal Stuffing Kontainer Export atau Audit QAM..."
              className="w-full px-3.5 py-2.5 bg-[#f0f2f5] hover:bg-[#e4e6eb] focus:bg-white border border-[#dddfe2] focus:border-[#1877F2] rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-hidden transition-all"
            />
          </div>

          {/* Caption / Content with Tag Mention */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700">
                Isi Caption / Informasi
              </label>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <AtSign className="w-3 h-3 text-[#1877F2]" />
                Ketik <strong>@</strong> untuk tag rekan kerja
              </span>
            </div>
            <textarea
              ref={textareaRef}
              rows={4}
              value={content}
              onChange={handleContentChange}
              placeholder={`Apa yang ingin Anda bagikan kepada departemen lain? Tag rekan kerja dengan @username...`}
              className="w-full px-3.5 py-2.5 bg-[#f0f2f5] hover:bg-[#e4e6eb] focus:bg-white border border-[#dddfe2] focus:border-[#1877F2] rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden resize-none leading-relaxed transition-all"
              required
            />

            {/* Mention Dropdown Suggestions */}
            {showMentionDropdown && filteredColleagues.length > 0 && (
              <div className="absolute z-20 left-3 top-24 w-64 bg-white rounded-xl shadow-xl border border-[#dddfe2] max-h-48 overflow-y-auto p-1.5">
                <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Saran Tag Karyawan
                </div>
                {filteredColleagues.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => insertMention(user.username)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 hover:bg-[#f0f2f5] rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="w-6 h-6 rounded-full object-cover border border-[#dddfe2]"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-800 truncate">
                        {user.fullName}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        @{user.username} • {user.department}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PHOTO UPLOAD FEATURE (MULTI-PHOTO) */}
          <div className="pt-2 border-t border-[#dddfe2]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#1877F2]" />
                Foto / Gambar Postingan
                {imageUrls.length > 0 && (
                  <span className="text-[11px] font-bold text-[#1877F2] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {imageUrls.length} Foto Dipilih
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] font-medium text-[#1877F2] hover:underline cursor-pointer"
                >
                  {showUrlInput ? 'Sembunyikan URL' : '+ Tautan URL Foto'}
                </button>
              </div>
            </div>

            {/* Hidden native file input with multiple allowed */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              multiple
              className="hidden"
            />

            {/* Multi-photo thumbnails preview */}
            {imageUrls.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-[#f0f2f5] rounded-xl border border-[#dddfe2] max-h-64 overflow-y-auto">
                  {imageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-lg overflow-hidden border border-zinc-300 bg-zinc-900 group aspect-4/3"
                    >
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {/* Photo Index Badge */}
                      <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                        #{idx + 1}
                      </span>
                      {/* Delete individual photo */}
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                        title="Hapus foto ini"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add more photo card button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#1877F2]/50 hover:border-[#1877F2] bg-blue-50/40 hover:bg-blue-50 text-[#1877F2] transition-colors p-3 aspect-4/3 cursor-pointer"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-[11px] font-bold">+ Tambah Foto</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 text-zinc-500">
                  <span>Anda dapat menambahkan lebih banyak foto (maks. 8MB/foto).</span>
                  <button
                    type="button"
                    onClick={() => setImageUrls([])}
                    className="text-rose-600 hover:underline font-medium cursor-pointer"
                  >
                    Hapus Semua Foto
                  </button>
                </div>
              </div>
            ) : (
              /* Upload Drop Zone (Drag & Drop + Click File Picker) */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#1877F2] bg-blue-50/50 scale-[0.99]'
                    : 'border-[#dddfe2] hover:border-[#1877F2] hover:bg-[#f0f2f5]/60 bg-white'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1877F2] flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">
                      Tarik & jatuhkan beberapa foto ke sini, atau <span className="text-[#1877F2] underline">pilih dari perangkat</span>
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Mendukung unggah <strong>lebih dari 1 foto</strong> sekaligus (JPG, PNG, WebP)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual URL input or quick presets */}
            {showUrlInput && (
              <div className="mt-2 p-3 bg-[#f0f2f5] rounded-xl border border-[#dddfe2] space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="Masukkan URL gambar: https://..."
                    className="flex-1 px-3 py-1.5 bg-white border border-[#dddfe2] rounded-lg text-xs text-zinc-800 focus:outline-hidden focus:border-[#1877F2]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualUrl.trim()) {
                        setImageUrls((prev) => [...prev, manualUrl.trim()]);
                        setManualUrl('');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    + Tambahkan
                  </button>
                </div>

                {/* Presets */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Atau Pilih Foto Sampel Cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_PHOTOS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setImageUrls((prev) => [...prev, preset.url])}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-[#1877F2] border border-[#dddfe2] rounded-lg text-[11px] font-medium text-zinc-700 transition-colors cursor-pointer"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTON CONFIGURATION (FEATURE HIGHLIGHT) */}
          <div className="pt-2 border-t border-[#dddfe2]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableActionButton"
                  checked={hasActionButton}
                  onChange={(e) => setHasActionButton(e.target.checked)}
                  className="w-4 h-4 text-[#1877F2] rounded-md border-zinc-300 focus:ring-[#1877F2] cursor-pointer"
                />
                <label
                  htmlFor="enableActionButton"
                  className="text-xs font-semibold text-zinc-800 cursor-pointer flex items-center gap-1.5"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-zinc-500" />
                  Tambahkan Action Button (Tautan Eksternal)
                </label>
              </div>
              <span className="text-[11px] text-zinc-400">
                Dibuka di tab baru
              </span>
            </div>

            {hasActionButton && (
              <div className="mt-2.5 p-3.5 bg-[#f0f2f5] rounded-xl border border-[#dddfe2] space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                      Label Tombol
                    </label>
                    <input
                      type="text"
                      value={actionButtonLabel}
                      onChange={(e) => setActionButtonLabel(e.target.value)}
                      placeholder="Contoh: Buka Dokumen, Isi Survei, dll."
                      className="w-full px-3 py-1.5 bg-white border border-[#dddfe2] rounded-lg text-xs text-zinc-800 focus:outline-hidden focus:border-[#1877F2]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                      Warna Tombol
                    </label>
                    <select
                      value={actionButtonType}
                      onChange={(e) => setActionButtonType(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-[#dddfe2] rounded-lg text-xs text-zinc-800 focus:outline-hidden focus:border-[#1877F2]"
                    >
                      <option value="primary">Hitam Standar (Elegan)</option>
                      <option value="accent">Biru Sorotan (Penting)</option>
                      <option value="secondary">Abu-abu Lembut (Netral)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    URL Tautan Tujuan
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="url"
                      value={actionButtonUrl}
                      onChange={(e) => setActionButtonUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#dddfe2] rounded-lg text-xs text-zinc-800 font-mono text-[11px] focus:outline-hidden focus:border-[#1877F2]"
                    />
                  </div>
                </div>

                {/* Live Preview of the Action Button */}
                {actionButtonLabel && (
                  <div className="pt-2 border-t border-[#dddfe2] flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Pratinjau:
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#1877F2] text-white">
                      <span>{actionButtonLabel}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recommendation Info Banner */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-zinc-700 flex items-start gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-[#1877F2] shrink-0 mt-0.5" />
            <div>
              <strong>Algoritma FYP:</strong> Postingan akan diprioritaskan di beranda lintas departemen jika menerima banyak <strong>Upvote (Follow Up)</strong> dari rekan kerja.
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-2.5 border-t border-[#dddfe2] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-[#f0f2f5] rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Publikasikan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

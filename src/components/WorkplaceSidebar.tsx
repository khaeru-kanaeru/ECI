import React from 'react';
import { Department } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Factory,
  Boxes,
  Truck,
  ShieldCheck,
  Wrench,
  Users,
  FileText,
  Users2,
  Plus,
  MessageSquare,
  Sparkles,
  ExternalLink,
  TrendingUp
} from 'lucide-react';

interface DeptItem {
  name: Department;
  icon: React.ComponentType<{ className?: string }>;
}

const DEPARTMENTS: DeptItem[] = [
  { name: 'Semua Departemen', icon: Layers },
  { name: 'Produksi Export', icon: Factory },
  { name: 'HA Export', icon: Truck },
  { name: 'VCFP Export', icon: Boxes },
  { name: 'QAM', icon: ShieldCheck },
  { name: 'Engineering', icon: Wrench },
  { name: 'Staff', icon: Users },
  { name: 'Administration', icon: FileText },
  { name: 'Human Resource', icon: Users2 },
];

interface WorkplaceSidebarProps {
  selectedDepartment: Department;
  onSelectDepartment: (dept: Department) => void;
  departmentCounts: Record<string, number>;
  onOpenCreatePost: () => void;
  onOpenChat: () => void;
  onOpenProfile?: () => void;
  myPostsCount?: number;
}

export const WorkplaceSidebar: React.FC<WorkplaceSidebarProps> = ({
  selectedDepartment,
  onSelectDepartment,
  departmentCounts,
  onOpenCreatePost,
  onOpenChat,
  onOpenProfile,
  myPostsCount = 0,
}) => {
  const { currentUser, openAuthModal, requireAuth } = useAuth();

  return (
    <aside className="space-y-3">
      {/* Current User Card (Facebook Style) */}
      <div className="bg-white rounded-xl border border-[#dddfe2] p-3.5 shadow-xs">
        {currentUser ? (
          <div>
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="w-10 h-10 rounded-full object-cover border border-zinc-200"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#050505] truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-[11px] font-mono text-[#1877F2]">
                  @{currentUser.username}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {currentUser.role} • {currentUser.department}
                </div>
              </div>
            </div>

            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="mt-3 w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-[#1877F2] font-semibold text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer border border-blue-100"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Lihat Profil &amp; Postingan Saya</span>
                </div>
                <span className="px-1.5 py-0.2 bg-[#1877F2] text-white text-[10px] font-bold rounded-full">
                  {myPostsCount}
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="text-xs font-semibold text-zinc-800">
              Mode Tamu
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 mb-2.5">
              Anda dapat membaca seluruh feed beranda. Masuk untuk berinteraksi.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal('Masuk untuk berinteraksi')}
              className="w-full py-1.5 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Masuk Akun
            </button>
          </div>
        )}
      </div>

      {/* Clean Department Shortcuts List */}
      <div className="bg-white rounded-xl border border-[#dddfe2] p-2 shadow-xs">
        <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          Kategori Departemen
        </div>
        <div className="space-y-0.5">
          {DEPARTMENTS.map(({ name, icon: Icon }) => {
            const isSelected = selectedDepartment === name;
            const count = departmentCounts[name] || 0;

            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelectDepartment(name)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-blue-50 text-[#1877F2] font-semibold'
                    : 'text-zinc-700 hover:bg-[#f0f2f5] hover:text-[#050505] font-normal'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#1877F2] text-white' : 'bg-[#f0f2f5] text-zinc-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{name}</span>
                </div>

                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ml-1 ${
                      isSelected ? 'bg-[#1877F2] text-white' : 'bg-[#f0f2f5] text-zinc-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Info / Fitur Utama Workplace */}
      <div className="bg-white rounded-xl border border-[#dddfe2] p-3.5 shadow-xs text-xs space-y-2">
        <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#1877F2]" />
          <span>Fitur Utama Feed</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-zinc-600 leading-relaxed">
          <div className="flex items-start gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Upvote (Follow Up):</strong> Semakin banyak upvote, semakin direkomendasikan di FYP beranda.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span><strong>Action Button:</strong> Klik tombol aksi pada postingan untuk langsung membuka tautan tujuan di tab baru.</span>
          </div>
        </div>
      </div>
    </aside>
  );
};


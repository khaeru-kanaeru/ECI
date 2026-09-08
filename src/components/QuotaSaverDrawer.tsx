import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { QuotaStats } from '../types';
import {
  X,
  Database,
  Cpu,
  RefreshCw,
  Archive,
  CheckCircle2,
  TrendingDown,
  ShieldAlert,
  ArrowDownCircle,
  Clock,
  HardDrive,
  Info,
  Server
} from 'lucide-react';

interface QuotaSaverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPostsUpdated: () => void;
}

export const QuotaSaverDrawer: React.FC<QuotaSaverDrawerProps> = ({
  isOpen,
  onClose,
  onPostsUpdated,
}) => {
  const [stats, setStats] = useState<QuotaStats>(StorageService.getQuotaStats());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const refreshStats = () => {
    setStats(StorageService.getQuotaStats());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunDeltaSync = () => {
    setIsSyncing(true);
    setSyncResult(null);
    setTimeout(() => {
      const res = StorageService.performDeltaSync();
      setIsSyncing(false);
      setSyncResult(
        `Delta Sync Berhasil! Mengambil ${res.newOrUpdatedCount} dokumen baru/berubah. ${res.oldPostsPreserved} postingan lama tetap terbaca dari cache lokal tanpa biaya read Firebase.`
      );
      refreshStats();
      onPostsUpdated();
    }, 600);
  };

  const handleClearLocalCache = () => {
    StorageService.clearAllPosts();
    refreshStats();
    onPostsUpdated();
    setSyncResult('Cache lokal telah dibersihkan.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200/80 bg-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span>Arsitektur Penghemat Kuota Firebase</span>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
            Mekanisme Hemat Kuota &amp; Arsip Historis
          </h2>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Arsitektur Delta Sync &amp; Local Persistence agar postingan bertahun-tahun lalu tetap bisa dibaca tanpa membebani limit read Firebase.
          </p>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Real-time Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-zinc-50/80 rounded-lg border border-zinc-200/70">
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Efisiensi Kuota
              </div>
              <div className="text-xl font-semibold text-zinc-900 mt-1">
                {stats.estimatedCostReductionPct}%
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Rasio Cache-Hit
              </div>
            </div>

            <div className="p-3 bg-zinc-50/80 rounded-lg border border-zinc-200/70">
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Cloud Reads Hemat
              </div>
              <div className="text-xl font-semibold text-zinc-900 mt-1">
                {stats.cloudReadsSaved.toLocaleString()}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Dokumen Terselamatkan
              </div>
            </div>

            <div className="p-3 bg-zinc-50/80 rounded-lg border border-zinc-200/70">
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Postingan Tersimpan
              </div>
              <div className="text-xl font-semibold text-zinc-900 mt-1">
                {stats.totalCachedLocally}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Di Database Lokal
              </div>
            </div>

            <div className="p-3 bg-zinc-50/80 rounded-lg border border-zinc-200/70">
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Bandwidth Hemat
              </div>
              <div className="text-xl font-semibold text-zinc-900 mt-1">
                {(stats.bandwidthSavedKB / 1024).toFixed(1)} MB
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Efisiensi Jaringan
              </div>
            </div>
          </div>

          {/* Sync status message if triggered */}
          {syncResult && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{syncResult}</span>
            </div>
          )}

          {/* Core Technical Pillars Breakdown */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-zinc-400" />
              Bagaimana Cara Kerjanya?
            </h4>

            <div className="space-y-2">
              {/* Pillar 1 */}
              <div className="p-3 rounded-lg border border-zinc-200/70 bg-zinc-50/50">
                <div className="flex items-center gap-2 font-medium text-xs text-zinc-900 mb-1">
                  <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-semibold">1</span>
                  Tingkat Penyimpanan Lokal (IndexedDB / Local Cache Tier)
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed ml-6">
                  Saat karyawan membuka beranda, aplikasi langsung menampilkan seluruh postingan dari penyimpanan lokal secara instan (0 milidetik). Tidak ada query read ke Firebase untuk postingan yang sudah pernah dimuat.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-3 rounded-lg border border-zinc-200/70 bg-zinc-50/50">
                <div className="flex items-center gap-2 font-medium text-xs text-zinc-900 mb-1">
                  <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-semibold">2</span>
                  Sinkronisasi Delta Berbasis Timestamp (<code className="text-zinc-800 bg-zinc-200/60 px-1 py-0.2 rounded text-[10px]">where('updatedAt', '&gt;', lastSync)</code>)
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed ml-6">
                  Saat memeriksa pembaruan, sistem tidak mendownload ulang ribuan postingan lama. Sistem hanya meminta dokumen yang dibuat atau di-upvote setelah waktu sinkronisasi terakhir.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-3 rounded-lg border border-zinc-200/70 bg-zinc-50/50">
                <div className="flex items-center gap-2 font-medium text-xs text-zinc-900 mb-1">
                  <span className="w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-semibold">3</span>
                  Arsip Historis Tetap Terbaca Sepanjang Waktu
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed ml-6">
                  Postingan dari 6 bulan atau 2 tahun lalu tidak dihapus, melainkan tersimpan di snapshot arsip lokal. Rekan kerja tetap bisa mencari, membaca, dan membuka tautan Action Button tanpa menguras kuota cloud.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="pt-2.5 border-t border-zinc-100 space-y-2.5">
            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Uji Coba Langsung:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleRunDeltaSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 py-2 px-3.5 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-medium text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menjalankan Sinkronisasi...' : 'Jalankan Delta Sync'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearLocalCache}
                className="flex items-center justify-center gap-1.5 py-2 px-3.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 font-medium text-xs rounded-lg transition-colors cursor-pointer border border-zinc-200"
              >
                <Archive className="w-3.5 h-3.5 text-zinc-500" />
                <span>Bersihkan Cache Lokal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-zinc-50 border-t border-zinc-200/80 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            Sinkronisasi terakhir: {new Date(stats.lastSyncedTimestamp).toLocaleTimeString('id-ID')}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 font-medium text-zinc-800 rounded-md transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

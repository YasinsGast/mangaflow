import React, { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '../components/RoleGuard';
import { 
  Users, Settings, Shield, TrendingUp, UserCheck, AlertCircle, CheckCircle, 
  XCircle, BookOpen, Tag, Clock, BarChart3, Menu, X as CloseIcon, 
  Home, FileText, UserCog, Sliders, ChevronRight, Zap, Eye, Activity, 
  RefreshCw, Layers, Award, Star, Edit, Trash2, Filter, Download, Upload, Search,
  Database, Lock, ScrollText, Save, Ban, CheckSquare, XSquare
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Chart.JS kayıt
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRoleCheck } from '../hooks/useRoleCheck';
import toast from 'react-hot-toast';

type TabType = 'dashboard' | 'content' | 'users' | 'settings';

interface UserItem {
  id: string;
  username: string;
  email: string;
  user_role: 'user' | 'fansub' | 'moderator' | 'admin';
  created_at: string;
}

interface PendingManga {
  id: string;
  title: string;
  description: string;
  author: string;
  artist: string;
  cover_image_url?: string;
  status: string;
  creator_id: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    username: string;
  };
  manga_categories?: {
    categories: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

interface MangaItem extends PendingManga {}

interface ChapterItem {
  id: string;
  manga_id: string;
  chapter_number: number;
  title: string;
  created_at: string;
  mangas?: {
    title: string;
  };
}

type ContentSubTab = 'pending' | 'all-mangas' | 'chapters';
type SettingsSubTab = 'user-management' | 'permissions' | 'system-settings' | 'logs';

interface SystemLog {
  id: string;
  log_type: string;
  action: string;
  severity: string;
  user_id?: string;
  description?: string;
  created_at: string;
  metadata?: any;
  user_username?: string;
}

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  category: string;
  description?: string;
  is_public: boolean;
  updated_at: string;
}

interface UserStatistics {
  id: string;
  username: string;
  user_role: string;
  account_status: string;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  manga_count: number;
  chapter_count: number;
}

interface DashboardStats {
  totalMangas: number;
  totalChapters: number;
  approvedMangas: number;
  approvedChapters: number;
  rejectedMangas: number;
  rejectedChapters: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeFansubs: number;
}

interface TopFansub {
  username: string;
  manga_count: number;
  approved_count: number;
}

export default function AdminPanelPage() {
  const { user } = useAuth();
  const { 
    userRole, 
    isAdmin, 
    isModerator, 
    hasRole, 
    loading: roleLoading,
    canApproveContent,
    canManageUsers,
    canViewLogs,
    canManageSystem
  } = useRoleCheck();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [pendingMangas, setPendingMangas] = useState<PendingManga[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingChapters, setPendingChapters] = useState(0);
  const [loadingChapters, setLoadingChapters] = useState(false);
  
  // Dashboard istatistikleri için yeni state'ler
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalMangas: 0,
    totalChapters: 0,
    approvedMangas: 0,
    approvedChapters: 0,
    rejectedMangas: 0,
    rejectedChapters: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    activeFansubs: 0,
  });
  const [topFansubs, setTopFansubs] = useState<TopFansub[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Content Management state'leri
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>('pending');
  const [allMangas, setAllMangas] = useState<MangaItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [selectedMangas, setSelectedMangas] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [editingManga, setEditingManga] = useState<MangaItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // System Management state'leri (ADIM 4)
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('user-management');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [userStatistics, setUserStatistics] = useState<UserStatistics[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingUserStats, setLoadingUserStats] = useState(false);
  const [logFilter, setLogFilter] = useState({ type: 'all', severity: 'all', search: '' });
  const [settingsCategory, setSettingsCategory] = useState<string>('all');
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);

  useEffect(() => {
    loadUsers();
    loadPendingMangas();
    loadPendingChapters();
    loadDashboardStats();
  }, []);

  // 5 dakikada bir otomatik güncelleme
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') {
        loadDashboardStats();
        loadUsers();
        toast.success('Dashboard güncelendi', { duration: 2000 });
      }
    }, 300000); // 5 dakika

    return () => clearInterval(interval);
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, username, user_role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Kullanıcılar yüklenirken hata:', error);
        toast.error('Kullanıcılar yüklenirken hata oluştu');
        return;
      }

      if (profilesData && profilesData.length > 0) {
        const usersWithEmails = profilesData.map(profile => ({
          ...profile,
          email: `${profile.username}@example.com`
        }));
        setUsers(usersWithEmails);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingChapters = async () => {
    setLoadingChapters(true);
    try {
      const { count, error } = await supabase
        .from('pending_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) {
        console.error('Bekleyen bölümler yüklenirken hata:', error);
        return;
      }

      setPendingChapters(count || 0);
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
    } finally {
      setLoadingChapters(false);
    }
  };

  const loadPendingMangas = async () => {
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from('mangas')
        .select(`
          *,
          profiles (
            username
          ),
          manga_categories (
            categories (
              id,
              name,
              color
            )
          )
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Bekleyen manga\'lar yüklenirken hata:', error);
        return;
      }

      setPendingMangas(data || []);
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserItem['user_role']) => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('Rol güncellenirken hata:', error);
        toast.error('Rol güncellenirken hata oluştu');
        return;
      }

      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, user_role: newRole }
            : user
        )
      );

      toast.success('Kullanıcı rolü başarıyla güncellendi');
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setUpdatingUser(null);
    }
  };

  const approveManga = async (mangaId: string) => {
    try {
      const { error } = await supabase
        .from('mangas')
        .update({ approval_status: 'approved' })
        .eq('id', mangaId);

      if (error) {
        console.error('Manga onaylanırken hata:', error);
        toast.error('Manga onaylanırken hata oluştu');
        return;
      }

      setPendingMangas(prev => prev.filter(manga => manga.id !== mangaId));
      toast.success('Manga başarıyla onaylandı');
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    }
  };

  const rejectManga = async (mangaId: string) => {
    try {
      const { error } = await supabase
        .from('mangas')
        .update({ approval_status: 'rejected' })
        .eq('id', mangaId);

      if (error) {
        console.error('Manga reddedilirken hata:', error);
        toast.error('Manga reddedilirken hata oluştu');
        return;
      }

      setPendingMangas(prev => prev.filter(manga => manga.id !== mangaId));
      toast.success('Manga başarıyla reddedildi');
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    }
  };

  // Content Management fonksiyonları
  const loadAllMangas = async () => {
    setLoadingContent(true);
    try {
      let query = supabase
        .from('mangas')
        .select(`*, profiles(username), manga_categories(categories(id, name, color))`)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('approval_status', filterStatus as 'pending' | 'approved' | 'rejected');
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Client-side filtering
      let filteredData = data || [];
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(m => 
          m.title?.toLowerCase().includes(term) ||
          m.author?.toLowerCase().includes(term) ||
          m.artist?.toLowerCase().includes(term)
        );
      }

      setAllMangas(filteredData);
    } catch (error) {
      console.error('Manga listesi yüklenirken hata:', error);
      toast.error('Manga listesi yüklenirken hata oluştu');
    } finally {
      setLoadingContent(false);
    }
  };

  const loadChapters = async () => {
    setLoadingContent(true);
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select(`*, mangas(title)`)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Bölüm listesi yüklenirken hata:', error);
      toast.error('Bölüm listesi yüklenirken hata oluştu');
    } finally {
      setLoadingContent(false);
    }
  };

  const deleteManga = async (mangaId: string) => {
    if (!confirm('Bu manga\'yı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    try {
      const { error } = await supabase.from('mangas').delete().eq('id', mangaId);
      if (error) throw error;
      setAllMangas(prev => prev.filter(m => m.id !== mangaId));
      toast.success('Manga başarıyla silindi');
    } catch (error) {
      console.error('Manga silinirken hata:', error);
      toast.error('Manga silinirken hata oluştu');
    }
  };

  const deleteChapter = async (chapterId: string) => {
    if (!confirm('Bu bölümü silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
      if (error) throw error;
      setChapters(prev => prev.filter(c => c.id !== chapterId));
      toast.success('Bölüm başarıyla silindi');
    } catch (error) {
      console.error('Bölüm silinirken hata:', error);
      toast.error('Bölüm silinirken hata oluştu');
    }
  };

  const bulkApprove = async () => {
    // 🔒 GÜVENLİK KONTROLÜ: Sadece admin veya moderatör onaylayabilir
    if (!isAdmin && !isModerator) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    // GÜVENLİK KONTROLÜ: İçerik onaylama yetkisi
    if (!canApproveContent()) {
      toast.error('İçerik onaylama yetkiniz bulunmuyor');
      return;
    }

    if (selectedMangas.length === 0) {
      toast.error('Lütfen onaylanacak manga seçin');
      return;
    }

    try {
      const { error } = await supabase
        .from('mangas')
        .update({ approval_status: 'approved' })
        .in('id', selectedMangas);
      if (error) throw error;
      
      // ✅ Başarılı işlemi logla
      await logSystemAction('admin_action', 'bulk_approve', 'info', `${selectedMangas.length} manga toplu onaylandı`);
      
      toast.success(`${selectedMangas.length} manga başarıyla onaylandı`);
      setSelectedMangas([]);
      loadAllMangas();
      loadPendingMangas();
    } catch (error) {
      console.error('Toplu onaylama hatası:', error);
      toast.error('Toplu onaylama başarısız: ' + (error as Error).message);
    }
  };

  const bulkReject = async () => {
    // 🔒 GÜVENLİK KONTROLÜ: Sadece admin veya moderatör reddedebilir
    if (!isAdmin && !isModerator) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    // GÜVENLİK KONTROLÜ: İçerik onaylama yetkisi
    if (!canApproveContent()) {
      toast.error('İçerik reddetme yetkiniz bulunmuyor');
      return;
    }

    if (selectedMangas.length === 0) {
      toast.error('Lütfen reddedilecek manga seçin');
      return;
    }

    try {
      const { error } = await supabase
        .from('mangas')
        .update({ approval_status: 'rejected' })
        .in('id', selectedMangas);
      if (error) throw error;
      
      // ✅ Başarılı işlemi logla
      await logSystemAction('admin_action', 'bulk_reject', 'info', `${selectedMangas.length} manga toplu reddedildi`);
      
      toast.success(`${selectedMangas.length} manga başarıyla reddedildi`);
      setSelectedMangas([]);
      loadAllMangas();
      loadPendingMangas();
    } catch (error) {
      console.error('Toplu reddetme hatası:', error);
      toast.error('Toplu reddetme başarısız: ' + (error as Error).message);
    }
  };

  const bulkDelete = async () => {
    // 🔒 KRİTİK GÜVENLİK KONTROLÜ: Sadece ADMIN silebilir!
    if (!isAdmin) {
      toast.error('Manga silme işlemi sadece Admin yetkisine sahip kullanıcılar tarafından yapılabilir');
      return;
    }

    if (selectedMangas.length === 0) {
      toast.error('Lütfen silinecek manga seçin');
      return;
    }

    // Ekstra güvenlik için confirm dialog
    if (!confirm(`${selectedMangas.length} manga'yı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;

    try {
      const { error } = await supabase.from('mangas').delete().in('id', selectedMangas);
      if (error) throw error;
      
      // ✅ KRİTİK İŞLEMİ LOGLA
      await logSystemAction('admin_action', 'bulk_delete', 'warning', `${selectedMangas.length} manga toplu silindi - YETKİLİ ADMIN İŞLEMİ`);
      
      toast.success(`${selectedMangas.length} manga başarıyla silindi`);
      setSelectedMangas([]);
      loadAllMangas();
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      toast.error('Toplu silme başarısız: ' + (error as Error).message);
    }
  };

  const updateManga = async (mangaId: string, updates: Partial<MangaItem>) => {
    try {
      const { error } = await supabase
        .from('mangas')
        .update(updates)
        .eq('id', mangaId);
      if (error) throw error;
      toast.success('Manga başarıyla güncellendi');
      setEditingManga(null);
      loadAllMangas();
    } catch (error) {
      console.error('Manga güncellenirken hata:', error);
      toast.error('Manga güncellenirken hata oluştu');
    }
  };

  // Export/Import fonksiyonları
  const exportMangasToCSV = async () => {
    try {
      const { data, error } = await supabase
        .from('mangas')
        .select('id, title, description, author, artist, status, approval_status, created_at');
      if (error) throw error;

      const csv = [
        ['ID', 'Baslik', 'Aciklama', 'Yazar', 'Cizer', 'Durum', 'Onay Durumu', 'Olusturma Tarihi'].join(','),
        ...data.map(m => [
          m.id, 
          `"${m.title?.replace(/"/g, '""') || ''}"`,
          `"${m.description?.replace(/"/g, '""') || ''}"`,
          m.author || '',
          m.artist || '',
          m.status || '',
          m.approval_status || '',
          m.created_at || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mangas_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Manga verisi CSV olarak indirildi');
    } catch (error) {
      console.error('Export hatası:', error);
      toast.error('Export başarısız');
    }
  };

  const exportMangasToJSON = async () => {
    try {
      const { data, error } = await supabase
        .from('mangas')
        .select('*');
      if (error) throw error;

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mangas_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      toast.success('Manga verisi JSON olarak indirildi');
    } catch (error) {
      console.error('Export hatası:', error);
      toast.error('Export başarısız');
    }
  };

  const exportChaptersToCSV = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, manga_id, chapter_number, title, created_at');
      if (error) throw error;

      const csv = [
        ['ID', 'Manga ID', 'Bolum No', 'Baslik', 'Olusturma Tarihi'].join(','),
        ...data.map(c => [
          c.id,
          c.manga_id,
          c.chapter_number,
          `"${c.title?.replace(/"/g, '""') || ''}"`,
          c.created_at || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `chapters_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Bölüm verisi CSV olarak indirildi');
    } catch (error) {
      console.error('Export hatası:', error);
      toast.error('Export başarısız');
    }
  };

  // ================================================
  // SYSTEM MANAGEMENT FUNCTIONS (ADIM 4)
  // ================================================

  // Load system logs with filtering
  const loadSystemLogs = async () => {
    setLoadingLogs(true);
    try {
      let query = (supabase as any)
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      // Apply filters
      if (logFilter.type !== 'all') {
        query = query.eq('log_type', logFilter.type);
      }
      if (logFilter.severity !== 'all') {
        query = query.eq('severity', logFilter.severity);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side search filtering
      let filteredLogs = (data || []) as SystemLog[];
      if (logFilter.search) {
        const searchLower = logFilter.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
          log.action?.toLowerCase().includes(searchLower) ||
          log.description?.toLowerCase().includes(searchLower)
        );
      }

      setSystemLogs(filteredLogs);
    } catch (error) {
      console.error('Log yükleme hatası:', error);
      toast.error('Log kayıtları yüklenirken hata oluştu');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load system settings
  const loadSystemSettings = async () => {
    setLoadingSettings(true);
    try {
      let query = (supabase as any).from('system_settings').select('*');
      
      if (settingsCategory !== 'all') {
        query = query.eq('category', settingsCategory);
      }

      const { data, error } = await query.order('category');
      if (error) throw error;

      setSystemSettings(data || []);
    } catch (error) {
      console.error('Ayarlar yükleme hatası:', error);
      toast.error('Sistem ayarları yüklenirken hata oluştu');
    } finally {
      setLoadingSettings(false);
    }
  };

  // Update system setting
  const updateSystemSetting = async (settingId: string, newValue: any) => {
    try {
      const { error } = await (supabase as any)
        .from('system_settings')
        .update({ 
          setting_value: newValue,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingId);

      if (error) throw error;

      toast.success('Ayar başarıyla güncellendi');
      loadSystemSettings();
      setEditingSetting(null);

      // Log the action
      await logSystemAction('system', 'setting_update', 'info', `Sistem ayarı güncellendi`);
    } catch (error) {
      console.error('Ayar güncelleme hatası:', error);
      toast.error('Ayar güncellenirken hata oluştu');
    }
  };

  // Load user statistics
  const loadUserStatistics = async () => {
    setLoadingUserStats(true);
    try {
      const { data: profiles, error } = await (supabase as any)
        .from('profiles')
        .select('id, username, user_role, account_status, email_verified, last_login_at, created_at, total_mangas, total_chapters');

      if (error) throw error;

      // Get manga and chapter counts for each user
      const userStats = await Promise.all((profiles || []).map(async (profile: any) => {
        const { count: mangaCount } = await supabase
          .from('mangas')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', profile.id);

        const { count: chapterCount } = await supabase
          .from('chapters')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', profile.id);

        return {
          ...profile,
          account_status: profile.account_status || 'active',
          email_verified: profile.email_verified || false,
          manga_count: mangaCount || 0,
          chapter_count: chapterCount || 0
        };
      }));

      setUserStatistics(userStats);
    } catch (error) {
      console.error('Kullanıcı istatistikleri yükleme hatası:', error);
      toast.error('Kullanıcı istatistikleri yüklenirken hata oluştu');
    } finally {
      setLoadingUserStats(false);
    }
  };

  // Update user account status
  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Kullanıcı durumu "${newStatus}" olarak güncellendi`);
      loadUserStatistics();

      // Log the action
      await logSystemAction('user_action', 'status_change', 'info', `Kullanıcı durumu değiştirildi: ${newStatus}`);
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      toast.error('Kullanıcı durumu güncellenirken hata oluştu');
    }
  };

  // Toggle email verified status
  const toggleEmailVerified = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ email_verified: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Email doğrulama durumu güncellendi`);
      loadUserStatistics();

      await logSystemAction('user_action', 'email_verification_toggle', 'info', `Email doğrulama değiştirildi`);
    } catch (error) {
      console.error('Email doğrulama güncelleme hatası:', error);
      toast.error('Email doğrulama durumu güncellenirken hata oluştu');
    }
  };

  // Log system action (helper function)
  const logSystemAction = async (
    logType: string,
    action: string,
    severity: string,
    description: string,
    metadata?: any
  ) => {
    try {
      const { error } = await (supabase as any).from('system_logs').insert({
        log_type: logType,
        action: action,
        severity: severity,
        user_id: user?.id,
        description: description,
        metadata: metadata || null
      });

      if (error) throw error;
    } catch (error) {
      console.error('Log kaydetme hatası:', error);
    }
  };

  // Delete old logs (cleanup) - 🔒 GÜVENLİK KONTROLÜ
  const deleteOldLogs = async (daysOld: number) => {
    // 🔒 GÜVENLİK KONTROLÜ: Sadece Admin log silebilir
    if (!isAdmin) {
      toast.error('Log silme işlemi sadece Admin yetkisine sahip kullanıcılar tarafından yapılabilir');
      return;
    }

    // GÜVENLİK KONTROLÜ: Log görüntüleme yetkisi
    if (!canViewLogs()) {
      toast.error('Log yönetimi yetkiniz bulunmuyor');
      return;
    }

    if (!confirm(`${daysOld} günden eski logları silmek istediğinize emin misiniz?`)) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await (supabase as any)
        .from('system_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      // ✅ KRİTİK İŞLEMİ LOGLA
      await logSystemAction('admin_action', 'log_cleanup', 'warning', `${daysOld} günden eski loglar silindi - YETKİLİ ADMIN İŞLEMİ`);

      toast.success(`${daysOld} günden eski loglar başarıyla silindi`);
      loadSystemLogs();
    } catch (error) {
      console.error('Log silme hatası:', error);
      toast.error('Loglar silinirken hata oluştu');
    }
  };

  // Export logs to CSV - 🔒 GÜVENLİK KONTROLÜ
  const exportLogsToCSV = async () => {
    // 🔒 GÜVENLİK KONTROLÜ: Log görüntüleme yetkisi kontrolü
    if (!canViewLogs()) {
      toast.error('Log görüntüleme yetkiniz bulunmuyor');
      return;
    }

    // GÜVENLİK KONTROLÜ: Sistem loglarını görüntüleme yetkisi
    if (!hasRole(['admin', 'moderator'])) {
      toast.error('Log dışa aktarma yetkiniz bulunmuyor');
      return;
    }

    try {
      const csv = [
        ['Tarih', 'Tip', 'İşlem', 'Önem', 'Açıklama'].join(','),
        ...systemLogs.map(log => [
          new Date(log.created_at).toLocaleString('tr-TR'),
          log.log_type,
          log.action,
          log.severity,
          `"${(log.description || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `system_logs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Loglar CSV olarak indirildi');
    } catch (error) {
      console.error('Log export hatası:', error);
      toast.error('Loglar dışa aktarılırken hata oluştu');
    }
  };

  // ================================================
  // END SYSTEM MANAGEMENT FUNCTIONS
  // ================================================

  // Dashboard istatistiklerini yükle
  const loadDashboardStats = async () => {
    setLoadingDashboard(true);
    try {
      // Toplam manga sayısı
      const { count: totalMangas } = await supabase
        .from('mangas')
        .select('*', { count: 'exact', head: true });

      // Onaylanmış manga sayısı
      const { count: approvedMangas } = await supabase
        .from('mangas')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      // Reddedilmiş manga sayısı
      const { count: rejectedMangas } = await supabase
        .from('mangas')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'rejected');

      // Toplam bölüm sayısı
      const { count: totalChapters } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true });

      // Onaylanmış bölüm sayısı (pending_chapters tablosundan)
      const { count: approvedChapters } = await supabase
        .from('pending_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Reddedilmiş bölüm sayısı
      const { count: rejectedChapters } = await supabase
        .from('pending_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');

      // Aktif fansub sayısı (en az 1 manga ekleyen)
      const { data: fansubData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_role', 'fansub');

      let activeFansubCount = 0;
      if (fansubData) {
        const { count: activeFansubs } = await supabase
          .from('mangas')
          .select('creator_id', { count: 'exact', head: true })
          .in('creator_id', fansubData.map(f => f.id));
        activeFansubCount = activeFansubs || 0;
      }

      // Bu hafta kayıt olan kullanıcılar
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newUsersThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Bu ay kayıt olan kullanıcılar
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const { count: newUsersThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString());

      // En aktif fansub'ları çek
      const { data: fansubs } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('user_role', 'fansub')
        .limit(10);

      if (fansubs) {
        const fansubStats = await Promise.all(
          fansubs.map(async (fansub) => {
            const { count: mangaCount } = await supabase
              .from('mangas')
              .select('*', { count: 'exact', head: true })
              .eq('creator_id', fansub.id);

            const { count: approvedCount } = await supabase
              .from('mangas')
              .select('*', { count: 'exact', head: true })
              .eq('creator_id', fansub.id)
              .eq('approval_status', 'approved');

            return {
              username: fansub.username,
              manga_count: mangaCount || 0,
              approved_count: approvedCount || 0,
            };
          })
        );

        // En çok manga ekleyenlere göre sırala
        const sortedFansubs = fansubStats
          .filter(f => f.manga_count > 0)
          .sort((a, b) => b.manga_count - a.manga_count)
          .slice(0, 5);

        setTopFansubs(sortedFansubs);
      }

      setDashboardStats({
        totalMangas: totalMangas || 0,
        totalChapters: totalChapters || 0,
        approvedMangas: approvedMangas || 0,
        approvedChapters: approvedChapters || 0,
        rejectedMangas: rejectedMangas || 0,
        rejectedChapters: rejectedChapters || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        activeFansubs: activeFansubCount,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Dashboard istatistikleri yüklenirken hata:', error);
      toast.error('İstatistikler yüklenirken hata oluştu');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const stats = {
    totalUsers: users.length,
    fansubs: users.filter(u => u.user_role === 'fansub').length,
    moderators: users.filter(u => u.user_role === 'moderator').length,
    admins: users.filter(u => u.user_role === 'admin').length,
    pendingMangas: pendingMangas.length,
    pendingChapters: pendingChapters,
    ...dashboardStats,
  };

  // Chart.js verileri
  const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const roleDistributionData = {
    labels: ['Kullanıcılar', 'Fansub\'lar', 'Moderatörler', 'Adminler'],
    datasets: [{
      data: [
        users.filter(u => u.user_role === 'user').length,
        stats.fansubs,
        stats.moderators,
        stats.admins,
      ],
      backgroundColor: COLORS,
      borderColor: COLORS.map(c => c + '80'),
      borderWidth: 2,
    }],
  };

  const contentStatsData = {
    labels: ['Toplam Manga', 'Onaylı Manga', 'Bekleyen', 'Reddedilen'],
    datasets: [{
      label: 'Manga İstatistikleri',
      data: [stats.totalMangas, stats.approvedMangas, stats.pendingMangas, stats.rejectedMangas],
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      borderWidth: 1,
      borderRadius: 8,
    }],
  };

  const chapterStatsData = {
    labels: ['Toplam Bölüm', 'Onaylı', 'Bekleyen', 'Reddedilen'],
    datasets: [{
      label: 'Bölüm İstatistikleri',
      data: [stats.totalChapters, stats.approvedChapters, stats.pendingChapters, stats.rejectedChapters],
      backgroundColor: '#10B981',
      borderColor: '#059669',
      borderWidth: 1,
      borderRadius: 8,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9CA3AF',
        },
      },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#fff',
        bodyColor: '#9CA3AF',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      y: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#9CA3AF',
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#fff',
        bodyColor: '#9CA3AF',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
  };

  const tabs = [
    { id: 'dashboard' as TabType, name: 'Dashboard', icon: Home, description: 'Genel bakış ve istatistikler' },
    { id: 'content' as TabType, name: 'İçerik Yönetimi', icon: FileText, description: 'Manga ve bölüm yönetimi' },
    { id: 'users' as TabType, name: 'Kullanıcı Yönetimi', icon: UserCog, description: 'Kullanıcı rolleri ve izinler' },
    { id: 'settings' as TabType, name: 'Sistem Ayarları', icon: Sliders, description: 'Genel sistem konfigürasyonu' },
  ];

  const quickActions = [
    { 
      title: 'Bekleyen Onaylar', 
      count: stats.pendingMangas + stats.pendingChapters, 
      icon: Eye, 
      color: 'orange',
      action: () => setActiveTab('content')
    },
    { 
      title: 'Hızlı Onay', 
      count: stats.pendingMangas, 
      icon: Zap, 
      color: 'green',
      action: () => {
        setActiveTab('content');
        toast.success('İçerik yönetimine yönlendirildi');
      }
    },
    { 
      title: 'Kullanıcı İşlemleri', 
      count: stats.totalUsers, 
      icon: Users, 
      color: 'blue',
      action: () => setActiveTab('users')
    },
  ];

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-900 text-white">
        {/* Sidebar */}
        <aside 
          className={`fixed lg:sticky top-0 left-0 h-screen bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-xl border-r border-gray-700/50 transition-all duration-300 z-40 ${
            sidebarOpen ? 'w-72' : 'w-0 lg:w-20'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-3 ${!sidebarOpen && 'lg:hidden'}`}>
                  <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-2 rounded-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Admin Panel</h2>
                    <p className="text-xs text-gray-400">MangaFlow</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex-1 p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600/20 to-purple-800/20 border border-purple-500/30 shadow-lg shadow-purple-600/10'
                        : 'hover:bg-gray-700/30 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-purple-400' : 'text-gray-400'}`} />
                    {(sidebarOpen || !sidebarOpen) && (
                      <div className={`flex-1 text-left ${!sidebarOpen && 'lg:hidden'}`}>
                        <p className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>
                          {tab.name}
                        </p>
                        <p className="text-xs text-gray-500">{tab.description}</p>
                      </div>
                    )}
                    {isActive && (sidebarOpen || !sidebarOpen) && (
                      <ChevronRight className={`h-4 w-4 text-purple-400 ${!sidebarOpen && 'lg:hidden'}`} />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className={`p-4 border-t border-gray-700/50 ${!sidebarOpen && 'lg:hidden'}`}>
              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 backdrop-blur-sm border border-purple-700/30 p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-600/20 p-2 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sistem Durumu</p>
                    <p className="text-xs text-green-400">Aktif ve Çalışıyor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 bg-gradient-to-br from-purple-600 to-purple-800 p-4 rounded-full shadow-lg shadow-purple-600/50 z-30"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {tabs.find(t => t.id === activeTab)?.name}
                </h1>
                <p className="text-gray-400">
                  {tabs.find(t => t.id === activeTab)?.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-xl">
                  <p className="text-sm text-gray-400">Hoş geldiniz</p>
                  <p className="font-semibold">{user?.email?.split('@')[0] || 'Admin'}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions - Only on Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  const colorClasses = {
                    orange: 'from-orange-900/40 to-orange-800/20 border-orange-700/30 text-orange-400',
                    green: 'from-green-900/40 to-green-800/20 border-green-700/30 text-green-400',
                    blue: 'from-blue-900/40 to-blue-800/20 border-blue-700/30 text-blue-400',
                  };
                  return (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`bg-gradient-to-br ${colorClasses[action.color as keyof typeof colorClasses]} backdrop-blur-sm border p-6 rounded-xl hover:scale-105 transition-transform shadow-lg`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Icon className="h-8 w-8" />
                        <span className="text-3xl font-bold">{action.count}</span>
                      </div>
                      <p className="text-sm font-medium text-white">{action.title}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Son güncelleme ve yenile butonu */}
                <div className="flex items-center justify-between bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
                  </div>
                  <button
                    onClick={() => loadDashboardStats()}
                    disabled={loadingDashboard}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 rounded-lg transition-all text-sm font-medium"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingDashboard ? 'animate-spin' : ''}`} />
                    {loadingDashboard ? 'Güncelleniyor...' : 'Yenile'}
                  </button>
                </div>

                {/* Gelişmiş Stats Grid - 12 Kart */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <StatCard title="Toplam Kullanıcı" value={stats.totalUsers} icon={Users} color="blue" loading={loadingDashboard} />
                  <StatCard title="Fansub Kullanıcıları" value={stats.fansubs} icon={TrendingUp} color="green" loading={loadingDashboard} />
                  <StatCard title="Moderatörler" value={stats.moderators} icon={Settings} color="yellow" loading={loadingDashboard} />
                  <StatCard title="Adminler" value={stats.admins} icon={Shield} color="purple" loading={loadingDashboard} />
                  
                  <StatCard title="Toplam Manga" value={stats.totalMangas} icon={BookOpen} color="indigo" loading={loadingDashboard} />
                  <StatCard title="Onaylı Manga" value={stats.approvedMangas} icon={CheckCircle} color="emerald" loading={loadingDashboard} />
                  <StatCard title="Bekleyen Manga" value={stats.pendingMangas} icon={Clock} color="orange" loading={loadingDashboard} />
                  <StatCard title="Reddedilen Manga" value={stats.rejectedMangas} icon={XCircle} color="red" loading={loadingDashboard} />
                  
                  <StatCard title="Toplam Bölüm" value={stats.totalChapters} icon={Layers} color="cyan" loading={loadingDashboard} />
                  <StatCard title="Onaylı Bölüm" value={stats.approvedChapters} icon={CheckCircle} color="teal" loading={loadingDashboard} />
                  <StatCard title="Bekleyen Bölüm" value={stats.pendingChapters} icon={AlertCircle} color="amber" loading={loadingDashboard} />
                  <StatCard title="Aktif Fansub" value={stats.activeFansubs} icon={Award} color="pink" loading={loadingDashboard} />
                </div>

                {/* Kullanıcı İstatistikleri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 backdrop-blur-sm border border-blue-700/30 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-blue-600/20 p-3 rounded-lg">
                        <Users className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Yeni Kayıtlar</p>
                        <p className="text-2xl font-bold text-white">{stats.newUsersThisWeek}</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-400">Bu Hafta</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 backdrop-blur-sm border border-purple-700/30 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-purple-600/20 p-3 rounded-lg">
                        <UserCheck className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Yeni Kayıtlar</p>
                        <p className="text-2xl font-bold text-white">{stats.newUsersThisMonth}</p>
                      </div>
                    </div>
                    <p className="text-xs text-purple-400">Bu Ay</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 backdrop-blur-sm border border-green-700/30 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-green-600/20 p-3 rounded-lg">
                        <Star className="h-6 w-6 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Aktif Fansub</p>
                        <p className="text-2xl font-bold text-white">{stats.activeFansubs}</p>
                      </div>
                    </div>
                    <p className="text-xs text-green-400">Manga Ekleyenler</p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Rol Dağılımı - Pie Chart */}
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-400" />
                      Kullanıcı Rol Dağılımı
                    </h3>
                    {loadingDashboard ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                      </div>
                    ) : (
                      <div className="h-80">
                        <Pie data={roleDistributionData} options={pieOptions} />
                      </div>
                    )}
                  </div>

                  {/* Manga İstatistikleri - Bar Chart */}
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-400" />
                      Manga İstatistikleri
                    </h3>
                    {loadingDashboard ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="h-80">
                        <Bar data={contentStatsData} options={chartOptions} />
                      </div>
                    )}
                  </div>

                  {/* Bölüm İstatistikleri - Bar Chart */}
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-green-400" />
                      Bölüm İstatistikleri
                    </h3>
                    {loadingDashboard ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                      </div>
                    ) : (
                      <div className="h-80">
                        <Bar data={chapterStatsData} options={chartOptions} />
                      </div>
                    )}
                  </div>

                  {/* En Aktif Fansub'lar */}
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-400" />
                      En Aktif Fansub'lar
                    </h3>
                    {loadingDashboard ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600"></div>
                      </div>
                    ) : topFansubs.length > 0 ? (
                      <div className="space-y-3">
                        {topFansubs.map((fansub, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-yellow-600/20 px-3 py-1 rounded-full">
                                <span className="text-yellow-400 font-bold">#{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium text-white">{fansub.username}</p>
                                <p className="text-xs text-gray-400">
                                  {fansub.approved_count} onaylı / {fansub.manga_count} toplam manga
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-yellow-400">{fansub.manga_count}</p>
                              <p className="text-xs text-gray-400">Manga</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        Henüz aktif fansub yok
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Content Management Tab */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                {/* Sub-tabs */}
                <div className="flex gap-2 border-b border-gray-700">
                  <button
                    onClick={() => {
                      setContentSubTab('pending');
                      loadPendingMangas();
                    }}
                    className={`px-4 py-2 font-medium transition-colors ${
                      contentSubTab === 'pending'
                        ? 'text-orange-400 border-b-2 border-orange-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Bekleyen Onaylar
                  </button>
                  <button
                    onClick={() => {
                      setContentSubTab('all-mangas');
                      loadAllMangas();
                    }}
                    className={`px-4 py-2 font-medium transition-colors ${
                      contentSubTab === 'all-mangas'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Tum Manga'lar
                  </button>
                  <button
                    onClick={() => {
                      setContentSubTab('chapters');
                      loadChapters();
                    }}
                    className={`px-4 py-2 font-medium transition-colors ${
                      contentSubTab === 'chapters'
                        ? 'text-green-400 border-b-2 border-green-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Bolumler
                  </button>
                </div>

                {/* Bekleyen Onaylar */}
                {contentSubTab === 'pending' && (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <UserCheck className="h-6 w-6 text-orange-400" />
                        Bekleyen Icerik Yonetimi
                      </h2>
                      <button
                        onClick={loadPendingMangas}
                        disabled={loadingPending}
                        className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 rounded-lg transition-all"
                      >
                        {loadingPending ? 'Yukleniyor...' : 'Yenile'}
                      </button>
                    </div>

                    {loadingPending ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingMangas.map((manga) => (
                          <MangaCard 
                            key={manga.id} 
                            manga={manga} 
                            onApprove={approveManga}
                            onReject={rejectManga}
                          />
                        ))}
                        
                        {pendingMangas.length === 0 && (
                          <div className="col-span-full text-center py-16">
                            <UserCheck className="h-20 w-20 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 text-lg">Bekleyen icerik yok</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tum Manga'lar */}
                {contentSubTab === 'all-mangas' && (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-blue-400" />
                        Tum Manga'lar
                      </h2>
                      <div className="flex gap-2">
                        <button
                          onClick={exportMangasToCSV}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-2"
                          title="CSV Export"
                        >
                          <Download className="h-4 w-4" />
                          CSV
                        </button>
                        <button
                          onClick={exportMangasToJSON}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm flex items-center gap-2"
                          title="JSON Export"
                        >
                          <Download className="h-4 w-4" />
                          JSON
                        </button>
                        <button
                          onClick={loadAllMangas}
                          disabled={loadingContent}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 rounded-lg transition-all"
                        >
                          {loadingContent ? 'Yukleniyor...' : 'Yenile'}
                        </button>
                      </div>
                    </div>

                    {/* Gelismis Filtreleme */}
                    <div className="mb-4 p-4 bg-gray-700/30 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Arama</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setTimeout(loadAllMangas, 300);
                              }}
                              placeholder="Baslik, yazar, cizer..."
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Durum</label>
                          <select
                            value={filterStatus}
                            onChange={(e) => {
                              setFilterStatus(e.target.value);
                              setTimeout(loadAllMangas, 100);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="all">Tum Durumlar</option>
                            <option value="approved">Onaylananlar</option>
                            <option value="pending">Bekleyenler</option>
                            <option value="rejected">Reddedilenler</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Baslangic Tarihi</label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                              setDateFrom(e.target.value);
                              setTimeout(loadAllMangas, 100);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Bitis Tarihi</label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                              setDateTo(e.target.value);
                              setTimeout(loadAllMangas, 100);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                            setDateFrom('');
                            setDateTo('');
                            setTimeout(loadAllMangas, 100);
                          }}
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                        >
                          Filtreleri Temizle
                        </button>
                        <span className="text-xs text-gray-400 flex items-center">
                          Toplam {allMangas.length} manga gosteriliyor
                        </span>
                      </div>
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedMangas.length > 0 && (
                      <div className="mb-4 p-4 bg-purple-900/30 border border-purple-700/50 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium">{selectedMangas.length} manga secildi</span>
                        <div className="flex gap-2">
                          {/* 🔒 GÜVENLİK KONTROLÜ: Onay butonu */}
                          {(isAdmin || isModerator) && canApproveContent() ? (
                            <button 
                              onClick={bulkApprove} 
                              disabled={selectedMangas.length === 0}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
                            >
                              Toplu Onayla
                            </button>
                          ) : (
                            <button 
                              disabled
                              title="Bu işlem için yetkiniz yok"
                              className="px-3 py-1.5 bg-gray-600 cursor-not-allowed rounded text-sm"
                            >
                              Toplu Onayla
                            </button>
                          )}

                          {/* 🔒 GÜVENLİK KONTROLÜ: Red butonu */}
                          {(isAdmin || isModerator) && canApproveContent() ? (
                            <button 
                              onClick={bulkReject} 
                              disabled={selectedMangas.length === 0}
                              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
                            >
                              Toplu Reddet
                            </button>
                          ) : (
                            <button 
                              disabled
                              title="Bu işlem için yetkiniz yok"
                              className="px-3 py-1.5 bg-gray-600 cursor-not-allowed rounded text-sm"
                            >
                              Toplu Reddet
                            </button>
                          )}

                          {/* 🔒 GÜVENLİK KONTROLÜ: Sil butonu - SADECE ADMIN */}
                          {isAdmin ? (
                            <button 
                              onClick={bulkDelete} 
                              disabled={selectedMangas.length === 0}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
                            >
                              Toplu Sil
                            </button>
                          ) : (
                            <button 
                              disabled
                              title="Manga silme işlemi sadece Admin yetkisine sahip kullanıcılar tarafından yapılabilir"
                              className="px-3 py-1.5 bg-gray-600 cursor-not-allowed rounded text-sm"
                            >
                              Toplu Sil
                            </button>
                          )}
                          <button onClick={() => setSelectedMangas([])} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm">
                            Temizle
                          </button>
                        </div>
                      </div>
                    )}

                    {loadingContent ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allMangas.map((manga) => (
                          <div key={manga.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedMangas.includes(manga.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMangas(prev => [...prev, manga.id]);
                                } else {
                                  setSelectedMangas(prev => prev.filter(id => id !== manga.id));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            {manga.cover_image_url && (
                              <img src={manga.cover_image_url} alt={manga.title} className="w-12 h-16 object-cover rounded" />
                            )}
                            <div className="flex-1">
                              <h3 className="font-medium">{manga.title}</h3>
                              <p className="text-sm text-gray-400">{manga.author || 'Bilinmiyor'} • {manga.status}</p>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                manga.approval_status === 'approved' ? 'bg-green-600/20 text-green-400' :
                                manga.approval_status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                                'bg-red-600/20 text-red-400'
                              }`}>
                                {manga.approval_status}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingManga(manga)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                                title="Duzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteManga(manga.id)}
                                className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {allMangas.length === 0 && (
                          <div className="text-center py-16 text-gray-400">
                            <BookOpen className="h-20 w-20 mx-auto mb-4 text-gray-600" />
                            <p>Manga bulunamadi</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bolumler */}
                {contentSubTab === 'chapters' && (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Layers className="h-6 w-6 text-green-400" />
                        Bolum Yonetimi
                      </h2>
                      <button
                        onClick={loadChapters}
                        disabled={loadingContent}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 rounded-lg transition-all"
                      >
                        {loadingContent ? 'Yukleniyor...' : 'Yenile'}
                      </button>
                    </div>

                    {loadingContent ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chapters.map((chapter) => (
                          <div key={chapter.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                            <div>
                              <h3 className="font-medium">{chapter.mangas?.title || 'Bilinmiyor'}</h3>
                              <p className="text-sm text-gray-400">Bolum {chapter.chapter_number}: {chapter.title}</p>
                              <p className="text-xs text-gray-500">{new Date(chapter.created_at).toLocaleDateString('tr-TR')}</p>
                            </div>
                            <button
                              onClick={() => deleteChapter(chapter.id)}
                              className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {chapters.length === 0 && (
                          <div className="text-center py-16 text-gray-400">
                            <Layers className="h-20 w-20 mx-auto mb-4 text-gray-600" />
                            <p>Bolum bulunamadi</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User Management Tab */}
            {activeTab === 'users' && (
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="h-6 w-6 text-blue-400" />
                    Kullanıcı Yönetimi
                  </h2>
                  <button
                    onClick={loadUsers}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 rounded-lg transition-all"
                  >
                    {loading ? 'Yükleniyor...' : 'Yenile'}
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="pb-4 px-4">Kullanıcı Adı</th>
                          <th className="pb-4 px-4">Email</th>
                          <th className="pb-4 px-4">Rol</th>
                          <th className="pb-4 px-4">Kayıt Tarihi</th>
                          <th className="pb-4 px-4">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                            <td className="py-4 px-4 font-medium">{user.username}</td>
                            <td className="py-4 px-4 text-gray-400">{user.email}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <select
                                  value={user.user_role}
                                  onChange={(e) => updateUserRole(user.id, e.target.value as UserItem['user_role'])}
                                  disabled={updatingUser === user.id}
                                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                >
                                  <option value="user">Kullanıcı</option>
                                  <option value="fansub">Fansub</option>
                                  <option value="moderator">Moderatör</option>
                                  <option value="admin">Admin</option>
                                </select>
                                {updatingUser === user.id && (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-gray-400">{new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
                            <td className="py-4 px-4">
                              <button className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
                                Sil
                              </button>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-gray-400 py-12">
                              Henüz kullanıcı yok veya yükleme yapılmadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab - ADIM 4: System Management */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Sub-Tab Navigation */}
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSettingsSubTab('user-management');
                        loadUserStatistics();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        settingsSubTab === 'user-management'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <UserCog className="h-5 w-5" />
                      Kullanici Yonetimi
                    </button>
                    <button
                      onClick={() => setSettingsSubTab('permissions')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        settingsSubTab === 'permissions'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Lock className="h-5 w-5" />
                      Izin Yonetimi
                    </button>
                    <button
                      onClick={() => {
                        setSettingsSubTab('system-settings');
                        loadSystemSettings();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        settingsSubTab === 'system-settings'
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Database className="h-5 w-5" />
                      Sistem Ayarlari
                    </button>
                    <button
                      onClick={() => {
                        setSettingsSubTab('logs');
                        loadSystemLogs();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        settingsSubTab === 'logs'
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <ScrollText className="h-5 w-5" />
                      Log Kayitlari
                    </button>
                  </div>
                </div>

                {/* User Management */}
                {settingsSubTab === 'user-management' && (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <UserCog className="h-6 w-6 text-blue-400" />
                        Gelismis Kullanici Yonetimi
                      </h2>
                      <button
                        onClick={loadUserStatistics}
                        disabled={loadingUserStats}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 rounded-lg transition-all"
                      >
                        {loadingUserStats ? 'Yukleniyor...' : 'Yenile'}
                      </button>
                    </div>

                    {loadingUserStats ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="pb-3 px-3">Kullanici</th>
                              <th className="pb-3 px-3">Rol</th>
                              <th className="pb-3 px-3">Durum</th>
                              <th className="pb-3 px-3">Email Dogrulama</th>
                              <th className="pb-3 px-3">Son Giris</th>
                              <th className="pb-3 px-3">Manga</th>
                              <th className="pb-3 px-3">Bolum</th>
                              <th className="pb-3 px-3">Kayit</th>
                              <th className="pb-3 px-3">Islemler</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userStatistics.map((user) => (
                              <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                                <td className="py-3 px-3 font-medium">{user.username}</td>
                                <td className="py-3 px-3">
                                  <select
                                    value={user.user_role}
                                    onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
                                  >
                                    <option value="user">Kullanici</option>
                                    <option value="fansub">Fansub</option>
                                    <option value="moderator">Moderator</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                                <td className="py-3 px-3">
                                  <select
                                    value={user.account_status}
                                    onChange={(e) => updateUserStatus(user.id, e.target.value)}
                                    className={`px-2 py-1 text-xs rounded border ${
                                      user.account_status === 'active' ? 'bg-green-900/30 border-green-700 text-green-400' :
                                      user.account_status === 'banned' ? 'bg-red-900/30 border-red-700 text-red-400' :
                                      'bg-gray-700 border-gray-600'
                                    }`}
                                  >
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Pasif</option>
                                    <option value="banned">Banli</option>
                                  </select>
                                </td>
                                <td className="py-3 px-3">
                                  <button
                                    onClick={() => toggleEmailVerified(user.id, user.email_verified)}
                                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                                      user.email_verified
                                        ? 'bg-green-900/30 text-green-400'
                                        : 'bg-gray-700 text-gray-400'
                                    }`}
                                  >
                                    {user.email_verified ? <CheckSquare className="h-3 w-3" /> : <XSquare className="h-3 w-3" />}
                                    {user.email_verified ? 'Dogrulandi' : 'Dogrulanmadi'}
                                  </button>
                                </td>
                                <td className="py-3 px-3 text-gray-400 text-xs">
                                  {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('tr-TR') : '-'}
                                </td>
                                <td className="py-3 px-3 text-center">{user.manga_count}</td>
                                <td className="py-3 px-3 text-center">{user.chapter_count}</td>
                                <td className="py-3 px-3 text-gray-400 text-xs">{new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
                                <td className="py-3 px-3">
                                  <button
                                    onClick={() => updateUserStatus(user.id, 'banned')}
                                    className="text-red-400 hover:text-red-300 text-xs"
                                    title="Banla"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {userStatistics.length === 0 && (
                          <div className="text-center py-12 text-gray-400">
                            <Users className="h-16 w-16 mx-auto mb-3 text-gray-600" />
                            <p>Kullanici bulunamadi</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Permission Management */}
                {settingsSubTab === 'permissions' && (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Lock className="h-6 w-6 text-purple-400" />
                      Izin Yonetimi & Permission Matrix
                    </h2>

                    <div className="space-y-6">
                      {/* Permission Matrix Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="pb-3 px-4">Islem / Rol</th>
                              <th className="pb-3 px-4 text-center">Admin</th>
                              <th className="pb-3 px-4 text-center">Moderator</th>
                              <th className="pb-3 px-4 text-center">Fansub</th>
                              <th className="pb-3 px-4 text-center">Kullanici</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-700/50">
                              <td className="py-3 px-4 font-medium">Manga Olusturma</td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-green-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-green-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-green-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                            </tr>
                            <tr className="border-b border-gray-700/50">
                              <td className="py-3 px-4 font-medium">Manga Onaylama</td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-green-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-green-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                            </tr>
                            <tr className="border-b border-gray-700/50">
                              <td className="py-3 px-4 font-medium">Kullanici Yonetimi</td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-green-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-yellow-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                            </tr>
                            <tr className="border-b border-gray-700/50">
                              <td className="py-3 px-4 font-medium">Sistem Ayarlari</td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-green-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                            </tr>
                            <tr className="border-b border-gray-700/50">
                              <td className="py-3 px-4 font-medium">Log Goruntuleme</td>
                              <td className="py-3 px-4 text-center"><CheckCircle className="h-5 w-5 text-green-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                              <td className="py-3 px-4 text-center"><XCircle className="h-5 w-5 text-red-400 mx-auto" /></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
                        <h3 className="font-semibold mb-2 text-purple-400">Izin Aciklamalari</h3>
                        <ul className="space-y-2 text-sm text-gray-300">
                          <li><strong>Admin:</strong> Tam yetki - tum islemleri gerceklestirebilir</li>
                          <li><strong>Moderator:</strong> Icerik onaylama ve temel kullanici yonetimi</li>
                          <li><strong>Fansub:</strong> Manga ve bolum yukleme, kendi icerigini duzenleme</li>
                          <li><strong>Kullanici:</strong> Okuma, yorum yapma, favorilere ekleme</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Settings */}
                {settingsSubTab === 'system-settings' && (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Database className="h-6 w-6 text-green-400" />
                        Sistem Ayarlari
                      </h2>
                      <div className="flex gap-2">
                        <select
                          value={settingsCategory}
                          onChange={(e) => {
                            setSettingsCategory(e.target.value);
                            setTimeout(loadSystemSettings, 100);
                          }}
                          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="all">Tum Kategoriler</option>
                          <option value="general">Genel</option>
                          <option value="content">Icerik</option>
                          <option value="security">Guvenlik</option>
                          <option value="ui">Arayuz</option>
                        </select>
                        <button
                          onClick={loadSystemSettings}
                          disabled={loadingSettings}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 rounded-lg transition-all"
                        >
                          {loadingSettings ? 'Yukleniyor...' : 'Yenile'}
                        </button>
                      </div>
                    </div>

                    {loadingSettings ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {systemSettings.map((setting) => (
                          <div key={setting.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{setting.setting_key}</h3>
                                <span className="px-2 py-0.5 bg-gray-600 rounded text-xs">{setting.category}</span>
                              </div>
                              <p className="text-sm text-gray-400">{setting.description}</p>
                              <div className="mt-2 text-xs text-gray-500">
                                Deger: <code className="bg-gray-800 px-2 py-1 rounded">{JSON.stringify(setting.setting_value)}</code>
                              </div>
                            </div>
                            <button
                              onClick={() => setEditingSetting(setting)}
                              className="p-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                              title="Duzenle"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {systemSettings.length === 0 && (
                          <div className="text-center py-12 text-gray-400">
                            <Database className="h-16 w-16 mx-auto mb-3 text-gray-600" />
                            <p>Ayar bulunamadi</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* System Logs */}
                {settingsSubTab === 'logs' && (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <ScrollText className="h-6 w-6 text-orange-400" />
                        Sistem Log Kayitlari
                      </h2>
                      <div className="flex gap-2">
                        {/* 🔒 GÜVENLİK KONTROLÜ: Export CSV - Log görüntüleme yetkisi */}
                        {canViewLogs() ? (
                          <button
                            onClick={exportLogsToCSV}
                            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Export CSV
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Log görüntüleme yetkiniz bulunmuyor"
                            className="px-3 py-2 bg-gray-600 cursor-not-allowed rounded-lg text-sm flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Export CSV
                          </button>
                        )}

                        {/* 🔒 GÜVENLİK KONTROLÜ: Delete logs - SADECE ADMIN */}
                        {isAdmin ? (
                          <button
                            onClick={() => deleteOldLogs(30)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm"
                          >
                            30 Gun Eski Logları Sil
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Log silme işlemi sadece Admin yetkisine sahip kullanıcılar tarafından yapılabilir"
                            className="px-3 py-2 bg-gray-600 cursor-not-allowed rounded-lg text-sm"
                          >
                            30 Gun Eski Logları Sil
                          </button>
                        )}
                        <button
                          onClick={loadSystemLogs}
                          disabled={loadingLogs}
                          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 rounded-lg transition-all"
                        >
                          {loadingLogs ? 'Yukleniyor...' : 'Yenile'}
                        </button>
                      </div>
                    </div>

                    {/* Log Filters */}
                    <div className="mb-4 p-4 bg-gray-700/30 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Tip</label>
                          <select
                            value={logFilter.type}
                            onChange={(e) => {
                              setLogFilter({ ...logFilter, type: e.target.value });
                              setTimeout(loadSystemLogs, 100);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="all">Tum Tipler</option>
                            <option value="user_action">Kullanici Islemleri</option>
                            <option value="security">Guvenlik</option>
                            <option value="system">Sistem</option>
                            <option value="performance">Performans</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Onem</label>
                          <select
                            value={logFilter.severity}
                            onChange={(e) => {
                              setLogFilter({ ...logFilter, severity: e.target.value });
                              setTimeout(loadSystemLogs, 100);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="all">Tum Seviyeler</option>
                            <option value="info">Bilgi</option>
                            <option value="warning">Uyari</option>
                            <option value="error">Hata</option>
                            <option value="critical">Kritik</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Arama</label>
                          <input
                            type="text"
                            value={logFilter.search}
                            onChange={(e) => {
                              setLogFilter({ ...logFilter, search: e.target.value });
                              setTimeout(loadSystemLogs, 300);
                            }}
                            placeholder="Islem veya aciklama..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {loadingLogs ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {systemLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-3 rounded-lg border ${
                              log.severity === 'critical' ? 'bg-red-900/20 border-red-700/50' :
                              log.severity === 'error' ? 'bg-red-900/10 border-red-700/30' :
                              log.severity === 'warning' ? 'bg-yellow-900/10 border-yellow-700/30' :
                              'bg-gray-700/30 border-gray-700/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    log.severity === 'critical' ? 'bg-red-600 text-white' :
                                    log.severity === 'error' ? 'bg-red-500 text-white' :
                                    log.severity === 'warning' ? 'bg-yellow-500 text-black' :
                                    'bg-gray-600 text-white'
                                  }`}>
                                    {log.severity}
                                  </span>
                                  <span className="px-2 py-0.5 bg-gray-600 rounded text-xs">{log.log_type}</span>
                                  <span className="text-sm font-medium">{log.action}</span>
                                </div>
                                <p className="text-sm text-gray-400">{log.description}</p>
                              </div>
                              <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('tr-TR')}</span>
                            </div>
                          </div>
                        ))}
                        {systemLogs.length === 0 && (
                          <div className="text-center py-12 text-gray-400">
                            <ScrollText className="h-16 w-16 mx-auto mb-3 text-gray-600" />
                            <p>Log kaydı bulunamadi</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Edit Manga Modal */}
      {editingManga && (
        <EditMangaModal
          manga={editingManga}
          onClose={() => setEditingManga(null)}
          onSave={updateManga}
        />
      )}

      {/* Edit Setting Modal */}
      {editingSetting && (
        <EditSettingModal
          setting={editingSetting}
          onClose={() => setEditingSetting(null)}
          onSave={updateSystemSetting}
        />
      )}
    </AdminGuard>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, loading }: { 
  title: string; 
  value: number; 
  icon: any; 
  color: string;
  loading?: boolean;
}) {
  const colorClasses: { [key: string]: string } = {
    blue: 'from-blue-900/40 to-blue-800/20 border-blue-700/30 text-blue-400',
    green: 'from-green-900/40 to-green-800/20 border-green-700/30 text-green-400',
    yellow: 'from-yellow-900/40 to-yellow-800/20 border-yellow-700/30 text-yellow-400',
    purple: 'from-purple-900/40 to-purple-800/20 border-purple-700/30 text-purple-400',
    orange: 'from-orange-900/40 to-orange-800/20 border-orange-700/30 text-orange-400',
    pink: 'from-pink-900/40 to-pink-800/20 border-pink-700/30 text-pink-400',
    indigo: 'from-indigo-900/40 to-indigo-800/20 border-indigo-700/30 text-indigo-400',
    emerald: 'from-emerald-900/40 to-emerald-800/20 border-emerald-700/30 text-emerald-400',
    red: 'from-red-900/40 to-red-800/20 border-red-700/30 text-red-400',
    cyan: 'from-cyan-900/40 to-cyan-800/20 border-cyan-700/30 text-cyan-400',
    teal: 'from-teal-900/40 to-teal-800/20 border-teal-700/30 text-teal-400',
    amber: 'from-amber-900/40 to-amber-800/20 border-amber-700/30 text-amber-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm border p-6 rounded-xl shadow-lg hover:scale-105 transition-transform`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-8 w-8" />
      </div>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
          <p className="text-lg text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          <p className="text-sm text-gray-300">{title}</p>
        </>
      )}
    </div>
  );
}

// Manga Card Component
function MangaCard({ manga, onApprove, onReject }: {
  manga: PendingManga;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all group">
      {manga.cover_image_url ? (
        <div className="relative overflow-hidden">
          <img 
            src={manga.cover_image_url} 
            alt={manga.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-600 flex items-center justify-center">
          <BookOpen className="h-20 w-20 text-gray-500" />
        </div>
      )}
      
      <div className="p-5">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{manga.title}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
          {manga.description || 'Açıklama yok'}
        </p>
        
        <div className="text-xs text-gray-500 mb-3 space-y-1">
          <p>Yazar: {manga.author || 'Bilinmiyor'}</p>
          <p>Çizer: {manga.artist || 'Bilinmiyor'}</p>
          <p>Oluşturan: {manga.profiles?.username || 'Bilinmiyor'}</p>
        </div>

        {manga.manga_categories && manga.manga_categories.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {manga.manga_categories.map((mc, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${mc.categories.color}20`,
                    color: mc.categories.color,
                    border: `1px solid ${mc.categories.color}40`
                  }}
                >
                  <Tag className="h-3 w-3" />
                  {mc.categories.name}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <button 
            onClick={() => onApprove(manga.id)}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Onayla
          </button>
          <button 
            onClick={() => onReject(manga.id)}
            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Manga Modal Component
function EditMangaModal({ manga, onClose, onSave }: {
  manga: MangaItem;
  onClose: () => void;
  onSave: (mangaId: string, updates: Partial<MangaItem>) => void;
}) {
  const [formData, setFormData] = useState({
    title: manga.title || '',
    description: manga.description || '',
    author: manga.author || '',
    artist: manga.artist || '',
    status: manga.status || 'ongoing',
    approval_status: manga.approval_status || 'pending',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(manga.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Manga Duzenle</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Baslik</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Aciklama</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Yazar</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cizer</label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Durum</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ongoing">Devam Ediyor</option>
                <option value="completed">Tamamlandi</option>
                <option value="hiatus">Ara Verdi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Onay Durumu</label>
              <select
                value={formData.approval_status}
                onChange={(e) => setFormData(prev => ({ ...prev, approval_status: e.target.value as any }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="pending">Bekliyor</option>
                <option value="approved">Onaylandi</option>
                <option value="rejected">Reddedildi</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg font-medium transition-colors"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Iptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Edit Setting Modal Component
function EditSettingModal({ 
  setting, 
  onClose, 
  onSave 
}: { 
  setting: SystemSetting; 
  onClose: () => void; 
  onSave: (settingId: string, newValue: any) => void;
}) {
  const [value, setValue] = useState<string>(JSON.stringify(setting.setting_value, null, 2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedValue = JSON.parse(value);
      onSave(setting.id, parsedValue);
    } catch (error) {
      toast.error('Geçersiz JSON formatı');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Ayar Duzenle</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Anahtar</label>
            <input
              type="text"
              value={setting.setting_key}
              disabled
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Kategori</label>
            <input
              type="text"
              value={setting.category}
              disabled
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Açıklama</label>
            <p className="text-sm text-gray-400">{setting.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Değer (JSON Format)
            </label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              rows={8}
              placeholder='{"key": "value"}'
            />
            <p className="text-xs text-gray-500 mt-1">
              JSON formatında yazın. Örnek: "metin" veya 123 veya true veya ["liste"]
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Kaydet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

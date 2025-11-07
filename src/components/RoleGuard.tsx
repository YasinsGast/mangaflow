import React from 'react';
import { useRoleCheck, UserRole } from '../hooks/useRoleCheck';
import { Shield, AlertCircle } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

/**
 * RoleGuard - Belirli rollere sahip kullanıcılar için sayfa koruma bileşeni
 * 
 * @param children - Gösterilecek içerik
 * @param allowedRoles - İzin verilen roller
 * @param fallback - Yetkisiz erişim durumunda gösterilecek içerik
 * @param showMessage - Yetkisiz erişim mesajı göster
 */
export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback, 
  showMessage = true 
}: RoleGuardProps) {
  const { hasRole, loading } = useRoleCheck(allowedRoles);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!hasRole()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Erişim Reddedildi</h2>
            <p className="text-gray-400 mb-4">
              Bu sayfaya erişim için gerekli yetkilere sahip değilsiniz.
            </p>
            <p className="text-sm text-gray-500">
              Gerekli roller: {allowedRoles.join(', ')}
            </p>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

// Hızlı kullanım için hazır bileşenler
export function AdminGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RoleGuard allowedRoles={['admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function ModeratorGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RoleGuard allowedRoles={['moderator', 'admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function FansubGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RoleGuard allowedRoles={['fansub', 'moderator', 'admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function ContentCreatorGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RoleGuard allowedRoles={['fansub', 'moderator', 'admin']} fallback={fallback}>{children}</RoleGuard>;
}
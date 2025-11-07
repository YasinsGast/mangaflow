import { useUserRole, UserRole } from './useUserRole';

export type { UserRole };

export function useRoleCheck(allowedRoles?: UserRole[]) {
  const { userRole, loading, isAdmin, isModerator, isFansub, isUser } = useUserRole();

  // Temel rol kontrolleri
  const hasRole = (roles?: UserRole[]) => {
    if (loading) return false;
    if (roles) return roles.includes(userRole);
    return allowedRoles ? allowedRoles.includes(userRole) : false;
  };

  const hasAnyRole = (roles: UserRole[]) => {
    if (loading) return false;
    return roles.includes(userRole);
  };

  const isModeratorOrAdmin = () => {
    if (loading) return false;
    return userRole === 'moderator' || userRole === 'admin';
  };

  // Yetenek bazlı kontroller
  const canCreateContent = () => {
    if (loading) return false;
    return ['fansub', 'moderator', 'admin'].includes(userRole);
  };

  const canModerate = () => {
    if (loading) return false;
    return ['moderator', 'admin'].includes(userRole);
  };

  const canApproveContent = () => {
    if (loading) return false;
    return ['moderator', 'admin'].includes(userRole);
  };

  const canManageUsers = () => {
    if (loading) return false;
    return userRole === 'admin';
  };

  const canViewLogs = () => {
    if (loading) return false;
    return ['moderator', 'admin'].includes(userRole);
  };

  const canManageSystem = () => {
    if (loading) return false;
    return userRole === 'admin';
  };

  // Premium content erişimi
  const canAccessPremiumContent = () => {
    if (loading) return false;
    return ['fansub', 'moderator', 'admin'].includes(userRole);
  };

  // Bulk operations yetkileri
  const canPerformBulkOperations = () => {
    if (loading) return false;
    return ['moderator', 'admin'].includes(userRole);
  };

  const canDeleteContent = () => {
    if (loading) return false;
    return userRole === 'admin'; // Sadece admin silebilir
  };

  return {
    // Rol bilgileri
    userRole,
    loading,
    
    // Temel kontroller
    hasRole,
    hasAnyRole,
    
    // Rol kontrolleri (from useUserRole, these are boolean values)
    isAdmin,
    isModerator,
    isModeratorOrAdmin,
    isFansub,
    isUser,
    
    // Yetenek kontrolleri
    canCreateContent,
    canModerate,
    canApproveContent,
    canManageUsers,
    canViewLogs,
    canManageSystem,
    
    // Özel yetenekler
    canAccessPremiumContent,
    canPerformBulkOperations,
    canDeleteContent,
    
    // Konfor fonksiyonları (useUserRole'dan gelen)
    profile: null, // useUserRole'dan gelen profile bilgisi
    error: null,
  };
}
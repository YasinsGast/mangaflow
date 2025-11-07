import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Menu, X, User, Search, LogOut, ChevronDown, Shield, Book, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const { user: authUser, signOut } = useAuth();
  const { 
    canCreateContent, 
    canModerate, 
    canManageUsers, 
    isAdmin, 
    isModerator, 
    isFansub,
    loading: roleLoading 
  } = useRoleCheck();
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ['rgba(11, 15, 25, 0.85)', 'rgba(11, 15, 25, 0.95)']
  );

  // Auth state management - useAuth context'den gelen user'ı kullan
  useEffect(() => {
    setUser(authUser);
    setLoading(!authUser && !roleLoading);
  }, [authUser, roleLoading]);

  const handleSignOut = async () => {
    await signOut();
    setShowProfileMenu(false);
    setShowProfileMenu(false);
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/library?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const mainNavLinks = [
    { href: '/', label: 'Ana Sayfa' },
    { href: '/library', label: 'Göz At' },
    { href: '/library?view=genres', label: 'Türler' },
  ];

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ 
        backgroundColor,
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      role="navigation"
      aria-label="Ana navigasyon"
    >
      <div className="container mx-auto px-6 lg:px-16 max-w-[1280px]">
        <div className="flex h-16 items-center justify-between gap-8">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-accent-primary rounded"
            aria-label="MangaFlow ana sayfa"
          >
            <span 
              className="text-h3 font-bold"
              style={{
                color: '#1E3A8A',
              }}
            >
              MangaFlow
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 flex-shrink-0">
            {mainNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-text-secondary hover:text-text-primary transition-colors duration-normal relative group focus:outline-none focus:ring-2 focus:ring-accent-primary rounded px-2 py-1"
                aria-label={link.label}
              >
                {link.label}
                <motion.span 
                  className="absolute -bottom-1 left-0 h-0.5 bg-accent-primary"
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            ))}
          </div>

          {/* Search Bar - Right Side */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md ml-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" aria-hidden="true" />
              <input
                type="search"
                placeholder="Manga ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white/10 text-text-primary rounded-lg transition-colors backdrop-blur-md"
                style={{ 
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid #3B82F6';
                  e.target.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(59, 130, 246, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
                aria-label="Manga ara"
              />
            </div>
          </form>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            {(loading || roleLoading) ? (
              <Button variant="primary" size="sm" disabled>
                <User className="h-4 w-4 mr-2" aria-hidden="true" />
                Yükleniyor...
              </Button>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-accent-primary rounded p-2"
                  aria-label="Profil menüsü"
                  aria-expanded={showProfileMenu}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-sm text-text-primary">
                    {user.email?.split('@')[0] || 'Kullanıcı'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                </button>
                
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 shadow-lg overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                    }}
                    role="menu"
                    aria-label="Kullanıcı menüsü"
                  >
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-text-primary hover:bg-white/10 transition-colors focus:outline-none focus:bg-white/10"
                      onClick={() => setShowProfileMenu(false)}
                      role="menuitem"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/library"
                      className="block px-4 py-2 text-text-primary hover:bg-white/10 transition-colors focus:outline-none focus:bg-white/10"
                      onClick={() => setShowProfileMenu(false)}
                      role="menuitem"
                    >
                      Kütüphanem
                    </Link>

                    {/* 🔒 ROL BAZLI MENÜLER */}
                    {canCreateContent() && (
                      <Link
                        to="/fansub"
                        className="block px-4 py-2 text-indigo-300 hover:bg-white/10 transition-colors focus:outline-none focus:bg-white/10"
                        onClick={() => setShowProfileMenu(false)}
                        role="menuitem"
                      >
                        <Book className="h-4 w-4 inline mr-2" aria-hidden="true" />
                        Fansub Panel
                      </Link>
                    )}

                    {canManageUsers() && (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-purple-300 hover:bg-white/10 transition-colors focus:outline-none focus:bg-white/10"
                        onClick={() => setShowProfileMenu(false)}
                        role="menuitem"
                      >
                        <Shield className="h-4 w-4 inline mr-2" aria-hidden="true" />
                        Admin Panel
                      </Link>
                    )}

                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-text-secondary hover:bg-white/10 transition-colors focus:outline-none focus:bg-white/10"
                      onClick={() => setShowProfileMenu(false)}
                      role="menuitem"
                    >
                      <Settings className="h-4 w-4 inline mr-2" aria-hidden="true" />
                      Ayarlar
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus:bg-red-500/10"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4 inline mr-2" aria-hidden="true" />
                      Çıkış Yap
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm" className="focus:ring-2 focus:ring-accent-primary">
                  <User className="h-4 w-4 mr-2" aria-hidden="true" />
                  Giriş Yap
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary rounded"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            className="md:hidden py-4 space-y-2 border-t border-border-subtle"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="menu"
          >
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Manga ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-white/10 text-text-primary placeholder:text-text-tertiary rounded-lg border border-white/10 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors"
                  aria-label="Manga ara"
                />
              </div>
            </form>

            {mainNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block py-2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary rounded px-2"
                onClick={() => setIsOpen(false)}
                role="menuitem"
              >
                {link.label}
              </Link>
            ))}
            
            <div className="pt-2 border-t border-border-subtle">
              {(loading || roleLoading) ? (
                <Button variant="primary" size="sm" className="w-full" disabled>
                  <User className="h-4 w-4 mr-2" aria-hidden="true" />
                  Yükleniyor...
                </Button>
              ) : user ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-white" aria-hidden="true" />
                    </div>
                    <span className="text-sm text-text-primary">
                      {user.email?.split('@')[0] || 'Kullanıcı'}
                    </span>
                  </div>
                  <Link
                    to="/dashboard"
                    className="block py-2 text-text-primary hover:text-accent-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/library"
                    className="block py-2 text-text-primary hover:text-accent-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Kütüphanem
                  </Link>

                  {/* 🔒 ROL BAZLI MENÜLER - MOBILE */}
                  {canCreateContent() && (
                    <Link
                      to="/fansub"
                      className="block py-2 text-indigo-300 hover:text-accent-primary transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <Book className="h-4 w-4 inline mr-2" aria-hidden="true" />
                      Fansub Panel
                    </Link>
                  )}

                  {canManageUsers() && (
                    <Link
                      to="/admin"
                      className="block py-2 text-purple-300 hover:text-accent-primary transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <Shield className="h-4 w-4 inline mr-2" aria-hidden="true" />
                      Admin Panel
                    </Link>
                  )}

                  <Link
                    to="/settings"
                    className="block py-2 text-text-secondary hover:text-accent-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="h-4 w-4 inline mr-2" aria-hidden="true" />
                    Ayarlar
                  </Link>

                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                    Çıkış Yap
                  </Button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    <User className="h-4 w-4 mr-2" aria-hidden="true" />
                    Giriş Yap
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}

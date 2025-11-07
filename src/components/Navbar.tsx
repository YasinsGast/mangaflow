import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Book, Search, User, Menu, LogOut, Settings, Shield, Users, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  isScrolled?: boolean;
}

export default function Navbar({ isScrolled = false }: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, signOut } = useAuth();
  const { canCreateContent, canModerate, canManageUsers } = useRoleCheck(['user', 'fansub', 'moderator', 'admin']);

  const navItems = [
    { label: 'Ana Sayfa', path: '/' },
    { label: 'Manga/Webtoon', path: '/library' },
    { label: 'Rastgele', path: '/random' },
    { label: 'Kategoriler', path: '/categories' },
  ];

  const ratingItems = user ? [
    { label: 'Puanlama Geçmişim', path: '/rating-history' },
    { label: 'Rating Dashboard', path: '/rating-dashboard' },
  ] : [];

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'backdrop-blur-xl bg-slate-900/80 shadow-lg shadow-purple-500/10' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        borderBottom: isScrolled ? '1px solid rgba(139, 92, 246, 0.2)' : 'none',
      }}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link to="/" className="flex items-center gap-2 group">
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Book className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                MangaFlow
              </span>
            </Link>
          </motion.div>

          {/* Navigation Links - Desktop */}
          <motion.div
            className="hidden md:flex items-center gap-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <motion.span
                  className="text-slate-300 hover:text-white font-medium relative group cursor-pointer"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                  <motion.span
                    className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"
                  />
                </motion.span>
              </Link>
            ))}
          </motion.div>

          {/* Right Actions */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {/* Search Icon */}
            <motion.button
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Ara"
            >
              <Search className="h-5 w-5 text-slate-300" />
            </motion.button>

            {/* User Menu / Login Button */}
            {user ? (
              <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <NotificationBell />
                
                <div className="relative">
                  <motion.button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Profil"
                  >
                    <User className="h-5 w-5 text-slate-300" />
                  </motion.button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 backdrop-blur-md rounded-xl shadow-lg border border-purple-500/20 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',
                    }}
                  >
                    <div className="px-4 py-3 border-b border-purple-500/20">
                      <p className="text-sm text-gray-400">Giriş Yapıldı</p>
                      <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    </div>
                    
                    <div className="py-2">
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-white/10 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4" />
                        <span>Profilim</span>
                      </Link>

                      {canCreateContent() && (
                        <Link
                          to="/fansub"
                          className="flex items-center gap-2 px-4 py-2 text-indigo-300 hover:bg-white/10 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Book className="h-4 w-4" />
                          <span>Fansub Panel</span>
                        </Link>
                      )}

                      {canManageUsers() && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-purple-300 hover:bg-white/10 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Shield className="h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      {/* Rating Links */}
                      {ratingItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2 px-4 py-2 text-yellow-300 hover:bg-white/10 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Star className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                      
                      <Link
                        to="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-white/10 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Ayarlar</span>
                      </Link>
                      
                      <button
                        onClick={async () => {
                          await signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  </motion.div>
                )}
                </div>
              </div>
            ) : (
              <Link to="/login">
                <motion.button
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Giriş Yap
                </motion.button>
              </Link>
            )}

            {/* Mobile Menu Icon */}
            <motion.button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Menü"
            >
              <Menu className="h-5 w-5 text-slate-300" />
            </motion.button>
          </motion.div>

        </div>
      </div>
    </motion.nav>
  );
}

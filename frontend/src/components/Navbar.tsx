import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, ChevronDown, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasAdminAccess } from '@/types';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
  { path: '/events', label: 'Events' },
  { path: '/team', label: 'Team' },
  { path: '/library', label: 'Library' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
  }, [location]);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-vyto-bg/85 backdrop-blur-2xl border-b border-vyto-border/60 shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-vyto-cyan to-vyto-blue flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-white">Vyto</span>
              <span className="text-vyto-cyan">Verse</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-vyto-cyan'
                      : 'text-vyto-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-vyto-cyan/10 rounded-lg border border-vyto-cyan/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vyto-cyan to-vyto-violet flex items-center justify-center text-white text-sm font-bold">
                    {user?.profile_image ? (
                      <img src={user.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user?.name?.charAt(0)?.toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown className="w-4 h-4 text-vyto-text-muted" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 glass-card p-2 rounded-xl"
                    >
                      <div className="px-3 py-2 border-b border-vyto-border mb-1">
                        <p className="text-sm font-medium text-white">{user?.name}</p>
                        <p className="text-xs text-vyto-text-muted">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-vyto-text-secondary hover:text-white hover:bg-white/5 transition-all"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      {user && hasAdminAccess(user.role) && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-vyto-text-secondary hover:text-white hover:bg-white/5 transition-all"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-vyto-error hover:bg-vyto-error/10 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm !py-2 !px-4">
                  Log in
                </Link>
                <Link to="/signup" className="btn-primary text-sm !py-2 !px-4">
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg text-vyto-text-secondary hover:text-white hover:bg-white/5"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-vyto-bg/95 backdrop-blur-xl border-t border-vyto-border"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === link.path
                      ? 'text-vyto-cyan bg-vyto-cyan/10'
                      : 'text-vyto-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-vyto-border mt-3 space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link to="/profile" className="block px-4 py-3 rounded-lg text-sm text-vyto-text-secondary hover:text-white hover:bg-white/5">
                      Profile
                    </Link>
                    {user && hasAdminAccess(user.role) && (
                      <Link to="/admin" className="block px-4 py-3 rounded-lg text-sm text-vyto-text-secondary hover:text-white hover:bg-white/5">
                        Admin Dashboard
                      </Link>
                    )}
                    <button onClick={logout} className="block w-full text-left px-4 py-3 rounded-lg text-sm text-vyto-error hover:bg-vyto-error/10">
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 px-4">
                    <Link to="/login" className="btn-secondary text-sm flex-1 !py-2.5">
                      Log in
                    </Link>
                    <Link to="/signup" className="btn-primary text-sm flex-1 !py-2.5">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

import { Link } from 'react-router-dom';
import { Code2, Globe, AtSign, Mail, ArrowUpRight } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="relative border-t border-vyto-border bg-vyto-bg-2/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <Logo size={36} className="rounded-lg" />
            </Link>
            <p className="text-sm text-vyto-text-muted leading-relaxed mb-6">
              Where Innovation Meets Code. A futuristic technology club platform for builders, creators, and innovators.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Code2, href: '#', label: 'GitHub' },
                { icon: Globe, href: '#', label: 'LinkedIn' },
                { icon: AtSign, href: '#', label: 'Twitter' },
                { icon: Mail, href: '#', label: 'Email' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-lg bg-vyto-surface border border-vyto-border flex items-center justify-center text-vyto-text-muted hover:text-vyto-cyan hover:border-vyto-cyan/30 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            {
              title: 'Platform',
              links: [
                { label: 'Events', to: '/events' },
                { label: 'Library', to: '/library' },
                { label: 'Team', to: '/team' },
                { label: 'About', to: '/about' },
              ],
            },
            {
              title: 'Resources',
              links: [
                { label: 'Getting Started', to: '/library' },
                { label: 'Documentation', to: '/library' },
                { label: 'Tutorials', to: '/library' },
              ],
            },
            {
              title: 'Account',
              links: [
                { label: 'Sign Up', to: '/signup' },
                { label: 'Log In', to: '/login' },
                { label: 'Profile', to: '/profile' },
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-vyto-text-muted hover:text-vyto-cyan transition-colors flex items-center gap-1 group"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-vyto-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-vyto-text-muted">
            &copy; {new Date().getFullYear()} VytoVerse. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-vyto-text-muted hover:text-vyto-cyan transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-vyto-text-muted hover:text-vyto-cyan transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

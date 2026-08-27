import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Code2, Globe, AtSign, Trophy, Search, Shield, Star, Crown } from 'lucide-react';
import { teamAPI } from '@/services/api';
import { hasAdminAccess, roleDisplayLabel, type User } from '@/types';

export default function Team() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    teamAPI
      .list()
      .then((r) => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(search.toLowerCase())) ||
      (m.team_role && m.team_role.toLowerCase().includes(search.toLowerCase())) ||
      (m.bio && m.bio.toLowerCase().includes(search.toLowerCase()))
  );

  // Separate admin-level from regular team members
  const adminMembers = filtered.filter((m) => hasAdminAccess(m.role));
  const regularMembers = filtered.filter((m) => !hasAdminAccess(m.role));

  return (
    <div className="relative pt-24">
      <section className="section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">Our Team</span>
            <h1 className="text-4xl sm:text-5xl font-bold mt-4 mb-4">
              Meet the <span className="gradient-text">VytoVerse</span> team
            </h1>
            <p className="text-lg text-vyto-text-secondary max-w-2xl mx-auto">
              The passionate individuals driving innovation and building community.
            </p>
          </motion.div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyto-text-muted" />
              <input
                type="text"
                placeholder="Search by name, role, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-10"
              />
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card p-8 animate-pulse text-center">
                  <div className="w-24 h-24 rounded-full bg-vyto-border mx-auto mb-4" />
                  <div className="h-5 bg-vyto-border rounded w-1/2 mx-auto mb-2" />
                  <div className="h-4 bg-vyto-border rounded w-1/3 mx-auto mb-4" />
                  <div className="h-8 bg-vyto-border rounded w-24 mx-auto" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-white mb-2">No team members found</h3>
              <p className="text-vyto-text-muted">Try a different search term.</p>
            </div>
          ) : (
            <>
              {/* Admin / Leadership */}
              {adminMembers.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-6">
                    <Shield className="w-5 h-5 text-vyto-violet" />
                    <h2 className="text-lg font-semibold text-white">Leadership</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {adminMembers.map((member, i) => (
                      <TeamCard key={member.id} member={member} index={i} featured />
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              {regularMembers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Crown className="w-5 h-5 text-vyto-cyan" />
                    <h2 className="text-lg font-semibold text-white">Team Members</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularMembers.map((member, i) => (
                      <TeamCard key={member.id} member={member} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── Team Card Component ─── */
function TeamCard({ member, index, featured = false }: { member: User; index: number; featured?: boolean }) {
  const socialLinks = [
    member.github_url && { icon: Code2, url: member.github_url, label: 'GitHub' },
    member.linkedin_url && { icon: Globe, url: member.linkedin_url, label: 'LinkedIn' },
    member.twitter_url && { icon: AtSign, url: member.twitter_url, label: 'Twitter' },
    member.website_url && { icon: Globe, url: member.website_url, label: 'Website' },
  ].filter(Boolean) as { icon: React.ElementType; url: string; label: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className={`glass-card-hover p-8 text-center group relative overflow-hidden ${
        featured ? 'border-vyto-violet/20' : ''
      }`}
    >
      {/* Subtle gradient top accent */}
      <div className={`absolute top-0 left-0 right-0 h-px ${
        featured
          ? 'bg-gradient-to-r from-transparent via-vyto-violet/40 to-transparent'
          : 'bg-gradient-to-r from-transparent via-vyto-cyan/30 to-transparent'
      }`} />

      {/* Avatar */}
      <div className={`w-24 h-24 rounded-full mx-auto mb-5 overflow-hidden border-2 transition-all duration-300 ${
        featured
          ? 'bg-gradient-to-br from-vyto-violet/30 to-vyto-cyan/30 border-vyto-violet/30 group-hover:border-vyto-violet/50 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]'
          : 'bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 border-vyto-border group-hover:border-vyto-cyan/40 group-hover:shadow-[0_0_30px_rgba(0,212,255,0.12)]'
      }`}>
        {member.profile_image ? (
          <img
            src={member.profile_image}
            alt={member.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
              {member.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-white mb-1">{member.name}</h3>

      {/* Team Role - prominently displayed */}
      {member.team_role && (
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold ${
            featured
              ? 'bg-vyto-violet/10 text-vyto-violet border border-vyto-violet/20'
              : 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20'
          }`}>
            {hasAdminAccess(member.role) && <Shield className="w-3.5 h-3.5" />}
            {member.team_role}
          </span>
        </div>
      )}

      {/* Department */}
      {member.department && (
        <p className="text-sm text-vyto-text-muted mb-2">{member.department}</p>
      )}

      {/* Badges */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {hasAdminAccess(member.role) && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${member.role === 'president' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : member.role === 'vice_president' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-vyto-violet/10 text-vyto-violet border border-vyto-violet/20'}`}>
            {member.role === 'president' || member.role === 'vice_president' ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />} {roleDisplayLabel(member.role)}
          </span>
        )}
        {member.team_membership === 1 && member.role !== 'admin' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20">
            Team Member
          </span>
        )}
      </div>

      {/* Bio */}
      {member.bio && (
        <p className="text-sm text-vyto-text-secondary mt-1 mb-4 line-clamp-2">{member.bio}</p>
      )}

      {/* Stars */}
      {member.stars > 0 && (
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-yellow-400">{member.stars} stars</span>
        </div>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div className="flex justify-center gap-2">
          {socialLinks.map(({ icon: Icon, url, label }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="w-9 h-9 rounded-lg bg-vyto-surface border border-vyto-border flex items-center justify-center text-vyto-text-muted hover:text-vyto-cyan hover:border-vyto-cyan/30 transition-all duration-200"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

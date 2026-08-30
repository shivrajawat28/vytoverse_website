import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Code2, Globe, AtSign, Trophy, Search, Crown, Shield } from 'lucide-react';
import { teamAPI } from '@/services/api';
import { type User } from '@/types';
import { getAssetUrl } from '@/utils/assets';

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
      (m.bio && m.bio.toLowerCase().includes(search.toLowerCase())) ||
      m.role.toLowerCase().includes(search.toLowerCase())
  );

  // Leadership: PRESIDENT and VICE_PRESIDENT only
  // Order: President first, then Vice President
  const leadershipRoles: Array<{ role: string; label: string }> = [
    { role: 'president', label: 'President' },
    { role: 'vice_president', label: 'Vice President' },
  ];

  const leadershipMembers = filtered.filter(
    (m) => m.role === 'president' || m.role === 'vice_president'
  );

  // Sorted by hierarchy order
  const sortedLeadership = leadershipRoles
    .map((r) => leadershipMembers.find((m) => m.role === r.role))
    .filter(Boolean) as User[];

  // Team Members: everyone else (not president/vice_president)
  const teamMembers = filtered.filter(
    (m) => m.role !== 'president' && m.role !== 'vice_president'
  );

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
              Meet the <span className="gradient-text">VytoVerse</span> Team
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
              {/* Leadership Section */}
              {sortedLeadership.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-purple-500/20 border border-yellow-500/20 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Leadership</h2>
                    </div>
                  </div>
                  {/* Divider below heading */}
                  <div className="h-px bg-gradient-to-r from-transparent via-vyto-border to-transparent mb-6" />
                  <div className="grid sm:grid-cols-2 gap-6">
                    {sortedLeadership.map((member, i) => (
                      <LeadershipCard key={member.id} member={member} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Visual divider between Leadership and Team Members */}
              {sortedLeadership.length > 0 && teamMembers.length > 0 && (
                <div className="my-10">
                  <div className="h-px bg-gradient-to-r from-transparent via-vyto-border to-transparent" />
                </div>
              )}

              {/* Team Members Section */}
              {teamMembers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vyto-cyan/20 to-vyto-violet/20 border border-vyto-cyan/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-vyto-cyan" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Team Members</h2>
                      <p className="text-sm text-vyto-text-muted">The backbone of our community</p>
                    </div>
                  </div>
                  {/* Divider below heading */}
                  <div className="h-px bg-gradient-to-r from-transparent via-vyto-border to-transparent mb-6" />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamMembers.map((member, i) => (
                      <TeamMemberCard key={member.id} member={member} index={i} />
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

/* ─── Leadership Card ─── */
function LeadershipCard({ member, index }: { member: User; index: number }) {
  const roleLabel = member.role === 'president' ? 'President' : 'Vice President';
  const isPresident = member.role === 'president';

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
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="glass-card-hover p-8 text-center group relative overflow-hidden border-vyto-violet/15"
    >
      {/* Top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vyto-violet/40 to-transparent" />

      {/* Subtle glow behind avatar */}
      <div className={`absolute top-6 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-2xl opacity-20 ${
        isPresident ? 'bg-yellow-400' : 'bg-vyto-violet'
      }`} />

      {/* Avatar */}
      <div className={`w-28 h-28 rounded-full mx-auto mb-5 overflow-hidden border-2 transition-all duration-300 relative z-10 ${
        isPresident
          ? 'bg-gradient-to-br from-yellow-500/30 to-amber-500/30 border-yellow-500/30 group-hover:border-yellow-400/50 group-hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]'
          : 'bg-gradient-to-br from-vyto-violet/30 to-purple-500/30 border-vyto-violet/30 group-hover:border-vyto-violet/50 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]'
      }`}>
        {member.profile_image ? (
          <img
            src={getAssetUrl(member.profile_image, member.updated_at || undefined) || member.profile_image}
            alt={member.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
              {member.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>

      {/* Role badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold ${
          isPresident
            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
        }`}>
          {isPresident ? <Crown className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
          {roleLabel}
        </span>
      </div>

      {/* Bio */}
      {member.bio && (
        <p className="text-sm text-vyto-text-secondary mb-4 line-clamp-3 leading-relaxed">{member.bio}</p>
      )}

      {/* Department */}
      {member.department && (
        <p className="text-xs text-vyto-text-muted mb-4">{member.department}</p>
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

/* ─── Team Member Card ─── */
function TeamMemberCard({ member, index }: { member: User; index: number }) {
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
      className="glass-card-hover p-8 text-center group relative overflow-hidden"
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vyto-cyan/30 to-transparent" />

      {/* Avatar */}
      <div className="w-24 h-24 rounded-full mx-auto mb-5 overflow-hidden border-2 bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 border-vyto-border group-hover:border-vyto-cyan/40 group-hover:shadow-[0_0_30px_rgba(0,212,255,0.12)] transition-all duration-300">
        {member.profile_image ? (
          <img
            src={getAssetUrl(member.profile_image, member.updated_at || undefined) || member.profile_image}
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

      {/* Team Role */}
      {member.team_role && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20">
            {member.team_role}
          </span>
        </div>
      )}

      {/* Department */}
      {member.department && (
        <p className="text-sm text-vyto-text-muted mb-2">{member.department}</p>
      )}

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

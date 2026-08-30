import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Code2, Globe, AtSign, Trophy, Search, Crown, Shield, X, type LucideIcon } from 'lucide-react';
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

  // Search filtering across name, department, team_role, role, bio
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q)) ||
        (m.team_role && m.team_role.toLowerCase().includes(q)) ||
        (m.bio && m.bio.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q))
    );
  }, [members, search]);

  // Authoritative Leadership Classification by SYSTEM role
  const presidents = useMemo(
    () => filtered.filter((m) => m.role === 'president'),
    [filtered]
  );

  const vicePresidents = useMemo(
    () => filtered.filter((m) => m.role === 'vice_president'),
    [filtered]
  );

  // Team Members: strictly everyone who is NOT president and NOT vice_president
  const teamMembers = useMemo(
    () => filtered.filter((m) => m.role !== 'president' && m.role !== 'vice_president'),
    [filtered]
  );

  const hasLeadership = presidents.length > 0 || vicePresidents.length > 0;
  const hasTeamMembers = teamMembers.length > 0;
  const hasAnyResults = hasLeadership || hasTeamMembers;

  return (
    <div className="relative pt-24 pb-20">
      <section className="section-padding !py-8 sm:!py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10 sm:mb-12"
          >
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-vyto-cyan bg-vyto-cyan/10 border border-vyto-cyan/20 uppercase mb-4">
              Our Community
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
              Meet the <span className="gradient-text">VytoVerse</span> Team
            </h1>
            <p className="text-base sm:text-lg text-vyto-text-secondary max-w-2xl mx-auto leading-relaxed">
              The passionate innovators, builders, and leaders shaping the student technology ecosystem.
            </p>
          </motion.div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vyto-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, role, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-10 !pr-10 !py-2.5 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-vyto-text-muted hover:text-white p-1 rounded transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="space-y-12">
              <div className="space-y-4">
                <div className="h-6 w-32 bg-vyto-border/60 rounded-md animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            </div>
          ) : !hasAnyResults ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center max-w-md mx-auto my-8 border-vyto-border"
            >
              <div className="w-14 h-14 rounded-2xl bg-vyto-surface flex items-center justify-center mx-auto mb-4 border border-vyto-border text-vyto-text-muted">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No team members found</h3>
              <p className="text-sm text-vyto-text-muted mb-5 leading-relaxed">
                We couldn't find anyone matching <span className="text-white">"{search}"</span>. Try a different keyword or clear the search.
              </p>
              <button
                onClick={() => setSearch('')}
                className="btn-secondary !py-2 !px-4 text-xs font-semibold"
              >
                Clear Search
              </button>
            </motion.div>
          ) : (
            <div className="space-y-12 sm:space-y-14">
              {/* SECTION 1 — LEADERSHIP */}
              {hasLeadership && (
                <div className="space-y-10">
                  {/* Leadership Section Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                      <Crown className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Leadership</h2>
                      <p className="text-xs text-vyto-text-muted">Guiding vision and strategic execution</p>
                    </div>
                  </div>

                  {/* Subsection: President(s) */}
                  {presidents.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-amber-300">
                          {presidents.length > 1 ? 'Presidents' : 'President'}
                        </h3>
                        <span className="text-xs text-vyto-text-muted font-mono">({presidents.length})</span>
                      </div>
                      <div className={getResponsiveGridClass(presidents.length)}>
                        {presidents.map((member, i) => (
                          <TeamCard
                            key={member.id}
                            member={member}
                            isLeadership
                            leadershipType="president"
                            priorityIndex={i}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subsection: Vice President(s) */}
                  {vicePresidents.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-purple-300">
                          {vicePresidents.length > 1 ? 'Vice Presidents' : 'Vice President'}
                        </h3>
                        <span className="text-xs text-vyto-text-muted font-mono">({vicePresidents.length})</span>
                      </div>
                      <div className={getResponsiveGridClass(vicePresidents.length)}>
                        {vicePresidents.map((member, i) => (
                          <TeamCard
                            key={member.id}
                            member={member}
                            isLeadership
                            leadershipType="vice_president"
                            priorityIndex={i}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Visual Divider Between Leadership & Team Members */}
              {hasLeadership && hasTeamMembers && (
                <div className="relative py-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-vyto-border-light to-transparent" />
                </div>
              )}

              {/* SECTION 2 — TEAM MEMBERS */}
              {hasTeamMembers && (
                <div className="space-y-8">
                  {/* Team Members Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-vyto-cyan/10 border border-vyto-cyan/25 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.08)]">
                      <Shield className="w-5 h-5 text-vyto-cyan" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Team Members</h2>
                      <p className="text-xs text-vyto-text-muted">The backbone and driving force of our community</p>
                    </div>
                  </div>

                  {/* Team Members Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamMembers.map((member, i) => (
                      <TeamCard
                        key={member.id}
                        member={member}
                        isLeadership={false}
                        priorityIndex={i}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Responsive grid arrangement:
 * 1 card -> centered max-w-sm
 * 2 cards -> 2 columns centered max-w-2xl
 * 3+ cards -> 3 columns full-width grid
 */
function getResponsiveGridClass(count: number): string {
  if (count === 1) {
    return 'flex justify-center';
  }
  if (count === 2) {
    return 'grid grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto gap-6';
  }
  return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
}

/* ─── Profile Card Component (Unified & Production Styled) ─── */
interface SocialLink {
  icon: LucideIcon;
  url: string;
  label: string;
}

interface TeamCardProps {
  member: User;
  isLeadership: boolean;
  leadershipType?: 'president' | 'vice_president';
  priorityIndex: number;
}

function TeamCard({ member, isLeadership, leadershipType, priorityIndex }: TeamCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // High performance cache-busted asset URL
  const avatarUrl = useMemo(
    () => getAssetUrl(member.profile_image, member.updated_at || undefined) || member.profile_image,
    [member.profile_image, member.updated_at]
  );

  const isPresident = leadershipType === 'president';
  const isVicePresident = leadershipType === 'vice_president';

  // Role badge determination
  let roleTitle = 'Team Member';
  let badgeClasses = 'bg-vyto-cyan/10 text-vyto-cyan border-vyto-cyan/25';
  let badgeIcon = <Shield className="w-3 h-3 text-vyto-cyan shrink-0" />;

  if (isPresident) {
    roleTitle = 'President';
    badgeClasses = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    badgeIcon = <Crown className="w-3 h-3 text-amber-400 shrink-0" />;
  } else if (isVicePresident) {
    roleTitle = 'Vice President';
    badgeClasses = 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    badgeIcon = <Crown className="w-3 h-3 text-purple-400 shrink-0" />;
  } else if (member.team_role) {
    roleTitle = member.team_role;
    badgeClasses = 'bg-vyto-cyan/10 text-vyto-cyan border-vyto-cyan/25';
  }

  // Card theme styling
  let cardBorderHover = 'hover:border-vyto-cyan/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]';
  let topAccent = 'bg-gradient-to-r from-transparent via-vyto-cyan/40 to-transparent';
  let avatarRing =
    'border-vyto-border group-hover:border-vyto-cyan/50 shadow-[0_0_20px_rgba(0,212,255,0.08)]';
  let avatarGlow = 'bg-vyto-cyan/10 group-hover:bg-vyto-cyan/20';
  let fallbackBg = 'bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30';

  if (isPresident) {
    cardBorderHover =
      'border-amber-500/25 hover:border-amber-400/60 hover:shadow-[0_12px_40px_rgba(245,158,11,0.15)]';
    topAccent = 'bg-gradient-to-r from-transparent via-amber-400/60 to-transparent';
    avatarRing =
      'border-amber-500/40 group-hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]';
    avatarGlow = 'bg-amber-500/15 group-hover:bg-amber-500/30';
    fallbackBg = 'bg-gradient-to-br from-amber-500/30 to-amber-600/30';
  } else if (isVicePresident) {
    cardBorderHover =
      'border-purple-500/25 hover:border-purple-400/60 hover:shadow-[0_12px_40px_rgba(168,85,247,0.15)]';
    topAccent = 'bg-gradient-to-r from-transparent via-purple-400/60 to-transparent';
    avatarRing =
      'border-purple-500/40 group-hover:border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.2)]';
    avatarGlow = 'bg-purple-500/15 group-hover:bg-purple-500/30';
    fallbackBg = 'bg-gradient-to-br from-purple-500/30 to-violet-600/30';
  }

  // Social links extraction
  const socialLinks: SocialLink[] = [
    member.github_url ? { icon: Code2, url: member.github_url, label: 'GitHub' } : null,
    member.linkedin_url ? { icon: Globe, url: member.linkedin_url, label: 'LinkedIn' } : null,
    member.twitter_url ? { icon: AtSign, url: member.twitter_url, label: 'Twitter' } : null,
    member.website_url ? { icon: Globe, url: member.website_url, label: 'Website' } : null,
  ].filter((link): link is SocialLink => link !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(priorityIndex * 0.05, 0.3) }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`glass-card relative flex flex-col items-center text-center p-6 sm:p-7 rounded-2xl overflow-hidden transition-all duration-300 group max-w-sm w-full mx-auto ${cardBorderHover}`}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${topAccent}`} />

      {/* 1. Profile Photo */}
      <div className="relative mb-4 sm:mb-5">
        {/* Subtle Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-full blur-xl scale-110 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300 ${avatarGlow}`}
        />

        {/* Outer Avatar Frame */}
        <div
          className={`relative rounded-full overflow-hidden border-2 transition-all duration-300 ${avatarRing} ${
            isLeadership
              ? 'w-28 h-28 sm:w-32 sm:h-32'
              : 'w-24 h-24 sm:w-28 sm:h-28'
          }`}
        >
          {avatarUrl && !imageFailed ? (
            <img
              src={avatarUrl}
              alt={member.name}
              loading={isLeadership ? 'eager' : 'lazy'}
              fetchPriority={isLeadership && priorityIndex === 0 ? 'high' : 'auto'}
              decoding="async"
              width={isLeadership ? 128 : 112}
              height={isLeadership ? 128 : 112}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center font-bold text-white ${fallbackBg}`}>
              <span className={isLeadership ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}>
                {member.name ? member.name.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. User Name */}
      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight line-clamp-1 mb-1.5">
        {member.name}
      </h3>

      {/* 3. Role / Title */}
      <div className="mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${badgeClasses}`}
        >
          {badgeIcon}
          {roleTitle}
        </span>
      </div>

      {/* Department (if available) */}
      {member.department && (
        <p className="text-xs text-vyto-text-muted line-clamp-1 mb-1 font-medium">
          {member.department}
        </p>
      )}

      {/* 4. Short Bio */}
      {member.bio && (
        <p className="text-xs sm:text-sm text-vyto-text-secondary leading-relaxed line-clamp-3 mt-2 px-1">
          {member.bio}
        </p>
      )}

      {/* Spacer to push social & stars to bottom if height varies */}
      <div className="flex-1 min-h-[0.5rem]" />

      {/* Stars Badge (if any) */}
      {member.stars > 0 && (
        <div className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-400 mt-3 px-2.5 py-0.5 rounded-full bg-yellow-500/[0.08] border border-yellow-500/20">
          <Trophy className="w-3 h-3 text-yellow-400 fill-yellow-400/20" />
          <span>{member.stars} {member.stars === 1 ? 'star' : 'stars'}</span>
        </div>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-3.5 border-t border-vyto-border/50 w-full">
          {socialLinks.map(({ icon: Icon, url, label }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name} on ${label}`}
              className="w-8 h-8 rounded-lg bg-vyto-surface border border-vyto-border flex items-center justify-center text-vyto-text-muted hover:text-vyto-cyan hover:border-vyto-cyan/30 hover:bg-vyto-cyan/5 transition-all duration-200"
            >
              <Icon className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Skeleton Loading Card ─── */
function SkeletonCard() {
  return (
    <div className="glass-card p-6 sm:p-7 rounded-2xl flex flex-col items-center text-center animate-pulse border-vyto-border max-w-sm w-full mx-auto">
      <div className="w-28 h-28 rounded-full bg-vyto-border/60 mb-4" />
      <div className="h-5 bg-vyto-border/80 rounded w-3/4 mb-2" />
      <div className="h-4 bg-vyto-border/50 rounded w-1/3 mb-3" />
      <div className="h-3 bg-vyto-border/40 rounded w-5/6 mb-1" />
      <div className="h-3 bg-vyto-border/30 rounded w-2/3" />
    </div>
  );
}


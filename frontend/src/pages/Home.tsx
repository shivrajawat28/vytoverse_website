import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Users,
  BookOpen,
  Trophy,
  Sparkles,
  ChevronRight,
  MapPin,
  Zap,
  Target,
  Lightbulb,
  X,
} from 'lucide-react';
import { eventsAPI, statsAPI, teamAPI, postersAPI } from '@/services/api';
import type { Event, Stats, User, Poster } from '@/types';

/* ─── Animated Hero Background (CSS-based, no WebGL) ─── */
function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-vyto-cyan/[0.04] rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-vyto-violet/[0.03] rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-vyto-blue/[0.03] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-vyto-cyan/20 animate-pulse"
          style={{
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            left: `${(i * 17 + 5) % 100}%`,
            top: `${(i * 23 + 10) % 100}%`,
            animationDuration: `${3 + (i % 4)}s`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Orbiting ring 1 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-vyto-cyan/[0.06] animate-[spin_20s_linear_infinite]" />
      {/* Orbiting ring 2 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-vyto-violet/[0.04] animate-[spin_30s_linear_infinite_reverse]" />
      {/* Orbiting ring 3 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-vyto-blue/[0.03] animate-[spin_40s_linear_infinite]" />

      {/* Orbiting nodes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] animate-[spin_20s_linear_infinite]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-vyto-cyan/40 shadow-[0_0_10px_rgba(0,212,255,0.3)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-vyto-violet/40" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1 h-1 rounded-full bg-vyto-blue/30" />
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* Radial fade */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-vyto-bg" style={{
        background: 'radial-gradient(circle at center, transparent 30%, var(--color-vyto-bg) 70%)',
      }} />
    </div>
  );
}

function AnimatedCounter({ target, label, icon: Icon, delay = 0 }: {
  target: number; label: string; icon: React.ElementType; delay?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay }} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="glass-card p-6 lg:p-8 text-center group cursor-default">
      <div className="w-12 h-12 rounded-xl bg-vyto-cyan/10 group-hover:bg-vyto-cyan/15 flex items-center justify-center mx-auto mb-4 transition-colors">
        <Icon className="w-6 h-6 text-vyto-cyan" />
      </div>
      <div className="text-3xl lg:text-4xl font-bold text-white mb-1">{count}+</div>
      <div className="text-sm text-vyto-text-muted font-medium">{label}</div>
    </motion.div>
  );
}

function Reveal({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [activePoster, setActivePoster] = useState<Poster | null>(null);
  const [showPosterPopup, setShowPosterPopup] = useState(false);

  useEffect(() => {
    eventsAPI.upcoming(3).then((r: { data: Event[] }) => setEvents(r.data)).catch(() => {});
    statsAPI.get().then((r: { data: Stats }) => setStats(r.data)).catch(() => {});
    teamAPI.list().then((r: { data: User[] }) => setTeam(r.data)).catch(() => {});

    // Check poster popup - show once per session
    postersAPI.getActive().then((r: { data: Poster[] }) => {
      if (r.data.length > 0) {
        const poster = r.data[0];
        const sessionKey = `vytoverse_poster_seen_${poster.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          setActivePoster(poster);
          setShowPosterPopup(true);
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
    }).catch(() => {});
  }, []);

  const closePosterPopup = () => {
    setShowPosterPopup(false);
    setTimeout(() => setActivePoster(null), 300);
  };

  return (
    <div className="relative">
      {/* ─── POSTER POPUP ─── */}
      <AnimatePresence>
        {showPosterPopup && activePoster && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={closePosterPopup}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-lg w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="glass-card overflow-hidden border border-vyto-border/50">
                {activePoster.title && (
                  <div className="px-6 pt-5">
                    <h3 className="text-lg font-bold text-white">{activePoster.title}</h3>
                  </div>
                )}
                {activePoster.target_url ? (
                  <a href={activePoster.target_url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={activePoster.image_url} alt={activePoster.title || 'Poster'} className="w-full object-contain max-h-[70vh] cursor-pointer hover:opacity-90 transition-opacity" />
                  </a>
                ) : (
                  <img src={activePoster.image_url} alt={activePoster.title || 'Poster'} className="w-full object-contain max-h-[70vh]" />
                )}
              </div>
              <button
                onClick={closePosterPopup}
                className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-vyto-surface border border-vyto-border flex items-center justify-center text-vyto-text-muted hover:text-white hover:bg-vyto-cyan/20 transition-all shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vyto-bg via-vyto-bg to-vyto-bg-2" />
        <HeroBackground />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vyto-surface/60 border border-vyto-border/50 mb-8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-vyto-cyan animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-vyto-cyan/90 uppercase">College Technology Club</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.08]">
            Welcome to <span className="gradient-text">VytoVerse</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-lg sm:text-xl text-vyto-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Where Innovation Meets Code. Join a community of builders, creators, and innovators pushing the boundaries of technology.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.45 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/about" className="btn-primary text-base !py-3.5 !px-8 group">Explore VytoVerse <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></Link>
            <Link to="/events" className="btn-secondary text-base !py-3.5 !px-8">Explore Events <Calendar className="w-5 h-5" /></Link>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-vyto-border/50 flex items-start justify-center p-1">
            <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} className="w-1.5 h-1.5 rounded-full bg-vyto-cyan" />
          </div>
        </motion.div>
      </section>

      {/* ─── STATS ─── */}
      <section className="section-padding relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <AnimatedCounter target={stats?.active_members || 150} label="Active Members" icon={Users} delay={0} />
            <AnimatedCounter target={stats?.total_events || 25} label="Events Hosted" icon={Calendar} delay={0.1} />
            <AnimatedCounter target={stats?.total_resources || 50} label="Resources" icon={BookOpen} delay={0.2} />
            <AnimatedCounter target={stats?.total_users - (stats?.total_resources || 0) || 30} label="Projects Built" icon={Trophy} delay={0.3} />
          </div>
        </div>
      </section>

      {/* ─── ABOUT PREVIEW ─── */}
      <section className="section-padding relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <Reveal>
              <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">About VytoVerse</span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-6 leading-tight">More than a club. <br /><span className="gradient-text">A launchpad for innovators.</span></h2>
              <p className="text-vyto-text-secondary leading-relaxed mb-6">VytoVerse is a premium technology community where college students learn, build, and ship real projects together. From hackathons to workshops, from coding challenges to open-source contributions — we turn ideas into reality.</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[{ icon: Target, text: 'Real-world Projects' }, { icon: Lightbulb, text: 'Industry Mentors' }, { icon: Zap, text: 'Cutting-edge Tech' }, { icon: Trophy, text: 'Competitions & Prizes' }].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-vyto-text-secondary"><Icon className="w-4 h-4 text-vyto-cyan shrink-0" />{text}</div>
                ))}
              </div>
              <Link to="/about" className="btn-primary group">Learn More <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></Link>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="glass-card p-8 lg:p-10">
                <div className="grid grid-cols-2 gap-6">
                  {[{ number: `${stats?.total_users || 5}+`, label: 'Active Members', color: 'text-vyto-cyan' }, { number: `${stats?.total_events || 25}+`, label: 'Events Hosted', color: 'text-vyto-blue' }, { number: `${stats?.total_resources || 50}+`, label: 'Resources', color: 'text-vyto-violet' }, { number: `${team.length || 5}+`, label: 'Team Members', color: 'text-vyto-purple' }].map(({ number, label, color }) => (
                    <div key={label} className="text-center"><div className={`text-2xl lg:text-3xl font-bold ${color}`}>{number}</div><div className="text-xs text-vyto-text-muted mt-1">{label}</div></div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── EVENTS PREVIEW ─── */}
      {events.length > 0 && (
        <section className="section-padding relative bg-vyto-bg-2/30">
          <div className="max-w-6xl mx-auto">
            <Reveal className="text-center mb-12">
              <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">Upcoming Events</span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-3">Don't miss what's next</h2>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-6">
              {events.map((event, i) => (
                <motion.div key={event.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="glass-card-hover overflow-hidden group">
                  {event.image && <div className="h-44 overflow-hidden"><img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>}
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-vyto-cyan font-medium mb-3"><Calendar className="w-3.5 h-3.5" />{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-vyto-cyan transition-colors">{event.title}</h3>
                    {event.category && <p className="text-xs text-vyto-violet font-medium mb-2">{event.category}</p>}
                    <p className="text-sm text-vyto-text-muted mb-4 line-clamp-2">{event.short_description || event.description?.slice(0, 120)}</p>
                    <div className="flex items-center justify-between">
                      {event.location && <span className="flex items-center gap-1 text-xs text-vyto-text-muted"><MapPin className="w-3 h-3" />{event.location.split(',')[0]}</span>}
                      <Link to="/events" className="text-sm text-vyto-cyan hover:underline flex items-center gap-1 group/link">Details <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" /></Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-10"><Link to="/events" className="btn-secondary group">View All Events <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></Link></div>
          </div>
        </section>
      )}

      {/* ─── TEAM PREVIEW ─── */}
      {team.length > 0 && (
        <section className="section-padding relative">
          <div className="max-w-6xl mx-auto">
            <Reveal className="text-center mb-12">
              <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">Our Team</span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-3">Meet the people behind <span className="gradient-text">VytoVerse</span></h2>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {team.slice(0, 6).map((member, i) => (
                <motion.div key={member.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="glass-card-hover p-6 text-center group">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center mx-auto mb-4 overflow-hidden border-2 border-vyto-border group-hover:border-vyto-cyan/30 transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(0,212,255,0.12)]">
                    {member.profile_image ? <img src={member.profile_image} alt={member.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /> : <span className="text-2xl font-bold text-white group-hover:scale-110 transition-transform duration-300">{member.name.charAt(0)}</span>}
                  </div>
                  <h3 className="text-base font-semibold text-white">{member.name}</h3>
                  {member.team_role ? <p className="text-sm text-vyto-cyan font-medium mt-1">{member.team_role}</p> : <p className="text-sm text-vyto-text-muted mt-1">{member.department || 'Member'}</p>}
                  {member.stars > 0 && <div className="flex items-center justify-center gap-1 mt-2"><Trophy className="w-3.5 h-3.5 text-yellow-400" /><span className="text-xs text-yellow-400 font-medium">{member.stars} stars</span></div>}
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-10"><Link to="/team" className="btn-secondary group">Meet the Full Team <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></Link></div>
          </div>
        </section>
      )}

      {/* ─── FINAL CTA ─── */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-vyto-cyan/[0.03] via-vyto-violet/[0.03] to-vyto-cyan/[0.03]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-vyto-cyan/[0.04] rounded-full blur-[200px]" />
        <Reveal className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">Build. Learn. <span className="gradient-text">Innovate.</span></h2>
          <p className="text-lg text-vyto-text-secondary mb-8 max-w-xl mx-auto">Join VytoVerse and be part of a community that's shaping the future of technology, one project at a time.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="btn-primary text-base !py-3.5 !px-8 group">Join VytoVerse <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></Link>
            <Link to="/about" className="btn-secondary text-base !py-3.5 !px-8">Learn More</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

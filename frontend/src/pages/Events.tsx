import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ExternalLink } from 'lucide-react';
import { eventsAPI } from '@/services/api';
import type { Event } from '@/types';

type TabType = 'all' | 'upcoming' | 'past';

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await eventsAPI.list({ limit: 50 });
      setEvents(res.data);
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  };

  const isPast = (e: Event) => e.status === 'completed' || (e.status !== 'cancelled' && new Date(e.date) < new Date());

  const filteredEvents = events.filter(e => {
    if (activeTab === 'upcoming') return !isPast(e);
    if (activeTab === 'past') return isPast(e);
    return true;
  });

  const upcomingCount = events.filter(e => !isPast(e)).length;
  const pastCount = events.filter(e => isPast(e)).length;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All Events', count: events.length },
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { key: 'past', label: 'Past', count: pastCount },
  ];

  const statusConfig: Record<string, { label: string; class: string }> = {
    upcoming: { label: 'Upcoming', class: 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20' },
    ongoing: { label: 'Live Now', class: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    completed: { label: 'Completed', class: 'bg-white/5 text-vyto-text-muted border border-vyto-border' },
    cancelled: { label: 'Cancelled', class: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  };

  return (
    <div className="relative pt-24">
      <section className="section-padding">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">Events</span>
            <h1 className="text-4xl sm:text-5xl font-bold mt-4 mb-4">What's <span className="gradient-text">happening</span></h1>
            <p className="text-lg text-vyto-text-secondary max-w-2xl mx-auto">From hackathons to workshops, there's always something exciting happening at VytoVerse.</p>
          </motion.div>

          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-vyto-surface rounded-xl p-1 border border-vyto-border">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.key ? 'bg-vyto-cyan/10 text-vyto-cyan shadow-sm' : 'text-vyto-text-muted hover:text-white'}`}>
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card overflow-hidden animate-pulse">
                  <div className="h-44 bg-vyto-border" />
                  <div className="p-6"><div className="h-4 bg-vyto-border rounded w-24 mb-4" /><div className="h-6 bg-vyto-border rounded w-3/4 mb-3" /><div className="h-4 bg-vyto-border rounded w-full mb-2" /></div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-16 h-16 text-vyto-text-muted/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No {activeTab === 'past' ? 'past' : activeTab === 'upcoming' ? 'upcoming' : ''} events found</h3>
              <p className="text-vyto-text-muted">Check back later for events.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event, i) => {
                const sc = statusConfig[event.status] || statusConfig.upcoming;
                return (
                  <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="glass-card-hover overflow-hidden group">
                    {event.image ? (
                      <div className="h-44 overflow-hidden relative">
                        <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-vyto-bg/60 to-transparent" />
                        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold ${sc.class}`}>{sc.label}</span>
                      </div>
                    ) : <div className="h-4 bg-gradient-to-r from-vyto-cyan/10 to-vyto-violet/10" />}

                    <div className="p-6">
                      {!event.image && <div className="flex items-center justify-between mb-3"><span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${sc.class}`}>{sc.label}</span></div>}
                      <div className="flex items-center gap-1.5 text-xs text-vyto-text-muted mb-2"><Calendar className="w-3.5 h-3.5" />{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-vyto-cyan transition-colors">{event.title}</h3>
                      <p className="text-sm text-vyto-text-muted mb-4 line-clamp-2">{event.short_description || event.description?.slice(0, 150)}</p>
                      <div className="space-y-1.5 mb-4">
                        {event.time_start && <div className="flex items-center gap-2 text-xs text-vyto-text-muted"><Clock className="w-3.5 h-3.5 shrink-0" />{event.time_start.slice(0, 5)}{event.time_end && ` — ${event.time_end.slice(0, 5)}`}</div>}
                        {event.location && <div className="flex items-center gap-2 text-xs text-vyto-text-muted"><MapPin className="w-3.5 h-3.5 shrink-0" />{event.location}</div>}
                        {event.max_participants && <div className="flex items-center gap-2 text-xs text-vyto-text-muted"><Users className="w-3.5 h-3.5 shrink-0" />Max {event.max_participants} participants</div>}
                      </div>
                      {event.registration_url && event.status === 'upcoming' && <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-sm !py-2.5 group/btn">Register <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" /></a>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

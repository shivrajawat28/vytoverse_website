import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Plus,
  Trash2,
  Star,
  Search,
  X,
  Save,
  UserMinus,
  Crown,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { adminAPI, statsAPI } from '@/services/api';
import type { User, Event, LibraryResource, Stats } from '@/types';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'users' | 'team' | 'events' | 'library';

const TEAM_ROLE_SUGGESTIONS = [
  'President',
  'Vice President',
  'Secretary',
  'Joint Secretary',
  'Technical Lead',
  'Frontend Lead',
  'Backend Lead',
  'AI/ML Lead',
  'Cybersecurity Lead',
  'Design Lead',
  'Event Lead',
  'Community Lead',
  'Content Lead',
  'PR Lead',
  'Member',
];

export default function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showStarsModal, setShowStarsModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [starCount, setStarCount] = useState(0);

  // Team modal form
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [teamRole, setTeamRole] = useState('');
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);

  // Form states
  const [eventForm, setEventForm] = useState<Record<string, string>>({
    title: '', description: '', short_description: '', date: '',
    time_start: '', time_end: '', location: '', status: 'upcoming', max_participants: '',
  });

  const [resourceForm, setResourceForm] = useState<Record<string, string>>({
    title: '', description: '', category: '', resource_type: 'pdf', external_url: '', author: '',
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, eventsRes, resourcesRes] = await Promise.all([
        statsAPI.get(),
        adminAPI.listUsers({ limit: 100 }),
        adminAPI.listEvents({}),
        adminAPI.listResources({}),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setEvents(eventsRes.data);
      setResources(resourcesRes.data);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  // Event CRUD
  const handleCreateEvent = async () => {
    try {
      await adminAPI.createEvent({
        ...eventForm,
        time_start: eventForm.time_start || undefined,
        time_end: eventForm.time_end || undefined,
        max_participants: eventForm.max_participants ? parseInt(eventForm.max_participants) : undefined,
      });
      toast.success('Event created!');
      setShowEventModal(false);
      resetEventForm();
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create event');
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await adminAPI.deleteEvent(id);
      toast.success('Event deleted!');
      loadData();
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const resetEventForm = () => {
    setEventForm({ title: '', description: '', short_description: '', date: '', time_start: '', time_end: '', location: '', status: 'upcoming', max_participants: '' });
  };

  // Resource CRUD
  const handleCreateResource = async () => {
    try {
      await adminAPI.createResource(resourceForm);
      toast.success('Resource added!');
      setShowResourceModal(false);
      resetResourceForm();
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to add resource');
    }
  };

  const handleDeleteResource = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await adminAPI.deleteResource(id);
      toast.success('Resource deleted!');
      loadData();
    } catch {
      toast.error('Failed to delete resource');
    }
  };

  const resetResourceForm = () => {
    setResourceForm({ title: '', description: '', category: '', resource_type: 'pdf', external_url: '', author: '' } as Record<string, string>);
  };

  // Stars
  const handleAssignStars = async () => {
    if (!selectedUser) return;
    try {
      await adminAPI.assignStars(selectedUser.id, starCount);
      toast.success(`Assigned ${starCount} stars to ${selectedUser.name}`);
      setShowStarsModal(false);
      setSelectedUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to assign stars');
    }
  };

  // Team management
  const openTeamModal = (user: User) => {
    setSelectedUser(user);
    setTeamEnabled(user.team_membership === 1);
    setTeamRole(user.team_role || '');
    setRoleSuggestions([]);
    setShowTeamModal(true);
  };

  const handleRoleSearch = (value: string) => {
    setTeamRole(value);
    if (value.length > 0) {
      const filtered = TEAM_ROLE_SUGGESTIONS.filter(
        (r) => r.toLowerCase().includes(value.toLowerCase()) && r !== value
      );
      setRoleSuggestions(filtered.slice(0, 5));
    } else {
      setRoleSuggestions([]);
    }
  };

  const selectSuggestion = (role: string) => {
    setTeamRole(role);
    setRoleSuggestions([]);
  };

  const handleSaveTeam = async () => {
    if (!selectedUser) return;
    if (teamEnabled && !teamRole.trim()) {
      toast.error('Team role is required when adding a team member');
      return;
    }
    setSavingTeam(true);
    try {
      await adminAPI.toggleTeamMember(selectedUser.id, teamEnabled ? 1 : 0, teamRole.trim() || undefined);
      toast.success(teamEnabled ? `${selectedUser.name} added to team as "${teamRole.trim()}"` : `${selectedUser.name} removed from team`);
      setShowTeamModal(false);
      setSelectedUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update team membership');
    } finally {
      setSavingTeam(false);
    }
  };

  // Quick toggle from Users table (role required if enabling)
  const handleQuickToggleTeam = (user: User) => {
    if (user.team_membership === 1) {
      // Quick remove - no role needed
      (async () => {
        try {
          await adminAPI.toggleTeamMember(user.id, 0);
          toast.success(`${user.name} removed from team`);
          loadData();
        } catch (err: any) {
          toast.error(err?.response?.data?.detail || 'Failed');
        }
      })();
    } else {
      // Open modal to set role
      openTeamModal(user);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'team', label: 'Team', icon: Crown },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'library', label: 'Library', icon: BookOpen },
  ];

  const teamMembers = users.filter((u) => u.team_membership === 1);

  if (!isAdmin) return null;

  return (
    <div className="relative pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="glass-card p-4 lg:sticky lg:top-28">
              <h2 className="text-lg font-bold text-white mb-4 px-2 hidden lg:block">Admin Panel</h2>
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === key
                        ? 'bg-vyto-cyan/10 text-vyto-cyan shadow-sm'
                        : 'text-vyto-text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {key === 'team' && teamMembers.length > 0 && (
                      <span className="ml-auto text-xs bg-vyto-cyan/10 text-vyto-cyan px-1.5 py-0.5 rounded">{teamMembers.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Overview */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h1>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Users', value: stats?.total_users || 0, color: 'text-vyto-cyan', icon: Users },
                    { label: 'Team Members', value: teamMembers.length, color: 'text-vyto-blue', icon: Crown },
                    { label: 'Total Events', value: stats?.total_events || 0, color: 'text-vyto-violet', icon: Calendar },
                    { label: 'Resources', value: stats?.total_resources || 0, color: 'text-vyto-purple', icon: BookOpen },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <motion.div
                      key={label}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      className="glass-card p-5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-vyto-surface flex items-center justify-center">
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div>
                          <p className="text-sm text-vyto-text-muted">{label}</p>
                          <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-white">User Management</h1>
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyto-text-muted" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field !pl-10"
                  />
                </div>
                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-vyto-border">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase">User</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase hidden sm:table-cell">Role</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase hidden md:table-cell">Team</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase hidden lg:table-cell">Designation</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase hidden md:table-cell">Stars</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users
                          .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
                          .map((u) => (
                            <tr key={u.id} className="border-b border-vyto-border/50 hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                                    {u.profile_image ? (
                                      <img src={u.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      u.name.charAt(0)
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{u.name}</p>
                                    <p className="text-xs text-vyto-text-muted truncate">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 hidden sm:table-cell">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                  u.role === 'admin' ? 'bg-vyto-violet/10 text-vyto-violet' : 'bg-vyto-surface text-vyto-text-muted'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-5 py-4 hidden md:table-cell">
                                <button
                                  onClick={() => handleQuickToggleTeam(u)}
                                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                    u.team_membership === 1
                                      ? 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                      : 'bg-vyto-surface text-vyto-text-muted border border-vyto-border hover:bg-vyto-cyan/10 hover:text-vyto-cyan hover:border-vyto-cyan/20'
                                  }`}
                                  title={u.team_membership === 1 ? 'Remove from team' : 'Add to team (opens modal)'}
                                >
                                  {u.team_membership === 1 ? 'Team ✓' : 'Add'}
                                </button>
                              </td>
                              <td className="px-5 py-4 hidden lg:table-cell">
                                {u.team_role ? (
                                  <span className="text-xs text-vyto-cyan font-medium">{u.team_role}</span>
                                ) : (
                                  <span className="text-xs text-vyto-text-muted">—</span>
                                )}
                              </td>
                              <td className="px-5 py-4 hidden md:table-cell">
                                <span className="text-sm text-yellow-400 flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                  {u.stars}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openTeamModal(u)}
                                    className="p-1.5 rounded-lg text-vyto-text-muted hover:text-vyto-cyan hover:bg-vyto-cyan/10 transition-all"
                                    title="Manage team membership"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { setSelectedUser(u); setStarCount(u.stars); setShowStarsModal(true); }}
                                    className="text-xs text-vyto-cyan hover:underline font-medium"
                                  >
                                    Stars
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-white">Team Management</h1>
                  <span className="text-sm text-vyto-text-muted">{teamMembers.length} members</span>
                </div>

                {teamMembers.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Crown className="w-12 h-12 text-vyto-text-muted/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No team members yet</h3>
                    <p className="text-vyto-text-muted text-sm">Go to the Users tab and click the gear icon to manage team membership.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map((u) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -2 }}
                        className="glass-card p-5 group"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center text-sm font-bold text-white shrink-0 border border-vyto-border group-hover:border-vyto-cyan/30 transition-all overflow-hidden">
                            {u.profile_image ? (
                              <img src={u.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{u.name}</p>
                            {u.team_role && (
                              <p className="text-xs text-vyto-cyan font-medium truncate">{u.team_role}</p>
                            )}
                            {!u.team_role && (
                              <p className="text-xs text-vyto-text-muted truncate">{u.department || u.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-yellow-400 font-medium">{u.stars}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openTeamModal(u)}
                              className="text-xs text-vyto-text-muted hover:text-vyto-cyan flex items-center gap-1 transition-colors"
                              title="Edit team role"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleQuickToggleTeam(u)}
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-white">Event Management</h1>
                  <button onClick={() => { resetEventForm(); setShowEventModal(true); }} className="btn-primary text-sm !py-2 !px-4">
                    <Plus className="w-4 h-4" /> Add Event
                  </button>
                </div>
                <div className="space-y-3">
                  {events.map((e) => (
                    <div key={e.id} className="glass-card p-5 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">{e.title}</h3>
                        <p className="text-sm text-vyto-text-muted">
                          {new Date(e.date).toLocaleDateString()} · {e.location || 'TBA'}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                          e.status === 'upcoming' ? 'bg-vyto-cyan/10 text-vyto-cyan' :
                          e.status === 'completed' ? 'bg-vyto-text-muted/10 text-vyto-text-muted' :
                          e.status === 'ongoing' ? 'bg-green-500/10 text-green-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {e.status}
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleDeleteEvent(e.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-all" title="Delete event">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Library Tab */}
            {activeTab === 'library' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-white">Library Management</h1>
                  <button onClick={() => { resetResourceForm(); setShowResourceModal(true); }} className="btn-primary text-sm !py-2 !px-4">
                    <Plus className="w-4 h-4" /> Add Resource
                  </button>
                </div>
                <div className="space-y-3">
                  {resources.map((r) => (
                    <div key={r.id} className="glass-card p-5 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">{r.title}</h3>
                        <p className="text-sm text-vyto-text-muted">
                          {r.category} · {r.resource_type.toUpperCase()}
                          {r.author && ` · ${r.author}`}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleDeleteResource(r.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-all" title="Delete resource">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Team Management Modal ─── */}
      <AnimatePresence>
        {showTeamModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTeamModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Manage Team Membership</h2>
                <button onClick={() => setShowTeamModal(false)} className="text-vyto-text-muted hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User info */}
              <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-vyto-surface/50 border border-vyto-border/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                  {selectedUser.profile_image ? (
                    <img src={selectedUser.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    selectedUser.name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{selectedUser.name}</p>
                  <p className="text-xs text-vyto-text-muted">{selectedUser.email}</p>
                </div>
              </div>

              {/* Team Member Toggle */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-vyto-text-secondary mb-2">Team Member</label>
                <button
                  onClick={() => setTeamEnabled(!teamEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    teamEnabled ? 'bg-vyto-cyan' : 'bg-vyto-border'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    teamEnabled ? 'left-[26px]' : 'left-0.5'
                  }`} />
                </button>
                <p className="text-xs text-vyto-text-muted mt-1.5">
                  {teamEnabled ? 'This user is a team member' : 'This user is not a team member'}
                </p>
              </div>

              {/* Team Role Input */}
              <div className="mb-6 relative">
                <label className="block text-sm font-medium text-vyto-text-secondary mb-2">
                  Team Designation {teamEnabled && <span className="text-vyto-error">*</span>}
                </label>
                <input
                  type="text"
                  value={teamRole}
                  onChange={(e) => handleRoleSearch(e.target.value)}
                  placeholder={teamEnabled ? 'e.g. Frontend Lead' : 'Enable team membership first'}
                  disabled={!teamEnabled}
                  className="input-field disabled:opacity-40 disabled:cursor-not-allowed"
                  maxLength={100}
                />
                {teamEnabled && roleSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-vyto-surface border border-vyto-border rounded-xl overflow-hidden shadow-lg">
                    {roleSuggestions.map((role) => (
                      <button
                        key={role}
                        onClick={() => selectSuggestion(role)}
                        className="w-full text-left px-4 py-2.5 text-sm text-vyto-text-secondary hover:text-white hover:bg-vyto-cyan/10 transition-colors"
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                )}
                {teamEnabled && (
                  <p className="text-xs text-vyto-text-muted mt-1.5">
                    Type to search suggestions or enter a custom designation (max 100 chars)
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => setShowTeamModal(false)} className="btn-secondary flex-1 !py-2.5">
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeam}
                  disabled={savingTeam || (teamEnabled && !teamRole.trim())}
                  className="btn-primary flex-1 !py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingTeam ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Event Modal ─── */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Create Event</h2>
                <button onClick={() => setShowEventModal(false)} className="text-vyto-text-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Title *</label>
                  <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Description</label>
                  <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} rows={3} className="input-field resize-none" />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Short Description</label>
                  <input value={eventForm.short_description} onChange={(e) => setEventForm({ ...eventForm, short_description: e.target.value })} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Date *</label>
                    <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Location</label>
                    <input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Start Time</label>
                    <input type="time" value={eventForm.time_start} onChange={(e) => setEventForm({ ...eventForm, time_start: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">End Time</label>
                    <input type="time" value={eventForm.time_end} onChange={(e) => setEventForm({ ...eventForm, time_end: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Status</label>
                    <select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })} className="input-field">
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Max Participants</label>
                    <input type="number" value={eventForm.max_participants} onChange={(e) => setEventForm({ ...eventForm, max_participants: e.target.value })} className="input-field" />
                  </div>
                </div>
                <button onClick={handleCreateEvent} className="btn-primary w-full !py-3 group" disabled={!eventForm.title || !eventForm.date}>
                  <Save className="w-4 h-4" /> Create Event
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Resource Modal ─── */}
      <AnimatePresence>
        {showResourceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowResourceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Add Resource</h2>
                <button onClick={() => setShowResourceModal(false)} className="text-vyto-text-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Title *</label>
                  <input value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Description</label>
                  <textarea value={resourceForm.description} onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })} rows={3} className="input-field resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Category *</label>
                    <input value={resourceForm.category} onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })} className="input-field" placeholder="e.g. Web Development" />
                  </div>
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Type</label>
                    <select value={resourceForm.resource_type} onChange={(e) => setResourceForm({ ...resourceForm, resource_type: e.target.value })} className="input-field">
                      <option value="pdf">PDF</option>
                      <option value="document">Document</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="note">Notes</option>
                      <option value="link">Link</option>
                      <option value="video">Video</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">External URL</label>
                  <input value={resourceForm.external_url} onChange={(e) => setResourceForm({ ...resourceForm, external_url: e.target.value })} className="input-field" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Author</label>
                  <input value={resourceForm.author} onChange={(e) => setResourceForm({ ...resourceForm, author: e.target.value })} className="input-field" />
                </div>
                <button onClick={handleCreateResource} className="btn-primary w-full !py-3 group" disabled={!resourceForm.title || !resourceForm.category}>
                  <Save className="w-4 h-4" /> Add Resource
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Stars Modal ─── */}
      <AnimatePresence>
        {showStarsModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowStarsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-2">Assign Stars</h2>
              <p className="text-sm text-vyto-text-muted mb-4">Set star count for {selectedUser.name}</p>
              <input
                type="number"
                value={starCount}
                onChange={(e) => setStarCount(parseInt(e.target.value) || 0)}
                min={0}
                max={9999}
                className="input-field mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowStarsModal(false)} className="btn-secondary flex-1 !py-2.5">Cancel</button>
                <button onClick={handleAssignStars} className="btn-primary flex-1 !py-2.5">
                  <Star className="w-4 h-4" /> Assign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

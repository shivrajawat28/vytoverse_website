import { useState, useEffect, useCallback } from 'react';
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
  CheckSquare,
  Image,
  Link2,
  ExternalLink,
  Edit3,
  Shield,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { adminAPI, statsAPI } from '@/services/api';
import { hasAdminAccess, roleDisplayLabel, type User, type Event, type LibraryResource, type Stats, type Task, type Poster, type ImportantLink } from '@/types';
import { getAssetUrl } from '@/utils/assets';
import Logo from '@/components/Logo';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'users' | 'tasks' | 'team' | 'events' | 'posters' | 'important-links' | 'library';

const TEAM_ROLE_SUGGESTIONS = [
  'President', 'Vice President', 'Secretary', 'Joint Secretary',
  'Technical Lead', 'Frontend Lead', 'Backend Lead', 'AI/ML Lead',
  'Cybersecurity Lead', 'Design Lead', 'Event Lead', 'Community Lead',
  'Content Lead', 'PR Lead', 'Member',
];

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'team', label: 'Team', icon: Crown },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'posters', label: 'Posters', icon: Image },
  { key: 'important-links', label: 'Links', icon: Link2 },
  { key: 'library', label: 'Library', icon: BookOpen },
];

export default function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [importantLinks, setImportantLinks] = useState<ImportantLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showStarsModal, setShowStarsModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null);
  const [selectedLink, setSelectedLink] = useState<ImportantLink | null>(null);
  const [starCount, setStarCount] = useState(0);

  // Team modal form
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [teamRole, setTeamRole] = useState('');
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);

  // Task form
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigned_user_id: 0, status: 'todo', priority: 'medium', due_date: '' });

  // Poster form
  const [posterForm, setPosterForm] = useState({ title: '', image_url: '', target_url: '', active: true, expires_at: '' });

  // Link form
  const [linkForm, setLinkForm] = useState({ title: '', description: '', url: '', assigned_user_id: 0, active: true, expires_at: '' });

  // Event form
  const [eventForm, setEventForm] = useState<Record<string, string>>({
    title: '', description: '', short_description: '', date: '',
    time_start: '', time_end: '', location: '', status: 'upcoming', max_participants: '',
    registration_url: '', poster_url: '', invitation_url: '',
  });

  // Event filter
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // Resource form
  const [resourceForm, setResourceForm] = useState<Record<string, string>>({
    title: '', description: '', category: '', resource_type: 'pdf', external_url: '', author: '',
  });

  // Close drawer on tab change
  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsResult, usersResult, eventsResult, resourcesResult, tasksResult, postersResult, linksResult] = await Promise.allSettled([
        statsAPI.get(),
        adminAPI.listUsers({ limit: 100 }),
        adminAPI.listEvents({}),
        adminAPI.listResources({}),
        adminAPI.listTasks({}),
        adminAPI.listPosters(),
        adminAPI.listImportantLinks({}),
      ]);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value.data);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.data);
      if (eventsResult.status === 'fulfilled') setEvents(eventsResult.value.data);
      if (resourcesResult.status === 'fulfilled') setResources(resourcesResult.value.data);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.data);
      if (postersResult.status === 'fulfilled') setPosters(postersResult.value.data);
      if (linksResult.status === 'fulfilled') setImportantLinks(linksResult.value.data);
    } catch { /* keep defaults */ } finally { setLoading(false); }
  };

  // ── Event CRUD ──
  const handleCreateEvent = async () => {
    try {
      const payload: Record<string, unknown> = { ...eventForm };
      if (eventForm.time_start) payload.time_start = eventForm.time_start;
      if (eventForm.time_end) payload.time_end = eventForm.time_end;
      if (eventForm.max_participants) payload.max_participants = parseInt(eventForm.max_participants);
      await adminAPI.createEvent(payload);
      toast.success('Event created!');
      setShowEventModal(false);
      resetEventForm();
      loadData();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to create event'); }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try { await adminAPI.deleteEvent(id); toast.success('Event deleted!'); loadData(); }
    catch { toast.error('Failed to delete event'); }
  };

  const resetEventForm = () => {
    setEventForm({ title: '', description: '', short_description: '', date: '', time_start: '', time_end: '', location: '', status: 'upcoming', max_participants: '', registration_url: '', poster_url: '', invitation_url: '' });
  };

  // ── Resource CRUD ──
  const handleCreateResource = async () => {
    try { await adminAPI.createResource(resourceForm); toast.success('Resource added!'); setShowResourceModal(false); resetResourceForm(); loadData(); }
    catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to add resource'); }
  };

  const handleDeleteResource = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try { await adminAPI.deleteResource(id); toast.success('Resource deleted!'); loadData(); }
    catch { toast.error('Failed to delete resource'); }
  };

  const resetResourceForm = () => {
    setResourceForm({ title: '', description: '', category: '', resource_type: 'pdf', external_url: '', author: '' });
  };

  // ── Stars ──
  const handleAssignStars = async () => {
    if (!selectedUser) return;
    try { await adminAPI.assignStars(selectedUser.id, starCount); toast.success(`Assigned ${starCount} stars to ${selectedUser.name}`); setShowStarsModal(false); setSelectedUser(null); loadData(); }
    catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to assign stars'); }
  };

  // ── Team management ──
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
      const filtered = TEAM_ROLE_SUGGESTIONS.filter(r => r.toLowerCase().includes(value.toLowerCase()) && r !== value);
      setRoleSuggestions(filtered.slice(0, 5));
    } else { setRoleSuggestions([]); }
  };

  const selectSuggestion = (role: string) => { setTeamRole(role); setRoleSuggestions([]); };

  const handleSaveTeam = async () => {
    if (!selectedUser) return;
    if (teamEnabled && !teamRole.trim()) { toast.error('Team role is required when adding a team member'); return; }
    setSavingTeam(true);
    try {
      await adminAPI.toggleTeamMember(selectedUser.id, teamEnabled ? 1 : 0, teamRole.trim() || undefined);
      toast.success(teamEnabled ? `${selectedUser.name} added to team` : `${selectedUser.name} removed from team`);
      setShowTeamModal(false); setSelectedUser(null); loadData();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to update team'); }
    finally { setSavingTeam(false); }
  };

  const handleQuickToggleTeam = (user: User) => {
    if (user.team_membership === 1) {
      (async () => { try { await adminAPI.toggleTeamMember(user.id, 0); toast.success(`${user.name} removed from team`); loadData(); } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed'); } })();
    } else { openTeamModal(user); }
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    try {
      await adminAPI.assignRole(selectedUser.id, selectedRole);
      toast.success(`${selectedUser.name}'s role updated to ${roleDisplayLabel(selectedRole as any)}`);
      setShowRoleModal(false); setSelectedUser(null); loadData();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to update role'); }
  };

  // ── Task CRUD ──
  const openCreateTask = () => { setSelectedTask(null); setTaskForm({ title: '', description: '', assigned_user_id: users[0]?.id || 0, status: 'todo', priority: 'medium', due_date: '' }); setShowTaskModal(true); };
  const openEditTask = (task: Task) => { setSelectedTask(task); setTaskForm({ title: task.title, description: task.description || '', assigned_user_id: task.assigned_user_id, status: task.status, priority: task.priority, due_date: task.due_date || '' }); setShowTaskModal(true); };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) { toast.error('Title is required'); return; }
    if (!taskForm.assigned_user_id) { toast.error('Assigned user is required'); return; }
    try {
      const payload: Record<string, unknown> = { ...taskForm };
      if (!taskForm.due_date) delete payload.due_date;
      if (selectedTask) { await adminAPI.updateTask(selectedTask.id, payload); toast.success('Task updated!'); }
      else { await adminAPI.createTask(payload); toast.success('Task created!'); }
      setShowTaskModal(false); loadData();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to save task'); }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try { await adminAPI.deleteTask(id); toast.success('Task deleted!'); loadData(); }
    catch { toast.error('Failed to delete task'); }
  };

  // ── Poster CRUD ──
  const openCreatePoster = () => { setSelectedPoster(null); setPosterForm({ title: '', image_url: '', target_url: '', active: true, expires_at: '' }); setShowPosterModal(true); };
  const openEditPoster = (poster: Poster) => { setSelectedPoster(poster); setPosterForm({ title: poster.title || '', image_url: poster.image_url, target_url: poster.target_url || '', active: poster.active, expires_at: poster.expires_at ? poster.expires_at.slice(0, 16) : '' }); setShowPosterModal(true); };

  const handleSavePoster = async () => {
    if (!posterForm.image_url.trim()) { toast.error('Image URL is required'); return; }
    try {
      const payload: Record<string, unknown> = { ...posterForm };
      if (!posterForm.expires_at) delete payload.expires_at;
      if (selectedPoster) { await adminAPI.updatePoster(selectedPoster.id, payload); toast.success('Poster updated!'); }
      else { await adminAPI.createPoster(payload); toast.success('Poster created!'); }
      setShowPosterModal(false); loadData();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to save poster'); }
  };

  const handleDeletePoster = async (id: number) => {
    if (!confirm('Delete this poster?')) return;
    try { await adminAPI.deletePoster(id); toast.success('Poster deleted!'); loadData(); }
    catch { toast.error('Failed to delete poster'); }
  };

  const handleTogglePoster = async (poster: Poster) => {
    try { await adminAPI.updatePoster(poster.id, { active: !poster.active }); toast.success(poster.active ? 'Poster deactivated' : 'Poster activated'); loadData(); }
    catch { toast.error('Failed to toggle poster'); }
  };

  // ── Important Links CRUD ──
  const openCreateLink = () => { setSelectedLink(null); setLinkForm({ title: '', description: '', url: '', assigned_user_id: users[0]?.id || 0, active: true, expires_at: '' }); setShowLinkModal(true); };
  const openEditLink = (link: ImportantLink) => { setSelectedLink(link); setLinkForm({ title: link.title, description: link.description || '', url: link.url, assigned_user_id: link.assigned_user_id, active: link.active, expires_at: link.expires_at ? link.expires_at.slice(0, 16) : '' }); setShowLinkModal(true); };

  const handleSaveLink = async () => {
    if (!linkForm.title.trim()) { toast.error('Title is required'); return; }
    if (!linkForm.url.trim()) { toast.error('URL is required'); return; }
    if (!linkForm.assigned_user_id) { toast.error('Assigned user is required'); return; }
    try {
      const payload: Record<string, unknown> = { ...linkForm };
      if (!linkForm.expires_at) delete payload.expires_at;
      if (selectedLink) { await adminAPI.updateImportantLink(selectedLink.id, payload); toast.success('Link updated!'); }
      else { await adminAPI.createImportantLink(payload); toast.success('Link created!'); }
      setShowLinkModal(false); loadData();
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Failed to save link'); }
  };

  const handleDeleteLink = async (id: number) => {
    if (!confirm('Delete this important link?')) return;
    try { await adminAPI.deleteImportantLink(id); toast.success('Link deleted!'); loadData(); }
    catch { toast.error('Failed to delete link'); }
  };

  const teamMembers = users.filter(u => u.team_membership === 1);
  const filteredEvents = events.filter(e => {
    if (eventFilter === 'upcoming') return e.status === 'upcoming' || e.status === 'ongoing';
    if (eventFilter === 'past') return e.status === 'completed' || new Date(e.date) < new Date();
    return true;
  });

  const taskStatusColors: Record<string, string> = {
    todo: 'bg-vyto-surface text-vyto-text-muted border border-vyto-border',
    in_progress: 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20',
    completed: 'bg-green-500/10 text-green-400 border border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };
  const taskPriorityColors: Record<string, string> = {
    low: 'text-vyto-text-muted',
    medium: 'text-yellow-400',
    high: 'text-red-400',
  };

  if (!isAdmin) return null;

  return (
    <div className="relative pt-24 min-h-screen overflow-x-hidden">
      {/* ─── Mobile Admin Toolbar (compact, no logo) ─── */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-vyto-bg/90 backdrop-blur-xl border-b border-vyto-border/60">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg text-vyto-text-secondary hover:text-white hover:bg-white/5 transition-all"
              aria-label="Open admin menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white">
              Admin
            </span>
          </div>
          <span className="text-xs font-medium text-vyto-cyan bg-vyto-cyan/10 px-2.5 py-1 rounded-md border border-vyto-cyan/20">
            {tabs.find(t => t.key === activeTab)?.label}
          </span>
        </div>
      </div>

      {/* ─── Mobile Drawer Backdrop ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Mobile Drawer ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-vyto-bg-2 border-r border-vyto-border shadow-2xl shadow-black/40 flex flex-col lg:hidden"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-vyto-border">
              <Logo variant="wordmark" className="h-8 w-auto max-w-[160px]" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-vyto-text-muted hover:text-white hover:bg-white/5 transition-all"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === key
                      ? 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20 shadow-sm'
                      : 'text-vyto-text-muted hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Drawer footer */}
            <div className="p-4 border-t border-vyto-border">
              <p className="text-xs text-vyto-text-muted text-center">Admin Panel</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <div className="glass-card p-4 lg:sticky lg:top-28">
              <div className="flex items-center gap-2.5 mb-4 px-2">
                <Logo variant="wordmark" className="h-6 w-auto max-w-[120px]" />
              </div>
              <nav className="flex flex-col gap-1">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => switchTab(key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === key ? 'bg-vyto-cyan/10 text-vyto-cyan shadow-sm' : 'text-vyto-text-muted hover:text-white hover:bg-white/5'}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* ─── Overview ─── */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6">Dashboard Overview</h1>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {[
                    { label: 'Total Users', value: stats?.total_users || 0, color: 'text-vyto-cyan', icon: Users },
                    { label: 'Team Members', value: stats?.team_members || teamMembers.length, color: 'text-vyto-blue', icon: Crown },
                    { label: 'Active Tasks', value: stats?.active_tasks || 0, color: 'text-vyto-violet', icon: CheckSquare },
                    { label: 'Upcoming Events', value: stats?.upcoming_events || 0, color: 'text-green-400', icon: Calendar },
                    { label: 'Active Posters', value: stats?.active_posters || 0, color: 'text-yellow-400', icon: Image },
                    { label: 'Important Links', value: stats?.total_links || 0, color: 'text-pink-400', icon: Link2 },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <motion.div key={label} whileHover={{ y: -2, transition: { duration: 0.2 } }} className="glass-card p-3 sm:p-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-vyto-surface flex items-center justify-center shrink-0">
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-vyto-text-muted truncate">{label}</p>
                          <p className={`text-lg sm:text-2xl font-bold ${color}`}>{value}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Users Tab ─── */}
            {activeTab === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">User Management</h1>
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyto-text-muted" />
                  <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="input-field !pl-10" />
                </div>

                {/* Desktop Table */}
                <div className="glass-card overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-vyto-border">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase">User</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase">Role</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase">Team</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase">Designation</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase">Stars</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-vyto-text-muted uppercase">Actions</th>
                      </tr></thead>
                      <tbody>
                        {users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).map(u => (
                          <tr key={u.id} className="border-b border-vyto-border/50 hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                                  {u.profile_image ? <img src={getAssetUrl(u.profile_image, u.updated_at || undefined) || u.profile_image} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : u.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{u.name}</p>
                                  <p className="text-xs text-vyto-text-muted truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${u.role === 'president' ? 'bg-yellow-500/10 text-yellow-400' : u.role === 'vice_president' ? 'bg-purple-500/10 text-purple-400' : u.role === 'admin' ? 'bg-vyto-violet/10 text-vyto-violet' : 'bg-vyto-surface text-vyto-text-muted'}`}>{roleDisplayLabel(u.role)}</span>
                            </td>
                            <td className="px-5 py-4">
                              <button onClick={() => handleQuickToggleTeam(u)} className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${u.team_membership === 1 ? 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'bg-vyto-surface text-vyto-text-muted border border-vyto-border hover:bg-vyto-cyan/10 hover:text-vyto-cyan hover:border-vyto-cyan/20'}`}>
                                {u.team_membership === 1 ? 'Team ✓' : 'Add'}
                              </button>
                            </td>
                            <td className="px-5 py-4">
                              {u.team_role ? <span className="text-xs text-vyto-cyan font-medium">{u.team_role}</span> : <span className="text-xs text-vyto-text-muted">—</span>}
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm text-yellow-400 flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400" />{u.stars}</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => openRoleModal(u)} className="p-1.5 rounded-lg text-vyto-text-muted hover:text-vyto-violet hover:bg-vyto-violet/10 transition-all" title="Change system role"><Shield className="w-4 h-4" /></button>
                                <button onClick={() => openTeamModal(u)} className="p-1.5 rounded-lg text-vyto-text-muted hover:text-vyto-cyan hover:bg-vyto-cyan/10 transition-all" title="Manage team"><Settings className="w-4 h-4" /></button>
                                <button onClick={() => { setSelectedUser(u); setStarCount(u.stars); setShowStarsModal(true); }} className="text-xs text-vyto-cyan hover:underline font-medium">Stars</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile User Cards */}
                <div className="md:hidden space-y-3">
                  {users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).map(u => (
                    <div key={u.id} className="glass-card p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                          {u.profile_image ? <img src={getAssetUrl(u.profile_image, u.updated_at || undefined) || u.profile_image} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : u.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{u.name}</p>
                          <p className="text-xs text-vyto-text-muted truncate">{u.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium shrink-0 ${u.role === 'president' ? 'bg-yellow-500/10 text-yellow-400' : u.role === 'vice_president' ? 'bg-purple-500/10 text-purple-400' : u.role === 'admin' ? 'bg-vyto-violet/10 text-vyto-violet' : 'bg-vyto-surface text-vyto-text-muted'}`}>{roleDisplayLabel(u.role)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleQuickToggleTeam(u)} className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${u.team_membership === 1 ? 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20' : 'bg-vyto-surface text-vyto-text-muted border border-vyto-border'}`}>
                            {u.team_membership === 1 ? `Team ✓${u.team_role ? ` · ${u.team_role}` : ''}` : 'Add to Team'}
                          </button>
                          <span className="text-xs text-yellow-400 flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" />{u.stars}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openRoleModal(u)} className="p-2 rounded-lg text-vyto-text-muted hover:text-vyto-violet hover:bg-vyto-violet/10 transition-all" title="Change role"><Shield className="w-4 h-4" /></button>
                          <button onClick={() => openTeamModal(u)} className="p-2 rounded-lg text-vyto-text-muted hover:text-vyto-cyan hover:bg-vyto-cyan/10 transition-all" title="Manage team"><Settings className="w-4 h-4" /></button>
                          <button onClick={() => { setSelectedUser(u); setStarCount(u.stars); setShowStarsModal(true); }} className="p-2 rounded-lg text-vyto-text-muted hover:text-yellow-400 hover:bg-yellow-400/10 transition-all" title="Assign stars"><Star className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Tasks Tab ─── */}
            {activeTab === 'tasks' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Task Management</h1>
                  <button onClick={openCreateTask} className="btn-primary text-sm !py-2 !px-3 sm:!px-4"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Assign </span>Task</button>
                </div>
                {tasks.length === 0 ? (
                  <div className="glass-card p-8 sm:p-12 text-center"><CheckSquare className="w-12 h-12 text-vyto-text-muted/30 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">No tasks yet</h3><p className="text-vyto-text-muted text-sm">Assign tasks to users from here.</p></div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map(t => (
                      <div key={t.id} className="glass-card p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                              <h3 className="text-sm sm:text-base font-semibold text-white truncate">{t.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${taskStatusColors[t.status] || ''}`}>{t.status.replace('_', ' ')}</span>
                              <span className={`text-xs font-medium ${taskPriorityColors[t.priority] || ''}`}>{t.priority}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-vyto-text-muted">Assigned to: {t.assigned_user_name || 'Unknown'}{t.due_date ? ` · Due: ${new Date(t.due_date).toLocaleDateString()}` : ''}</p>
                          </div>
                          <div className="flex gap-1 sm:gap-2 shrink-0">
                            <button onClick={() => openEditTask(t)} className="p-2 rounded-lg text-vyto-text-muted hover:text-vyto-cyan hover:bg-vyto-cyan/10 transition-all" title="Edit"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteTask(t.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Team Tab ─── */}
            {activeTab === 'team' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Team Management</h1>
                  <span className="text-sm text-vyto-text-muted">{teamMembers.length} members</span>
                </div>
                {teamMembers.length === 0 ? (
                  <div className="glass-card p-8 sm:p-12 text-center"><Crown className="w-12 h-12 text-vyto-text-muted/30 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">No team members yet</h3><p className="text-vyto-text-muted text-sm">Go to the Users tab and click the gear icon to manage team membership.</p></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {teamMembers.map(u => (
                      <motion.div key={u.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -2 }} className="glass-card p-4 sm:p-5 group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center text-sm font-bold text-white shrink-0 border border-vyto-border group-hover:border-vyto-cyan/30 transition-all overflow-hidden">
                            {u.profile_image ? <img src={getAssetUrl(u.profile_image, u.updated_at || undefined) || u.profile_image} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : u.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{u.name}</p>
                            {u.team_role ? <p className="text-xs text-vyto-cyan font-medium truncate">{u.team_role}</p> : <p className="text-xs text-vyto-text-muted truncate">{u.department || u.email}</p>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /><span className="text-xs text-yellow-400 font-medium">{u.stars}</span></div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openTeamModal(u)} className="p-1.5 rounded-lg text-vyto-text-muted hover:text-vyto-cyan transition-colors"><Settings className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleQuickToggleTeam(u)} className="p-1.5 rounded-lg text-red-400 hover:text-red-300 transition-colors"><UserMinus className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Events Tab ─── */}
            {activeTab === 'events' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Event Management</h1>
                  <button onClick={() => { resetEventForm(); setShowEventModal(true); }} className="btn-primary text-sm !py-2 !px-3 sm:!px-4"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add </span>Event</button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['all', 'upcoming', 'past'] as const).map(f => (
                    <button key={f} onClick={() => setEventFilter(f)} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${eventFilter === f ? 'bg-vyto-cyan/10 text-vyto-cyan' : 'text-vyto-text-muted hover:text-white'}`}>
                      {f.charAt(0).toUpperCase() + f.slice(1)} ({events.filter(e => f === 'all' ? true : f === 'upcoming' ? (e.status === 'upcoming' || e.status === 'ongoing') : (e.status === 'completed' || new Date(e.date) < new Date())).length})
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {filteredEvents.map(e => (
                    <div key={e.id} className="glass-card p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-white truncate">{e.title}</h3>
                          <p className="text-xs sm:text-sm text-vyto-text-muted">{new Date(e.date).toLocaleDateString()} · {e.location || 'TBA'}</p>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.status === 'upcoming' ? 'bg-vyto-cyan/10 text-vyto-cyan' : e.status === 'completed' ? 'bg-vyto-text-muted/10 text-vyto-text-muted' : e.status === 'ongoing' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{e.status}</span>
                            {e.registration_url && <a href={e.registration_url} target="_blank" rel="noopener noreferrer" className="text-xs text-vyto-cyan hover:underline flex items-center gap-1">Register <ExternalLink className="w-3 h-3" /></a>}
                            {e.poster_url && <a href={e.poster_url} target="_blank" rel="noopener noreferrer" className="text-xs text-vyto-text-muted hover:text-vyto-cyan flex items-center gap-1">Poster <ExternalLink className="w-3 h-3" /></a>}
                            {e.invitation_url && <a href={e.invitation_url} target="_blank" rel="noopener noreferrer" className="text-xs text-vyto-text-muted hover:text-vyto-cyan flex items-center gap-1">Invite <ExternalLink className="w-3 h-3" /></a>}
                          </div>
                        </div>
                        <div className="flex gap-1 sm:gap-2 shrink-0">
                          <button onClick={() => handleDeleteEvent(e.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Posters Tab ─── */}
            {activeTab === 'posters' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Poster Management</h1>
                  <button onClick={openCreatePoster} className="btn-primary text-sm !py-2 !px-3 sm:!px-4"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add </span>Poster</button>
                </div>
                {posters.length === 0 ? (
                  <div className="glass-card p-8 sm:p-12 text-center"><Image className="w-12 h-12 text-vyto-text-muted/30 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">No posters yet</h3><p className="text-vyto-text-muted text-sm">Create posters that appear as popups on the home page.</p></div>
                ) : (
                  <div className="space-y-3">
                    {posters.map(p => {
                      const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                      return (
                        <div key={p.id} className="glass-card p-4 sm:p-5">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-vyto-surface overflow-hidden shrink-0">
                              <img src={getAssetUrl(p.image_url) || p.image_url} alt={p.title || 'Poster'} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base font-semibold text-white truncate">{p.title || 'Untitled Poster'}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.active && !isExpired ? 'bg-green-500/10 text-green-400' : 'bg-vyto-text-muted/10 text-vyto-text-muted'}`}>
                                  {isExpired ? 'Expired' : p.active ? 'Active' : 'Inactive'}
                                </span>
                                {p.expires_at && <span className="text-xs text-vyto-text-muted">Exp: {new Date(p.expires_at).toLocaleDateString()}</span>}
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 mt-2">
                                <button onClick={() => handleTogglePoster(p)} className="text-xs text-vyto-text-muted hover:text-vyto-cyan transition-colors px-2 py-1">{p.active ? 'Deactivate' : 'Activate'}</button>
                                <button onClick={() => openEditPoster(p)} className="p-1.5 rounded-lg text-vyto-text-muted hover:text-vyto-cyan hover:bg-vyto-cyan/10 transition-all"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeletePoster(p.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Important Links Tab ─── */}
            {activeTab === 'important-links' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Important Links</h1>
                  <button onClick={openCreateLink} className="btn-primary text-sm !py-2 !px-3 sm:!px-4"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add </span>Link</button>
                </div>
                {importantLinks.length === 0 ? (
                  <div className="glass-card p-8 sm:p-12 text-center"><Link2 className="w-12 h-12 text-vyto-text-muted/30 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">No important links yet</h3><p className="text-vyto-text-muted text-sm">Assign private links to specific users.</p></div>
                ) : (
                  <div className="space-y-3">
                    {importantLinks.map(l => (
                      <div key={l.id} className="glass-card p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-white truncate">{l.title}</h3>
                            <p className="text-xs sm:text-sm text-vyto-text-muted">Assigned to: {l.assigned_user_name || 'Unknown'}{l.expires_at ? ` · Expires: ${new Date(l.expires_at).toLocaleDateString()}` : ''}</p>
                            <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-vyto-cyan hover:underline flex items-center gap-1 mt-1 truncate">{l.url} <ExternalLink className="w-3 h-3 shrink-0" /></a>
                          </div>
                          <div className="flex gap-1 sm:gap-2 shrink-0 items-start">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${l.active ? 'bg-green-500/10 text-green-400' : 'bg-vyto-text-muted/10 text-vyto-text-muted'}`}>{l.active ? 'Active' : 'Inactive'}</span>
                            <button onClick={() => openEditLink(l)} className="p-1.5 rounded-lg text-vyto-text-muted hover:text-vyto-cyan hover:bg-vyto-cyan/10 transition-all"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteLink(l.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Library Tab ─── */}
            {activeTab === 'library' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Library Management</h1>
                  <button onClick={() => { resetResourceForm(); setShowResourceModal(true); }} className="btn-primary text-sm !py-2 !px-3 sm:!px-4"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add </span>Resource</button>
                </div>
                <div className="space-y-3">
                  {resources.map(r => (
                    <div key={r.id} className="glass-card p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-white truncate">{r.title}</h3>
                          <p className="text-xs sm:text-sm text-vyto-text-muted">{r.category} · {r.resource_type.toUpperCase()}{r.author && ` · ${r.author}`}</p>
                        </div>
                        <button onClick={() => handleDeleteResource(r.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-all shrink-0"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals ─── */}

      {/* Team Modal */}
      <AnimatePresence>
        {showTeamModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTeamModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card p-5 sm:p-6 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-white">Manage Team Membership</h2>
                <button onClick={() => setShowTeamModal(false)} className="text-vyto-text-muted hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-3 mb-5 sm:mb-6 p-3 rounded-xl bg-vyto-surface/50 border border-vyto-border/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                  {selectedUser.profile_image ? <img src={getAssetUrl(selectedUser.profile_image, selectedUser.updated_at || undefined) || selectedUser.profile_image} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : selectedUser.name.charAt(0)}
                </div>
                <div className="min-w-0"><p className="text-sm font-medium text-white truncate">{selectedUser.name}</p><p className="text-xs text-vyto-text-muted truncate">{selectedUser.email}</p></div>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-vyto-text-secondary mb-2">Team Member</label>
                <button onClick={() => setTeamEnabled(!teamEnabled)} className={`relative w-12 h-6 rounded-full transition-colors ${teamEnabled ? 'bg-vyto-cyan' : 'bg-vyto-border'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${teamEnabled ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="mb-5 sm:mb-6 relative">
                <label className="block text-sm font-medium text-vyto-text-secondary mb-2">Team Designation {teamEnabled && <span className="text-vyto-error">*</span>}</label>
                <input type="text" value={teamRole} onChange={e => handleRoleSearch(e.target.value)} placeholder={teamEnabled ? 'e.g. Frontend Lead' : 'Enable team membership first'} disabled={!teamEnabled} className="input-field disabled:opacity-40 disabled:cursor-not-allowed" maxLength={100} />
                {teamEnabled && roleSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-vyto-surface border border-vyto-border rounded-xl overflow-hidden shadow-lg">
                    {roleSuggestions.map(role => (<button key={role} onClick={() => selectSuggestion(role)} className="w-full text-left px-4 py-2.5 text-sm text-vyto-text-secondary hover:text-white hover:bg-vyto-cyan/10 transition-colors">{role}</button>))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowTeamModal(false)} className="btn-secondary flex-1 !py-2.5">Cancel</button>
                <button onClick={handleSaveTeam} disabled={savingTeam || (teamEnabled && !teamRole.trim())} className="btn-primary flex-1 !py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  {savingTeam ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTaskModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card p-5 sm:p-6 w-full sm:max-w-lg max-h-[85vh] overflow-y-auto sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-white">{selectedTask ? 'Edit Task' : 'Assign Task'}</h2>
                <button onClick={() => setShowTaskModal(false)} className="text-vyto-text-muted hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Assigned User *</label>
                  <select value={taskForm.assigned_user_id} onChange={e => setTaskForm({ ...taskForm, assigned_user_id: parseInt(e.target.value) })} className="input-field">
                    <option value={0}>Select user...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Title *</label>
                  <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="input-field" placeholder="Task title" />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Description</label>
                  <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} className="input-field resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Priority</label>
                    <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} className="input-field">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-vyto-text-secondary mb-1">Status</label>
                    <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })} className="input-field">
                      <option value="todo">Todo</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Due Date</label>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} className="input-field" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowTaskModal(false)} className="btn-secondary flex-1 !py-2.5">Cancel</button>
                  <button onClick={handleSaveTask} className="btn-primary flex-1 !py-2.5"><Save className="w-4 h-4" /> {selectedTask ? 'Update' : 'Assign'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poster Modal */}
      <AnimatePresence>
        {showPosterModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPosterModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card p-5 sm:p-6 w-full sm:max-w-lg max-h-[85vh] overflow-y-auto sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-white">{selectedPoster ? 'Edit Poster' : 'Add Poster'}</h2>
                <button onClick={() => setShowPosterModal(false)} className="text-vyto-text-muted hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Title (optional)</label>
                  <input value={posterForm.title} onChange={e => setPosterForm({ ...posterForm, title: e.target.value })} className="input-field" placeholder="Poster title" />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Image URL *</label>
                  <input value={posterForm.image_url} onChange={e => setPosterForm({ ...posterForm, image_url: e.target.value })} className="input-field" placeholder="https://... or /uploads/posters/..." />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Click URL (optional)</label>
                  <input value={posterForm.target_url} onChange={e => setPosterForm({ ...posterForm, target_url: e.target.value })} className="input-field" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Expiration (optional)</label>
                  <input type="datetime-local" value={posterForm.expires_at} onChange={e => setPosterForm({ ...posterForm, expires_at: e.target.value })} className="input-field" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-vyto-text-secondary">Active</label>
                  <button onClick={() => setPosterForm({ ...posterForm, active: !posterForm.active })} className={`relative w-12 h-6 rounded-full transition-colors ${posterForm.active ? 'bg-vyto-cyan' : 'bg-vyto-border'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${posterForm.active ? 'left-[26px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowPosterModal(false)} className="btn-secondary flex-1 !py-2.5">Cancel</button>
                  <button onClick={handleSavePoster} className="btn-primary flex-1 !py-2.5"><Save className="w-4 h-4" /> {selectedPoster ? 'Update' : 'Publish'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Important Link Modal */}
      <AnimatePresence>
        {showLinkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLinkModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card p-5 sm:p-6 w-full sm:max-w-lg max-h-[85vh] overflow-y-auto sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-white">{selectedLink ? 'Edit Link' : 'Add Important Link'}</h2>
                <button onClick={() => setShowLinkModal(false)} className="text-vyto-text-muted hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Assign To *</label>
                  <select value={linkForm.assigned_user_id} onChange={e => setLinkForm({ ...linkForm, assigned_user_id: parseInt(e.target.value) })} className="input-field">
                    <option value={0}>Select user...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Title *</label>
                  <input value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} className="input-field" placeholder="Link title" />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Description</label>
                  <textarea value={linkForm.description} onChange={e => setLinkForm({ ...linkForm, description: e.target.value })} rows={2} className="input-field resize-none" />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">URL *</label>
                  <input value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} className="input-field" placeholder="https://drive.google.com/..." />
                </div>
                <div>
                  <label className="block text-sm text-vyto-text-secondary mb-1">Expiration (optional)</label>
                  <input type="datetime-local" value={linkForm.expires_at} onChange={e => setLinkForm({ ...linkForm, expires_at: e.target.value })} className="input-field" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-vyto-text-secondary">Active</label>
                  <button onClick={() => setLinkForm({ ...linkForm, active: !linkForm.active })} className={`relative w-12 h-6 rounded-full transition-colors ${linkForm.active ? 'bg-vyto-cyan' : 'bg-vyto-border'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${linkForm.active ? 'left-[26px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowLinkModal(false)} className="btn-secondary flex-1 !py-2.5">Cancel</button>
                  <button onClick={handleSaveLink} className="btn-primary flex-1 !py-2.5"><Save className="w-4 h-4" /> {selectedLink ? 'Update' : 'Save Link'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEventModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card p-5 sm:p-6 w-full sm:max-w-lg max-h-[85vh] overflow-y-auto sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-white">Create Event</h2>
                <button onClick={() => setShowEventModal(false)} className="text-vyto-text-muted hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-vyto-text-secondary mb-1">Title *</label><input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm text-vyto-text-secondary mb-1">Description</label><textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} rows={3} className="input-field resize-none" /></div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div><label className="block text-sm text-vyto-text-secondary mb-1">Date *</label><input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} className="input-field" /></div>
                  <div><label className="block text-sm text-vyto-text-secondary mb-1">Location</label><input value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} className="input-field" /></div>
                </div>
                <div><label className="block text-sm text-vyto-text-secondary mb-1">Registration URL</label><input value={eventForm.registration_url} onChange={e => setEventForm({ ...eventForm, registration_url: e.target.value })} className="input-field" placeholder="https://forms.google.com/..." /></div>
                <div><label className="block text-sm text-vyto-text-secondary mb-1">Poster URL (Google Drive)</label><input value={eventForm.poster_url} onChange={e => setEventForm({ ...eventForm, poster_url: e.target.value })} className="input-field" placeholder="https://drive.google.com/..." /></div>
                <div><label className="block text-sm text-vyto-text-secondary mb-1">Invitation URL (Google Drive)</label><input value={eventForm.invitation_url} onChange={e => setEventForm({ ...eventForm, invitation_url: e.target.value })} className="input-field" placeholder="https://drive.google.com/..." /></div>
                <button onClick={handleCreateEvent} className="btn-primary w-full !py-3 group" disabled={!eventForm.title || !eventForm.date}><Save className="w-4 h-4" /> Create Event</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resource Modal */}
      <AnimatePresence>
        {showResourceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowResourceModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card p-5 sm:p-6 w-full sm:max-w-lg max-h-[85vh] overflow-y-auto sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold text-white">Add Resource</h2>
                <button onClick={() => setShowResourceModal(false)} className="text-vyto-text-muted hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-vyto-text-secondary mb-1">Title *</label><input value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm text-vyto-text-secondary mb-1">Description</label><textarea value={resourceForm.description} onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })} rows={3} className="input-field resize-none" /></div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div><label className="block text-sm text-vyto-text-secondary mb-1">Category *</label><input value={resourceForm.category} onChange={e => setResourceForm({ ...resourceForm, category: e.target.value })} className="input-field" placeholder="e.g. Web Development" /></div>
                  <div><label className="block text-sm text-vyto-text-secondary mb-1">Type</label><select value={resourceForm.resource_type} onChange={e => setResourceForm({ ...resourceForm, resource_type: e.target.value })} className="input-field"><option value="pdf">PDF</option><option value="document">Document</option><option value="tutorial">Tutorial</option><option value="note">Notes</option><option value="link">Link</option><option value="video">Video</option><option value="other">Other</option></select></div>
                </div>
                <button onClick={handleCreateResource} className="btn-primary w-full !py-3 group" disabled={!resourceForm.title || !resourceForm.category}><Save className="w-4 h-4" /> Add Resource</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stars Modal */}
      <AnimatePresence>
        {showStarsModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowStarsModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card p-5 sm:p-6 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-base sm:text-lg font-bold text-white mb-2">Assign Stars</h2>
              <p className="text-sm text-vyto-text-muted mb-4">Set star count for {selectedUser.name}</p>
              <input type="number" value={starCount} onChange={e => setStarCount(parseInt(e.target.value) || 0)} min={0} max={9999} className="input-field mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setShowStarsModal(false)} className="btn-secondary flex-1 !py-2.5">Cancel</button>
                <button onClick={handleAssignStars} className="btn-primary flex-1 !py-2.5"><Star className="w-4 h-4" /> Assign</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Modal */}
      <AnimatePresence>
        {showRoleModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowRoleModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass-card p-5 sm:p-6 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-white">System Role</h2>
                <button onClick={() => setShowRoleModal(false)} className="text-vyto-text-muted hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-vyto-surface/50 border border-vyto-border/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                  {selectedUser.profile_image ? <img src={getAssetUrl(selectedUser.profile_image, selectedUser.updated_at || undefined) || selectedUser.profile_image} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : selectedUser.name.charAt(0)}
                </div>
                <div className="min-w-0"><p className="text-sm font-medium text-white truncate">{selectedUser.name}</p><p className="text-xs text-vyto-text-muted truncate">{selectedUser.email}</p></div>
              </div>
              <p className="text-sm text-vyto-text-secondary mb-3">Select a system role:</p>
              <div className="space-y-2 mb-6">
                {(['user', 'admin', 'president', 'vice_president'] as const).map(r => (
                  <button key={r} onClick={() => setSelectedRole(r)} className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${selectedRole === r ? 'border-vyto-cyan bg-vyto-cyan/10 text-vyto-cyan' : 'border-vyto-border bg-vyto-surface/50 text-vyto-text-secondary hover:border-vyto-border/80 hover:text-white'}`}>
                    <span className="flex items-center gap-2">
                      {r === 'president' || r === 'vice_president' ? <Crown className="w-4 h-4" /> : r === 'admin' ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      {roleDisplayLabel(r)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowRoleModal(false)} className="btn-secondary flex-1 !py-2.5">Cancel</button>
                <button onClick={handleSaveRole} className="btn-primary flex-1 !py-2.5"><Save className="w-4 h-4" /> Save Role</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

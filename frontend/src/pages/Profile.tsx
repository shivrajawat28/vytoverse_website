import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, Trophy, Mail, Building2, Edit3, Star, Shield, Users, CheckSquare, Link2, ExternalLink, Calendar, Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usersAPI, tasksAPI, importantLinksAPI } from '@/services/api';
import { hasAdminAccess, roleDisplayLabel, type Task, type ImportantLink } from '@/types';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myLinks, setMyLinks] = useState<ImportantLink[]>([]);
  const [form, setForm] = useState({
    name: '', username: '', bio: '', department: '',
    github_url: '', linkedin_url: '', twitter_url: '', website_url: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '', username: user.username || '', bio: user.bio || '',
        department: user.department || '', github_url: user.github_url || '',
        linkedin_url: user.linkedin_url || '', twitter_url: user.twitter_url || '', website_url: user.website_url || '',
      });
    }
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      const [tasksRes, linksRes] = await Promise.all([
        tasksAPI.getMyTasks().catch(() => ({ data: [] })),
        importantLinksAPI.getMyLinks().catch(() => ({ data: [] })),
      ]);
      setMyTasks(tasksRes.data);
      setMyLinks(linksRes.data);
    } catch { /* keep defaults */ }
  };

  const handleSave = async () => {
    setLoading(true);
    try { await usersAPI.updateProfile(form); await refreshUser(); setEditing(false); toast.success('Profile updated!'); }
    catch (err: any) { toast.error(err?.response?.data?.detail || 'Update failed'); }
    finally { setLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await usersAPI.uploadProfileImage(file); await refreshUser(); toast.success('Profile image updated!'); }
    catch (err: any) { toast.error(err?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const taskStatusColors: Record<string, string> = {
    todo: 'bg-vyto-surface text-vyto-text-muted border border-vyto-border',
    in_progress: 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20',
    completed: 'bg-green-500/10 text-green-400 border border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };
  const taskPriorityColors: Record<string, string> = {
    low: 'text-vyto-text-muted', medium: 'text-yellow-400', high: 'text-red-400',
  };

  if (!user) return null;

  return (
    <div className="relative pt-24">
      <section className="section-padding">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Profile Card */}
            <div className="glass-card p-8 lg:p-10 mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vyto-cyan/40 to-transparent" />
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-vyto-cyan/30 to-vyto-violet/30 flex items-center justify-center overflow-hidden border-2 border-vyto-border group-hover:border-vyto-cyan/30 transition-all duration-300">
                    {user.profile_image ? <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-white">{user.name.charAt(0)}</span>}
                  </div>
                  <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-vyto-cyan flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                  {user.username && <p className="text-vyto-text-muted text-sm">@{user.username}</p>}
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                    {hasAdminAccess(user.role) && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${user.role === 'president' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : user.role === 'vice_president' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-vyto-violet/10 text-vyto-violet border border-vyto-violet/20'}`}>
                        {user.role === 'president' ? <Crown className="w-3 h-3" /> : user.role === 'vice_president' ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />} {roleDisplayLabel(user.role)}
                      </span>
                    )}
                    {user.team_membership === 1 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20"><Users className="w-3 h-3" /> Team Member</span>}
                    {user.team_membership === 1 && user.team_role && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-vyto-blue/10 text-vyto-blue border border-vyto-blue/20">{user.team_role}</span>}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-sm text-vyto-text-secondary"><Mail className="w-4 h-4 shrink-0" />{user.email}</div>
                  {user.department && <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-sm text-vyto-text-secondary"><Building2 className="w-4 h-4 shrink-0" />{user.department}</div>}
                </div>
                <button onClick={() => setEditing(!editing)} className="btn-secondary text-sm !py-2 !px-4 shrink-0"><Edit3 className="w-4 h-4" />{editing ? 'Cancel' : 'Edit Profile'}</button>
              </div>
            </div>

            {/* Edit Form */}
            {editing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 lg:p-10 mb-8">
                <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div><label className="block text-sm font-medium text-vyto-text-secondary mb-2">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
                  <div><label className="block text-sm font-medium text-vyto-text-secondary mb-2">Username</label><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="input-field" /></div>
                  <div className="sm:col-span-2"><label className="block text-sm font-medium text-vyto-text-secondary mb-2">Bio</label><textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} className="input-field resize-none" /></div>
                  <div><label className="block text-sm font-medium text-vyto-text-secondary mb-2">Department</label><input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input-field" /></div>
                  <div><label className="block text-sm font-medium text-vyto-text-secondary mb-2">GitHub URL</label><input value={form.github_url} onChange={e => setForm({ ...form, github_url: e.target.value })} className="input-field" placeholder="https://github.com/..." /></div>
                  <div><label className="block text-sm font-medium text-vyto-text-secondary mb-2">LinkedIn URL</label><input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} className="input-field" placeholder="https://linkedin.com/in/..." /></div>
                  <div><label className="block text-sm font-medium text-vyto-text-secondary mb-2">Twitter URL</label><input value={form.twitter_url} onChange={e => setForm({ ...form, twitter_url: e.target.value })} className="input-field" placeholder="https://twitter.com/..." /></div>
                </div>
                <div className="mt-6"><button onClick={handleSave} disabled={loading} className="btn-primary group">{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}</button></div>
              </motion.div>
            )}

            {/* My Tasks */}
            <div className="glass-card p-8 lg:p-10 mb-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-vyto-cyan" /> My Tasks</h2>
              {myTasks.length === 0 ? (
                <p className="text-vyto-text-muted">No tasks have been assigned to you yet.</p>
              ) : (
                <div className="space-y-3">
                  {myTasks.map(t => (
                    <div key={t.id} className="p-4 rounded-xl bg-vyto-surface/50 border border-vyto-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${taskStatusColors[t.status] || ''}`}>{t.status.replace('_', ' ')}</span>
                        <span className={`text-xs font-medium ${taskPriorityColors[t.priority] || ''}`}>{t.priority.toUpperCase()}</span>
                      </div>
                      <h3 className="text-base font-semibold text-white mb-1">{t.title}</h3>
                      {t.description && <p className="text-sm text-vyto-text-muted mb-2">{t.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-vyto-text-muted">
                        {t.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {new Date(t.due_date).toLocaleDateString()}</span>}
                        <span>Created: {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Important Links */}
            <div className="glass-card p-8 lg:p-10 mb-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Link2 className="w-5 h-5 text-vyto-cyan" /> Important Links</h2>
              {myLinks.length === 0 ? (
                <p className="text-vyto-text-muted">No important links have been assigned to you yet.</p>
              ) : (
                <div className="space-y-3">
                  {myLinks.map(l => (
                    <div key={l.id} className="p-4 rounded-xl bg-vyto-surface/50 border border-vyto-border/50 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white mb-1">{l.title}</h3>
                        {l.description && <p className="text-sm text-vyto-text-muted mb-1">{l.description}</p>}
                        {l.expires_at && <span className="text-xs text-vyto-text-muted">Expires: {new Date(l.expires_at).toLocaleDateString()}</span>}
                      </div>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs !py-2 !px-3 shrink-0"><ExternalLink className="w-3.5 h-3.5" /> Open</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stars */}
            <div className="glass-card p-8 lg:p-10">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Stars Earned</h2>
              {user.stars > 0 ? (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-yellow-500/[0.08] border border-yellow-500/15">
                      <Star className="w-7 h-7 text-yellow-400 fill-yellow-400" />
                      <span className="text-3xl font-bold text-yellow-400">{user.stars}</span>
                      <span className="text-sm text-yellow-400/60">stars</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {Array.from({ length: Math.min(user.stars, 30) }).map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400 opacity-80" />)}
                    {user.stars > 30 && <span className="text-sm text-yellow-400/70 self-center ml-1">+{user.stars - 30} more</span>}
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-vyto-surface overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((user.stars / 100) * 100, 100)}%` }} transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500" />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-vyto-text-muted"><span>{user.stars} stars</span><span>Next milestone: 100</span></div>
                </div>
              ) : <p className="text-vyto-text-muted">No stars yet. Participate in events and contribute to earn stars!</p>}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  FileText,
  Link2,
  Video,
  BookOpen,
  Download,
  ExternalLink,
  Tag,
  Calendar,
} from 'lucide-react';
import { libraryAPI } from '@/services/api';
import type { LibraryResource } from '@/types';

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  document: FileText,
  link: Link2,
  video: Video,
  tutorial: BookOpen,
  note: FileText,
  other: FileText,
};

const typeColors: Record<string, string> = {
  pdf: 'bg-red-500/10 text-red-400 border-red-500/20',
  document: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  link: 'bg-vyto-cyan/10 text-vyto-cyan border-vyto-cyan/20',
  video: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  tutorial: 'bg-green-500/10 text-green-400 border-green-500/20',
  note: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  other: 'bg-white/5 text-vyto-text-muted border-vyto-border',
};

export default function Library() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    loadResources();
    loadCategories();
  }, [selectedCategory, selectedType]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (selectedCategory) params.category = selectedCategory;
      if (selectedType) params.type = selectedType;
      const res = await libraryAPI.list(params);
      setResources(res.data);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await libraryAPI.categories();
      setCategories(res.data);
    } catch {
      // keep empty
    }
  };

  const filtered = resources.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.author?.toLowerCase().includes(search.toLowerCase())
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
            <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">Library</span>
            <h1 className="text-4xl sm:text-5xl font-bold mt-4 mb-4">
              Learning <span className="gradient-text">Resources</span>
            </h1>
            <p className="text-lg text-vyto-text-secondary max-w-2xl mx-auto">
              Access curated tutorials, notes, documentation, and learning materials.
            </p>
          </motion.div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyto-text-muted" />
              <input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field !w-auto !py-3 min-w-[180px]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input-field !w-auto !py-3 min-w-[160px]"
            >
              <option value="">All Types</option>
              <option value="pdf">PDF</option>
              <option value="document">Document</option>
              <option value="tutorial">Tutorial</option>
              <option value="note">Notes</option>
              <option value="link">Link</option>
              <option value="video">Video</option>
            </select>
          </div>

          {/* Category Chips */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !selectedCategory
                    ? 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20'
                    : 'bg-vyto-surface text-vyto-text-muted border border-vyto-border hover:text-white'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-vyto-cyan/10 text-vyto-cyan border border-vyto-cyan/20'
                      : 'bg-vyto-surface text-vyto-text-muted border border-vyto-border hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Resources Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-vyto-border" />
                    <div className="h-6 w-16 bg-vyto-border rounded" />
                  </div>
                  <div className="h-5 bg-vyto-border rounded w-3/4 mb-3" />
                  <div className="h-4 bg-vyto-border rounded w-full mb-2" />
                  <div className="h-4 bg-vyto-border rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-vyto-text-muted/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No resources found</h3>
              <p className="text-vyto-text-muted">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((resource, i) => {
                const Icon = typeIcons[resource.resource_type] || FileText;
                const tc = typeColors[resource.resource_type] || typeColors.other;
                return (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="glass-card-hover p-6 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-vyto-cyan/10 flex items-center justify-center group-hover:bg-vyto-cyan/15 transition-colors">
                        <Icon className="w-5 h-5 text-vyto-cyan" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${tc}`}>
                        {resource.resource_type.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white mb-2 group-hover:text-vyto-cyan transition-colors">
                      {resource.title}
                    </h3>

                    <p className="text-sm text-vyto-text-muted mb-4 line-clamp-2">
                      {resource.description || 'No description available.'}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-vyto-surface border border-vyto-border text-vyto-text-muted">
                        <Tag className="w-3 h-3" />
                        {resource.category}
                      </span>
                      {resource.author && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-vyto-surface border border-vyto-border text-vyto-text-muted">
                          By {resource.author}
                        </span>
                      )}
                    </div>

                    {resource.created_at && (
                      <div className="flex items-center gap-1.5 text-xs text-vyto-text-muted mb-4">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(resource.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {resource.external_url && (
                        <a
                          href={resource.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary flex-1 text-xs !py-2 !px-3 group/btn"
                        >
                          Open <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </a>
                      )}
                      {resource.file_url && (
                        <a
                          href={resource.file_url}
                          download
                          className="btn-primary flex-1 text-xs !py-2 !px-3 group/btn"
                        >
                          Download <Download className="w-3.5 h-3.5 group-hover/btn:translate-y-0.5 transition-transform" />
                        </a>
                      )}
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

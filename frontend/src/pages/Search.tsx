// Search Page
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Video, CheckSquare, GitBranch, FileText } from 'lucide-react';
import { searchApi } from '../services/api';
import type { SearchResult } from '../types';
import { truncate } from '../utils';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  meeting: <Video className="w-4 h-4 text-brand-400" />,
  action: <CheckSquare className="w-4 h-4 text-emerald-400" />,
  decision: <GitBranch className="w-4 h-4 text-blue-400" />,
  transcript: <FileText className="w-4 h-4 text-surface-400" />,
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchApi.search(query);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const getLink = (r: SearchResult) => {
    if (r.type === 'meeting') return `/meetings/${r.id}`;
    if (r.type === 'action') return `/actions`;
    if (r.type === 'decision') return `/decisions`;
    if (r.type === 'transcript' && r.meeting_id) return `/meetings/${r.meeting_id}`;
    return '#';
  };

  return (
    <div className="space-y-5 animate-fade max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Global Search</h1>
        <p className="text-surface-400 text-sm mt-0.5">Search across meetings, actions, decisions, and transcripts</p>
      </div>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          autoFocus
          className="input pl-12 py-4 text-base"
          placeholder='Search for "website redesign", "Arun Kumar", "budget"…'
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {query.length >= 2 && results.length === 0 && !loading && (
        <div className="empty-state">
          <Search className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400">No results for "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-surface-500 mb-3">{results.length} results for "{query}"</div>
          {results.map((r, i) => (
            <Link key={`${r.type}-${r.id}-${i}`} to={getLink(r)} className="card-hover flex items-start gap-3">
              <div className="w-8 h-8 bg-surface-700 rounded-lg flex items-center justify-center flex-shrink-0">
                {TYPE_ICONS[r.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-surface-500 uppercase">{r.type}</span>
                  {r.meeting_title && (
                    <span className="text-2xs text-surface-600">• {r.meeting_title}</span>
                  )}
                </div>
                <div className="text-sm font-medium text-surface-100 mt-0.5">
                  {truncate(r.title, 80)}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">{truncate(r.snippet, 120)}</div>
              </div>
              <div className="text-2xs text-surface-600 flex-shrink-0">{(r.score * 100).toFixed(0)}% match</div>
            </Link>
          ))}
        </div>
      )}

      {query.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-surface-700 mx-auto mb-3" />
          <p className="text-surface-500 text-sm">
            Try searching for a person, action, decision, or topic
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {['website redesign', 'Arun Kumar', 'budget', 'overdue', 'launch'].map(s => (
              <button key={s} onClick={() => setQuery(s)}
                className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-full text-xs text-surface-300 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';

interface DocTree {
  id: string;
  filename: string;
  status: string;
  nodes: number;
  depth: number;
  summary?: string;
}

export function FileSystemTreeView() {
  const [docs, setDocs] = useState<DocTree[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/files')
      .then(r => r.json())
      .then(data => {
        const files = (data.files || []) as Array<{
          id: string; filename: string; status: string; summary?: string;
          metadata?: Record<string, unknown>;
        }>;
        setDocs(files.map(f => {
          const tree = f.metadata?.pageindexTree as { totalNodes?: number; depth?: number } | undefined;
          return {
            id: f.id, filename: f.filename, status: f.status,
            nodes: tree?.totalNodes || 0,
            depth: tree?.depth || 0,
            summary: f.summary,
          };
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-black/40 animate-pulse">Loading indexed documents...</div>;

  const withTrees = docs.filter(d => d.nodes > 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-black/80">Indexed Documents</h2>
      {withTrees.length === 0 ? (
        <div className="text-sm text-black/40">No indexed documents with trees found.</div>
      ) : (
        <div className="bg-white border border-black/10 rounded-xl divide-y divide-black/[0.06]">
          {withTrees.map(d => (
            <div key={d.id} className="px-4 py-3 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-black/70 truncate">{d.filename}</div>
                {d.summary && <div className="text-xs text-black/40 mt-0.5 line-clamp-2">{d.summary}</div>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-black/40">{d.nodes} nodes</span>
                <span className="text-xs text-black/30">depth {d.depth}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  d.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                  d.status === 'indexing' ? 'bg-amber-50 text-amber-700' :
                  'bg-black/5 text-black/50'
                }`}>{d.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

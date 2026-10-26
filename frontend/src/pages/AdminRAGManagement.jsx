import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PlusCircle, CheckCircle2, XCircle, RefreshCw, Trash2, Shield, Search, ArrowRight, Layers, FileText } from 'lucide-react';
import { api } from '../api/client';

export default function AdminRAGManagement() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // New Document Form
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('eligibility');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('approved');
  const [uploading, setUploading] = useState(false);

  // Vector Search Test Box
  const [testQuery, setTestQuery] = useState('How long to wait between blood donations?');
  const [queryResults, setQueryResults] = useState(null);
  const [searchingVector, setSearchingVector] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await api.rag.getDocuments();
      if (res.success) {
        setDocuments(res.documents || []);
      }
    } catch (err) {
      console.error('Failed to load RAG docs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleIngestDocument = async (e) => {
    e.preventDefault();
    if (!title || !content) return;

    setUploading(true);
    try {
      const res = await api.rag.ingestDocument({
        title,
        source,
        category,
        content,
        status
      });

      if (res.success) {
        setShowUploadModal(false);
        setTitle('');
        setSource('');
        setContent('');
        fetchDocs();
      }
    } catch (err) {
      alert(`Ingestion failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (docId, newStatus) => {
    try {
      await api.rag.updateStatus(docId, newStatus);
      fetchDocs();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleReingest = async (docId) => {
    try {
      await api.rag.reingest(docId);
      alert('Document re-ingested and chunks refreshed.');
      fetchDocs();
    } catch (err) {
      alert(`Re-ingestion failed: ${err.message}`);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document and all its chunks?')) return;
    try {
      await api.rag.deleteDoc(docId);
      fetchDocs();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleTestVectorSearch = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setSearchingVector(true);
    try {
      const res = await api.rag.testQuery(testQuery);
      if (res.success) {
        setQueryResults(res.chunks || []);
      }
    } catch (err) {
      alert(`Vector search error: ${err.message}`);
    } finally {
      setSearchingVector(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Approved RAG Knowledge Documents
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Grounded vector storage: only <strong>approved</strong> documents are retrievable by the AI Assistant
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Ingest Knowledge Doc
          </button>
        </div>
      </div>

      {/* Vector Retrieval Evaluator Sandbox */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 p-6 sm:p-8 rounded-3xl border border-indigo-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-indigo-600" />
            Live Vector Similarity Retrieval Sandbox
          </span>
          <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full">
            Cosine Similarity &gt; 0.12
          </span>
        </div>

        <form onSubmit={handleTestVectorSearch} className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type a query to evaluate vector cosine chunk matching..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={searchingVector}
            className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm whitespace-nowrap"
          >
            {searchingVector ? 'Calculating Cosine...' : 'Test Retrieval'}
          </button>
        </form>

        {queryResults && (
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold text-slate-700">
              Retrieved {queryResults.length} approved chunk(s):
            </span>
            {queryResults.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No approved chunks met the similarity threshold.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {queryResults.map((chunk, idx) => (
                  <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">{chunk.title}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Score: {chunk.similarity_score}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">{chunk.content}</p>
                    <span className="text-[10px] text-slate-400 block pt-1">Source: {chunk.source}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Ingested Knowledge Documents ({documents.length})
        </h3>

        <div className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <div key={doc.id} className="py-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    doc.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : doc.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {doc.status}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {doc.chunk_count} Chunks
                  </span>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2">
                  {doc.status !== 'approved' && (
                    <button
                      onClick={() => handleStatusChange(doc.id, 'approved')}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg"
                    >
                      Approve
                    </button>
                  )}
                  {doc.status !== 'rejected' && (
                    <button
                      onClick={() => handleStatusChange(doc.id, 'rejected')}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleReingest(doc.id)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                    title="Re-chunk and Re-embed"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-red-500 hover:text-red-800 hover:bg-red-50 rounded-lg"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span>Source: <strong>{doc.source}</strong></span>
                <span>Category: <strong>{doc.category}</strong></span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {doc.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Upload/Ingest Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Ingest New Knowledge Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIngestDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Platelet Donation Guidelines 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Authoritative Source *</label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. NBTC / DGHS"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="eligibility">Eligibility</option>
                    <option value="guidelines">Guidelines</option>
                    <option value="workflow">Workflow</option>
                    <option value="faq">FAQ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Document Text *</label>
                <textarea
                  rows={6}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste official approved guidance text here..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Approval Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  <option value="approved">Approved (Immediately retrievable)</option>
                  <option value="pending">Pending Admin Review</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  {uploading ? 'Chunking & Embedding...' : 'Ingest Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Building2, 
  Download, 
  FileText, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Activity,
  Calendar,
  FileCheck,
  Tag,
  Eye,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TenderItem, DocumentItem, APILog } from './types';
import { 
  fetchTendersList, 
  fetchTenderDocuments, 
  downloadDocument,
  getTenderID,
  getTenderNo,
  getTenderTitle,
  getDepartment,
  getClosingDate,
  getOpeningDate,
  getPublishDate,
  getTenderFee,
  getEstimatedCost,
  getDocumentID,
  getDocumentGUID,
  getDocumentTitle,
  getDocumentSize,
  registerLogListener,
  clearLogs
} from './utils/api';

const DEPARTMENTS = [
  { value: '', label: 'All Departments' },
  { value: 'School Education & Literacy Department', label: 'School Education & Literacy' },
  { value: 'Irrigation Department', label: 'Irrigation' },
  { value: 'Health Department', label: 'Health' },
  { value: 'Works & Services Department', label: 'Works & Services & Road' },
  { value: 'Local Government Department', label: 'Local Government' },
  { value: 'Sindh Revenue Board', label: 'Sindh Revenue Board' },
  { value: 'Agriculture Department', label: 'Agriculture' },
  { value: 'Police Department', label: 'Sindh Police' },
  { value: 'Energy Department', label: 'Energy' },
];

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  // Core application states
  const [tenders, setTenders] = useState<TenderItem[]>([]);
  const [selectedTender, setSelectedTender] = useState<TenderItem | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingTenders, setIsLoadingTenders] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [errorTenders, setErrorTenders] = useState<string | null>(null);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);

  // Search, paging, and filters
  const [searchKeywords, setSearchKeywords] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [lastFetchedFilters, setLastFetchedFilters] = useState({ keywords: '', dept: '' });

  // Live clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // API logs and download History
  const [logs, setLogs] = useState<APILog[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<Array<{
    id: string;
    title: string;
    timestamp: string;
    tenderNo: string;
  }>>([]);

  // Track downloading states matching file identifiers
  const [downloadingStates, setDownloadingStates] = useState<Record<string, boolean>>({});

  // Collapsible diagnostics tray/inspector state
  const [activeInspectorLog, setActiveInspectorLog] = useState<APILog | null>(null);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState(true);

  // Elegant notifications (React Toast)
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Trigger toast notification
  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Real-time API Logs synchronization
  useEffect(() => {
    registerLogListener((updatedLogs) => {
      setLogs(updatedLogs);
    });
  }, []);

  // Sync real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch tenders handler with custom page reset guards
  const loadTenders = async (pageTarget: number = 1, forceKeywords?: string, forceDept?: string) => {
    setIsLoadingTenders(true);
    setErrorTenders(null);
    
    let kw = forceKeywords !== undefined ? forceKeywords : searchKeywords;
    const dp = forceDept !== undefined ? forceDept : selectedDept;

    if (kw === 'All' || kw === 'all') {
      kw = '';
    }

    try {
      const results = await fetchTendersList(kw, dp, pageTarget, pageSize);
      setTenders(results);
      setPage(pageTarget);
      setLastFetchedFilters({ keywords: kw, dept: dp });

      // Automatically pre-select first item if it exists and nothing is selected
      if (results.length > 0) {
        handleTenderSelection(results[0]);
      } else {
        setSelectedTender(null);
        setDocuments([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorTenders(err.message || 'Error occurred while loading tenders from the proxy server.');
      addToast('error', `Failed to load tenders: ${err.message || 'Network proxy issue'}`);
    } finally {
      setIsLoadingTenders(false);
    }
  };

  // Trigger loading automatically on mount
  useEffect(() => {
    loadTenders(1);
  }, []);

  // Selection change triggers documents query automatically
  const handleTenderSelection = async (tender: TenderItem) => {
    setSelectedTender(tender);
    setDocuments([]);
    setErrorDocs(null);
    setIsLoadingDocs(true);

    const docId = getTenderID(tender);
    if (String(docId) === 'N/A' || !docId) {
      setErrorDocs('This tender lacks a valid document identifier.');
      setIsLoadingDocs(false);
      return;
    }

    try {
      const docResults = await fetchTenderDocuments(docId);
      setDocuments(docResults);
    } catch (err: any) {
      console.error(err);
      setErrorDocs(err.message || 'Failed to retreive attachment files.');
      addToast('error', `Could not fetch documents for Tender #${getTenderNo(tender)}`);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Handle keyword submission / search trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTenders(1);
    addToast('info', `Broad search query requested: "${searchKeywords || 'All'}"`);
  };

  // Quick department selection fetch trigger
  const handleDeptChange = (deptVal: string) => {
    setSelectedDept(deptVal);
    loadTenders(1, searchKeywords, deptVal);
    addToast('info', `Filtering by Department: ${deptVal || 'All'}`);
  };

  // Clear search and reload all
  const handleClearSearch = () => {
    setSearchKeywords('');
    setSelectedDept('');
    loadTenders(1, '', '');
    addToast('success', 'Search filters reset successfully');
  };

  // Download PDF asset action handler
  const handleDownloadFile = async (doc: DocumentItem) => {
    const fileId = getDocumentID(doc);
    const fileGuid = getDocumentGUID(doc);
    const title = getDocumentTitle(doc);
    
    if (String(fileId) === 'N/A' || !fileId || !fileGuid) {
      addToast('error', `Cannot download document (missing GUID/ID attributes)`);
      return;
    }

    setDownloadingStates(prev => ({ ...prev, [fileId]: true }));
    addToast('info', `Starting download for ${title}...`);

    try {
      const blob = await downloadDocument(fileId, fileGuid, title);
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', title);
      document.body.appendChild(link);
      link.click();
      
      // Post cleanup
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);

      // Log download history state
      setDownloadHistory(prev => [
        {
          id: fileId.toString(),
          title,
          timestamp: new Date().toLocaleTimeString(),
          tenderNo: selectedTender ? getTenderNo(selectedTender) : 'N/A',
        },
        ...prev
      ]);
      addToast('success', `Document "${title}" saved successfully!`);
    } catch (err: any) {
      console.error(err);
      addToast('error', `Download aborted: ${err.message || err}`);
    } finally {
      setDownloadingStates(prev => ({ ...prev, [fileId]: false }));
    }
  };

  // Clear user history
  const handleClearHistory = () => {
    setDownloadHistory([]);
    addToast('success', 'Download history cleared');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans flex flex-col antialiased">
      
      {/* Toast notifications portal */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl shadow-lg border text-sm pointer-events-auto flex items-center gap-3 ${
                toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-950' :
                toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-950' :
                'bg-blue-50 border-blue-100 text-blue-950'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              {toast.type === 'info' && <Activity className="w-5 h-5 text-blue-600 shrink-0" />}
              <span className="flex-1 font-medium">{toast.message}</span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Primary Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-600 text-white rounded-lg">
                <FileSpreadsheet className="w-5 h-5" id="header-logo-icon" />
              </span>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 font-display tracking-tight flex items-center gap-2">
                Sindh e-Procurement Portal
              </h1>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full font-mono mt-1">
                Proxy Mode
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1 pl-10">
              Browse public tenders, inspect tenders schemas, and download official PDF attachments.
            </p>
          </div>

          {/* Right hand parameters with Realtime clocks */}
          <div className="flex items-center gap-4 text-xs font-mono pl-10 md:pl-0">
            <div className="hidden sm:flex flex-col items-end text-slate-500 border-r border-slate-200 pr-4">
              <span>ACTIVE USER OFFICE</span>
              <span className="font-semibold text-slate-800">31640 (Provincial)</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-slate-400 text-[10px] select-none">UTC STAMP CLOCK</span>
              <div className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold select-none">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentTime.toISOString().replace('T', ' ').split('.')[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (span 7): Search Criteria & Tenders List */}
        <section className="col-span-1 lg:col-span-7 flex flex-col gap-6">
          
          {/* Query Filter panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-md text-slate-600">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-slate-900 font-display text-sm tracking-tight">
                  Tender Filtering Controls
                </h2>
              </div>
              
              <button 
                onClick={() => loadTenders(page)}
                disabled={isLoadingTenders}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 font-medium cursor-pointer transition-colors"
                id="btn-refresh-tenders"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTenders ? 'animate-spin text-emerald-600' : ''}`} />
                <span>Force Sync</span>
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Free keywords filter input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="search-input" className="text-xs font-semibold text-slate-600 pl-0.5">
                    Keywords / Subject
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      id="search-input"
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400 text-slate-950"
                      placeholder="e.g. Roads, School, Health, NIT"
                      value={searchKeywords}
                      onChange={(e) => setSearchKeywords(e.target.value)}
                    />
                  </div>
                </div>

                {/* Popular Sindh Departments Selection list */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dept-select" className="text-xs font-semibold text-slate-600 pl-0.5">
                    Department Agency
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      id="dept-select"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-950 appearance-none font-sans"
                      value={selectedDept}
                      onChange={(e) => handleDeptChange(e.target.value)}
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Action row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Current page: <span className="font-mono text-slate-700 font-semibold">#{page}</span> | Payload target: <span className="font-mono text-slate-700 font-semibold">{pageSize} items</span>
                </p>

                <div className="flex items-center gap-3">
                  {(searchKeywords !== '' || selectedDept !== '') && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                      id="btn-clear-filters"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoadingTenders}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
                    id="btn-search-trigger"
                  >
                    {isLoadingTenders ? 'Loading...' : 'Apply Filters'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Tender Results Index */}
          <div className="flex-1 flex flex-col min-h-[450px]">
            {errorTenders ? (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center flex flex-col items-center justify-center flex-1">
                <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                <h3 className="font-semibold text-rose-950 font-display">Tenders Load Failure</h3>
                <p className="text-xs text-rose-800 mt-1.5 max-w-md">
                  {errorTenders}
                </p>
                <button
                  onClick={() => loadTenders(1)}
                  className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 cursor-pointer transition-colors"
                >
                  Retry Request
                </button>
              </div>
            ) : isLoadingTenders ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center flex-1 gap-3">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="mt-2">
                  <p className="text-sm font-semibold text-slate-800">Querying Sindh Proxy Portal...</p>
                  <p className="text-xs text-slate-400 mt-0.5">Fetching active tenders list with standard headers</p>
                </div>
              </div>
            ) : tenders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center flex-1">
                <span className="p-4 bg-slate-50 text-slate-400 rounded-2xl mb-4">
                  <Search className="w-8 h-8" />
                </span>
                <h3 className="font-semibold text-slate-900 font-display">No Tenders Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  We couldn't find any tenders matching '{lastFetchedFilters.keywords || 'All'}' in {lastFetchedFilters.dept ? lastFetchedFilters.dept : 'All Departments'}.
                </p>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="mt-4 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Clear Adjustments
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                
                {/* Tenders Loop */}
                <div className="flex flex-col gap-3">
                  {tenders.map((item) => {
                    const id = getTenderID(item);
                    const isSelected = selectedTender ? getTenderID(selectedTender) === id : false;
                    const number = getTenderNo(item);
                    const title = getTenderTitle(item);
                    const dept = getDepartment(item);
                    const closeDate = getClosingDate(item);
                    const pubDate = getPublishDate(item);

                    return (
                      <motion.div
                        key={id || Math.random()}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleTenderSelection(item)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 relative overflow-hidden group ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs text-slate-800'
                        }`}
                      >
                        {/* Selected Indicator Light */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                          isSelected ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-slate-200'
                        }`} />

                        <div className="pl-2 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            {/* Tender Number Tag */}
                            <span className={`px-2 py-1 rounded text-[11px] font-mono font-bold tracking-tight select-all leading-none ${
                              isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              ID: {number}
                            </span>

                            {closeDate !== 'N/A' && (
                              <span className={`text-[11px] font-mono flex items-center gap-1 shrink-0 select-none ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}>
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                Closing: {closeDate.split(',')[0]}
                              </span>
                            )}
                          </div>

                          {/* Subject / Title */}
                          <h3 className="font-semibold text-sm leading-snug tracking-tight font-display line-clamp-2">
                            {title}
                          </h3>

                          {/* Meta grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-dashed border-slate-100/10 text-xs">
                            <span className={`flex items-center gap-2 ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}>
                              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="truncate">{dept}</span>
                            </span>
                            {pubDate !== 'N/A' && (
                              <span className={`flex items-center gap-2 sm:justify-end ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}>
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Published: {pubDate.split(',')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination Module */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between mt-2 shadow-xs">
                  <button
                    disabled={page === 1 || isLoadingTenders}
                    onClick={() => loadTenders(page - 1)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 text-xs text-slate-600"
                    id="btn-pagination-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs text-slate-500 font-mono">
                    Page <span className="font-bold text-slate-800">#{page}</span> of index
                  </span>

                  <button
                    disabled={tenders.length < pageSize || isLoadingTenders}
                    onClick={() => loadTenders(page + 1)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 text-xs text-slate-600"
                    id="btn-pagination-next"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}
          </div>
        </section>

        {/* Right Column (span 5): Tender Details & Diagnostics */}
        <section className="col-span-1 lg:col-span-5 flex flex-col gap-6">

          {/* Expanded Tender Detail panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-5 sticky top-24">
            
            {/* Selected Heading */}
            {selectedTender ? (
              <div className="flex flex-col gap-4">
                
                {/* ID with title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 font-mono">
                      Selected Tender Specifics
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      DocRef: {getTenderID(selectedTender)}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 font-display leading-snug">
                    {getTenderTitle(selectedTender)}
                  </h2>
                </div>

                {/* Primary specs metadata grid */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500 shrink-0 font-medium">Department</span>
                    <span className="text-slate-800 text-right font-medium truncate">{getDepartment(selectedTender)}</span>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Tender No / NIT</span>
                    <span className="font-mono font-bold text-slate-800 select-all">{getTenderNo(selectedTender)}</span>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Closing submission</span>
                    <span className="font-mono text-slate-800">{getClosingDate(selectedTender)}</span>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Opening session</span>
                    <span className="font-mono text-slate-800">{getOpeningDate(selectedTender)}</span>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Estimated cost</span>
                    <span className="font-mono text-slate-800 font-medium text-emerald-700">{getEstimatedCost(selectedTender)}</span>
                  </div>
                  <div className="h-px bg-slate-200/60" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Tender fee</span>
                    <span className="font-mono text-slate-800">{getTenderFee(selectedTender)}</span>
                  </div>
                </div>

                {/* Documents section */}
                <div className="flex flex-col gap-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Official Attachments & Forms
                  </h3>
                  
                  {isLoadingDocs ? (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin"></div>
                      <span className="text-xs text-slate-500 font-mono">Retrieving Document Index...</span>
                    </div>
                  ) : errorDocs ? (
                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-semibold">Documents Error</span>
                        <span>{errorDocs}</span>
                      </div>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 text-center text-xs text-slate-500 flex flex-col items-center">
                      <FileCheck className="w-5 h-5 text-slate-300 mb-1" />
                      <span>No attachments returned by proxy.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {documents.map((doc, idx) => {
                        const fileId = getDocumentID(doc);
                        const size = getDocumentSize(doc);
                        const title = getDocumentTitle(doc);
                        const isDownloading = downloadingStates[fileId] || false;

                        return (
                          <div
                            key={fileId || idx}
                            className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 text-xs hover:border-slate-200 transition-colors"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <FileText className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-slate-800 truncate" title={title}>
                                  {title}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  ID: {fileId} • Size: {size}
                                </span>
                              </div>
                            </div>

                            <button
                              disabled={isDownloading}
                              onClick={() => handleDownloadFile(doc)}
                              className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white p-2 rounded-lg shrink-0 transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              {isDownloading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center p-8 flex flex-col items-center justify-center min-h-[200px]">
                <FileText className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-800 text-sm font-display">No Selection</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Choose a tender from the left list row panel to see documents, parameters, and download files.
                </p>
              </div>
            )}

            {/* History of downloaded items */}
            {downloadHistory.length > 0 && (
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Session Save ledger ({downloadHistory.length})
                  </span>
                  <button 
                    onClick={handleClearHistory}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                    title="Clear history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {downloadHistory.slice(0, 5).map(hist => (
                    <div key={hist.id + hist.timestamp} className="flex justify-between items-center gap-3 bg-emerald-50/50 border border-emerald-100/30 rounded-lg p-2 text-[10px] font-mono">
                      <span className="text-emerald-800 truncate font-sans font-medium hover:underline flex-1" title={hist.title}>
                        {hist.title}
                      </span>
                      <span className="text-slate-400 shrink-0 text-[9px]">{hist.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible API Diagnositics ledger trigger */}
            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowDiagnosticsPanel(!showDiagnosticsPanel)}
                className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 cursor-pointer transition-colors"
                id="btn-toggle-diagnostics"
              >
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span>API Diagnostics Logs</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${logs.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                    {logs.length}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans font-semibold">
                  {showDiagnosticsPanel ? 'Hide Ledger' : 'Show Ledger'}
                </span>
              </button>

              {/* API logs container display panel */}
              {showDiagnosticsPanel && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Logs ledger (last 30)</span>
                    <button 
                      onClick={clearLogs}
                      className="hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      Clear Logs
                    </button>
                  </div>

                  {logs.length === 0 ? (
                    <div className="bg-slate-900 text-slate-400 p-4 rounded-xl border border-slate-800 font-mono text-[10px] text-center">
                      No requests recorded yet.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-[170px] overflow-y-auto pr-1">
                      {logs.map((lg) => (
                        <div 
                          key={lg.id}
                          className="bg-slate-900 text-slate-200 rounded-lg p-2.5 font-mono text-[11px] border border-slate-800 flex flex-col gap-1.5 cursor-pointer hover:border-slate-700 hover:bg-slate-950 transition-all"
                          onClick={() => setActiveInspectorLog(lg)}
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                lg.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`} />
                              <span className="font-semibold text-white">/{lg.endpoint}</span>
                            </div>
                            <span className="text-[9px] text-slate-500">{lg.timestamp}</span>
                          </div>

                          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 select-none">
                            <span>{lg.statusCode ? `Status: ${lg.statusCode}` : 'Net Error'}</span>
                            <span>{lg.duration ? `${lg.duration}ms` : ''}</span>
                            <span className="text-emerald-500 text-[9px] underline">Inspect JSON</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </section>

      </main>

      {/* JSON Diagnostics Portal Modal popup */}
      <AnimatePresence>
        {activeInspectorLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
            >
              {/* Modal Banner header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-850">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono font-semibold text-sm">
                    Inspect JSON: /{activeInspectorLog.endpoint}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeInspectorLog.status === 'SUCCESS' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-rose-900/45 text-rose-300'
                  }`}>
                    {activeInspectorLog.status === 'SUCCESS' ? 'SUCCESS' : 'ERROR'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveInspectorLog(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* JSON code container */}
              <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 font-mono text-[11px]">
                
                {/* Method and Payload properties */}
                <div className="flex flex-col gap-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[10px]">
                  <div><span className="text-emerald-400 font-bold">Request URL:</span> {
                    activeInspectorLog.endpoint === 'tenders' ? 'https://eprocure-proxy.vercel.app/api/proxy?endpoint=tenders' :
                    activeInspectorLog.endpoint === 'documents' ? 'https://eprocure-proxy.vercel.app/api/proxy?endpoint=documents' :
                    'https://eprocure-proxy.vercel.app/api/download'
                  }</div>
                  <div><span className="text-emerald-400 font-bold">Method:</span> POST</div>
                  {activeInspectorLog.duration && (
                    <div><span className="text-emerald-400 font-bold">Latency:</span> {activeInspectorLog.duration}ms</div>
                  )}
                </div>

                {/* POST Payload block */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                    Request Payload (Body JSON)
                  </span>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-850 overflow-x-auto text-emerald-300 max-h-[160px]">
                    {JSON.stringify(activeInspectorLog.requestBody, null, 2)}
                  </pre>
                </div>

                {/* Response payload / Error string */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
                    {activeInspectorLog.errorMessage ? 'Error Details' : 'Server Response Payload'}
                  </span>
                  {activeInspectorLog.errorMessage ? (
                    <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl text-rose-300 break-words font-sans">
                      {activeInspectorLog.errorMessage}
                    </div>
                  ) : (
                    <pre className="bg-slate-950 p-3 rounded-xl border border-slate-850 overflow-x-auto text-cyan-300 max-h-[220px]">
                      {JSON.stringify(activeInspectorLog.responseBody, null, 2)}
                    </pre>
                  )}
                </div>

              </div>

              {/* Bottom footer bar */}
              <div className="p-3 bg-slate-950 border-t border-slate-850 rounded-b-2xl text-[10px] text-slate-500 flex justify-between">
                <span>Timestamp: {activeInspectorLog.timestamp}</span>
                <span>Click outside or press X to return</span>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clean elegant outer metadata credits band */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 text-center select-none">
          <p>© {new Date().getFullYear()} Sindh e-Procurement Portal. Built with elegant proxy utilities.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Database Sync: Local</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}

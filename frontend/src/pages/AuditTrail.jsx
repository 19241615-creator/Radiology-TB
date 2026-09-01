import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Loader2, 
  AlertCircle,
  Database,
  Terminal,
  Info
} from 'lucide-react';

export default function AuditTrail() {
  const token = localStorage.getItem('token');

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Gagal mengambil log aktivitas sistem.');
      }
      const data = await response.json();
      setLogs(data);
      setFilteredLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  // Client side search filtering
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLogs(logs);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = logs.filter(log => 
        log.username.toLowerCase().includes(term) ||
        log.activity.toLowerCase().includes(term) ||
        (log.affected_data && log.affected_data.toLowerCase().includes(term)) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(term)) ||
        log.role.toLowerCase().includes(term)
      );
      setFilteredLogs(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, logs]);

  // Pagination logic
  const totalRows = filteredLogs.length;
  const totalPages = Math.ceil(totalRows / limit) || 1;
  const startIndex = (currentPage - 1) * limit;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Log Aktivitas Pengguna</h2>
        <p className="text-sm text-slate-500 mt-0.5">Audit Trail untuk memantau jejak audit aktivitas operasi penting di dalam sistem.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Search log bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari aktivitas, username, data yang terpengaruh, atau alamat IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={fetchLogs}
          className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          Refresh Log
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="text-blue-600 animate-spin mb-2" size={32} />
            <span className="text-slate-500 text-sm">Memuat audit trail log...</span>
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Info size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm">Tidak ada catatan log aktivitas ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left w-20">Waktu</th>
                  <th scope="col" className="px-6 py-4 text-left w-40">Pengguna</th>
                  <th scope="col" className="px-6 py-4 text-left">Aktivitas</th>
                  <th scope="col" className="px-6 py-4 text-left">Data Terpengaruh</th>
                  <th scope="col" className="px-6 py-4 text-left w-32">Alamat IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-semibold text-slate-900">{log.username}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{log.role}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{log.activity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{log.affected_data || <span className="text-slate-300 italic">—</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && filteredLogs.length > 0 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Menampilkan <span className="font-semibold text-slate-700">{startIndex + 1}</span> hingga{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * limit, totalRows)}
              </span>{' '}
              dari <span className="font-semibold text-slate-700">{totalRows}</span> log aktivitas
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Sebelumnya
              </button>

              <div className="text-slate-600 font-semibold px-2">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

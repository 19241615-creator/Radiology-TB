import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  Filter, 
  Eye, 
  Edit2, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

export default function ExaminationList() {
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const token = localStorage.getItem('token');
  const role = user.role;

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';

  // Query State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportingStatus, setReportingStatus] = useState('');
  const [riskCategory, setRiskCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Data State
  const [examinations, setExaminations] = useState([]);
  const [pagination, setPagination] = useState({ totalRows: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

  const fetchExaminations = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        search,
        startDate,
        endDate,
        reportingStatus,
        riskCategory,
        page: currentPage,
        limit
      });

      const response = await fetch(`/api/examinations?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil data pemeriksaan.');
      }

      const result = await response.json();
      setExaminations(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExaminations();
  }, [currentPage, reportingStatus, riskCategory, search, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchExaminations();
  };

  const handleResetFilters = () => {
    setSearchParams(prev => {
      prev.delete('search');
      return prev;
    });
    setStartDate('');
    setEndDate('');
    setReportingStatus('');
    setRiskCategory('');
    setCurrentPage(1);
    // State updates are batch processed, trigger fetch manually
    setTimeout(() => fetchExaminations(), 0);
  };

  const handleDeleteClick = (exam) => {
    setExamToDelete(exam);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!examToDelete) return;
    try {
      const response = await fetch(`/api/examinations/${examToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Gagal menghapus data pemeriksaan.');
      }

      setSuccessMsg('Data pemeriksaan berhasil dihapus.');
      setShowDeleteModal(false);
      setExamToDelete(null);
      fetchExaminations();

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Sudah Dilaporkan':
        return <span className="px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">Sudah Dilaporkan</span>;
      case 'Data Belum Lengkap':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 rounded-full">Data Belum Lengkap</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">Belum Dilaporkan</span>;
    }
  };

  const getQueueBadge = (status) => {
    switch (status) {
      case 'Selesai':
        return <span className="px-2 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">Selesai</span>;
      case 'Sedang Diperiksa':
        return <span className="px-2 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">Sedang Diperiksa</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">Menunggu Tindakan</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {role === 'institution' ? 'Pemantauan Antrean Pasien' : 'Data Pemeriksaan & Registrasi'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {role === 'institution' 
              ? 'Monitoring daftar antrean pasien dan rekapitulasi skrining TB secara terintegrasi.' 
              : 'Kelola seluruh pencatatan registrasi dan pemeriksaan radiologi pasien TB.'}
          </p>
        </div>
        {role !== 'institution' && (
          <Link
            to="/examinations/add"
            className="flex items-center gap-2 bg-secondary-fixed hover:bg-secondary-fixed-dim text-on-secondary-fixed font-bold py-2 px-4 rounded-lg text-sm border border-secondary-fixed shadow-md transition cursor-pointer"
          >
            <Plus size={16} />
            <span>{role === 'admin' ? 'Registrasi Pasien Baru' : 'Tambah Pemeriksaan'}</span>
          </Link>
        )}
      </div>

      {role === 'institution' && (
        <div className="bg-purple-50/80 border border-purple-200 text-purple-900 p-4 rounded-xl flex items-center gap-3">
          <Info size={20} className="text-purple-600 shrink-0" />
          <span className="text-xs font-medium leading-relaxed">
            <strong>Mode Pemantauan Institusi:</strong> Anda dapat memantau progres antrean tindakan radiografer, status kesiapan pasien, dan melihat rekapitulasi berkas pemeriksaan secara terintegrasi.
          </span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle size={20} />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-4">
          {/* Search bar */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari ID Pasien, Nama Pasien, No Rekam Medis, atau No Telepon..."
              value={search}
              onChange={(e) => {
                setSearchParams(prev => {
                  if (e.target.value) {
                    prev.set('search', e.target.value);
                  } else {
                    prev.delete('search');
                  }
                  return prev;
                });
              }}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition shadow-sm cursor-pointer"
          >
            Cari
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Tanggal Mulai</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Tanggal Selesai</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
              />
            </div>
          </div>

          {/* Status Pelaporan */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Status Pelaporan</label>
            <select
              value={reportingStatus}
              onChange={(e) => {
                setReportingStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white"
            >
              <option value="">Semua Status</option>
              <option value="Belum Dilaporkan">Belum Dilaporkan</option>
              <option value="Data Belum Lengkap">Data Belum Lengkap</option>
              <option value="Sudah Dilaporkan">Sudah Dilaporkan</option>
            </select>
          </div>

          {/* Kategori Risiko */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Kategori Risiko</label>
            <select
              value={riskCategory}
              onChange={(e) => {
                setRiskCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white"
            >
              <option value="">Semua Kategori</option>
              <option value="Rendah">Rendah</option>
              <option value="Sedang">Sedang</option>
              <option value="Tinggi">Tinggi</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-blue-600 font-semibold transition cursor-pointer"
          >
            Reset Filter & Pencarian
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="text-blue-600 animate-spin mb-2" size={32} />
            <span className="text-slate-500 text-sm">Memuat data pemeriksaan...</span>
          </div>
        ) : examinations.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Info size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm">Tidak ada data pemeriksaan ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-12">No</th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ID Pasien</th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Identitas & Kontak</th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Antrean Tindakan</th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hasil/Diagnosa</th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Radiografer</th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status Lapor</th>
                  <th scope="col" className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-sm text-slate-700">
                {examinations.map((exam, idx) => (
                  <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-400">
                      {(currentPage - 1) * limit + idx + 1}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-bold text-blue-900">{exam.patient_id}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-bold text-slate-900">{exam.patient_name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>RM: <strong className="text-slate-700">{exam.medical_record_number}</strong></span>
                          <span>•</span>
                          <span>Usia: {exam.age} th ({exam.gender})</span>
                          {exam.phone_number && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">Telp: {exam.phone_number}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getQueueBadge(exam.queue_status)}
                        {exam.pre_action_checklist?.id_confirmed && (
                          <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                            ✓ SOP Tindakan Lengkap
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">{exam.examination_date}</td>
                    <td className="px-5 py-4 max-w-xs truncate text-xs" title={exam.diagnosis}>{exam.diagnosis}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600">{exam.radiographer_name}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(exam.reporting_status)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-center text-xs font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View details */}
                        <Link
                          to={`/examinations/detail/${exam.id}`}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
                          title="Lihat Detail & Cetak"
                        >
                          <Eye size={16} />
                        </Link>

                        {/* Edit data (Admin & Radiographer only) */}
                        {role !== 'institution' && (role === 'admin' || exam.radiographer_name === user.name) && (
                          <Link
                            to={`/examinations/edit/${exam.id}`}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition"
                            title="Ubah Pemeriksaan / Tindakan"
                          >
                            <Edit2 size={16} />
                          </Link>
                        )}

                        {/* Delete data (Admin Only) */}
                        {role === 'admin' && (
                          <button
                            onClick={() => handleDeleteClick(exam)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            title="Hapus Pemeriksaan"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && examinations.length > 0 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <div>
              Menampilkan <span className="font-semibold text-slate-700">{(currentPage - 1) * limit + 1}</span> hingga{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * limit, pagination.totalRows)}
              </span>{' '}
              dari <span className="font-semibold text-slate-700">{pagination.totalRows}</span> baris data
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="text-slate-600 font-semibold text-xs px-2.5">
                Halaman {currentPage} dari {pagination.totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={currentPage === pagination.totalPages}
                className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowDeleteModal(false)} />
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-100 p-6 z-10 animate-slide-down-modal">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Hapus Data</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus data pemeriksaan pasien <span className="font-semibold text-slate-800">{examToDelete.patient_name} ({examToDelete.patient_id})</span>? Tindakan ini bersifat permanen dan data file DICOM yang diunggah juga akan terhapus.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setExamToDelete(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

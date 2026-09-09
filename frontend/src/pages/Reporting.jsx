import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  Search, 
  Loader2, 
  AlertCircle,
  Database,
  CheckCircle,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Custom component to animate counting up metrics numbers
function AnimatedCounter({ value, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endValue = parseInt(value, 10);
    
    if (isNaN(endValue) || endValue === 0) {
      setCount(value || 0);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutExpo function for smooth natural counting
      const easeOutProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeOutProgress * endValue));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{count}</span>;
}

export default function Reporting() {
  const token = localStorage.getItem('token');
  
  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportingStatus, setReportingStatus] = useState('');
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Summary Statistics
      const sumResponse = await fetch('/api/reports/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!sumResponse.ok) throw new Error('Gagal mengambil data ringkasan pelaporan.');
      const sumResult = await sumResponse.json();
      setSummary(sumResult.summary);

      // 2. Fetch Detailed List with Filter for table preview
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        reportingStatus,
        limit: 1000 // Get all matching rows for export
      });

      const listResponse = await fetch(`/api/examinations?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!listResponse.ok) throw new Error('Gagal mengambil daftar rekap pemeriksaan.');
      const listResult = await listResponse.json();
      setRecords(listResult.data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportingStatus, token]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchReportData();
  };

  const handleExportExcel = () => {
    if (records.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    try {
      const excelRows = records.map((record, index) => ({
        'No': index + 1,
        'ID Pasien': record.patient_id,
        'Nama Pasien': record.patient_name,
        'No Rekam Medis': record.medical_record_number,
        'No Telepon/WA': record.phone_number || '-',
        'Usia': record.age,
        'L/P': record.gender,
        'Asal Fasyankes Perujuk': record.fasyankes_origin,
        'Unit / Poli Pengirim': record.sending_unit || 'Poli TB / Paru',
        'Dokter Pengirim': record.referring_doctor || 'dr. Sp.P / Tim TB',
        'Jenis Pemeriksaan': record.examination_type || 'Radiografi Thoraks (Thorax PA)',
        'Tanggal Pemeriksaan': record.examination_date,
        'Status Antrean': record.queue_status || 'Selesai',
        'Pemakaian Logistik/Film': record.film_usage || 'Film 35x43 cm (1 Lembar)',
        'Parameter Eksposi': record.exposure_params || '115 kV, 4 mAs, FFD 180 cm',
        'Durasi Pelayanan (Menit)': record.service_duration || 12,
        'Hasil Radiologi': record.diagnosis,
        'Kategori Risiko': record.risk_category,
        'Tindak Lanjut': record.follow_up_status,
        'Radiografer': record.radiographer_name,
        'Status Pelaporan': record.reporting_status,
        'Tanggal Diinput': new Date(record.created_at).toLocaleDateString('id-ID')
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Radiologi TB');
      
      // Auto-fit column widths
      const colWidths = Object.keys(excelRows[0] || {}).map(key => ({
        wch: Math.max(key.length + 2, ...excelRows.map(row => (row[key] ? row[key].toString().length + 2 : 10)))
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `Laporan_Skrining_TB_${startDate || 'Semua'}_s.d_${endDate || 'Semua'}.xlsx`);
    } catch (err) {
      alert('Gagal mengekspor berkas Excel: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const stats = summary || { total: 0, today: 0, month: 0, unreported: 0, incomplete: 0, reported: 0, avgServiceDuration: 12, totalFilmUsage: 0 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pelaporan & Rekap Skrining TB</h2>
          <p className="text-sm text-slate-500 mt-0.5">Analisis jumlah pasien, evaluasi logistik film, durasi pelayanan, dan ekspor data.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-md transition"
          >
            <FileSpreadsheet size={16} />
            <span>Ekspor Excel Lengkap</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-secondary-fixed hover:bg-secondary-fixed-dim text-on-secondary-fixed font-bold py-2 px-4 rounded-lg text-sm border border-secondary-fixed shadow-md transition"
          >
            <Printer size={16} />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center gap-3 print:hidden">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 print:hidden">
        {/* Total Data */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Skrining</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">
              <AnimatedCounter value={stats.total} />
            </span>
          </div>
          <div className="bg-slate-50 text-slate-600 p-2 rounded-lg">
            <Database size={18} />
          </div>
        </div>

        {/* Sudah Dilaporkan */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Dilaporkan</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">
              <AnimatedCounter value={stats.reported} />
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
            <CheckCircle size={18} />
          </div>
        </div>

        {/* Belum Dilaporkan */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Belum Lapor</span>
            <span className="text-xl font-extrabold text-amber-600 mt-0.5 block">
              <AnimatedCounter value={stats.unreported} />
            </span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
            <AlertCircle size={18} />
          </div>
        </div>

        {/* Data Belum Lengkap */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Belum Lengkap</span>
            <span className="text-xl font-extrabold text-rose-600 mt-0.5 block">
              <AnimatedCounter value={stats.incomplete} />
            </span>
          </div>
          <div className="bg-rose-50 text-rose-600 p-2 rounded-lg">
            <Info size={18} />
          </div>
        </div>

        {/* Logistik Film Terpakai */}
        <div className="bg-white p-4 rounded-xl border border-amber-100/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-700 uppercase block">Pemakaian Film</span>
            <span className="text-xl font-extrabold text-amber-900 mt-0.5 block">
              <AnimatedCounter value={stats.totalFilmUsage || stats.total} /> <span className="text-xs font-medium text-slate-500">Lbr</span>
            </span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
            🎞️
          </div>
        </div>

        {/* Rata-rata Durasi Pelayanan */}
        <div className="bg-white p-4 rounded-xl border border-blue-100/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-blue-700 uppercase block">Rerata Durasi</span>
            <span className="text-xl font-extrabold text-blue-900 mt-0.5 block">
              <AnimatedCounter value={stats.avgServiceDuration || 12} /> <span className="text-xs font-medium text-slate-500">Mnt</span>
            </span>
          </div>
          <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
            ⏱️
          </div>
        </div>
      </div>

      {/* Filter form (Hidden on Print) */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm print:hidden">
        <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Periode Awal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Periode Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Status Laporan</label>
            <select
              value={reportingStatus}
              onChange={(e) => setReportingStatus(e.target.value)}
              className="block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white"
            >
              <option value="">Semua Status</option>
              <option value="Sudah Dilaporkan">Sudah Dilaporkan</option>
              <option value="Belum Dilaporkan">Belum Dilaporkan</option>
              <option value="Data Belum Lengkap">Data Belum Lengkap</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition shadow-sm"
          >
            Terapkan Filter
          </button>
        </form>
      </div>

      {/* Report Header for PDF Print Only */}
      <div className="print-header print-only text-center border-b-2 border-slate-800 pb-3 mb-4">
        <div className="text-center mb-2">
          <h2 className="text-base font-extrabold uppercase text-slate-900 tracking-wide leading-tight">
            Laporan Rekapitulasi Pemeriksaan Radiologi
          </h2>
          <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider mt-0.5">
            Skrining & Pelaporan Tuberkulosis (TB)
          </h3>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            Sistem Informasi Pengelolaan Data Radiologi TB Terpadu
          </p>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-600 border-t border-slate-200 pt-2 mt-2 px-1">
          <span>Periode: <strong>{startDate || 'Semua Periode'}</strong> s.d. <strong>{endDate || 'Semua Periode'}</strong></span>
          <span>Status Lapor: <strong>{reportingStatus || 'Semua Status'}</strong></span>
          <span>Tanggal Cetak: <strong>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
        </div>
      </div>

      {/* Data Preview Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden print-card">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between print:hidden">
          <h3 className="font-bold text-slate-800 text-sm">Preview Tabel Rekap Pemeriksaan</h3>
          <span className="text-xs bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
            {records.length} Baris Data
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="text-blue-600 animate-spin mb-2" size={32} />
            <span className="text-slate-500 text-sm">Memuat data rekap pelaporan...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Info size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm">Tidak ada data rekap ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left w-12">No</th>
                  <th scope="col" className="px-4 py-3 text-left">ID Pasien</th>
                  <th scope="col" className="px-4 py-3 text-left">Nama Pasien</th>
                  <th scope="col" className="px-4 py-3 text-left">L/P</th>
                  <th scope="col" className="px-4 py-3 text-left">Usia</th>
                  <th scope="col" className="px-4 py-3 text-left">Puskesmas Perujuk</th>
                  <th scope="col" className="px-4 py-3 text-left">Tanggal</th>
                  <th scope="col" className="px-4 py-3 text-left">Kategori Risiko</th>
                  <th scope="col" className="px-4 py-3 text-left">Tindak Lanjut</th>
                  <th scope="col" className="px-4 py-3 text-left">Status Lapor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {records.map((rec, index) => (
                  <tr 
                    key={rec.id} 
                    className="row-pop-in hover:bg-slate-50/70 transition-all duration-300"
                    style={{ transitionDelay: `${(index % 15) * 35}ms` }}
                  >
                    <td className="px-4 py-3 font-medium text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{rec.patient_id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{rec.patient_name}</td>
                    <td className="px-4 py-3">{rec.gender}</td>
                    <td className="px-4 py-3">{rec.age} th</td>
                    <td className="px-4 py-3">{rec.fasyankes_origin}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{rec.examination_date}</td>
                    <td className="px-4 py-3 font-medium">{rec.risk_category}</td>
                    <td className="px-4 py-3 text-xs">{rec.follow_up_status}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {rec.reporting_status === 'Sudah Dilaporkan' && (
                        <span className="text-emerald-600 font-semibold">Sudah Dilaporkan</span>
                      )}
                      {rec.reporting_status === 'Data Belum Lengkap' && (
                        <span className="text-rose-600 font-semibold">Belum Lengkap</span>
                      )}
                      {rec.reporting_status === 'Belum Dilaporkan' && (
                        <span className="text-amber-600 font-semibold">Belum Dilaporkan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature block for printable page */}
      <div className="hidden print:flex mt-12 justify-between text-sm w-full px-8">
        <div className="w-48 text-center">
          <p className="mb-16">Mengetahui,<br />Kepala Unit Radiologi</p>
          <div className="border-t border-slate-500 pt-1 font-semibold">
            (...........................................)
          </div>
        </div>
        <div className="w-48 text-center">
          <p className="mb-16">Dibuat Oleh,<br />Petugas Radiografer</p>
          <div className="border-t border-slate-500 pt-1 font-semibold">
            (...........................................)
          </div>
        </div>
      </div>
    </div>
  );
}

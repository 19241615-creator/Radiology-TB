import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Database, 
  File, 
  CheckCircle, 
  AlertTriangle, 
  History, 
  Edit2, 
  Loader2, 
  AlertCircle,
  FileText
} from 'lucide-react';

export default function ExaminationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const role = user.role;

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await fetch(`/api/examinations/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Gagal mengambil rincian detail pemeriksaan.');
        }
        const data = await response.json();
        setExam(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-blue-600 animate-spin" />
        <span className="ml-3 text-slate-600 font-medium">Memuat rincian pemeriksaan...</span>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle size={24} />
        <div>
          <p className="font-semibold">Terjadi Kesalahan</p>
          <p className="text-sm">{error || 'Data pemeriksaan tidak ditemukan.'}</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Sudah Dilaporkan':
        return <span className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">Sudah Dilaporkan</span>;
      case 'Data Belum Lengkap':
        return <span className="px-3 py-1 text-xs font-semibold bg-rose-100 text-rose-800 rounded-full">Data Belum Lengkap</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">Belum Dilaporkan</span>;
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'Tinggi':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded">Tinggi</span>;
      case 'Sedang':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 rounded">Sedang</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded">Rendah</span>;
    }
  };

  const getMatchText = (matched) => {
    if (matched === true) return <span className="text-emerald-600 font-semibold">✓ Sesuai</span>;
    if (matched === false) return <span className="text-amber-600 font-semibold">⚠ Tidak Sesuai</span>;
    return <span className="text-slate-400">— Tidak tersedia</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/examinations" 
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 transition shadow-sm"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Detail Pemeriksaan: {exam.patient_id}</h2>
            <p className="text-sm text-slate-500 mt-0.5">Melihat detail rekam medis, file DICOM, dan log aktivitas terkait.</p>
          </div>
        </div>

        {(role === 'admin' || exam.radiographer_name === user.name) && (
          <Link
            to={`/examinations/edit/${exam.id}`}
            className="flex items-center gap-2 bg-secondary-fixed hover:bg-secondary-fixed-dim text-on-secondary-fixed font-bold py-2 px-4 rounded-lg text-sm border border-secondary-fixed shadow-md transition"
          >
            <Edit2 size={16} />
            <span>Ubah Data</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column - Medical details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Profile Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Identitas & Kontak Pasien</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Nama Pasien</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{exam.patient_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">ID Pasien</span>
                <span className="font-bold text-blue-900 mt-0.5 block">{exam.patient_id}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">No. Rekam Medis (MRN)</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{exam.medical_record_number}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">No. Telepon / WhatsApp</span>
                <span className="font-semibold text-blue-600 mt-0.5 block">
                  {exam.phone_number ? `📞 ${exam.phone_number}` : <span className="text-slate-400 italic">—</span>}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Usia / Jenis Kelamin</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {exam.age} Tahun | {exam.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Status Antrean Pelayanan</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {exam.queue_status === 'Selesai' && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">✅ Selesai</span>}
                  {exam.queue_status === 'Sedang Diperiksa' && <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">🔬 Sedang Diperiksa</span>}
                  {(!exam.queue_status || exam.queue_status === 'Menunggu Tindakan') && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">⏳ Menunggu Tindakan</span>}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Asal Fasyankes Perujuk</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{exam.fasyankes_origin}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Tanggal Pemeriksaan</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{exam.examination_date}</span>
              </div>
            </div>
          </div>

          {/* SOP Radiographer Checklist Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Checklist Standar Operasional Radiografer</h3>
                <p className="text-xs text-slate-400 mt-0.5">Verifikasi kesiapan sebelum tindakan dan kendali mutu pasca-pemeriksaan.</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-100">
                SOP Radiologi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pra-Tindakan */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-blue-900">
                  1. Kesiapan Sebelum Tindakan (Pra)
                </h4>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={exam.pre_action_checklist?.id_confirmed ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {exam.pre_action_checklist?.id_confirmed ? '✓' : '○'}
                    </span>
                    <span className={exam.pre_action_checklist?.id_confirmed ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      Konfirmasi Identitas Pasien
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={exam.pre_action_checklist?.procedure_explained ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {exam.pre_action_checklist?.procedure_explained ? '✓' : '○'}
                    </span>
                    <span className={exam.pre_action_checklist?.procedure_explained ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      Penjelasan Prosedur & Posisi PA/AP
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={exam.pre_action_checklist?.metal_removed ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {exam.pre_action_checklist?.metal_removed ? '✓' : '○'}
                    </span>
                    <span className={exam.pre_action_checklist?.metal_removed ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      Pelepasan Benda Logam Dada
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={exam.pre_action_checklist?.pregnancy_screened ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {exam.pre_action_checklist?.pregnancy_screened ? '✓' : '○'}
                    </span>
                    <span className={exam.pre_action_checklist?.pregnancy_screened ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      Skrining Status Kehamilan
                    </span>
                  </div>
                </div>
              </div>

              {/* Pasca-Pemeriksaan */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-emerald-900">
                  2. Kendali Mutu Pasca-Pemeriksaan
                </h4>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={exam.post_action_checklist?.image_quality_optimal ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {exam.post_action_checklist?.image_quality_optimal ? '✓' : '○'}
                    </span>
                    <span className={exam.post_action_checklist?.image_quality_optimal ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      Kualitas Citra Optimal & Lapang Paru Simetris
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={exam.post_action_checklist?.inspiration_adequate ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {exam.post_action_checklist?.inspiration_adequate ? '✓' : '○'}
                    </span>
                    <span className={exam.post_action_checklist?.inspiration_adequate ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      Inspirasi Maksimal (Costa ke-10)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={exam.post_action_checklist?.no_motion_artifact ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {exam.post_action_checklist?.no_motion_artifact ? '✓' : '○'}
                    </span>
                    <span className={exam.post_action_checklist?.no_motion_artifact ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      Bebas Artefak Gerakan (Tidak Goyang)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={exam.post_action_checklist?.patient_stable ? 'text-emerald-600 font-bold' : 'text-slate-300'}>
                      {exam.post_action_checklist?.patient_stable ? '✓' : '○'}
                    </span>
                    <span className={exam.post_action_checklist?.patient_stable ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      Kondisi Pasien Pasca-Tindakan Stabil
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnosis & Findings Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Hasil Skrining & Diagnosis</h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400 block font-medium mb-1">Diagnosa / Temuan Radiologi</span>
                <div className="bg-slate-50 p-4 rounded-xl text-slate-800 text-sm whitespace-pre-line border border-slate-100 leading-relaxed">
                  {exam.diagnosis}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium mb-1">Kategori Risiko TB</span>
                  {getRiskBadge(exam.risk_category)}
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium mb-1">Status Tindak Lanjut</span>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded inline-block">
                    {exam.follow_up_status}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium mb-1">Status Pelaporan</span>
                  <div className="mt-0.5">{getStatusBadge(exam.reporting_status)}</div>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs text-slate-400 block font-medium">Keterangan Tambahan</span>
                <span className="text-sm text-slate-700 mt-1 block">
                  {exam.additional_info || <span className="text-slate-400 italic">Tidak ada keterangan tambahan.</span>}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-4 grid grid-cols-2 text-xs text-slate-400">
                <div>Radiografer: <span className="font-semibold text-slate-500">{exam.radiographer_name}</span></div>
                <div className="text-right">Dibuat: <span className="font-semibold text-slate-500">{new Date(exam.created_at).toLocaleString('id-ID')}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - DICOM info & history */}
        <div className="space-y-6">
          {/* DICOM / Image File Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <span>Foto Ronsen / File DICOM</span>
            </h3>

            {exam.dicom_filename ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                  <File className="text-blue-600 shrink-0" size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate" title={exam.dicom_filename}>
                      {exam.dicom_filename}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Ukuran: {(exam.dicom_filesize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* DICOM Metadata Display (if it is a DICOM file) */}
                {exam.dicom_metadata && (exam.dicom_metadata.patientId || exam.dicom_metadata.patientName) && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-700">Metadata Extracted:</h4>
                    <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Patient ID:</span>
                        <span className="font-medium">{exam.dicom_metadata.patientId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Patient Name:</span>
                        <span className="font-medium">{exam.dicom_metadata.patientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Study Date:</span>
                        <span className="font-medium">{exam.dicom_metadata.studyDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sex (L/P):</span>
                        <span className="font-medium">{exam.dicom_metadata.patientSex}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Status Display (if it is a DICOM file with metadata) */}
                {exam.validation_status && (exam.validation_status.idMatch !== null || exam.validation_status.nameMatch !== null) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700">Hasil Validasi:</h4>
                    <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ID Pasien:</span>
                        <span>{getMatchText(exam.validation_status.idMatch)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nama Pasien:</span>
                        <span>{getMatchText(exam.validation_status.nameMatch)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tanggal Periksa:</span>
                        <span>{getMatchText(exam.validation_status.dateMatch)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Jenis Kelamin:</span>
                        <span>{getMatchText(exam.validation_status.genderMatch)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* X-Ray Image Photo Preview */}
                {/* X-Ray Image Photo Preview */}
                {exam.dicom_filename && (
                  <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden bg-slate-50 p-2 shadow-inner">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Foto Ronsen Pasien:</h4>
                    <img 
                      src={exam.dicom_filename.toLowerCase().endsWith('.dcm')
                        ? `/uploads/dicom/${exam.dicom_filename.replace('.dcm', '.png')}`
                        : `/uploads/dicom/${exam.dicom_filename}`
                      }
                      alt="Foto Ronsen" 
                      className="w-full max-h-60 object-contain rounded border border-slate-200"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertTriangle className="mx-auto text-amber-500 mb-2" size={24} />
                <p className="text-xs font-medium">Foto ronsen belum diunggah.</p>
                <Link to={`/examinations/edit/${exam.id}`} className="text-xs text-blue-600 font-semibold hover:underline mt-1.5 inline-block">
                  Unggah Sekarang
                </Link>
              </div>
            )}
          </div>

          {/* Audit History Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <History size={18} className="text-blue-600" />
              <span>Riwayat Perubahan Data</span>
            </h3>

            {exam.history && exam.history.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {exam.history.map((log, logIdx) => (
                    <li key={logIdx}>
                      <div className="relative pb-8">
                        {logIdx !== exam.history.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white text-slate-600">
                              <History size={14} />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5">
                            <p className="text-xs font-bold text-slate-800">{log.activity}</p>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                              <span>Oleh: <span className="font-semibold text-slate-600">{log.username} ({log.role})</span></span>
                              <span>•</span>
                              <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">Belum ada riwayat aktivitas terkait pemeriksaan ini.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

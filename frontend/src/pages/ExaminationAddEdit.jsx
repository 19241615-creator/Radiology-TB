import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  UploadCloud, 
  File, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Info,
  RefreshCw
} from 'lucide-react';

export default function ExaminationAddEdit() {
  const { id } = useParams(); // exists if edit mode
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};

  const isEditMode = !!id;

  // Form State
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    medical_record_number: '',
    phone_number: '',
    age: '',
    gender: 'L',
    fasyankes_origin: '',
    sending_unit: 'Poli TB / Paru',
    referring_doctor: 'dr. Sp.P / Tim TB',
    examination_type: 'Radiografi Thoraks (Thorax PA)',
    film_usage: 'Film 35x43 cm (1 Lembar)',
    exposure_params: '115 kV, 4 mAs, FFD 180 cm',
    service_duration: 12,
    examination_date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    risk_category: 'Rendah',
    follow_up_status: 'Tidak Ada Tindak Lanjut',
    additional_info: '',
    queue_status: 'Menunggu Tindakan',
    reporting_status: 'Belum Dilaporkan'
  });

  // SOP Checklist State (Radiographer)
  const [preChecklist, setPreChecklist] = useState({
    id_confirmed: false,
    procedure_explained: false,
    metal_removed: false,
    pregnancy_screened: false
  });

  const [postChecklist, setPostChecklist] = useState({
    image_quality_optimal: false,
    inspiration_adequate: false,
    no_motion_artifact: false,
    patient_stable: false
  });

  // DICOM Upload State
  const [dicomFile, setDicomFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedDicomMeta, setUploadedDicomMeta] = useState(null);
  const [dicomFilename, setDicomFilename] = useState('');
  const [dicomFilesize, setDicomFilesize] = useState(null);

  // App State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [idWarning, setIdWarning] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);
  const [ignoreMismatches, setIgnoreMismatches] = useState(false);

  // Fetch data in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const fetchExam = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/examinations/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
            throw new Error('Gagal mengambil data pemeriksaan.');
          }
          const data = await response.json();
          
          setFormData({
            patient_id: data.patient_id,
            patient_name: data.patient_name,
            medical_record_number: data.medical_record_number,
            phone_number: data.phone_number || '',
            age: data.age,
            gender: data.gender,
            fasyankes_origin: data.fasyankes_origin,
            sending_unit: data.sending_unit || 'Poli TB / Paru',
            referring_doctor: data.referring_doctor || 'dr. Sp.P / Tim TB',
            examination_type: data.examination_type || 'Radiografi Thoraks (Thorax PA)',
            film_usage: data.film_usage || 'Film 35x43 cm (1 Lembar)',
            exposure_params: data.exposure_params || '115 kV, 4 mAs, FFD 180 cm',
            service_duration: data.service_duration !== undefined ? data.service_duration : 12,
            examination_date: data.examination_date,
            diagnosis: data.diagnosis || '',
            risk_category: data.risk_category || 'Rendah',
            follow_up_status: data.follow_up_status || 'Tidak Ada Tindak Lanjut',
            additional_info: data.additional_info || '',
            queue_status: data.queue_status || 'Menunggu Tindakan',
            reporting_status: data.reporting_status || 'Belum Dilaporkan'
          });

          if (data.pre_action_checklist) {
            setPreChecklist(data.pre_action_checklist);
          }
          if (data.post_action_checklist) {
            setPostChecklist(data.post_action_checklist);
          }

          if (data.dicom_filename) {
            setDicomFilename(data.dicom_filename);
            setDicomFilesize(data.dicom_filesize);
            setUploadedDicomMeta(data.dicom_metadata);
            setValidationStatus(data.validation_status);
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchExam();
    }
  }, [id, isEditMode, token]);

  // Real-time comparison effect
  useEffect(() => {
    if (uploadedDicomMeta) {
      const isStandardImage = uploadedDicomMeta.patientId === null && 
                               uploadedDicomMeta.patientName === null && 
                               uploadedDicomMeta.patientSex === null && 
                               uploadedDicomMeta.studyDate === null;

      const nameMatch = isStandardImage ? true : cleanString(formData.patient_name) === cleanString(uploadedDicomMeta.patientName);
      const idMatch = isStandardImage ? true : cleanString(formData.patient_id) === cleanString(uploadedDicomMeta.patientId);
      const genderMatch = isStandardImage ? true : formData.gender === uploadedDicomMeta.patientSex;
      const dateMatch = isStandardImage ? true : formData.examination_date === uploadedDicomMeta.studyDate;

      const isFullyValid = nameMatch && idMatch && genderMatch && dateMatch;

      setValidationStatus({
        nameMatch,
        idMatch,
        genderMatch,
        dateMatch,
        isFullyValid
      });
    } else {
      setValidationStatus(null);
    }
  }, [formData.patient_name, formData.patient_id, formData.gender, formData.examination_date, uploadedDicomMeta]);

  // Clean strings for comparison
  const cleanString = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Trigger ID Duplication Check on Blur/Change for ID
    if (name === 'patient_id' && !isEditMode) {
      if (value.trim().length > 1) {
        checkPatientIdDuplication(value.trim());
      } else {
        setIdWarning('');
      }
    }
  };

  const checkPatientIdDuplication = async (patientId) => {
    try {
      const response = await fetch(`/api/examinations/check-id/${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.exists) {
        setIdWarning(`Peringatan: ID Pasien '${patientId}' sudah digunakan oleh pasien '${data.patientName}'.`);
      } else {
        setIdWarning('');
      }
    } catch (err) {
      console.error('Gagal mengecek duplikasi ID:', err);
    }
  };

  // Drag and Drop Handling
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file) => {
    // Validate Extension
    const nameLower = file.name.toLowerCase();
    const isValid = nameLower.endsWith('.dcm') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png');
    if (!isValid) {
      setError('Hanya file dengan ekstensi .dcm, .jpg, .jpeg, atau .png yang diperbolehkan.');
      return;
    }
    setError('');
    setDicomFile(file);
    uploadDicomFile(file);
  };

  const uploadDicomFile = async (file) => {
    setUploading(true);
    setUploadProgress(10);
    setError('');

    const uploadData = new FormData();
    uploadData.append('dicomFile', file);

    try {
      // Simulate progress indicator increase
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 200);

      const response = await fetch('/api/examinations/upload-dicom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      clearInterval(interval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal mengunggah file DICOM.');
      }

      setDicomFilename(result.filename);
      setDicomFilesize(result.filesize);
      setUploadedDicomMeta(result.metadata);
      
      // Auto fill manual inputs if empty to assist the Radiographer
      setFormData(prev => ({
        ...prev,
        patient_id: prev.patient_id || result.metadata.patientId || '',
        patient_name: prev.patient_name || result.metadata.patientName || '',
        gender: prev.gender || (result.metadata.patientSex === 'M' ? 'L' : result.metadata.patientSex === 'F' ? 'P' : 'L'),
        examination_date: prev.examination_date || result.metadata.studyDate || new Date().toISOString().split('T')[0]
      }));

    } catch (err) {
      setError(err.message);
      setDicomFile(null);
    } finally {
      setTimeout(() => setUploading(false), 300);
    }
  };

  const removeDicomFile = () => {
    setDicomFile(null);
    setUploadedDicomMeta(null);
    setDicomFilename('');
    setDicomFilesize(null);
    setValidationStatus(null);
    setIgnoreMismatches(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check Duplicate ID warning
    if (idWarning && !isEditMode) {
      setError('ID Pasien sudah digunakan. Harap ubah ID Pasien terlebih dahulu.');
      return;
    }

    // Check Validation mismatch
    if (validationStatus && !validationStatus.isFullyValid && !ignoreMismatches) {
      setError('Ada ketidaksesuaian data manual dengan metadata DICOM. Harap periksa kembali atau centang kotak konfirmasi di bawah tabel validasi.');
      return;
    }

    setSubmitting(true);

    const payload = {
      ...formData,
      dicom_filename: dicomFilename,
      dicom_filesize: dicomFilesize,
      dicom_metadata: uploadedDicomMeta,
      validation_status: validationStatus,
      pre_action_checklist: preChecklist,
      post_action_checklist: postChecklist
    };

    try {
      const url = isEditMode ? `/api/examinations/${id}` : '/api/examinations';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal menyimpan pemeriksaan.');
      }

      navigate('/examinations');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-blue-600 animate-spin" />
        <span className="ml-3 text-slate-600 font-medium">Memuat data pemeriksaan...</span>
      </div>
    );
  }

  const getMatchIcon = (matched) => {
    if (matched === true) {
      return <span className="inline-flex items-center text-emerald-600 font-semibold gap-1 text-xs">✓ Sesuai</span>;
    } else if (matched === false) {
      return <span className="inline-flex items-center text-amber-600 font-semibold gap-1 text-xs">⚠ Tidak Sesuai</span>;
    }
    return <span className="text-slate-400 text-xs">— Tidak tersedia</span>;
  };

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Link 
          to="/examinations" 
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 transition shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isEditMode ? 'Ubah Pemeriksaan' : 'Tambah Pemeriksaan Baru'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEditMode ? 'Ubah data dan unggahan berkas pemeriksaan radiologi.' : 'Input data pasien baru, upload berkas DICOM dan simpan pemeriksaan.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-rose-800 font-medium">{error}</div>
        </div>
      )}

      {idWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-800 font-medium">{idWarning}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns - Manual Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Profile Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Identitas Pasien</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ID Pasien *</label>
                <input
                  type="text"
                  name="patient_id"
                  required
                  disabled={isEditMode}
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  placeholder="Contoh: P001"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all font-semibold"
                />
              </div>

              {/* Patient Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Pasien *</label>
                <input
                  type="text"
                  name="patient_name"
                  required
                  value={formData.patient_name}
                  onChange={handleInputChange}
                  placeholder="Nama Lengkap Pasien"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Medical Record Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">No. Rekam Medis (MRN) *</label>
                <input
                  type="text"
                  name="medical_record_number"
                  required
                  value={formData.medical_record_number}
                  onChange={handleInputChange}
                  placeholder="Contoh: MRN-2026-001"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Phone Number / WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">No. Telepon / WhatsApp Pasien *</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="Contoh: 081234567890"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Usia Pasien *</label>
                <input
                  type="number"
                  name="age"
                  required
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Tahun"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Jenis Kelamin *</label>
                <div className="flex gap-4 mt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="L"
                      checked={formData.gender === 'L'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Laki-laki (L)
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="P"
                      checked={formData.gender === 'P'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Perempuan (P)
                  </label>
                </div>
              </div>

              {/* Origin Puskesmas */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Asal Fasyankes / Instansi Perujuk *</label>
                <input
                  type="text"
                  name="fasyankes_origin"
                  required
                  value={formData.fasyankes_origin}
                  onChange={handleInputChange}
                  placeholder="Contoh: Puskesmas Gambir"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Unit Pengirim */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Unit / Poli Pengirim *</label>
                <input
                  type="text"
                  name="sending_unit"
                  value={formData.sending_unit}
                  onChange={handleInputChange}
                  placeholder="Contoh: Poli TB / Rawat Jalan / IGD"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Dokter Pengirim */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Dokter Pengirim / Perujuk *</label>
                <input
                  type="text"
                  name="referring_doctor"
                  value={formData.referring_doctor}
                  onChange={handleInputChange}
                  placeholder="Contoh: dr. Budiarto, Sp.P"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Jenis Pemeriksaan */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Jenis Pemeriksaan Radiologi *</label>
                <select
                  name="examination_type"
                  value={formData.examination_type}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white font-medium"
                >
                  <option value="Radiografi Thoraks (Thorax PA)">Radiografi Thoraks (Thorax PA) - Skrining TB</option>
                  <option value="Radiografi Thoraks (Thorax AP)">Radiografi Thoraks (Thorax AP)</option>
                  <option value="Radiografi Thoraks Lateral">Radiografi Thoraks Lateral (PA + Lateral)</option>
                </select>
              </div>

              {/* Examination Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tanggal Pemeriksaan *</label>
                <input
                  type="date"
                  name="examination_date"
                  required
                  value={formData.examination_date}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                />
              </div>

              {/* Status Antrean Pelayanan */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Status Antrean Pelayanan *</label>
                <select
                  name="queue_status"
                  value={formData.queue_status}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white font-medium"
                >
                  <option value="Menunggu Tindakan">Menunggu Tindakan Radiografer</option>
                  <option value="Sedang Diperiksa">Sedang Diperiksa</option>
                  <option value="Selesai">Selesai Diperiksa</option>
                </select>
              </div>

              {/* Status Pelaporan (Admin / Radiographer can set, defaults to Belum Dilaporkan) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Status Pelaporan *</label>
                <select
                  name="reporting_status"
                  value={formData.reporting_status}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white font-medium"
                >
                  <option value="Belum Dilaporkan">Belum Dilaporkan</option>
                  <option value="Data Belum Lengkap">Data Belum Lengkap</option>
                  <option value="Sudah Dilaporkan">Sudah Dilaporkan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pemakaian Logistik & Parameter Gambar (Radiografer) */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Logistik Film & Parameter Radiografi</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pencatatan pemakaian film/kaset, eksposi gambar, dan durasi pelayanan radiologi.</p>
              </div>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-lg border border-amber-200">
                Logistik & Parameter
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Pemakaian Film / Logistik *</label>
                <select
                  name="film_usage"
                  value={formData.film_usage}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white font-medium"
                >
                  <option value="Film 35x43 cm (1 Lembar)">Film 35x43 cm (1 Lembar)</option>
                  <option value="Film 30x40 cm (1 Lembar)">Film 30x40 cm (1 Lembar)</option>
                  <option value="Film 24x30 cm (1 Lembar)">Film 24x30 cm (1 Lembar)</option>
                  <option value="Digital DR/PACS (Tanpa Film Fisik)">Digital DR/PACS (Tanpa Film Fisik)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Parameter Gambar (Eksposi) *</label>
                <input
                  type="text"
                  name="exposure_params"
                  value={formData.exposure_params}
                  onChange={handleInputChange}
                  placeholder="Contoh: 115 kV, 4 mAs, FFD 180 cm"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Durasi Pelayanan (Menit) *</label>
                <input
                  type="number"
                  name="service_duration"
                  min="1"
                  max="120"
                  value={formData.service_duration}
                  onChange={handleInputChange}
                  placeholder="12"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* Checklist Standar Operasional Radiografer (SOP Pelayanan Skrining TB) */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Checklist Standar Operasional Radiografer</h3>
                <p className="text-xs text-slate-400 mt-0.5">Memastikan kesiapan pra-tindakan dan kendali mutu pasca-pemeriksaan radiografi.</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-100">
                SOP Radiologi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {/* Checklist Pra-Tindakan */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-blue-900">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  1. Kesiapan Sebelum Tindakan (Pra)
                </h4>
                <div className="space-y-2 pt-1 text-xs text-slate-700">
                  <label className="flex items-start gap-2.5 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={!!preChecklist.id_confirmed}
                      onChange={(e) => setPreChecklist(prev => ({ ...prev, id_confirmed: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Konfirmasi Identitas Pasien (Nama, No. RM, Tgl Lahir)</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={!!preChecklist.procedure_explained}
                      onChange={(e) => setPreChecklist(prev => ({ ...prev, procedure_explained: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Penjelasan Prosedur Tindakan & Edukasi Posisi PA/AP</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={!!preChecklist.metal_removed}
                      onChange={(e) => setPreChecklist(prev => ({ ...prev, metal_removed: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Pelepasan Benda Logam / Kalung di Area Dada</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={!!preChecklist.pregnancy_screened}
                      onChange={(e) => setPreChecklist(prev => ({ ...prev, pregnancy_screened: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Skrining Status Kehamilan (Khusus Pasien Wanita)</span>
                  </label>
                </div>
              </div>

              {/* Checklist Pasca-Pemeriksaan */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-emerald-900">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  2. Kendali Mutu Pasca-Pemeriksaan
                </h4>
                <div className="space-y-2 pt-1 text-xs text-slate-700">
                  <label className="flex items-start gap-2.5 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={!!postChecklist.image_quality_optimal}
                      onChange={(e) => setPostChecklist(prev => ({ ...prev, image_quality_optimal: e.target.checked }))}
                      className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Kualitas Citra Optimal & Lapang Paru Simetris</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={!!postChecklist.inspiration_adequate}
                      onChange={(e) => setPostChecklist(prev => ({ ...prev, inspiration_adequate: e.target.checked }))}
                      className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Inspirasi Maksimal (Costa Posterior ke-10 Terlihat)</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={!!postChecklist.no_motion_artifact}
                      onChange={(e) => setPostChecklist(prev => ({ ...prev, no_motion_artifact: e.target.checked }))}
                      className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Bebas Artefak Gerakan (Citra Tajam / Tidak Goyang)</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer hover:text-slate-900">
                    <input 
                      type="checkbox"
                      checked={!!postChecklist.patient_stable}
                      onChange={(e) => setPostChecklist(prev => ({ ...prev, patient_stable: e.target.checked }))}
                      className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Kondisi Umum Pasien Pasca-Tindakan Aman & Stabil</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* TB Examination Info Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Detail Hasil Radiologi</h3>
            
            <div className="space-y-4">
              {/* Diagnosis */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Diagnosa / Hasil Pembacaan Radiologi *</label>
                <textarea
                  name="diagnosis"
                  required
                  rows={3}
                  value={formData.diagnosis}
                  onChange={handleInputChange}
                  placeholder="Tuliskan temuan radiologi secara detail (misal: infiltrat di apeks paru, cor normal, sinus lancip)..."
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Risk Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Kategori Risiko TB *</label>
                  <select
                    name="risk_category"
                    value={formData.risk_category}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white"
                  >
                    <option value="Rendah">Rendah (Hasil Normal/Bercak minimal)</option>
                    <option value="Sedang">Sedang (Suspect TB / Lesi lama)</option>
                    <option value="Tinggi">Tinggi (Kavitas / Infiltrat luas)</option>
                  </select>
                </div>

                {/* Follow Up Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Status Tindak Lanjut *</label>
                  <select
                    name="follow_up_status"
                    value={formData.follow_up_status}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 bg-white"
                  >
                    <option value="Tidak Ada Tindak Lanjut">Tidak Ada Tindak Lanjut</option>
                    <option value="Dirujuk TCM">Dirujuk TCM (Tes Cepat Molekuler)</option>
                    <option value="Dirujuk BTA">Dirujuk BTA (Mikroskopis Sputum)</option>
                    <option value="Pemeriksaan Lanjutan">Pemeriksaan Lanjutan / Konsul Dokter</option>
                  </select>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Keterangan Tambahan</label>
                <textarea
                  name="additional_info"
                  rows={2}
                  value={formData.additional_info}
                  onChange={handleInputChange}
                  placeholder="Keterangan klinis tambahan jika diperlukan..."
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - DICOM Upload and Validation */}
        <div className="space-y-6">
          {/* Upload DICOM Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Foto Ronsen / File DICOM</h3>
            
            {dicomFilename ? (
              // Uploaded State
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <File className="text-emerald-600 shrink-0" size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate" title={dicomFilename}>
                      {dicomFile ? dicomFile.name : dicomFilename}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Ukuran: {dicomFilesize ? (dicomFilesize / (1024 * 1024)).toFixed(2) + ' MB' : 'Tidak Diketahui'}
                    </p>
                  </div>
                </div>

                {/* Real-time Image Preview for DICOM / Photos */}
                {dicomFilename && (
                  <div className="mt-2 border border-emerald-100 rounded-lg overflow-hidden bg-white shadow-inner p-1">
                    <img 
                      src={dicomFilename.toLowerCase().endsWith('.dcm')
                        ? `/uploads/dicom/${dicomFilename.replace('.dcm', '.png')}`
                        : `/uploads/dicom/${dicomFilename}`
                      } 
                      alt="Pratinjau Foto Ronsen" 
                      className="w-full max-h-48 object-contain rounded"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-emerald-100 pt-2 text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle size={14} /> Berhasil Terunggah
                  </span>
                  <button
                    type="button"
                    onClick={removeDicomFile}
                    className="text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Hapus File
                  </button>
                </div>
              </div>
            ) : (
              // Drag and drop zone
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px]
                  ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/30'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dcm,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                {uploading ? (
                  <div className="space-y-3 w-full px-4">
                    <Loader2 size={32} className="text-blue-600 animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">Sedang memproses berkas...</p>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-1.5 transition-all duration-300 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">{uploadProgress}% Selesai</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="text-slate-400 mb-3" size={36} />
                    <p className="text-xs font-bold text-slate-700 mb-1">Tarik berkas foto ronsen ke sini</p>
                    <p className="text-[10px] text-slate-400 mb-3">atau klik untuk memilih (.jpg, .png, .dcm)</p>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-bold tracking-wider uppercase">Format: JPG, PNG, DCM (Max 50MB)</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Validation Comparison Card */}
          {uploadedDicomMeta && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Validasi Data Metadata</span>
                {validationStatus?.isFullyValid ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Valid</span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Perlu Cek</span>
                )}
              </h3>

              <div className="overflow-hidden border border-slate-100 rounded-lg">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Manual</th>
                      <th className="px-3 py-2 text-left">DICOM Meta</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {/* ID */}
                    <tr>
                      <td className="px-3 py-2.5 font-medium bg-slate-50/50">ID Pasien</td>
                      <td className="px-3 py-2.5 break-all font-semibold">{formData.patient_id || <span className="text-slate-400 italic">kosong</span>}</td>
                      <td className="px-3 py-2.5 break-all">
                        {uploadedDicomMeta.patientId === null && uploadedDicomMeta.patientName === null && uploadedDicomMeta.patientSex === null && uploadedDicomMeta.studyDate === null ? (
                          <span className="text-slate-400 italic">N/A (Gambar)</span>
                        ) : (
                          uploadedDicomMeta.patientId || <span className="text-slate-400 italic">kosong</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">{getMatchIcon(validationStatus?.idMatch)}</td>
                    </tr>
                    {/* Name */}
                    <tr>
                      <td className="px-3 py-2.5 font-medium bg-slate-50/50">Nama Pasien</td>
                      <td className="px-3 py-2.5 break-all font-semibold">{formData.patient_name || <span className="text-slate-400 italic">kosong</span>}</td>
                      <td className="px-3 py-2.5 break-all">
                        {uploadedDicomMeta.patientId === null && uploadedDicomMeta.patientName === null && uploadedDicomMeta.patientSex === null && uploadedDicomMeta.studyDate === null ? (
                          <span className="text-slate-400 italic">N/A (Gambar)</span>
                        ) : (
                          uploadedDicomMeta.patientName || <span className="text-slate-400 italic">kosong</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">{getMatchIcon(validationStatus?.nameMatch)}</td>
                    </tr>
                    {/* Date */}
                    <tr>
                      <td className="px-3 py-2.5 font-medium bg-slate-50/50">Tanggal</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold">{formData.examination_date}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {uploadedDicomMeta.patientId === null && uploadedDicomMeta.patientName === null && uploadedDicomMeta.patientSex === null && uploadedDicomMeta.studyDate === null ? (
                          <span className="text-slate-400 italic">N/A (Gambar)</span>
                        ) : (
                          uploadedDicomMeta.studyDate || <span className="text-slate-400 italic">kosong</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">{getMatchIcon(validationStatus?.dateMatch)}</td>
                    </tr>
                    {/* Gender */}
                    <tr>
                      <td className="px-3 py-2.5 font-medium bg-slate-50/50">L/P</td>
                      <td className="px-3 py-2.5 font-semibold">{formData.gender}</td>
                      <td className="px-3 py-2.5">
                        {uploadedDicomMeta.patientId === null && uploadedDicomMeta.patientName === null && uploadedDicomMeta.patientSex === null && uploadedDicomMeta.studyDate === null ? (
                          <span className="text-slate-400 italic">N/A (Gambar)</span>
                        ) : (
                          uploadedDicomMeta.patientSex || <span className="text-slate-400 italic">kosong</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">{getMatchIcon(validationStatus?.genderMatch)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mismatch warnings */}
              {validationStatus && !validationStatus.isFullyValid && (
                <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                      {dicomFilename && (dicomFilename.toLowerCase().endsWith('.jpg') || dicomFilename.toLowerCase().endsWith('.jpeg') || dicomFilename.toLowerCase().endsWith('.png')) ? (
                        <span>Format berkas yang diunggah adalah <strong>gambar biasa (PNG/JPG)</strong> yang tidak memiliki metadata DICOM. Silakan centang kotak konfirmasi di bawah untuk menyimpan data pemeriksaan ini.</span>
                      ) : (
                        <span>Ditemukan ketidaksesuaian antara data yang dimasukkan secara manual dengan metadata file DICOM yang diupload. Harap sesuaikan data manual agar sama dengan metadata, atau centang kotak di bawah.</span>
                      )}
                    </p>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ignoreMismatches}
                      onChange={(e) => setIgnoreMismatches(e.target.checked)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 rounded h-3.5 w-3.5"
                    />
                    <span className="text-[10px] text-amber-900 font-semibold select-none">
                      {dicomFilename && (dicomFilename.toLowerCase().endsWith('.jpg') || dicomFilename.toLowerCase().endsWith('.jpeg') || dicomFilename.toLowerCase().endsWith('.png')) ? (
                        <span>Saya mengonfirmasi bahwa data manual yang dimasukkan sudah benar dan valid.</span>
                      ) : (
                        <span>Saya mengonfirmasi bahwa perbedaan ini valid dan ingin menyimpan data ini.</span>
                      )}
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Form Actions Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm shadow-md transition flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Pemeriksaan</span>
              )}
            </button>

            <Link
              to="/examinations"
              className="w-full block text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-lg text-sm transition"
            >
              Batal
            </Link>
          </div>
        </div>

      </form>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Database, 
  CheckCircle, 
  Info, 
  Download, 
  Upload, 
  Loader2, 
  AlertTriangle,
  Camera,
  Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user') || '{}');
  });

  const [activeTab, setActiveTab] = useState('general'); // 'general', 'profile', 'database'
  
  // Alert messages
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // General Settings State
  const [hospitalName, setHospitalName] = useState(() => {
    return localStorage.getItem('hospitalName') || 'Unit Radiologi TB Nasional';
  });
  const [sessionTimeout, setSessionTimeout] = useState(() => {
    return localStorage.getItem('sessionTimeout') || '8';
  });

  // Profile Pic State
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picTimestamp, setPicTimestamp] = useState(Date.now());
  const fileInputRef = useRef(null);

  // Sync user from API on mount & on custom event
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        })
        .catch(err => console.error('Gagal memuat info user:', err));
    }

    const handleProfilePicUpdate = () => {
      const updated = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(updated);
      setPicTimestamp(Date.now());
    };
    window.addEventListener('profilePicChanged', handleProfilePicUpdate);
    return () => {
      window.removeEventListener('profilePicChanged', handleProfilePicUpdate);
    };
  }, [token]);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  // Database State
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoringDb, setRestoringDb] = useState(false);
  const [clearingDb, setClearingDb] = useState(false);
  const dbInputRef = useRef(null);

  // Custom Confirm Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {}
  });

  // Save General Settings
  const handleSaveGeneral = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      localStorage.setItem('hospitalName', hospitalName);
      localStorage.setItem('sessionTimeout', sessionTimeout);
      setSuccess('Pengaturan umum berhasil disimpan.');
      // Dispatch event to notify Layout Topbar to update facility name reactively
      window.dispatchEvent(new Event('hospitalNameChanged'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Gagal menyimpan pengaturan.');
    }
  };

  // Profile Pic Change Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Ukuran file maksimal adalah 2MB.');
        return;
      }
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  // Camera Control Handlers
  const startCamera = async () => {
    setError('');
    setSuccess('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 480, height: 480, facingMode: 'user' } 
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      setError('Gagal mengakses kamera: ' + err.message);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      // Draw frame mirrored for natural feel
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `camera-pic-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setProfilePicFile(file);
        setProfilePicPreview(URL.createObjectURL(file));
        stopCamera();
      }, 'image/jpeg', 0.9);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Upload Profile Pic
  const handleUploadProfilePic = async (e) => {
    e.preventDefault();
    if (!profilePicFile) return;

    setUploadingPic(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('profile_pic', profilePicFile);

    try {
      const response = await fetch('/api/users/profile-pic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal mengunggah foto profil.');
      }

      // Update local storage user state
      const updatedUser = { ...user, profile_pic: result.profile_pic };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfilePicFile(null);
      setPicTimestamp(Date.now());
      setSuccess('Foto profil berhasil diperbarui.');
      
      // Dispatch custom event to notify Topbar layout to update avatar
      window.dispatchEvent(new Event('profilePicChanged'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPic(false);
    }
  };

  // Delete Profile Pic Handler
  const handleDeleteProfilePic = () => {
    setConfirmModalConfig({
      title: 'Hapus Foto Profil?',
      message: 'Apakah Anda yakin ingin menghapus foto profil dan kembali menggunakan avatar inisial nama standar?',
      type: 'danger',
      onConfirm: async () => {
        setUploadingPic(true);
        setError('');
        setSuccess('');
        try {
          const response = await fetch('/api/users/profile-pic', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || 'Gagal menghapus foto profil.');
          }
          const updatedUser = { ...user, profile_pic: null };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          setProfilePicFile(null);
          setProfilePicPreview('');
          setPicTimestamp(Date.now());
          setSuccess('Foto profil berhasil dihapus.');
          window.dispatchEvent(new Event('profilePicChanged'));
          setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
          setError(err.message);
        } finally {
          setUploadingPic(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Download Backup
  const handleDownloadBackup = async () => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/settings/backup', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Gagal membuat unduhan cadangan.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_radiologi_tb_${new Date().toISOString().slice(0,10)}_${Date.now()}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccess('Cadangan database berhasil diunduh.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Restore Database Click Trigger
  const handleRestoreDatabase = (e) => {
    e.preventDefault();
    if (!restoreFile) return;

    setConfirmModalConfig({
      title: 'Pulihkan Database dari Cadangan',
      message: 'PERINGATAN: Memulihkan database akan menghapus seluruh data pemeriksaan, log, dan pengguna saat ini, lalu menggantinya dengan data cadangan. Anda yakin ingin melanjutkan?',
      type: 'danger',
      onConfirm: () => {
        executeRestoreDatabase();
      }
    });
    setShowConfirmModal(true);
  };

  const executeRestoreDatabase = async () => {
    setRestoringDb(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('database', restoreFile);

    try {
      const response = await fetch('/api/settings/restore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal memulihkan database.');
      }

      setRestoreFile(null);
      if (dbInputRef.current) dbInputRef.current.value = '';
      setSuccess('Database berhasil dipulihkan dari cadangan. Sistem diperbarui!');
      
      // Notify components to update notifications and logs
      window.dispatchEvent(new Event('locationChanged'));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setRestoringDb(false);
    }
  };

  // Clear Data Click Trigger
  const handleClearData = () => {
    setConfirmModalConfig({
      title: 'Kosongkan Semua Data Pemeriksaan',
      message: 'APAKAH ANDA YAKIN? Tindakan ini akan menghapus seluruh data catatan pemeriksaan pasien secara permanen dari database sistem! Tindakan ini tidak dapat dibatalkan.',
      type: 'danger',
      onConfirm: () => {
        executeClearData();
      }
    });
    setShowConfirmModal(true);
  };

  const executeClearData = async () => {
    setClearingDb(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/settings/clear-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Gagal menghapus data.');
      
      setSuccess('Semua data pemeriksaan pasien berhasil dikosongkan secara permanen!');
      // Dispatch location change to refresh notifications
      window.dispatchEvent(new Event('locationChanged'));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setClearingDb(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pengaturan Sistem</h2>
        <p className="text-sm text-slate-500 mt-0.5">Konfigurasi parameter sistem informasi, foto profil, dan cadangan database.</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex justify-center border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('general'); setError(''); setSuccess(''); }}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings size={16} />
          <span>Pengaturan Umum</span>
        </button>

        <button
          onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <User size={16} />
          <span>Foto Profil</span>
        </button>

        <button
          onClick={() => { setActiveTab('database'); setError(''); setSuccess(''); }}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'database'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database size={16} />
          <span>Cadangan Database</span>
        </button>

        <button
          onClick={() => { setActiveTab('clear'); setError(''); setSuccess(''); }}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'clear'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trash2 size={16} />
          <span>Kosongkan Database</span>
        </button>
      </div>

      {/* Alert Banners */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle size={20} className="text-rose-600" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Tab 1: General Settings */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Settings size={18} className="text-blue-600" />
              <span>Konfigurasi Umum</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Fasilitas Layanan Kesehatan / Unit</label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Sesi Token Kedaluwarsa (Jam)</label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition shadow-md cursor-pointer"
          >
            Simpan Pengaturan
          </button>
        </form>
      )}

      {/* Tab 2: User Profile Picture */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User size={18} className="text-blue-600" />
              <span>Ubah Foto Profil</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
              <div className="relative">
                {isCameraActive ? (
                  <div className="w-32 h-32 rounded-xl border border-slate-200 overflow-hidden bg-slate-950 flex items-center justify-center relative shadow-sm">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded text-[10px] transition cursor-pointer text-center shadow"
                      >
                        Ambil
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 rounded text-[10px] transition cursor-pointer text-center px-2 shadow"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {profilePicPreview || user.profile_pic ? (
                      <img
                        src={profilePicPreview || (user.profile_pic ? `${user.profile_pic}?t=${picTimestamp}` : '')}
                        alt="Foto Profil"
                        className="w-24 h-24 rounded-full border-4 border-slate-100 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-blue-600 text-white border-4 border-slate-100 flex items-center justify-center font-bold text-3xl shadow-sm">
                        {user.name ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="text-center sm:text-left space-y-1">
                <h4 className="font-bold text-slate-800 text-base">{user.name}</h4>
                <p className="text-xs text-slate-400 font-semibold uppercase">{user.role}</p>
                <p className="text-xs text-slate-500 mt-1">Format gambar: JPG, JPEG, PNG (Maks 2MB).</p>
                {!isCameraActive && (
                  <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer border border-slate-200"
                    >
                      <Camera size={14} className="text-blue-600" />
                      <span>Ambil Foto via Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer border border-slate-200"
                    >
                      <Upload size={14} className="text-blue-600" />
                      <span>Pilih Foto dari Galeri</span>
                    </button>
                    {user.profile_pic && !profilePicFile && (
                      <button
                        type="button"
                        onClick={handleDeleteProfilePic}
                        disabled={uploadingPic}
                        className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-1.5 px-3 rounded-lg text-xs transition border border-rose-200 cursor-pointer disabled:opacity-50"
                        title="Hapus foto profil dan gunakan avatar inisial nama"
                      >
                        <Trash2 size={14} />
                        <span>Hapus Foto Profil</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {profilePicFile && (
            <div className="flex gap-3">
              <button
                onClick={handleUploadProfilePic}
                disabled={uploadingPic}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {uploadingPic ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Simpan Foto Profil</span>
                  </>
                )}
              </button>

              <button
                onClick={() => { setProfilePicFile(null); setProfilePicPreview(''); }}
                disabled={uploadingPic}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-5 rounded-lg text-sm transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Database Backup & Restore */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Card 1: Backup */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Download size={18} className="text-emerald-600" />
              <span>Cadangan (Backup) Database</span>
            </h3>
            
            <p className="text-sm text-slate-600 leading-relaxed">
              Unduh salinan database SQLite sistem informasi radiologi TB (`radiologi_tb.db`) secara langsung ke komputer lokal Anda. Cadangan ini mencakup seluruh data pemeriksaan pasien, pengaturan institusi, akun pengguna, serta seluruh log aktivitas.
            </p>

            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-5 rounded-lg text-sm transition shadow-md cursor-pointer"
            >
              <Download size={16} />
              <span>Unduh Cadangan Database</span>
            </button>
          </div>

          {/* Card 2: Restore */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Upload size={18} className="text-rose-600" />
              <span>Pemulihan (Restore) Database</span>
            </h3>

            {/* Warning Alert */}
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex gap-3">
              <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold block text-sm">Peringatan Kritis!</span>
                <span className="block leading-relaxed">
                  Memulihkan database dari file cadangan akan menghapus dan menimpa seluruh data yang aktif saat ini. Pastikan file cadangan yang diunggah berformat `.db` SQLite resmi yang berasal dari backup sistem ini sebelumnya.
                </span>
              </div>
            </div>

            <form onSubmit={handleRestoreDatabase} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Pilih Berkas Cadangan (.db)</label>
                <input
                  type="file"
                  ref={dbInputRef}
                  onChange={(e) => setRestoreFile(e.target.files[0])}
                  accept=".db"
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer file:cursor-pointer"
                />
              </div>

              {restoreFile && (
                <button
                  type="submit"
                  disabled={restoringDb}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-5 rounded-lg text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {restoringDb ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Memulihkan Database...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Mulai Pemulihan Database</span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Clear Database */}
      {activeTab === 'clear' && (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Trash2 size={18} className="text-rose-600" />
            <span>Kosongkan Semua Data Pemeriksaan</span>
          </h3>
          
          <p className="text-sm text-slate-600 leading-relaxed">
            Tindakan ini akan menghapus seluruh data catatan pemeriksaan pasien secara permanen dari database sistem, namun tetap mempertahankan konfigurasi nama rumah sakit, pengaturan sesi, serta akun login pengguna (Admin dan Radiografer).
          </p>

          <button
            onClick={handleClearData}
            disabled={clearingDb}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-5 rounded-lg text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {clearingDb ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Mengosongkan Data...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Kosongkan Semua Data Pemeriksaan</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform animate-slide-down-modal text-left">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full shrink-0 ${
                confirmModalConfig.type === 'danger' 
                  ? 'bg-rose-50 text-rose-600' 
                  : 'bg-amber-50 text-amber-600'
              }`}>
                <AlertTriangle size={24} />
              </div>
              
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-slate-800 text-lg">{confirmModalConfig.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{confirmModalConfig.message}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  confirmModalConfig.onConfirm();
                }}
                className={`px-5 py-2 text-white font-semibold rounded-lg text-sm transition shadow-md cursor-pointer ${
                  confirmModalConfig.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

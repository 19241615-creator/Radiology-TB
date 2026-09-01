import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Shield, CheckCircle, Camera, Upload, Loader2, X, Trash2 } from 'lucide-react';

export default function Profile() {
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user') || '{}');
  });

  // Success / Error Alerts
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Upload/Camera Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Profile Pic State
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picTimestamp, setPicTimestamp] = useState(Date.now());
  const fileInputRef = useRef(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  // Profile picture changed listener & initial fresh fetch
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
        .catch(err => console.error('Gagal sinkronisasi data user:', err));
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

  // File Change Handler
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

  // Camera Handlers
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
      setShowUploadModal(false);
      
      // Dispatch custom event to notify Sidebar/Topbar layouts
      window.dispatchEvent(new Event('profilePicChanged'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPic(false);
    }
  };

  // In-App Delete Profile Pic Confirmation Modal State
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingPic, setDeletingPic] = useState(false);

  const handleDeleteProfilePic = () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteProfilePic = async () => {
    setDeletingPic(true);
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
      setShowUploadModal(false);
      setShowDeleteConfirmModal(false);
      setPicTimestamp(Date.now());
      setSuccess('Foto profil berhasil dihapus.');
      window.dispatchEvent(new Event('profilePicChanged'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingPic(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Profil Saya</h2>
        <p className="text-sm text-slate-500 mt-0.5">Lihat informasi detail dan ubah foto profil akun Anda.</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-emerald-800 font-semibold">{success}</div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-rose-800 font-semibold">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-blue-600 flex items-end p-6 text-white relative">
          
          {/* Circular Interactive Avatar Box */}
          <div 
            onClick={() => setShowUploadModal(true)}
            className="absolute top-16 left-6 bg-slate-200 border-4 border-white w-20 h-20 rounded-2xl overflow-hidden shadow-md flex items-center justify-center font-bold text-2xl cursor-pointer group hover:opacity-95 transition relative"
            title="Klik untuk ubah foto profil"
          >
            {user.profile_pic ? (
              <img 
                src={`${user.profile_pic}?t=${picTimestamp}`} 
                alt="Foto Profil" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-800 text-white flex items-center justify-center">
                {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
              </div>
            )}
            
            {/* Camera Overlay Icon on Hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200">
              <Camera size={20} />
            </div>
          </div>
        </div>

        <div className="pt-10 p-6 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
            <p className="text-sm text-slate-500 capitalize">{user.role === 'radiographer' ? 'Radiografer' : user.role}</p>
          </div>

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <User size={18} className="text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Username</span>
                <span className="font-semibold">{user.username}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Mail size={18} className="text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Email</span>
                <span className="font-semibold">{user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Shield size={18} className="text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Role Akses</span>
                <span className="font-semibold capitalize">{user.role}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <CheckCircle size={18} className="text-emerald-500" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Status Akun</span>
                <span className="font-semibold text-emerald-600">Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload & Webcam Capture Popup Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-slide-down-modal space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Camera size={18} className="text-blue-600" />
                <span>Ubah Foto Profil Saya</span>
              </h3>
              <button 
                onClick={() => { stopCamera(); setProfilePicFile(null); setProfilePicPreview(''); setShowUploadModal(false); }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-5 py-2">
              <div className="relative">
                {isCameraActive ? (
                  <div className="w-32 h-32 rounded-xl border border-slate-200 overflow-hidden bg-slate-950 flex items-center justify-center relative shadow-sm">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 rounded text-[10px] transition cursor-pointer text-center shadow"
                      >
                        Ambil
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1 rounded text-[10px] transition cursor-pointer text-center px-1.5 shadow"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {profilePicPreview || user.profile_pic ? (
                      <img
                        src={profilePicPreview || `${user.profile_pic}?t=${picTimestamp}`}
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

              <div className="text-center w-full space-y-2">
                <p className="text-[11px] text-slate-400">Format berkas: JPG, JPEG, PNG (Maks 2MB).</p>
                {!isCameraActive && (
                  <div className="flex flex-col items-center gap-2 mt-3 w-full">
                    <div className="flex justify-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer border border-slate-200"
                      >
                        <Camera size={14} className="text-blue-600" />
                        <span>Kamera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer border border-slate-200"
                      >
                        <Upload size={14} className="text-blue-600" />
                        <span>Galeri</span>
                      </button>
                    </div>

                    {user.profile_pic && !profilePicFile && (
                      <button
                        type="button"
                        onClick={handleDeleteProfilePic}
                        disabled={uploadingPic}
                        className="w-full flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-1.5 px-3 rounded-lg text-xs transition border border-rose-200 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        <span>Hapus Foto</span>
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

            {/* Modal Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              {profilePicFile ? (
                <>
                  <button
                    onClick={handleUploadProfilePic}
                    disabled={uploadingPic}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingPic ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Simpan</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePicFile(null);
                      setProfilePicPreview('');
                    }}
                    disabled={uploadingPic}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-lg text-xs transition text-center cursor-pointer"
                  >
                    Batal
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setProfilePicFile(null);
                    setProfilePicPreview('');
                    setShowUploadModal(false);
                  }}
                  disabled={uploadingPic}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-xs transition text-center cursor-pointer"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Profile Photo Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-slide-down-modal text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <Trash2 size={24} />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-800">Hapus Foto Profil?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Foto profil Anda akan dihapus dan tampilan avatar akan kembali menggunakan inisial nama standar.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deletingPic}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteProfilePic}
                disabled={deletingPic}
                className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {deletingPic ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Key, 
  Shield, 
  ShieldAlert, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  CameraOff
} from 'lucide-react';

export default function UserManagement() {
  const token = localStorage.getItem('token');
  const currentLoggedInUser = JSON.parse(localStorage.getItem('user') || '{}') || {};

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'reset-pw'
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('radiographer');
  const [status, setStatus] = useState('active');
  const [password, setPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Gagal mengambil daftar pengguna.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedUser(null);
    setName('');
    setUsername('');
    setEmail('');
    setRole('radiographer');
    setStatus('active');
    setPassword('');
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status);
    setPassword(''); // keep blank unless resetting
    setShowModal(true);
  };

  const handleOpenResetPwModal = (user) => {
    setModalMode('reset-pw');
    setSelectedUser(user);
    setPassword('');
    setShowModal(true);
  };

  const handleToggleStatus = async (user) => {
    if (user.username === currentLoggedInUser.username) {
      setError('Anda tidak dapat menonaktifkan akun Anda sendiri.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          status: newStatus
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Gagal mengubah status pengguna.');
      }

      setSuccessMsg(`Status akun ${user.username} diubah menjadi ${newStatus}.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  // In-App Confirm Delete State
  const [userToDelete, setUserToDelete] = useState(null);
  const [photoUserToDelete, setPhotoUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteUser = (user) => {
    if (user.username === currentLoggedInUser.username) {
      setError('Anda tidak dapat menghapus akun Anda sendiri.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Gagal menghapus pengguna.');
      }

      setSuccessMsg('Pengguna berhasil dihapus.');
      setUserToDelete(null);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUserPic = (userToEdit) => {
    setPhotoUserToDelete(userToEdit);
  };

  const confirmDeleteUserPic = async () => {
    if (!photoUserToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${photoUserToDelete.id}/profile-pic`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Gagal menghapus foto profil pengguna.');
      setSuccessMsg(`Foto profil milik ${photoUserToDelete.name} berhasil dihapus.`);
      fetchUsers();
      if (selectedUser && selectedUser.id === photoUserToDelete.id) {
        setSelectedUser(prev => ({ ...prev, profile_pic: null }));
      }
      if (photoUserToDelete.username === currentLoggedInUser.username) {
        const updated = { ...currentLoggedInUser, profile_pic: null };
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new Event('profilePicChanged'));
      }
      setPhotoUserToDelete(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = { name, username, email, role, status, password };

    try {
      let response;
      if (modalMode === 'add') {
        response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else if (modalMode === 'edit') {
        response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name, email, role, status })
        });
      } else if (modalMode === 'reset-pw') {
        response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: selectedUser.name,
            email: selectedUser.email,
            role: selectedUser.role,
            status: selectedUser.status,
            password
          })
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal menyimpan perubahan.');
      }

      setSuccessMsg(
        modalMode === 'add' 
          ? 'Pengguna baru berhasil ditambahkan.' 
          : modalMode === 'edit'
            ? 'Profil pengguna berhasil diperbarui.'
            : 'Password pengguna berhasil di-reset.'
      );

      setShowModal(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola akun akses sistem untuk Admin dan Radiografer.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-secondary-fixed hover:bg-secondary-fixed-dim text-on-secondary-fixed font-bold py-2 px-4 rounded-lg text-sm border border-secondary-fixed shadow-md transition"
        >
          <Plus size={16} />
          <span>Tambah Pengguna</span>
        </button>
      </div>

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

      {/* Users Table Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="text-blue-600 animate-spin mb-2" size={32} />
            <span className="text-slate-500 text-sm">Memuat daftar pengguna...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm">Tidak ada data pengguna.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left">Nama Lengkap</th>
                  <th scope="col" className="px-6 py-4 text-left">Username</th>
                  <th scope="col" className="px-6 py-4 text-left">Email</th>
                  <th scope="col" className="px-6 py-4 text-left">Role</th>
                  <th scope="col" className="px-6 py-4 text-center">Status</th>
                  <th scope="col" className="px-6 py-4 text-center w-40">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {u.profile_pic ? (
                            <img src={u.profile_pic} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{u.name}</span>
                          {u.profile_pic && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUserPic(u)}
                              className="text-[10px] text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer font-medium"
                              title="Hapus foto profil pengguna ini"
                            >
                              <Trash2 size={10} />
                              <span>Hapus Foto</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{u.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">
                      {u.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold text-xs border border-blue-100">
                          <Shield size={12} /> Administrasi
                        </span>
                      )}
                      {u.role === 'institution' && (
                        <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold text-xs border border-purple-200">
                          <ShieldAlert size={12} /> Institusi
                        </span>
                      )}
                      {u.role === 'radiographer' && (
                        <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-semibold text-xs">
                          Radiografer
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={u.username === currentLoggedInUser.username}
                        className={`inline-flex items-center gap-1.5 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={u.username === currentLoggedInUser.username ? '' : 'Klik untuk mengubah status'}
                      >
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold text-xs border border-emerald-100">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-semibold text-xs">
                            Nonaktif
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit profile */}
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition cursor-pointer"
                          title="Edit Profil"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Delete user photo if exists */}
                        {u.profile_pic && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUserPic(u)}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition border border-rose-200 cursor-pointer"
                            title="Hapus Foto Profil Pengguna"
                          >
                            <CameraOff size={15} />
                          </button>
                        )}
                        
                        {/* Reset password */}
                        <button
                          onClick={() => handleOpenResetPwModal(u)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition cursor-pointer"
                          title="Reset Password"
                        >
                          <Key size={15} />
                        </button>

                        {/* Delete user */}
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.username === currentLoggedInUser.username}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600 cursor-pointer"
                          title="Hapus Akun"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pop Up Dialog Modal for Add/Edit/Reset PW */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowModal(false)} />
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-100 p-6 z-10 animate-slide-down-modal space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
              {modalMode === 'add' && 'Tambah Pengguna Baru'}
              {modalMode === 'edit' && 'Ubah Profil Pengguna'}
              {modalMode === 'reset-pw' && `Reset Password: ${selectedUser?.username}`}
            </h3>

            {modalMode !== 'reset-pw' ? (
              <div className="space-y-3">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap petugas"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: radiografer01"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@fasyankes.id"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Hak Akses (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="radiographer">Radiografer</option>
                    <option value="admin">Administrasi (Admin)</option>
                    <option value="institution">Institusi / Pimpinan Faskes</option>
                  </select>
                </div>

                {/* Profile Picture Management (Edit Mode) */}
                {modalMode === 'edit' && selectedUser?.profile_pic && (
                  <div className="flex items-center justify-between p-3 bg-rose-50/70 border border-rose-100 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={selectedUser.profile_pic} 
                        alt="Foto Profil" 
                        className="w-9 h-9 rounded-full object-cover border border-rose-200" 
                      />
                      <div>
                        <span className="text-xs text-rose-900 font-bold block">Foto Profil Kustom</span>
                        <span className="text-[10px] text-rose-600 block">Pengguna memiliki foto aktif</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteUserPic(selectedUser)}
                      className="flex items-center gap-1 text-xs text-rose-700 font-bold bg-white hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Hapus Foto</span>
                    </button>
                  </div>
                )}

                {/* Password (Add mode only) */}
                {modalMode === 'add' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Password Awal *</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 karakter"
                      className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              // Reset Password Mode
              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Masukkan password baru untuk user <span className="font-semibold text-slate-800">{selectedUser?.name}</span>. Pengguna harus login kembali menggunakan password baru setelah berhasil disimpan.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Password Baru *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 karakter"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* In-App Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-slide-down-modal text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <Trash2 size={24} />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-800">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Akun pengguna <strong className="text-slate-800">{userToDelete.name}</strong> ({userToDelete.username}) akan dihapus secara permanen dari sistem.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
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

      {/* In-App Delete User Photo Confirmation Modal */}
      {photoUserToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-slide-down-modal text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <Trash2 size={24} />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-800">Hapus Foto Profil Pengguna?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Foto profil milik <strong className="text-slate-800">{photoUserToDelete.name}</strong> akan dihapus dan kembali menggunakan avatar inisial nama.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPhotoUserToDelete(null)}
                disabled={isDeleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUserPic}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
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

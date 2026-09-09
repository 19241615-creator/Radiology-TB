const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db = require('./database');
const { parseDicomMetadata } = require('./shared/dicomParser');
const { authenticateToken, authorizeRoles, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Setup directories
const uploadsDir = path.join(__dirname, 'uploads', 'dicom');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for DICOM files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'dicom-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Validate extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.dcm', '.jpg', '.jpeg', '.png'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file dengan ekstensi .dcm, .jpg, .jpeg, atau .png yang diperbolehkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const profilePicsDir = path.join(__dirname, 'uploads', 'profile_pics');
if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir, { recursive: true });
}

const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${req.user.id}${ext}`);
  }
});

const uploadProfilePic = multer({ 
  storage: profilePicStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Helper function to log audit activities
function logActivity(username, role, activity, affectedData = null, ipAddress = '127.0.0.1') {
  try {
    const insertLog = db.prepare(`
      INSERT INTO audit_logs (username, role, activity, affected_data, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLog.run(username, role, activity, affectedData, ipAddress);
  } catch (err) {
    console.error('Gagal menulis audit log:', err);
  }
}

// ==========================================
// 1. AUTH API
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi.' });
  }

  try {
    const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = getUser.get(username);

    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Akun Anda dinonaktifkan. Hubungi Admin.' });
    }

    const passwordValid = bcrypt.compareSync(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Audit log
    logActivity(user.username, user.role, 'Login ke sistem', 'Sesi Pengguna', req.ip || '127.0.0.1');

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        profile_pic: user.profile_pic
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const getUser = db.prepare('SELECT id, name, username, email, role, status, profile_pic, created_at FROM users WHERE id = ?');
    const user = getUser.get(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// ==========================================
// 2. USERS API (Admin Only)
// ==========================================

app.get('/api/users', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const getUsers = db.prepare('SELECT id, name, username, email, role, status, created_at FROM users ORDER BY created_at DESC');
    const users = getUsers.all();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data pengguna.' });
  }
});

app.post('/api/users', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { name, username, email, password, role } = req.body;

  if (!name || !username || !email || !password || !role) {
    return res.status(400).json({ message: 'Semua field wajib diisi.' });
  }

  try {
    const checkExists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?');
    const existing = checkExists.get(username, email);

    if (existing) {
      return res.status(400).json({ message: 'Username atau Email sudah terdaftar.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const insertUser = db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `);
    const result = insertUser.run(name, username, email, hashedPassword, role);

    logActivity(req.user.username, req.user.role, `Menambahkan pengguna baru: ${username}`, `${name} (${role})`, req.ip);

    res.status(201).json({
      message: 'Pengguna berhasil ditambahkan.',
      userId: result.lastInsertRowid
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menambahkan pengguna.' });
  }
});

app.put('/api/users/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { name, email, role, status, password } = req.body;
  const userId = req.params.id;

  try {
    const getUser = db.prepare('SELECT username FROM users WHERE id = ?');
    const targetUser = getUser.get(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    // Dynamic update depending on password field presence
    if (password && password.trim() !== '') {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const updateStmt = db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, role = ?, status = ?, password = ?
        WHERE id = ?
      `);
      updateStmt.run(name, email, role, status, hashedPassword, userId);
    } else {
      const updateStmt = db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, role = ?, status = ?
        WHERE id = ?
      `);
      updateStmt.run(name, email, role, status, userId);
    }

    logActivity(req.user.username, req.user.role, `Mengubah data pengguna: ${targetUser.username}`, `${name} (${role}, ${status})`, req.ip);

    res.json({ message: 'Data pengguna berhasil diubah.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengubah data pengguna.' });
  }
});

// Update profile picture
app.post('/api/users/profile-pic', authenticateToken, uploadProfilePic.single('profile_pic'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file foto profil yang diunggah.' });
  }
  const profilePicPath = `/uploads/profile_pics/${req.file.filename}`;
  try {
    db.prepare('UPDATE users SET profile_pic = ? WHERE id = ?').run(profilePicPath, req.user.id);
    const updatedUser = db.prepare('SELECT id, name, username, email, role, profile_pic FROM users WHERE id = ?').get(req.user.id);
    
    logActivity(req.user.username, req.user.role, 'Memperbarui foto profil', req.user.name, req.ip || '127.0.0.1');

    res.json({ 
      message: 'Foto profil berhasil diperbarui.',
      profile_pic: profilePicPath,
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui foto profil.' });
  }
});

// Delete profile picture (Current User)
app.delete('/api/users/profile-pic', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, username, email, role, profile_pic FROM users WHERE id = ?').get(req.user.id);
    if (user && user.profile_pic) {
      const filePath = path.join(__dirname, user.profile_pic);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Error removing pic file:', e); }
      }
    }
    db.prepare('UPDATE users SET profile_pic = NULL WHERE id = ?').run(req.user.id);
    const updatedUser = db.prepare('SELECT id, name, username, email, role, profile_pic FROM users WHERE id = ?').get(req.user.id);

    logActivity(req.user.username, req.user.role, 'Menghapus foto profil', req.user.name, req.ip || '127.0.0.1');

    res.json({
      message: 'Foto profil berhasil dihapus.',
      user: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus foto profil.' });
  }
});

// Delete specific user's profile picture (Admin Only)
app.delete('/api/users/:id/profile-pic', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const targetId = req.params.id;
  try {
    const user = db.prepare('SELECT id, username, name, profile_pic FROM users WHERE id = ?').get(targetId);
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }
    if (user.profile_pic) {
      const filePath = path.join(__dirname, user.profile_pic);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Error removing pic file:', e); }
      }
    }
    db.prepare('UPDATE users SET profile_pic = NULL WHERE id = ?').run(targetId);

    logActivity(req.user.username, req.user.role, `Menghapus foto profil pengguna: ${user.username}`, user.name, req.ip || '127.0.0.1');

    res.json({ message: 'Foto profil pengguna berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus foto profil pengguna.' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const userId = req.params.id;

  try {
    const getUser = db.prepare('SELECT username, name FROM users WHERE id = ?');
    const targetUser = getUser.get(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    if (targetUser.username === req.user.username) {
      return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
    }

    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    deleteStmt.run(userId);

    logActivity(req.user.username, req.user.role, `Menghapus pengguna: ${targetUser.username}`, targetUser.name, req.ip);

    res.json({ message: 'Pengguna berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus pengguna.' });
  }
});

// ==========================================
// 3. EXAMINATIONS API
// ==========================================

// Get examinations with filters, search, pagination
app.get('/api/examinations', authenticateToken, (req, res) => {
  const { search, startDate, endDate, reportingStatus, diagnosis, riskCategory, page = 1, limit = 10 } = req.query;

  try {
    let queryStr = 'SELECT * FROM examinations WHERE 1=1';
    let countQueryStr = 'SELECT COUNT(*) as count FROM examinations WHERE 1=1';
    const params = [];
    const countParams = [];

    // Search patient ID or patient Name
    if (search) {
      const searchParam = `%${search}%`;
      queryStr += ' AND (patient_id LIKE ? OR patient_name LIKE ? OR medical_record_number LIKE ?)';
      countQueryStr += ' AND (patient_id LIKE ? OR patient_name LIKE ? OR medical_record_number LIKE ?)';
      params.push(searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam);
    }

    // Filter examination date range
    if (startDate) {
      queryStr += ' AND examination_date >= ?';
      countQueryStr += ' AND examination_date >= ?';
      params.push(startDate);
      countParams.push(startDate);
    }
    if (endDate) {
      queryStr += ' AND examination_date <= ?';
      countQueryStr += ' AND examination_date <= ?';
      params.push(endDate);
      countParams.push(endDate);
    }

    // Filter reporting status
    if (reportingStatus) {
      queryStr += ' AND reporting_status = ?';
      countQueryStr += ' AND reporting_status = ?';
      params.push(reportingStatus);
      countParams.push(reportingStatus);
    }

    // Filter diagnosis (general TB search)
    if (diagnosis) {
      queryStr += ' AND diagnosis LIKE ?';
      countQueryStr += ' AND diagnosis LIKE ?';
      params.push(`%${diagnosis}%`);
      countParams.push(`%${diagnosis}%`);
    }

    // Filter risk category
    if (riskCategory) {
      queryStr += ' AND risk_category = ?';
      countQueryStr += ' AND risk_category = ?';
      params.push(riskCategory);
      countParams.push(riskCategory);
    }

    // Count total rows for pagination
    const totalCountStmt = db.prepare(countQueryStr);
    const totalRows = totalCountStmt.get(...countParams).count;

    // Apply pagination and sorting
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryStr += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const getExams = db.prepare(queryStr);
    const examinations = getExams.all(...params);

    // Format examinations (decode JSON fields)
    const formattedExams = examinations.map(exam => ({
      ...exam,
      dicom_metadata: exam.dicom_metadata ? JSON.parse(exam.dicom_metadata) : null,
      validation_status: exam.validation_status ? JSON.parse(exam.validation_status) : null,
      pre_action_checklist: exam.pre_action_checklist ? JSON.parse(exam.pre_action_checklist) : null,
      post_action_checklist: exam.post_action_checklist ? JSON.parse(exam.post_action_checklist) : null
    }));

    res.json({
      data: formattedExams,
      pagination: {
        totalRows,
        totalPages: Math.ceil(totalRows / parseInt(limit)),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data pemeriksaan.' });
  }
});

// Get individual examination details
app.get('/api/examinations/:id', authenticateToken, (req, res) => {
  const examId = req.params.id;
  try {
    const getExam = db.prepare('SELECT * FROM examinations WHERE id = ?');
    const exam = getExam.get(examId);

    if (!exam) {
      return res.status(404).json({ message: 'Data pemeriksaan tidak ditemukan.' });
    }

    // Fetch related changes history from audit logs
    const getHistory = db.prepare(`
      SELECT username, role, activity, created_at 
      FROM audit_logs 
      WHERE affected_data LIKE ? 
      ORDER BY created_at DESC
    `);
    const history = getHistory.all(`%(${exam.patient_id})%`);

    const formattedExam = {
      ...exam,
      dicom_metadata: exam.dicom_metadata ? JSON.parse(exam.dicom_metadata) : null,
      validation_status: exam.validation_status ? JSON.parse(exam.validation_status) : null,
      pre_action_checklist: exam.pre_action_checklist ? JSON.parse(exam.pre_action_checklist) : null,
      post_action_checklist: exam.post_action_checklist ? JSON.parse(exam.post_action_checklist) : null,
      history
    };

    res.json(formattedExam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil detail pemeriksaan.' });
  }
});

// Upload DICOM metadata extract endpoint
app.post('/api/examinations/upload-dicom', authenticateToken, upload.single('dicomFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Berkas wajib diunggah.' });
  }

  try {
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.dcm') {
      const fileBuffer = fs.readFileSync(filePath);
      
      // Parse metadata using our shared parser
      const result = parseDicomMetadata(fileBuffer);

      if (!result.success) {
        // Clean up uploaded file if parsing fails
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: `Format biner file DICOM rusak atau tidak valid: ${result.error}` });
      }

      logActivity(req.user.username, req.user.role, `Mengunggah file DICOM: ${req.file.originalname}`, `File: ${req.file.filename}`, req.ip);

      // Convert DICOM to PNG for browser previewing
      const { execSync } = require('child_process');
      const pngPath = filePath.replace('.dcm', '.png');
      const scriptPath = path.join(__dirname, 'shared', 'convert_dicom.py');
      
      try {
        const stdout = execSync(`python "${scriptPath}" "${filePath}" "${pngPath}"`);
        console.log('DICOM to PNG conversion success:', stdout.toString());
      } catch (err) {
        console.error('Failed to convert DICOM to PNG:', err);
      }

      return res.json({
        message: 'DICOM berhasil diupload dan diekstrak.',
        filename: req.file.filename,
        filesize: req.file.size,
        filetype: 'dicom',
        metadata: result.metadata
      });
    } else {
      // It's a standard image (.jpg, .jpeg, .png)
      logActivity(req.user.username, req.user.role, `Mengunggah foto ronsen: ${req.file.originalname}`, `File: ${req.file.filename}`, req.ip);

      return res.json({
        message: 'Foto ronsen berhasil diunggah.',
        filename: req.file.filename,
        filesize: req.file.size,
        filetype: 'image',
        metadata: {
          patientName: null,
          patientId: null,
          patientSex: null,
          studyDate: null
        }
      });
    }
  } catch (error) {
    console.error(error);
    // Cleanup
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Gagal memproses berkas ronsen.' });
  }
});

// Check duplicate Patient ID
app.get('/api/examinations/check-id/:patientId', authenticateToken, (req, res) => {
  const patientId = req.params.patientId;
  try {
    const checkStmt = db.prepare('SELECT id, patient_name FROM examinations WHERE patient_id = ?');
    const existing = checkStmt.get(patientId);
    
    if (existing) {
      return res.json({ exists: true, patientName: existing.patient_name });
    }
    res.json({ exists: false });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memvalidasi ID pasien.' });
  }
});

// Create new examination
app.post('/api/examinations', authenticateToken, authorizeRoles('admin', 'radiographer'), (req, res) => {
  const {
    patient_id, patient_name, medical_record_number, phone_number, age, gender, fasyankes_origin,
    examination_date, diagnosis, risk_category, follow_up_status, additional_info,
    dicom_filename, dicom_filesize, dicom_metadata, validation_status,
    pre_action_checklist, post_action_checklist, queue_status, reporting_status
  } = req.body;

  if (!patient_id || !patient_name || !medical_record_number || !age || !gender || !fasyankes_origin || !examination_date) {
    return res.status(400).json({ message: 'Data identitas pasien wajib diisi secara lengkap.' });
  }

  try {
    // Check duplication
    const checkDup = db.prepare('SELECT id FROM examinations WHERE patient_id = ?');
    if (checkDup.get(patient_id)) {
      return res.status(400).json({ message: `ID Pasien ${patient_id} sudah terdaftar dalam sistem.` });
    }

    const insertStmt = db.prepare(`
      INSERT INTO examinations (
        patient_id, patient_name, medical_record_number, phone_number, age, gender, fasyankes_origin,
        examination_date, diagnosis, risk_category, follow_up_status, radiographer_name, additional_info,
        dicom_filename, dicom_filesize, dicom_metadata, validation_status,
        pre_action_checklist, post_action_checklist, queue_status, reporting_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      patient_id,
      patient_name,
      medical_record_number,
      phone_number || null,
      parseInt(age),
      gender,
      fasyankes_origin,
      examination_date,
      diagnosis || 'Menunggu Tindakan Radiografer',
      risk_category || 'Rendah',
      follow_up_status || 'Tidak Ada Tindak Lanjut',
      req.user.name,
      additional_info || null,
      dicom_filename || null,
      dicom_filesize ? parseInt(dicom_filesize) : null,
      dicom_metadata ? JSON.stringify(dicom_metadata) : null,
      validation_status ? JSON.stringify(validation_status) : null,
      pre_action_checklist ? JSON.stringify(pre_action_checklist) : null,
      post_action_checklist ? JSON.stringify(post_action_checklist) : null,
      queue_status || (dicom_filename ? 'Selesai' : 'Menunggu Tindakan'),
      reporting_status || (dicom_filename ? 'Sudah Dilaporkan' : 'Belum Dilaporkan')
    );

    logActivity(
      req.user.username,
      req.user.role,
      `Menambahkan pemeriksaan baru`,
      `${patient_name} (${patient_id})`,
      req.ip
    );

    res.status(201).json({
      message: 'Data pemeriksaan berhasil disimpan.',
      examinationId: result.lastInsertRowid
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menyimpan data pemeriksaan.' });
  }
});

// Update examination
app.put('/api/examinations/:id', authenticateToken, authorizeRoles('admin', 'radiographer'), (req, res) => {
  const examId = req.params.id;
  const {
    patient_name, medical_record_number, phone_number, age, gender, fasyankes_origin,
    examination_date, diagnosis, risk_category, follow_up_status, additional_info,
    dicom_filename, dicom_filesize, dicom_metadata, validation_status,
    pre_action_checklist, post_action_checklist, queue_status, reporting_status
  } = req.body;

  try {
    const getExam = db.prepare('SELECT * FROM examinations WHERE id = ?');
    const exam = getExam.get(examId);

    if (!exam) {
      return res.status(404).json({ message: 'Data pemeriksaan tidak ditemukan.' });
    }

    const updateStmt = db.prepare(`
      UPDATE examinations
      SET patient_name = ?, medical_record_number = ?, phone_number = ?, age = ?, gender = ?, fasyankes_origin = ?,
          examination_date = ?, diagnosis = ?, risk_category = ?, follow_up_status = ?, additional_info = ?,
          dicom_filename = ?, dicom_filesize = ?, dicom_metadata = ?, validation_status = ?,
          pre_action_checklist = ?, post_action_checklist = ?, queue_status = ?, reporting_status = ?,
          radiographer_name = CASE WHEN ? = 'radiographer' THEN ? ELSE radiographer_name END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(
      patient_name,
      medical_record_number,
      phone_number || null,
      parseInt(age),
      gender,
      fasyankes_origin,
      examination_date,
      diagnosis,
      risk_category,
      follow_up_status,
      additional_info || null,
      dicom_filename !== undefined ? dicom_filename : exam.dicom_filename,
      dicom_filesize !== undefined ? (dicom_filesize ? parseInt(dicom_filesize) : null) : exam.dicom_filesize,
      dicom_metadata !== undefined ? (dicom_metadata ? JSON.stringify(dicom_metadata) : null) : exam.dicom_metadata,
      validation_status !== undefined ? (validation_status ? JSON.stringify(validation_status) : null) : exam.validation_status,
      pre_action_checklist !== undefined ? (pre_action_checklist ? JSON.stringify(pre_action_checklist) : null) : exam.pre_action_checklist,
      post_action_checklist !== undefined ? (post_action_checklist ? JSON.stringify(post_action_checklist) : null) : exam.post_action_checklist,
      queue_status || exam.queue_status,
      reporting_status || exam.reporting_status,
      req.user.role,
      req.user.name,
      examId
    );

    logActivity(
      req.user.username,
      req.user.role,
      `Mengubah data pemeriksaan`,
      `${patient_name} (${exam.patient_id})`,
      req.ip
    );

    res.json({ message: 'Data pemeriksaan berhasil diubah.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengubah data pemeriksaan.' });
  }
});

// Delete examination (Admin Only)
app.delete('/api/examinations/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const examId = req.params.id;

  try {
    const getExam = db.prepare('SELECT patient_id, patient_name, dicom_filename FROM examinations WHERE id = ?');
    const exam = getExam.get(examId);

    if (!exam) {
      return res.status(404).json({ message: 'Data pemeriksaan tidak ditemukan.' });
    }

    // Delete DICOM file from disk if exists
    if (exam.dicom_filename) {
      const fileDiskPath = path.join(uploadsDir, exam.dicom_filename);
      if (fs.existsSync(fileDiskPath)) {
        fs.unlinkSync(fileDiskPath);
      }
    }

    const deleteStmt = db.prepare('DELETE FROM examinations WHERE id = ?');
    deleteStmt.run(examId);

    logActivity(
      req.user.username,
      req.user.role,
      `Menghapus data pemeriksaan`,
      `${exam.patient_name} (${exam.patient_id})`,
      req.ip
    );

    res.json({ message: 'Data pemeriksaan berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus data pemeriksaan.' });
  }
});

// ==========================================
// 4. REPORTS API
// ==========================================

app.get('/api/reports/summary', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Summary counters
    const totalExam = db.prepare('SELECT COUNT(*) as count FROM examinations').get().count;
    const todayExam = db.prepare('SELECT COUNT(*) as count FROM examinations WHERE examination_date = ?').get(today).count;
    const monthExam = db.prepare('SELECT COUNT(*) as count FROM examinations WHERE examination_date >= ?').get(firstDayOfMonth).count;
    const unreportedExam = db.prepare("SELECT COUNT(*) as count FROM examinations WHERE reporting_status = 'Belum Dilaporkan'").get().count;
    const incompleteExam = db.prepare("SELECT COUNT(*) as count FROM examinations WHERE reporting_status = 'Data Belum Lengkap'").get().count;
    const reportedExam = db.prepare("SELECT COUNT(*) as count FROM examinations WHERE reporting_status = 'Sudah Dilaporkan'").get().count;

    // Trend by date for chart (last 60 days of examinations)
    const getTrend = db.prepare(`
      SELECT examination_date as date, COUNT(*) as count 
      FROM examinations 
      GROUP BY examination_date 
      ORDER BY examination_date DESC 
      LIMIT 60
    `);
    const trend = getTrend.all().reverse();

    // Risk category distribution
    const getRisk = db.prepare(`
      SELECT risk_category as category, COUNT(*) as count 
      FROM examinations 
      GROUP BY risk_category
    `);
    const riskData = getRisk.all();

    // Reporting status distribution
    const statusData = [
      { name: 'Belum Dilaporkan', value: unreportedExam },
      { name: 'Data Belum Lengkap', value: incompleteExam },
      { name: 'Sudah Dilaporkan', value: reportedExam }
    ];

    // Latest 5 examinations for dashboard table
    const getLatest = db.prepare(`
      SELECT id, patient_id, patient_name, age, gender, fasyankes_origin, examination_date, risk_category, reporting_status
      FROM examinations 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    const latest = getLatest.all();

    res.json({
      summary: {
        total: totalExam,
        today: todayExam,
        month: monthExam,
        unreported: unreportedExam,
        incomplete: incompleteExam,
        reported: reportedExam
      },
      charts: {
        trend,
        risk: riskData,
        status: statusData
      },
      latest: latest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memuat ringkasan laporan.' });
  }
});

// Get dynamic notification lists for topbar
app.get('/api/topbar/notifications', authenticateToken, (req, res) => {
  try {
    // 1. High risk + unreported patients count
    const highRiskUnreported = db.prepare(`
      SELECT COUNT(*) as count FROM examinations WHERE risk_category = 'Tinggi' AND reporting_status != 'Sudah Dilaporkan'
    `).get().count;

    // 2. Incomplete patients count
    const incompleteCount = db.prepare(`
      SELECT COUNT(*) as count FROM examinations WHERE reporting_status = 'Data Belum Lengkap'
    `).get().count;

    // 3. Latest audit log
    const latestLog = db.prepare(`
      SELECT username, activity, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 1
    `).get();

    // 4. Latest referred examinations as messages
    const latestExams = db.prepare(`
      SELECT id, patient_name, fasyankes_origin, created_at FROM examinations ORDER BY created_at DESC LIMIT 5
    `).all();

    res.json({
      highRiskUnreported,
      incompleteCount,
      latestLog: latestLog || null,
      latestExams
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memuat data notifikasi.' });
  }
});

// ==========================================
// 5. AUDIT TRAIL API (Admin Only)
// ==========================================

app.get('/api/audit-logs', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const getLogs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
    const logs = getLogs.all();
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data log aktivitas.' });
  }
});

// ==========================================
// 6. BACKUP & RESTORE API
// ==========================================

const tempDir = path.join(__dirname, 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
const uploadDb = multer({ dest: 'uploads/temp/' });

// Download database backup
app.get('/api/settings/backup', authenticateToken, (req, res) => {
  try {
    const dbFile = path.join(__dirname, 'radiologi_tb.db');
    // Log audit
    const insertLogStmt = db.prepare(`
      INSERT INTO audit_logs (username, role, activity, affected_data, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLogStmt.run(req.user.username, req.user.role, 'Mengunduh cadangan (backup) database', 'Database', req.ip || '127.0.0.1');

    res.download(dbFile, `backup_radiologi_tb_${Date.now()}.db`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengunduh cadangan database.' });
  }
});

// Restore database from backup file upload
app.post('/api/settings/restore', authenticateToken, uploadDb.single('database'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file cadangan yang diunggah.' });
  }
  const tempPath = req.file.path;
  try {
    // Attach database
    db.exec(`ATTACH DATABASE '${tempPath.replace(/\\/g, '/')}' AS backup`);
    
    // Clear current tables
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM examinations');
    db.exec('DELETE FROM audit_logs');
    
    // Restore data
    db.exec('INSERT INTO users SELECT * FROM backup.users');
    db.exec('INSERT INTO examinations SELECT * FROM backup.examinations');
    db.exec('INSERT INTO audit_logs SELECT * FROM backup.audit_logs');
    
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('DETACH DATABASE backup');
    
    // Log audit
    const insertLogStmt = db.prepare(`
      INSERT INTO audit_logs (username, role, activity, affected_data, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLogStmt.run(req.user.username, req.user.role, 'Melakukan pemulihan (restore) database', 'Database', req.ip || '127.0.0.1');

    // Delete temp file
    fs.unlinkSync(tempPath);
    
    res.json({ message: 'Database berhasil dipulihkan dari cadangan.' });
  } catch (error) {
    console.error(error);
    // Clean up temp file in case of error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    res.status(500).json({ message: 'Gagal memulihkan database: ' + error.message });
  }
});

// Clear all examinations data (Admin Only)
app.post('/api/settings/clear-data', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    db.exec('DELETE FROM examinations');
    
    // Log audit
    const insertLogStmt = db.prepare(`
      INSERT INTO audit_logs (username, role, activity, affected_data, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLogStmt.run(req.user.username, req.user.role, 'Mengosongkan semua data pemeriksaan pasien', 'Database', req.ip || '127.0.0.1');

    res.json({ message: 'Semua data pemeriksaan berhasil dihapus secara permanen.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus data: ' + error.message });
  }
});

// ==========================================
// 7. FRONTEND STATIC FILE HOSTING
// ==========================================

const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Server Radiologi TB berjalan. Frontend belum di-build.');
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
});

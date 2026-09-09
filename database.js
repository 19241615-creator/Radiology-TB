const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'radiologi_tb.db');
const db = new DatabaseSync(dbPath);

console.log(`Database initialized at: ${dbPath}`);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'radiographer', 'institution')),
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    profile_pic TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS examinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT UNIQUE NOT NULL,
    patient_name TEXT NOT NULL,
    medical_record_number TEXT NOT NULL,
    phone_number TEXT,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('L', 'P')),
    fasyankes_origin TEXT NOT NULL,
    examination_date TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    risk_category TEXT NOT NULL CHECK(risk_category IN ('Rendah', 'Sedang', 'Tinggi')),
    follow_up_status TEXT NOT NULL CHECK(follow_up_status IN ('Dirujuk TCM', 'Dirujuk BTA', 'Pemeriksaan Lanjutan', 'Tidak Ada Tindak Lanjut')),
    radiographer_name TEXT NOT NULL,
    additional_info TEXT,
    dicom_filename TEXT,
    dicom_filesize INTEGER,
    dicom_metadata TEXT, -- JSON String
    validation_status TEXT, -- JSON String
    pre_action_checklist TEXT, -- JSON String
    post_action_checklist TEXT, -- JSON String
    queue_status TEXT CHECK(queue_status IN ('Menunggu Tindakan', 'Sedang Diperiksa', 'Selesai')) DEFAULT 'Menunggu Tindakan',
    reporting_status TEXT NOT NULL CHECK(reporting_status IN ('Belum Dilaporkan', 'Data Belum Lengkap', 'Sudah Dilaporkan')) DEFAULT 'Belum Dilaporkan',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    activity TEXT NOT NULL,
    affected_data TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Function to seed initial data if empty
function seedDatabase() {
  const checkUserStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = checkUserStmt.get().count;

  if (userCount === 0) {
    console.log('Seeding database with default users...');
    const insertUserStmt = db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Admin user: admin / admin123
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    insertUserStmt.run('Administrator TB', 'admin', 'admin@tb-radiology.id', adminPasswordHash, 'admin', 'active');

    // Radiographer user: radiographer / radio123
    const radiographerPasswordHash = bcrypt.hashSync('radio123', 10);
    insertUserStmt.run('Medioker Radiografer', 'radiographer', 'radiographer@tb-radiology.id', radiographerPasswordHash, 'radiographer', 'active');

    // Institution user: institusi / institusi123
    const institutionPasswordHash = bcrypt.hashSync('institusi123', 10);
    insertUserStmt.run('Pimpinan Institusi & Faskes', 'institusi', 'institusi@tb-radiology.id', institutionPasswordHash, 'institution', 'active');

    console.log('Default users created:');
    console.log('- Admin: username "admin", password "admin123"');
    console.log('- Radiographer: username "radiographer", password "radio123"');
    console.log('- Institution: username "institusi", password "institusi123"');

    // Insert dummy examinations for dashboard graphs
    const insertExamStmt = db.prepare(`
      INSERT INTO examinations (
        patient_id, patient_name, medical_record_number, phone_number, age, gender, fasyankes_origin,
        examination_date, diagnosis, risk_category, follow_up_status, radiographer_name,
        reporting_status, queue_status, pre_action_checklist, post_action_checklist,
        dicom_filename, dicom_filesize, dicom_metadata, validation_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const dateToday = new Date().toISOString().split('T')[0];
    const dateYesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const dateLastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const defaultDicomMeta = JSON.stringify({
      patientId: 'P001',
      patientName: 'Budi Santoso',
      patientSex: 'L',
      studyDate: '2026-08-25'
    });

    const defaultValStatus = JSON.stringify({
      nameMatch: true,
      idMatch: true,
      genderMatch: true,
      dateMatch: true,
      isFullyValid: true
    });

    const defaultPreChecklist = JSON.stringify({
      id_confirmed: true,
      procedure_explained: true,
      metal_removed: true,
      pregnancy_screened: true
    });

    const defaultPostChecklist = JSON.stringify({
      image_quality_optimal: true,
      inspiration_adequate: true,
      no_motion_artifact: true,
      patient_stable: true
    });

    insertExamStmt.run(
      'P001', 'Budi Santoso', 'MRN-2026-001', '081234567890', 45, 'L', 'Puskesmas Gambir',
      dateLastWeek, 'TB Positif, infiltrat di apeks paru kanan', 'Tinggi', 'Dirujuk TCM', 'Medioker Radiografer',
      'Sudah Dilaporkan', 'Selesai', defaultPreChecklist, defaultPostChecklist,
      'dummy_budi.dcm', 5242880, defaultDicomMeta, defaultValStatus
    );

    insertExamStmt.run(
      'P002', 'Siti Rahma', 'MRN-2026-002', '085712345678', 32, 'P', 'Puskesmas Menteng',
      dateYesterday, 'Bercak fibrosis, suspect TB lama', 'Sedang', 'Pemeriksaan Lanjutan', 'Medioker Radiografer',
      'Belum Dilaporkan', 'Sedang Diperiksa', defaultPreChecklist, defaultPostChecklist,
      'dummy_siti.dcm', 5242880, defaultDicomMeta, defaultValStatus
    );

    insertExamStmt.run(
      'P003', 'Andi Wijaya', 'MRN-2026-003', '087898765432', 28, 'L', 'Puskesmas Senen',
      dateToday, 'Radiografi Thorax Normal', 'Rendah', 'Tidak Ada Tindak Lanjut', 'Medioker Radiografer',
      'Data Belum Lengkap', 'Menunggu Tindakan', defaultPreChecklist, defaultPostChecklist,
      null, null, null, null
    );

    // Seed audit logs
    const insertLogStmt = db.prepare(`
      INSERT INTO audit_logs (username, role, activity, affected_data, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLogStmt.run('admin', 'admin', 'Inisialisasi sistem & database', 'Sistem', '127.0.0.1');
    insertLogStmt.run('radiographer', 'radiographer', 'Menambahkan pemeriksaan P001', 'Budi Santoso (P001)', '127.0.0.1');
    insertLogStmt.run('radiographer', 'radiographer', 'Menambahkan pemeriksaan P002', 'Siti Rahma (P002)', '127.0.0.1');
    insertLogStmt.run('radiographer', 'radiographer', 'Menambahkan pemeriksaan P003', 'Andi Wijaya (P003)', '127.0.0.1');

    console.log('Dummy examinations and logs seeded successfully.');
  }
}

seedDatabase();

// Apply migrations to existing tables safely
try {
  db.exec("ALTER TABLE users ADD COLUMN profile_pic TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN phone_number TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN pre_action_checklist TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN post_action_checklist TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN queue_status TEXT DEFAULT 'Menunggu Tindakan'");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN examination_type TEXT DEFAULT 'Radiografi Thoraks (Thorax PA)'");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN referring_doctor TEXT DEFAULT 'dr. Sp.P / Tim TB'");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN sending_unit TEXT DEFAULT 'Poli TB / Paru'");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN film_usage TEXT DEFAULT 'Film 35x43 cm (1 Lembar)'");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN exposure_params TEXT DEFAULT '115 kV, 4 mAs, FFD 180 cm'");
} catch (e) {}

try {
  db.exec("ALTER TABLE examinations ADD COLUMN service_duration INTEGER DEFAULT 12");
} catch (e) {}

// Fill default values for existing rows if null
try {
  db.exec(`
    UPDATE examinations 
    SET 
      examination_type = COALESCE(examination_type, 'Radiografi Thoraks (Thorax PA)'),
      referring_doctor = COALESCE(referring_doctor, 'dr. Sp.P / Tim TB'),
      sending_unit = COALESCE(sending_unit, 'Poli TB / Paru'),
      film_usage = COALESCE(film_usage, 'Film 35x43 cm (1 Lembar)'),
      exposure_params = COALESCE(exposure_params, '115 kV, 4 mAs, FFD 180 cm'),
      service_duration = COALESCE(service_duration, 12)
    WHERE examination_type IS NULL OR referring_doctor IS NULL OR film_usage IS NULL
  `);
} catch (e) {}

// Ensure institution user exists in existing database
try {
  const checkInst = db.prepare("SELECT COUNT(*) as count FROM users WHERE username = 'institusi'").get();
  if (checkInst.count === 0) {
    const instPass = bcrypt.hashSync('institusi123', 10);
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Pimpinan Institusi & Faskes', 'institusi', 'institusi@tb-radiology.id', instPass, 'institution', 'active');
    console.log('Default institution user created: username "institusi", password "institusi123"');
  }
} catch (e) {
  console.error('Error ensuring institution user:', e);
}

module.exports = db;

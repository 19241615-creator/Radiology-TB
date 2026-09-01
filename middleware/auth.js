const jwt = require('jsonwebtoken');

const JWT_SECRET = 'tb-radiology-secret-key-2026';

/**
 * Middleware to verify JWT token and authenticate user
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token tidak valid atau kedaluwarsa.' });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware to check if user has required role
 * @param {string[]} allowedRoles 
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Hak akses tidak memadai untuk melakukan aksi ini.' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  JWT_SECRET
};

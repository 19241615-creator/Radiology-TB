const dicomParser = require('dicom-parser');

/**
 * Format date from DICOM YYYYMMDD to YYYY-MM-DD
 * @param {string} dateStr 
 * @returns {string|null}
 */
function formatDicomDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  if (cleaned.length === 8) {
    return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
  }
  return cleaned;
}

/**
 * Parse DICOM file Buffer and extract metadata
 * @param {Buffer} buffer 
 * @returns {object}
 */
function parseDicomMetadata(buffer) {
  try {
    const dataSet = dicomParser.parseDicom(buffer);

    // Extract tags
    const patientName = dataSet.string('x00100010');
    const patientId = dataSet.string('x00100020');
    const patientSex = dataSet.string('x00100040');
    const studyDate = dataSet.string('x00080020');

    // Clean gender value (DICOM standard is M, F, O)
    let gender = null;
    if (patientSex) {
      const g = patientSex.trim().toUpperCase();
      if (g === 'M' || g === 'L' || g === 'MALE' || g === 'LAKI-LAKI') {
        gender = 'L';
      } else if (g === 'F' || g === 'P' || g === 'FEMALE' || g === 'PEREMPUAN') {
        gender = 'P';
      } else {
        gender = g;
      }
    }

    return {
      success: true,
      metadata: {
        patientName: patientName ? patientName.replace(/\^/g, ' ').trim() : null, // DICOM names use ^ as delimiter
        patientId: patientId ? patientId.trim() : null,
        patientSex: gender,
        studyDate: studyDate ? formatDicomDate(studyDate) : null
      }
    };
  } catch (error) {
    console.error('Error parsing DICOM metadata:', error);
    return {
      success: false,
      error: error.message || 'Gagal mengurai file DICOM'
    };
  }
}

module.exports = {
  parseDicomMetadata
};

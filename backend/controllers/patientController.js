const patientService = require('../services/patientService');

const getPatients = async (req, res) => {
  try {
    const patients = await patientService.getAllPatients(req.query.search);
    res.status(200).json({ status: 'success', data: patients });
  } catch (error) {
    console.error('\n❌ ERROR GET PATIENTS:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const addPatient = async (req, res) => {
  try {
    const patient = await patientService.createPatient(req.body);
    res.status(201).json({ status: 'success', message: 'Pasien berhasil ditambahkan', data: patient });
  } catch (error) {
    console.error('\n❌ ERROR ADD PATIENT:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const updatePatient = async (req, res) => {
  try {
    const patient = await patientService.updatePatient(req.params.id, req.body);
    res.status(200).json({ status: 'success', message: 'Data pasien berhasil diperbarui', data: patient });
  } catch (error) {
    console.error('\n❌ ERROR UPDATE PATIENT:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const deletePatient = async (req, res) => {
  try {
    await patientService.deletePatient(req.params.id);
    res.status(200).json({ status: 'success', message: 'Data pasien berhasil dihapus' });
  } catch (error) {
    console.error('\n❌ ERROR DELETE PATIENT:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getPatients, addPatient, updatePatient, deletePatient };
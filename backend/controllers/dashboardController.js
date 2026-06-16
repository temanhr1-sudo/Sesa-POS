const dashboardService = require('../services/dashboardService');

const getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.status(200).json({ status: 'success', data: stats });
  } catch (error) {
    // INI YANG BIKIN TERMINALMU KOSONG KEMARIN! 
    // Kita paksa Node.js untuk berteriak di terminal jika ada error
    console.error('\n❌ ERROR DASHBOARD:', error.message, '\n');
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getStats };
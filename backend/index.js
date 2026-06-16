require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (Keep-alive ping)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Sesa POS Backend is running',
    timestamp: new Date()
  });
});

// Test Database Connection Endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW()');
    res.status(200).json({ 
      status: 'success', 
      message: 'Database connected successfully', 
      time: rows[0].now 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes'); 
const patientRoutes = require('./routes/patientRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const cashflowRoutes = require('./routes/cashflowRoutes');
const payableRoutes = require('./routes/payableRoutes');
const receivableRoutes = require('./routes/receivableRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes); 
app.use('/api/patients', patientRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/cashflow', cashflowRoutes);
app.use('/api/payables', payableRoutes);
app.use('/api/receivables', receivableRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shifts', shiftRoutes);
// PERBAIKAN DI SINI: Menambahkan huruf "s" menjadi /api/users
app.use('/api/users', userRoutes); 

// Handle 404
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: 'error', 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
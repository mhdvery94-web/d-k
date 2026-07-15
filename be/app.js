const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const postalCodeRoutes = require('./routes/postalCodeRoutes');
const checklistRoutes = require('./routes/checklistRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const shippingZoneRoutes = require('./routes/shippingZoneRoutes');
const settingRoutes = require('./routes/settingRoutes');
const pendingPaymentModel = require('./models/pendingPaymentModel');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Dapur Kemas API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/postal-code', postalCodeRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes.router);
app.use('/api/shipping-zones', shippingZoneRoutes);
app.use('/api/settings', settingRoutes);

function startPendingPaymentCron() {
  return cron.schedule('* * * * *', async () => {
    try {
      await pendingPaymentModel.expireOldPayments();
    } catch (error) {
      console.error('Failed to expire pending payments:', error.message);
    }
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

if (require.main === module) {
  startPendingPaymentCron();

  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '127.0.0.1';
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Dapur Kemas API server running on port ${PORT}`);
    console.log(`📍 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    process.exit(1);
  });
}

module.exports = app;
module.exports.startPendingPaymentCron = startPendingPaymentCron;

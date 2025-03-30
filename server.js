  const express = require('express');
  const cors = require('cors');
  const connectDB = require('./config/db');
  const userRoutes = require('./routes/user');
  require('dotenv').config();
  const ngrok = require('ngrok');
  const app = express();
  const { scheduleNotifications } = require('./services/notificationService'); // Adjust path
  // Middleware
  app.use(cors());
  app.use(express.json());

  // Connect to DB
  connectDB();

  // Routes
  app.use('/users', userRoutes);
  
  // Start notification scheduling
  scheduleNotifications();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, async() => {
      console.log(`Server running on port ${PORT}`)
      try {
          const url = await ngrok.connect(PORT);
          console.log(`🌍 ngrok Public URL: ${url}`);
          console.log(`🔗 Use this URL in your frontend: ${url}`);
        } catch (err) {
          console.error("❌ ngrok Error:", err);
        }
  });

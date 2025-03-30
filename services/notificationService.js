const { Expo } = require('expo-server-sdk');
const User = require('../models/User'); // Adjust path to your User model

// Create a new Expo SDK client
const expo = new Expo();

async function sendCalorieNotification() {
  try {
    // Fetch users with calorie goals and push tokens
    const users = await User.find({
      expoPushToken: { $exists: true, $ne: null },
      dailyCalorieGoal: { $exists: true }
    });

    const messages = [];
    for (let user of users) {
      const calories = user.dailyCalorieGoal || 0;
      
      // Check if calories are between 0 and 100
      if (calories > 0 && calories < 100) {
        if (!Expo.isExpoPushToken(user.expoPushToken)) {
          console.error(`Push token ${user.expoPushToken} is not a valid Expo push token`);
          continue;
        }

        messages.push({
          to: user.expoPushToken,
          sound: 'default',
          title: 'Calorie Alert',
          body: `Your daily calorie goal is low (${calories} kcal). Consider adjusting your plan!`,
          data: { type: 'calorie_alert', calories },
        });
      }
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    // Handle receipts (optional)
    const receiptIds = tickets
      .filter(ticket => ticket.status === 'ok')
      .map(ticket => ticket.id);

    if (receiptIds.length > 0) {
      const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
      Object.entries(receipts).forEach(([id, receipt]) => {
        if (receipt.status === 'error') {
          console.error(`Notification error for receipt ${id}:`, receipt.details);
        }
      });
    }

  } catch (error) {
    console.error('Error in sendCalorieNotification:', error);
  }
}

// Schedule this to run periodically (e.g., daily)
function scheduleNotifications() {
  // Run immediately and then every 24 hours
  sendCalorieNotification();
  setInterval(sendCalorieNotification, 24 * 60 * 60 * 1000);
}

module.exports = { sendCalorieNotification, scheduleNotifications };
const Employee = require('../models/EmpModel');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification to rider
 * @param {string} riderId - Rider's ID
 * @param {object} notification - Notification object { title, body, data }
 */
const sendPushNotificationToRider = async (riderId, notification) => {
    try {
        // Fetch rider's expo tokens
        const rider = await Employee.findById(riderId).select('tokens name email');

        if (!rider || !rider.tokens || rider.tokens.length === 0) {
            console.warn(`⚠️ No expo tokens found for rider ${riderId}`);
            return;
        }

        // Prepare push notifications
        const messages = rider.tokens.map(token => ({
            to: token,
            sound: 'default',
            title: notification.title || 'New Order',
            body: notification.body || 'You have a new order assignment',
            data: notification.data || {},
            badge: 1,
            priority: 'high'
        }));

        // Send to Expo using native fetch
        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages)
        });

        if (!response.ok) {
            throw new Error(`Expo API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Push notification sent to rider ${rider.name} (${riderId})`);
        return data;

    } catch (error) {
        console.error(`❌ Error sending push notification to rider ${riderId}:`, error.message);
    }
};

/**
 * Send order assignment push notification
 * @param {string} riderId - Rider's ID
 * @param {object} order - Order object
 */
const sendOrderAssignmentNotification = async (riderId, order) => {
    const notification = {
        title: '📦 New Order Assigned!',
        body: `Order #${order._id.toString().slice(-6)} - ₹${order.totalAmount}`,
        data: {
            orderId: order._id.toString(),
            action: 'order-assigned',
            shopName: order.shopId?.name || 'Unknown Shop',
            totalAmount: order.totalAmount
        }
    };

    await sendPushNotificationToRider(riderId, notification);
};

/**
 * Send order status update push notification
 * @param {string} riderId - Rider's ID
 * @param {object} order - Order object
 * @param {string} status - New order status
 */
const sendOrderStatusNotification = async (riderId, order, status) => {
    const statusMessages = {
        'confirmed': '✅ Order Confirmed',
        'out-for-delivery': '🚗 Out for Delivery',
        'delivered': '🎉 Order Delivered',
        'cancelled': '❌ Order Cancelled',
        'payment-confirmed': '💳 Payment Confirmed'
    };

    const notification = {
        title: statusMessages[status] || 'Order Updated',
        body: `Order #${order._id.toString().slice(-6)} status updated`,
        data: {
            orderId: order._id.toString(),
            action: 'order-updated',
            status: status
        }
    };

    await sendPushNotificationToRider(riderId, notification);
};

module.exports = {
    sendPushNotificationToRider,
    sendOrderAssignmentNotification,
    sendOrderStatusNotification
};

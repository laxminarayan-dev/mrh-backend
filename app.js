const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 8000;

const kpiData = [
    {
        title: "Today's Revenue",
        counts: "₹2,847",
        subTitle: "+12.5%",
        color: "text-stone-600",
        icon: "IndianRupee",
    },
    {
        title: "Orders Completed",
        counts: "47",
        subTitle: "+8.2%",
        color: "text-stone-600",
        icon: "ShoppingCart",
    },
    {
        title: "Customer Count",
        counts: "156",
        subTitle: "23 new",
        color: "text-stone-600",
        icon: "Users",
    },
];
const chartData = {
    cashFlow: [
        { day: "Mon", revenue: 350, expenses: 100 },
        { day: "Tue", revenue: 320, expenses: 250 },
        { day: "Wed", revenue: 280, expenses: 40 },
        { day: "Thu", revenue: 410, expenses: 230 },
        { day: "Fri", revenue: 650, expenses: 120 },
        { day: "Sat", revenue: 780, expenses: 430 },
        { day: "Sun", revenue: 710, expenses: 120 },
    ],
    topSelling: [
        { category: "Snacks", value: 400 },
        { category: "Main Course", value: 340 },
        { category: "Chaat", value: 300 },
        { category: "Chaat", value: 204 },
        { category: "Drinks", value: 200 },
        { category: "Drinks", value: 156 },
        { category: "Main Course", value: 150 },
    ],
};
const tablesData = {
    recentOrdersData: {
        thead: [
            "Order ID",
            "Customer Name",
            "Order Item",
            "Quantity",
            "Order Date & Time",
            "Amount",
            "Status",
            "Payment Method",
            "Delivered On & Time",
            "Actions",
        ],
        tbody: [
            {
                orderId: "101",
                customerName: "Alice Johnson",
                orderItem: "Chocolate Cake",
                quantity: 2,
                orderDateTime: "2025-06-10T14:30",
                amount: 1500,
                status: "Delivered",
                paymentMethod: "Credit Card",
                deliveredDateTime: "2025-06-12T10:00",
                actions: "",
            },
            {
                orderId: "102",
                customerName: "Bob Smith",
                orderItem: "Veg Pizza",
                quantity: 1,
                orderDateTime: "2025-06-12T09:15",
                amount: 2500,
                status: "Pending",
                paymentMethod: "Cash on Delivery",
                deliveredDateTime: "",
                actions: "",
            },
            {
                orderId: "103",
                customerName: "Charlie Lee",
                orderItem: "Pasta",
                quantity: 3,
                orderDateTime: "2025-06-15T16:45",
                amount: 1800,
                status: "Shipped",
                paymentMethod: "UPI",
                deliveredDateTime: "",
                actions: "",
            },
            {
                orderId: "104",
                customerName: "Diana Prince",
                orderItem: "Burger",
                quantity: 4,
                orderDateTime: "2025-06-18T11:00",
                amount: 3200,
                status: "Delivered",
                paymentMethod: "Net Banking",
                deliveredDateTime: "2025-06-20T13:20",
                actions: "",
            },
        ],
        fields: [
            {
                name: "customerName",
                label: "Customer Name",
                type: "text",
                required: true,
                placeholder: "Enter Customer Name",
            },
            {
                name: "orderItem",
                label: "Order Item",
                type: "text",
                required: true,
                placeholder: "Enter Item Name",
            },
            {
                name: "quantity",
                label: "Quantity",
                type: "number",
                required: true,
                min: "1",
                step: "1",
                placeholder: "Enter Quantity",
            },
            {
                name: "orderDateTime",
                label: "Order Date & Time",
                type: "datetime-local",
                required: true,
            },
            {
                name: "amount",
                label: "Amount",
                type: "number",
                required: true,
                placeholder: "0.00",
                step: "1",
                min: "0",
                prefix: "₹",
            },
            {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: ["Pending", "Shipped", "Delivered", "Cancelled"],
            },
            {
                name: "paymentMethod",
                label: "Payment Method",
                type: "select",
                required: true,
                options: ["Cash on Delivery", "Credit Card", "UPI", "Net Banking"],
            },
            {
                name: "deliveredDateTime",
                label: "Delivered On & Time",
                type: "datetime-local",
                required: false,
            },
        ],
    },
    recentTransactionsData: {
        thead: [
            "Transaction ID",
            "Payer/Recipient  Name",
            "Transaction Date & Time",
            "Amount",
            "Type",
            "Method",
            "Status",
            "Reference",
            "Actions",
        ],
        tbody: [
            {
                transactionId: "T001",
                userName: "Alice Johnson",
                transactionDateTime: "2025-06-10T14:45",
                amount: 1500,
                type: "Credit",
                method: "Credit Card",
                status: "Successful",
                reference: "INV-101",
                actions: "",
            },
            {
                transactionId: "T002",
                userName: "Bob Smith",
                transactionDateTime: "2025-06-12T10:30",
                amount: 2500,
                type: "Debit",
                method: "Cash",
                status: "Pending",
                reference: "ORD-102",
                actions: "",
            },
            {
                transactionId: "T003",
                userName: "Charlie Lee",
                transactionDateTime: "2025-06-15T17:00",
                amount: 1800,
                type: "Credit",
                method: "UPI",
                status: "Failed",
                reference: "ORD-103",
                actions: "",
            },
            {
                transactionId: "T004",
                userName: "Diana Prince",
                transactionDateTime: "2025-06-18T12:15",
                amount: 3200,
                type: "Credit",
                method: "Net Banking",
                status: "Successful",
                reference: "INV-104",
                actions: "",
            },
        ],
        fields: [
            {
                name: "userName",
                label: "Payer / Recipient  Name",
                type: "text",
                required: true,
                placeholder: "Enter Payer / Recipient Name",
            },
            {
                name: "transactionDateTime",
                label: "Transaction Date & Time",
                type: "datetime-local",
                required: true,
            },
            {
                name: "amount",
                label: "Amount",
                type: "number",
                required: true,
                placeholder: "0.00",
                step: "1",
                min: "0",
                prefix: "₹",
            },
            {
                name: "type",
                label: "Type",
                type: "select",
                required: true,
                options: ["Credit", "Debit"],
            },
            {
                name: "method",
                label: "Payment Method",
                type: "select",
                required: true,
                options: ["Cash", "Credit Card", "UPI", "Net Banking"],
            },
            {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: ["Successful", "Pending", "Failed"],
            },
            {
                name: "reference",
                label: "Reference",
                type: "text",
                required: false,
                placeholder: "Enter Reference (optional)",
            },
        ],
    }
}
const orderData = [
    {
        orderId: "101",
        customerName: "Alice Johnson",
        orderItem: "Chocolate Cake",
        quantity: 2,
        orderDateTime: "2025-06-10T14:30",
        amount: 1500,
        status: "Delivered",
        paymentMethod: "Credit Card",
        deliveredDateTime: "2025-06-12T10:00",

    },
    {
        orderId: "102",
        customerName: "Bob Smith",
        orderItem: "Veg Pizza",
        quantity: 1,
        orderDateTime: "2025-06-12T09:15",
        amount: 2500,
        status: "Pending",
        paymentMethod: "Cash on Delivery",
        deliveredDateTime: "",

    },
    {
        orderId: "103",
        customerName: "Charlie Lee",
        orderItem: "Pasta",
        quantity: 3,
        orderDateTime: "2025-06-15T16:45",
        amount: 1800,
        status: "Shipped",
        paymentMethod: "UPI",
        deliveredDateTime: "",

    },
    {
        orderId: "104",
        customerName: "Diana Prince",
        orderItem: "Burger",
        quantity: 4,
        orderDateTime: "2025-06-18T11:00",
        amount: 3200,
        status: "Delivered",
        paymentMethod: "Net Banking",
        deliveredDateTime: "2025-06-20T13:20",

    },
]

app.use(cors());
app.use(express.json())

app.post("/api/dashboard-data", (req, res) => {
    res.send({
        kpiData, chartData, tablesData
    })
})

app.post("/api/order/:orderId", (req, res) => {
    const orderId = req.params.orderId;
    const result = orderData.find(orders => orders.orderId == orderId)
    res.send(result)
})

app.get("*", (req, res) => {
    res.send(404);
})
app.post("*", (req, res) => {
    res.send(404);
})

app.listen(PORT, () => {
    console.log(`Server listining on port ${PORT}`);

})

🍔 QuickBites Restaurant Chatbot
A full-stack conversational restaurant ordering system with integrated payment processing using Paystack. Customers can browse the menu, place orders, and make payments through an intuitive chat interface.# restaurant-bot

✨ Features

🤖 Interactive Chat Interface: Conversational ordering experience
📋 Dynamic Menu System: Browse and select from available items
🛒 Shopping Cart Management: Add items, view current order, cancel orders
💳 Integrated Payments: Secure payment processing with Paystack
📜 Order History: View past orders and their status
🔄 Session Management: Maintains user state across interactions
📱 Responsive Design: Works on desktop and mobile devices

🛠️ Tech Stack
Backend

Node.js - JavaScript runtime
Express.js - Web framework
MongoDB - Database
Mongoose - MongoDB object modeling
Axios - HTTP client for API requests

Frontend

HTML5 - Markup
CSS3 - Styling
Vanilla JavaScript - Client-side interactions

Payment Integration

Paystack API - Payment processing

📁 Project Structure
restaurant-chatbot/
├── src/
│   ├── controllers/
│   │   └── chatController.js      # Chat logic and payment handling
│   ├── models/
│   │   ├── Item.js               # Menu item model
│   │   └── Session.js            # User session model
│   ├── routes/
│   │   ├── chatRoutes.js         # Chat endpoints
│   │   └── paystackRoutes.js     # Payment endpoints
│   ├── middleware/
│   │   └── sessionMiddleware.js  # Session management
│   ├── seedItems.js              # Database seeding script
│   └── server.js                 # Main application server
|   └── app.js                    # Express application
├── public/
│   ├── index.html               # Main chat interface
│   ├── chat.js                  # Frontend JavaScript
│   └── styles.css               # Styling
├── .env                         # Environment variables (not tracked)
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
🚀 Quick Start
Prerequisites

Node.js (v14 or higher)
MongoDB (local installation or MongoDB Atlas)
Paystack account for payment processing

Installation

Clone the repository

bash   git clone https://github.com/AkinwumiOyinkansola/restaurant-chatbot.git
   cd restaurant-chatbot

Install dependencies

bash   npm install

Set up environment variables
Create a .env file in the root directory:

env   # Database
   MONGODB_URI=mongodb://localhost:27017/restaurant-chatbot
   
   # Paystack Configuration
   PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key_here
   PAYSTACK_CALLBACK_URL=http://localhost:3000/paystack/callback
   
   # Server Configuration
   PORT=3000

Set up Paystack

Sign up at Paystack
Get your test secret key from Settings → API Keys & Webhooks
Replace sk_test_your_paystack_secret_key_here in your .env file


Seed the database

bash   node src/seedItems.js

Start the server

bash   node src/server.js

Open your browser
Navigate to http://localhost:3000

💬 How to Use
Customer Journey

Start Conversation

Visit the website to see the main menu options


Browse Menu

Type 1 to view available menu items
Each item shows name and price


Place Order

Type the item number to add to your cart
Items are automatically added with quantity


Manage Current Order

Type 97 to view current order
Type 0 to cancel current order


Checkout

Type 99 to place your order
System generates an order number


Make Payment

Type pay [order_number] (e.g., pay 4)
Click the "Pay with Paystack" button
Complete payment on Paystack's secure page


Order History

Type 98 to view all past orders and their status



Chat Commands
CommandAction1Browse menu items[number]Add item to cart (when viewing menu)97View current order99Checkout current order98View order history0Cancel current orderpay [order_number]Initiate payment for specific orderback or menuReturn to main menu
🔧 Configuration
Database Setup
Local MongoDB:
bash# Start MongoDB service
brew services start mongodb/brew/mongodb-community  # macOS
sudo systemctl start mongod                         # Linux
MongoDB Atlas (Cloud):

Create account at MongoDB Atlas
Create a cluster
Get connection string
Update MONGODB_URI in .env

Payment Configuration

Paystack Setup:

Create account at Paystack
Verify your business
Get API keys from Settings → API Keys & Webhooks


Test vs Live Environment:

env   # Test Environment
   PAYSTACK_SECRET_KEY=sk_test_...
   
   # Live Environment (for production)
   PAYSTACK_SECRET_KEY=sk_live_...
🔒 Security Features

Environment Variables: Sensitive data stored in .env file
Input Validation: User inputs are validated and sanitized
Secure Payments: All payments processed through Paystack's secure infrastructure
Session Management: Secure session handling with unique identifiers

🧪 Testing
Manual Testing

Test Order Flow:

   User Input: 1
   Expected: Menu display
   
   User Input: 1 (when viewing menu)
   Expected: Item added to cart
   
   User Input: 99
   Expected: Order placed with order number
   
   User Input: pay [order_number]
   Expected: Payment button appears

Test Payment Flow:

Use Paystack test cards
Test card: 4084084084084081
Any future expiry date
Any 3-digit CVV



Database Testing
bash# Check if items are seeded
node -e "
const mongoose = require('mongoose');
const Item = require('./src/models/Item');
mongoose.connect('mongodb://localhost:27017/restaurant-chatbot');
Item.find().then(items => {
  console.log('Menu items:', items.length);
  mongoose.disconnect();
});
"
🚀 Deployment
Environment Setup

Production Environment Variables:

env   NODE_ENV=production
   MONGODB_URI=your_production_mongodb_uri
   PAYSTACK_SECRET_KEY=sk_live_your_live_paystack_key
   PAYSTACK_CALLBACK_URL=https://yourdomain.com/paystack/callback
   PORT=process.env.PORT || 3000
Platform Deployment
Heroku:
bash# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set PAYSTACK_SECRET_KEY=your_paystack_key

# Deploy
git push heroku main
Railway/Render/Netlify:

Connect your GitHub repository
Set environment variables in dashboard
Deploy automatically on push

🛠️ Development
Adding New Features

New Menu Items:

Modify src/seedItems.js
Run seeding script: node src/seedItems.js


New Chat Commands:

Update src/controllers/chatController.js
Add command handling in the appropriate state


Payment Features:

Modify src/routes/paystackRoutes.js
Update frontend in public/chat.js



Database Schema
Item Model:
javascript{
  name: String,        // Item name
  basePrice: Number,   // Price in Naira
  category: String,    // Food category
  available: Boolean   // Availability status
}
Session Model:
javascript{
  userId: String,           // Unique user identifier
  state: String,           // Current chat state
  currentOrder: {          // Active order
    items: Array,
    total: Number
  },
  orders: Array,           // Order history
  __menuMap: Array        // Temporary menu mapping
}
📊 API Endpoints
Chat Endpoints

POST /chat - Main chat interface
GET / - Serve chat interface

Payment Endpoints

POST /paystack/init - Initialize payment
POST /paystack/verify - Verify payment
GET /paystack/callback - Payment callback handler

🤝 Contributing

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

Development Guidelines

Follow existing code style
Add comments for complex logic
Test your changes thoroughly
Update documentation as needed

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.
🙋‍♂️ Support
If you encounter any issues or have questions:

Check the Issues page
Create a new issue with detailed description
Include error messages and steps to reproduce

🚧 Roadmap

 User authentication system
 Admin dashboard for menu management
 Order tracking and notifications
 Multiple payment options
 Delivery tracking integration
 Mobile app development
 Analytics and reporting

👨‍💻 Author
Oyinkansola Akinwumi

GitHub: @AkinwumiOyinkansola
App is live @ https://restaurant-chatbot-b8bc.onrender.com/

🙏 Acknowledgments

Paystack for payment processing
MongoDB for database services
Express.js community for excellent documentation


Made with ❤️ for seamless restaurant ordering experiences

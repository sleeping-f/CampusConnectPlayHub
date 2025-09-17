# CampusConnectPlayHub 🎓

*Where campus life meets digital connection*

A comprehensive social platform designed specifically for university students. Think of it as your digital campus companion that helps you connect with friends, manage your schedule, study together, play games, and stay organized throughout your academic journey.

## What is CampusConnectPlayHub?

Imagine having a single platform where you can:
- **Find and connect** with fellow students across your campus
- **Manage your weekly routine** with smart scheduling and conflict detection
- **Create study groups** and collaborate with classmates
- **Play games** with friends during breaks
- **Chat in real-time** with your campus network
- **Get feedback** and report issues to improve the platform

That's exactly what CampusConnectPlayHub offers. It's built by students, for students, with the understanding that campus life is about more than just academics—it's about building lasting connections and making the most of your university experience.

## 🌟 Features That Matter

### 👥 **Friend Management**
- Search for students by name, email, or campus ID
- Send and manage friend requests
- View detailed friend profiles
- Build your campus network organically

### 📅 **Smart Routine Management**
- Create weekly schedules with different activity types (classes, study, breaks, activities)
- Visual timeline view for each day
- Time conflict detection to prevent scheduling issues
- Easy-to-use interface for busy students

### 📚 **Study Groups**
- Create or join study groups for any subject
- Manage group members and roles
- Find study partners for specific courses
- Collaborate effectively with classmates

### 🎮 **Campus Gaming**
- Play Tic-Tac-Toe and Rock Paper Scissors with friends
- Create private game rooms with unique codes
- Track your gaming statistics and win rates
- Compete on leaderboards
- More games coming soon!

### 💬 **Real-Time Chat**
- Direct messaging with friends
- Clean, modern chat interface
- Message history and timestamps
- Easy friend discovery for starting conversations

### 🔔 **Notifications System**
- Get notified about friend requests
- Stay updated on study group activities
- Never miss important campus connections

### 🛠️ **Admin Tools**
- Comprehensive admin console for platform management
- Feedback and bug report management
- User support and platform maintenance

## 🚀 Getting Started

### Prerequisites
Before you begin, make sure you have:
- **Node.js** (version 16 or higher)
- **MySQL** (version 8.0 or higher)
- **npm** or **yarn** package manager
- A **Google Cloud Console** account (for OAuth login)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CampusConnectPlayHub
   ```

2. **Set up the database**
   ```sql
   CREATE DATABASE campus_connect;
   ```

3. **Configure environment variables**
   
   **Backend setup:**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `backend/.env` with your configuration:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=campus_connect
   JWT_SECRET=your_super_secret_jwt_key_here
   GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

   **Frontend setup:**
   ```bash
   # In the root directory
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
   REACT_APP_API_URL=http://localhost:5000
   ```

4. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies (from root directory)
   cd ..
   npm install
   ```

5. **Set up Google OAuth** (Optional but recommended)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add `http://localhost:3000` to authorized origins
   - Copy the Client ID to both environment files

6. **Start the application**
   ```bash
   # Start the backend server
   cd backend
   npm start
   
   # In a new terminal, start the frontend
   cd ..
   npm start
   ```

7. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 🎯 How to Use

### For Students

1. **Sign Up**: Create an account with your campus email and student ID
2. **Complete Your Profile**: Add your department and any additional information
3. **Find Friends**: Use the search feature to connect with classmates
4. **Set Up Your Routine**: Add your weekly schedule including classes, study time, and activities
5. **Join Study Groups**: Find or create study groups for your courses
6. **Play Games**: Challenge friends to games during your free time
7. **Stay Connected**: Use the chat feature to communicate with your campus network

### For Administrators

1. **Access Admin Console**: Log in with admin credentials
2. **Manage Feedback**: Review and respond to user feedback
3. **Handle Bug Reports**: Track and manage reported issues
4. **Monitor Platform**: Keep the platform running smoothly

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework for responsive interfaces
- **React Router** - Seamless navigation between features
- **Framer Motion** - Smooth animations and transitions
- **React Icons** - Consistent iconography throughout the app
- **Axios** - Reliable HTTP client for API communication
- **React Hot Toast** - User-friendly notifications

### Backend
- **Node.js** - JavaScript runtime for server-side development
- **Express.js** - Fast, unopinionated web framework
- **MySQL2** - Robust database driver for MySQL
- **JWT** - Secure authentication tokens
- **bcryptjs** - Password hashing for security
- **Google Auth Library** - OAuth integration for easy login

### Database
- **MySQL** - Relational database for structured data storage

## 📁 Project Structure

```
CampusConnectPlayHub/
├── public/                 # Static files and assets
├── src/
│   ├── components/        # React components
│   │   ├── auth/          # Authentication components
│   │   ├── common/        # Shared components
│   │   └── features/      # Main feature components
│   ├── contexts/          # React context providers
│   └── App.js             # Main application component
├── backend/
│   ├── routes/            # API route handlers
│   ├── uploads/           # File upload storage
│   ├── server.js          # Express server setup
│   └── package.json       # Backend dependencies
└── package.json           # Frontend dependencies
```

## 🔧 API Overview

The platform provides a comprehensive REST API:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user info

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/search` - Search for users

### Friends
- `POST /api/friends/request` - Send friend request
- `PUT /api/friends/respond` - Accept/reject friend request
- `GET /api/friends` - Get friends list
- `GET /api/friends/pending` - Get pending requests

### Routines
- `GET /api/routines` - Get user routines
- `POST /api/routines` - Create routine
- `PUT /api/routines/:id` - Update routine
- `DELETE /api/routines/:id` - Delete routine

### Study Groups
- `GET /api/study-groups` - Get all study groups
- `POST /api/study-groups` - Create study group
- `POST /api/study-groups/:id/join` - Join study group
- `POST /api/study-groups/:id/leave` - Leave study group

### Gaming
- `GET /api/games` - Get available games
- `POST /api/games/rooms` - Create game room
- `POST /api/games/rooms/:code/join` - Join game room
- `GET /api/games/statistics` - Get user game stats

### Chat
- `GET /api/chat/rooms` - Get chat rooms
- `POST /api/chat/rooms` - Create chat room
- `GET /api/chat/rooms/:id/messages` - Get messages
- `POST /api/chat/rooms/:id/messages` - Send message

## 🎨 Design Philosophy

CampusConnectPlayHub is designed with students in mind:

- **Dark Theme**: Easy on the eyes during late-night study sessions
- **Modern UI**: Clean, intuitive interface that doesn't get in your way
- **Smooth Animations**: Delightful interactions that make the app feel alive
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Accessibility**: Built with all students in mind, regardless of ability

## 🔒 Security & Privacy

Your data and privacy are important to us:

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: All passwords are securely hashed using bcrypt
- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Protection against abuse and spam
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Helmet.js**: Security headers for additional protection

## 🚧 Development Roadmap

### ✅ **Completed Features**
- User authentication and registration
- Friend management system
- Routine scheduling and management
- Study group creation and management
- Basic gaming platform (Tic-Tac-Toe, Rock Paper Scissors)
- Real-time chat system
- Admin console for platform management
- Feedback and bug reporting system

### 🔄 **In Development**
- Enhanced gaming features
- Mobile app development
- Advanced notification system
- Study group collaboration tools

### 📋 **Future Plans**
- Food ordering integration
- Campus event management
- Housing finder feature
- Advanced analytics dashboard
- Integration with university systems

## 🤝 Contributing

We welcome contributions from the campus community! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style and patterns
- Write clear, descriptive commit messages
- Test your changes thoroughly
- Update documentation as needed
- Be respectful and inclusive in all interactions

## 🐛 Troubleshooting

### Common Issues

**Database Connection Problems**
- Ensure MySQL is running
- Check your database credentials in `.env`
- Verify the database exists

**Authentication Issues**
- Check your JWT secret is set correctly
- Ensure Google OAuth credentials are properly configured
- Clear browser cache and cookies

**Frontend Not Loading**
- Verify all dependencies are installed (`npm install`)
- Check that the backend server is running
- Ensure no port conflicts (3000 for frontend, 5000 for backend)

**File Upload Issues**
- Check that the uploads directory exists
- Verify file size limits (2MB for profile images)
- Ensure proper file permissions

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Review the server logs for backend errors
3. Ensure all environment variables are set correctly
4. Try restarting both frontend and backend servers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the campus community
- Inspired by the need for better student connection tools
- Thanks to all the students who provided feedback and suggestions
- Special thanks to the open-source community for the amazing tools we use

---

**Ready to connect with your campus?** Start by creating your account and exploring all the features CampusConnectPlayHub has to offer. Your university experience is about to get a whole lot more connected! 🎓✨
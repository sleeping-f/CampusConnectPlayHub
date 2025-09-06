# CampusConnectPlayHub 🎓🎮

After cloning

-rename both exampl.env to .env

-cd backend

-npm install

-npm start

-in another terminal npm install

-npm start


A comprehensive campus social platform that connects students through food, gaming, academics, and social activities.

## 🌟 Features

### 🔐 Authentication & User Management
- **Role-based login system** (Student, Faculty, Staff, Admin)
- **Google OAuth integration**
- **Secure JWT authentication**
- **Profile management with edit capabilities**

### 👥 Social Features
- **Friend System** with request/accept/reject functionality
- **Real-time notifications** for all activities
- **User search and discovery**
- **Profile customization**

### 📅 Routine Management
- **Weekly schedule management**
- **Time conflict detection**
- **Routine matching with friends**
- **Free time slot calculation**
- **Visual weekly overview**

### 🍕 Food System (Coming Soon)
- **Khabar Dabar Pre-Order**
- **Get a Happy Meal** (Student food selling)
- **Food Buddy Finder**

### 🎮 Gaming & Entertainment (Coming Soon)
- **Arcade of the Day**
- **Mini Tournaments**
- **Achievements and Badges**
- **Campus Coin System**
- **Leaderboards**

### 📚 Academic Features (Coming Soon)
- **Study Group Roulette**
- **Daily Quizzes**
- **Peer Mentorship**
- **Book Resource Sharing**

### 🏠 Housing (Coming Soon)
- **Roommate Finder**
- **Housing Management**

### 💬 Communication (Coming Soon)
- **Real-time Chat**
- **Group Chat Rooms**

### 📝 Feedback System (Coming Soon)
- **Anonymous feedback**
- **Bug reporting**
- **Feature requests**

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn
- Google Cloud Console account (for OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CampusConnectPlayHub
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Set up MySQL database**
   ```sql
   CREATE DATABASE campus_connect;
   ```

5. **Configure environment variables**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database and JWT settings
   
   # Frontend environment
   cp frontend.env.example .env
   # Edit .env with your Google OAuth client ID
   ```
   
   Backend `.env` configuration:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=campus_connect
   JWT_SECRET=your_super_secret_jwt_key_here
   GOOGLE_CLIENT_ID=your_google_client_id_here
   ```
   
   Frontend `.env` configuration:
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
   REACT_APP_API_URL=http://localhost:5000
   ```

6. **Set up Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Set application type to "Web application"
   - Add authorized JavaScript origins: `http://localhost:3000`
   - Add authorized redirect URIs: `http://localhost:3000`
   - Copy the Client ID and add it to both backend and frontend `.env` files
   GOOGLE_CLIENT_ID=your_google_client_id
   ```

6. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

7. **Start the frontend development server**
   ```bash
   # In root directory
   npm start
   ```

8. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Framer Motion** - Animations
- **React Icons** - Icon library
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - Database driver
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Google Auth Library** - OAuth integration

### Database
- **MySQL** - Relational database

## 📁 Project Structure

```
CampusConnectPlayHub/
├── public/                 # Static files
├── src/
│   ├── components/        # React components
│   │   ├── auth/          # Authentication components
│   │   └── features/      # Dashboard components
│   ├── contexts/          # React contexts
│   └── App.js             # Main app component
├── backend/
│   ├── routes/            # API routes
│   ├── server.js          # Express server
│   └── package.json       # Backend dependencies
└── package.json           # Frontend dependencies
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/search` - Search users
- `POST /api/users/friends/request` - Send friend request
- `PUT /api/users/friends/respond` - Accept/reject friend request
- `GET /api/users/friends` - Get friends list

### Routines
- `GET /api/routines` - Get user routines
- `POST /api/routines` - Create routine
- `PUT /api/routines/:id` - Update routine
- `DELETE /api/routines/:id` - Delete routine
- `GET /api/routines/matches/friends` - Find routine matches

## 🎨 Design Features

- **Modern UI/UX** with smooth animations
- **Responsive design** for all devices
- **Abstract background** with floating shapes
- **Gradient color schemes**
- **Clean typography** using Inter and Poppins fonts
- **Interactive elements** with hover effects

## 🔒 Security Features

- **JWT token authentication**
- **Password hashing** with bcrypt
- **Input validation** and sanitization
- **Rate limiting** to prevent abuse
- **CORS configuration**
- **Helmet.js** for security headers

## 🚧 Development Roadmap

### Phase 1 ✅ (Current)
- [x] Authentication system
- [x] User profiles
- [x] Friend system
- [x] Routine management
- [x] Basic dashboard

### Phase 2 🔄 (In Progress)
- [ ] Food ordering system
- [ ] Gaming features
- [ ] Study group functionality
- [ ] Real-time notifications

### Phase 3 📋 (Planned)
- [ ] Chat system
- [ ] Housing finder
- [ ] Advanced analytics
- [ ] Mobile app

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🙏 Acknowledgments

- React team for the amazing framework
- Express.js community for the robust backend framework
- MySQL team for the reliable database
- All contributors and testers

---

**Made with ❤️ for the campus community**



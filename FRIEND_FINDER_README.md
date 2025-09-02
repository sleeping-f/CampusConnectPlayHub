# Friend Finder Feature

A comprehensive friend management system for CampusConnectPlayHub that allows users to find, connect, and manage friendships with other students.

## Features

### 🔍 Find Friends
- **Multi-field Search**: Search by name, student ID, or email
- **Smart Filtering**: Automatically excludes current user and existing friends
- **Real-time Results**: Instant search results with beautiful user cards

### 👥 Friend Management
- **Send Friend Requests**: One-click friend request sending
- **Accept/Reject Requests**: Manage incoming friend requests
- **View Friends List**: See all your accepted friends
- **Remove Friends**: Unfriend users when needed

### 🎨 Modern UI/UX
- **Slick Design**: Beautiful gradient backgrounds and smooth animations
- **Responsive Layout**: Works perfectly on all device sizes
- **Tab Navigation**: Organized into Search, Friends, and Requests tabs
- **Smooth Animations**: Framer Motion powered transitions

## Setup Instructions

### 1. Backend Setup

The backend already includes all necessary endpoints:
- `GET /api/users/search` - Search for users
- `POST /api/users/friends/request` - Send friend request
- `PUT /api/users/friends/respond` - Accept/reject friend request
- `GET /api/users/friends` - Get friends list
- `GET /api/users/friends/pending` - Get pending requests
- `DELETE /api/users/friends/:friendId` - Remove friend

### 2. Database Setup

The database tables are automatically created when the server starts:
- `users` - User profiles and information
- `friends` - Friend relationships and requests
- `notifications` - Friend request notifications

### 3. Seed Sample Data

To test the feature with sample users, run:

```bash
cd backend
npm run seed
```

This will create 10 sample users with credentials:
- **Email**: john.doe@university.edu
- **Password**: password123

### 4. Frontend Integration

The FriendFinder component is already integrated into the Dashboard:
- Added as a new "Friends" tab
- Accessible from the sidebar navigation
- Quick action button in the sidebar

## Usage

### Finding Friends
1. Navigate to the "Friends" tab in the Dashboard
2. Use the search bar to find users by name, student ID, or email
3. Click "Add Friend" on any user card to send a request

### Managing Requests
1. Check the "Requests" tab for incoming friend requests
2. Click "Accept" or "Reject" to respond
3. Accepted requests automatically move to your friends list

### Managing Friends
1. View all friends in the "My Friends" tab
2. Use the remove button (X) to unfriend users
3. See friend count in the tab navigation

## Technical Details

### Frontend Components
- `FriendFinder.js` - Main component with tab navigation
- `FriendFinder.css` - Modern, responsive styling
- Integrated with existing Dashboard component

### Backend Features
- JWT authentication for all endpoints
- Input validation and sanitization
- Efficient database queries with proper indexing
- Notification system for friend requests

### Search Algorithm
- Multi-field search across firstName, lastName, email, and studentId
- Case-insensitive matching with LIKE queries
- Automatic exclusion of current user and existing friends
- Pagination support for large result sets

## Styling Features

### Modern Design Elements
- **Gradient Backgrounds**: Beautiful color transitions
- **Glassmorphism**: Translucent cards with backdrop blur
- **Smooth Animations**: Hover effects and transitions
- **Responsive Grid**: Adaptive layout for all screen sizes

### Color Scheme
- **Primary**: Blue gradient (#667eea to #764ba2)
- **Success**: Green gradient (#10b981 to #059669)
- **Danger**: Red gradient (#ef4444 to #dc2626)
- **Neutral**: Gray tones for text and borders

### Animation Features
- **Framer Motion**: Smooth page transitions
- **Hover Effects**: Interactive button and card animations
- **Loading States**: Spinner animations for search operations
- **Tab Transitions**: Smooth content switching

## Browser Support

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+
- **Mobile**: iOS Safari 13+, Chrome Mobile 80+
- **Features**: CSS Grid, Flexbox, CSS Variables, Backdrop Filter

## Future Enhancements

- **Friend Suggestions**: AI-powered friend recommendations
- **Group Chats**: Create study groups with friends
- **Activity Feed**: See what friends are up to
- **Location Sharing**: Find friends on campus
- **Study Sessions**: Schedule study sessions with friends

## Troubleshooting

### Common Issues
1. **Search not working**: Check if backend is running and database is connected
2. **Friend requests not showing**: Verify JWT token is valid
3. **Styling issues**: Ensure all CSS files are properly imported

### Debug Mode
Enable debug logging in the backend by setting:
```bash
NODE_ENV=development
```

## Contributing

To add new features to the friend finder:
1. Update the backend routes in `backend/routes/users.js`
2. Modify the frontend component in `src/components/features/FriendFinder.js`
3. Update styling in `src/components/features/FriendFinder.css`
4. Test thoroughly with different user scenarios

---

**Note**: This feature requires a running MySQL database and proper environment configuration. See the main README for database setup instructions.

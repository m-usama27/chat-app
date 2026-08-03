# MernChat - Instant Messaging Web Application

A full-stack instant messaging application built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

- **User Authentication** - Register and login with JWT tokens
- **Create Profile** - Set display name, bio, and avatar
- **Instant Messaging** - Real-time chat with other users
- **User Search** - Find users by username or display name
- **Conversation List** - View all your active conversations
- **Message History** - Full message history with date separators
- **Profile Management** - Update your profile anytime
- **Responsive Design** - Works on desktop and mobile
- **Clean UI** - Built with shadcn/ui components and Tailwind CSS

## Tech Stack

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logging
- **express-validator** - Input validation

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Radix UI** - Primitives
- **Axios** - HTTP client
- **lucide-react** - Icons

## Project Structure

```
test/
├── package.json              # Root package with dev scripts
├── .gitignore
├── README.md
├── server/                   # Backend
│   ├── package.json
│   ├── .env                  # Environment variables
│   ├── .env.example
│   ├── server.js             # Express app entry point
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── models/
│   │   ├── User.js           # User model
│   │   └── Message.js        # Message model
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── messageController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   └── messageRoutes.js
│   └── middleware/
│       ├── auth.js           # JWT auth middleware
│       └── errorHandler.js  # Error handling
└── client/                   # Frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── components.json
    ├── index.html
    └── src/
        ├── main.jsx          # React entry
        ├── App.jsx           # Root component
        ├── index.css         # Tailwind + theme
        ├── lib/
        │   └── utils.js      # Utility functions
        ├── services/
        │   └── api.js        # Axios API client
        ├── context/
        │   └── AppContext.jsx # Global state
        ├── components/
        │   ├── ui/           # shadcn components
        │   ├── AuthPage.jsx
        │   ├── Sidebar.jsx
        │   ├── ChatList.jsx
        │   ├── ChatWindow.jsx
        │   ├── MessageInput.jsx
        │   ├── ProfileModal.jsx
        │   └── UserAvatar.jsx
        └── pages/
            └── Home.jsx
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Configure your MongoDB connection string in `server/.env`:
```
MONGODB_URI=mongodb://localhost:27017/mern-chat
```
For MongoDB Atlas, use:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mern-chat
```

3. Start both server and client in development mode:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client concurrently |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run install:all` | Install all dependencies |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server |

## API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/profile` - Update profile
- `GET /api/users/search?q=` - Search users

### Messages
- `POST /api/messages` - Send a message
- `GET /api/messages/:userId` - Get conversation
- `GET /api/messages/conversations` - Get all conversations
- `PUT /api/messages/:userId/read` - Mark messages as read

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/mern-chat` |
| `JWT_SECRET` | JWT signing secret | - |
| `CLIENT_URL` | CORS origin URL | `http://localhost:5173` |
| `NODE_ENV` | Environment | `development` |

## License

MIT
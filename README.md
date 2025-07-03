# E-Voting System

A secure, transparent, and accessible electronic voting platform built with Node.js, Express, SQLite, and modern web technologies.

## 🚀 Features

### For Voters
- **Secure Registration & Authentication**: JWT-based authentication with password hashing
- **Election Browsing**: View all available elections with real-time status
- **Secure Voting**: Cast votes with unique vote hashes for verification
- **Vote Verification**: Verify your vote anytime using vote hashes
- **Voting History**: Track all your past votes
- **Profile Management**: Update personal information

### For Administrators
- **Dashboard**: Real-time system statistics and overview
- **Election Management**: Create, edit, and manage elections
- **Candidate Management**: Add and manage candidates for elections
- **Voter Management**: Verify voters and manage user accounts
- **Results Management**: View and analyze election results
- **System Monitoring**: Track voting patterns and system usage

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt encryption for passwords
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive form validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Protection**: Cross-origin request security
- **Helmet Security**: HTTP header security

## 🛠️ Technology Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **SQLite**: Lightweight database
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **express-validator**: Input validation
- **helmet**: Security middleware
- **cors**: Cross-origin resource sharing

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with gradients and animations
- **JavaScript (ES6+)**: Modern JavaScript with classes and async/await
- **Bootstrap 5**: Responsive UI framework
- **Font Awesome**: Icon library

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd e-voting-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   # Create .env file with the following content:
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - Default admin credentials:
     - Username: `admin`
     - Password: `admin123`

## 📁 Project Structure

```
e-voting-system/
├── public/                 # Frontend static files
│   ├── index.html         # Main HTML file
│   ├── styles.css         # Custom CSS styles
│   └── app.js            # Frontend JavaScript
├── routes/                # API routes
│   ├── auth.js           # Authentication routes
│   ├── voting.js         # Voting routes
│   └── admin.js          # Admin routes
├── middleware/            # Custom middleware
│   └── auth.js           # Authentication middleware
├── database/             # Database files
│   ├── init.js           # Database initialization
│   └── voting.db         # SQLite database (auto-generated)
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── README.md            # Project documentation
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Voting
- `GET /api/voting/elections` - Get all elections
- `GET /api/voting/elections/:id` - Get election details
- `POST /api/voting/vote` - Cast a vote
- `GET /api/voting/history` - Get voting history
- `GET /api/voting/verify/:hash` - Verify vote
- `GET /api/voting/results/:id` - Get election results

### Admin
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/verify` - Verify voter
- `POST /api/admin/elections` - Create election
- `GET /api/admin/elections` - Get all elections (admin view)
- `PUT /api/admin/elections/:id` - Update election
- `DELETE /api/admin/elections/:id` - Delete election
- `POST /api/admin/elections/:id/candidates` - Add candidate
- `GET /api/admin/elections/:id/candidates` - Get candidates
- `PUT /api/admin/candidates/:id` - Update candidate
- `DELETE /api/admin/candidates/:id` - Delete candidate
- `GET /api/admin/elections/:id/results` - Get detailed results

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email
- `password_hash` - Hashed password
- `full_name` - User's full name
- `voter_id` - Unique voter ID
- `role` - User role (voter/admin)
- `is_verified` - Verification status
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Elections Table
- `id` - Primary key
- `title` - Election title
- `description` - Election description
- `start_date` - Voting start date
- `end_date` - Voting end date
- `status` - Election status
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Candidates Table
- `id` - Primary key
- `election_id` - Foreign key to elections
- `name` - Candidate name
- `party` - Political party
- `manifesto` - Candidate manifesto
- `image_url` - Candidate photo URL
- `created_at` - Creation timestamp

### Votes Table
- `id` - Primary key
- `election_id` - Foreign key to elections
- `voter_id` - Foreign key to users
- `candidate_id` - Foreign key to candidates
- `vote_hash` - Unique vote verification hash
- `timestamp` - Vote timestamp

## 🔐 Security Considerations

1. **Change Default Credentials**: Update admin password in production
2. **JWT Secret**: Use a strong, unique JWT secret
3. **HTTPS**: Use HTTPS in production
4. **Rate Limiting**: Adjust rate limits based on usage
5. **Database Security**: Secure database access
6. **Input Validation**: All inputs are validated
7. **SQL Injection**: Parameterized queries prevent SQL injection

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use a strong JWT secret
3. Enable HTTPS
4. Set up proper logging
5. Configure database backups
6. Set up monitoring

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🔄 Version History

- **v1.0.0** - Initial release with core voting functionality
- Basic authentication and voting system
- Admin panel for election management
- Vote verification system

---

**Note**: This is a demonstration project. For production use, additional security measures, audit trails, and compliance features should be implemented based on local regulations and requirements. 
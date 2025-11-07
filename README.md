# Remote Commander

A secure web interface to execute and stream terminal commands to remote Linux servers. Built with Next.js, MongoDB, and AI-powered command generation.

## Features

- 🔐 **Secure Authentication** - JWT-based user authentication
- 🖥️ **Interactive Terminal** - Browser-based SSH terminal using xterm.js
- 🔑 **Encrypted Credentials** - AES-encrypted private key storage
- 👥 **Server Sharing** - Share server access with other users
- 🤖 **AI Command Generation** - Generate Linux commands from natural language
- 📱 **Responsive Design** - Modern dark theme with mobile support
- 🔔 **Real-time Notifications** - Activity alerts and system updates
- ⭐ **Favorites System** - Mark frequently used servers

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, MongoDB, SSH2
- **Terminal**: xterm.js with WebGL acceleration
- **AI**: Google Genkit with Gemini 2.0 Flash
- **Security**: JWT, bcryptjs, CryptoJS

## Prerequisites

- Node.js 18+ 
- MongoDB database
- Google AI API key (for command generation)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Remote-Commander
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Copy `.env.sample` to `.env` and configure:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/remote-commander
   
   # Authentication
   JWT_SECRET=your-jwt-secret-key
   ENCRYPTION_SECRET=your-encryption-secret
   
   # AI (Optional)
   GOOGLE_GENAI_API_KEY=your-google-ai-key
   
   # Email (Optional - for support)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the app**
   
   Open [http://localhost:3000](http://localhost:3000)

## Usage

### Getting Started

1. **Register/Login** - Create an account or sign in
2. **Add Server** - Configure your Linux server credentials
3. **Connect** - Click on a server to open the terminal
4. **Execute Commands** - Type commands in the browser terminal

### Server Management

- **Add Server**: Dashboard → Add Server button
- **Edit Server**: Click server options → Edit
- **Share Server**: Options → Share → Enter user email
- **Test Connection**: Options → Test Connection
- **Download Key**: Options → Download Private Key (owners only)

### AI Command Generation

Use the Command Classifier on the dashboard to generate Linux commands from natural language descriptions.

## Security

- Private keys are AES-encrypted before database storage
- JWT tokens for secure authentication
- User isolation - access only owned/shared servers
- Input validation and sanitization
- Secure session management

## API Routes

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/servers` - List user servers
- `POST /api/servers` - Add new server
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  password: String, // bcrypt hashed
  firstName: String,
  lastName: String,
  favorites: [ObjectId] // server IDs
}
```

### Servers Collection
```javascript
{
  _id: ObjectId,
  name: String,
  ip: String, // IPv4 address
  port: Number,
  username: String,
  privateKey: String, // AES encrypted
  ownerId: ObjectId,
  guestIds: [ObjectId],
  status: String // 'active' | 'inactive'
}
```

## Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Project Structure
```
src/
├── app/             # Next.js app router pages
├── components/      # React components
├── lib/             # Utilities and actions
├── models/          # Data schemas
├── ai/              # AI integration
└── hooks/           # Custom React hooks
```

## Deployment

### Docker
```bash
docker build -t remote-commander .
docker run -p 3000:3000 remote-commander
```

### Environment Variables (Production)
- Set `NODE_ENV=production`
- Use secure JWT and encryption secrets
- Configure production MongoDB URI
- Set up proper SMTP for email notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support requests, use the built-in support form in the application or contact the development team.

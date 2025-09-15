# Recall AI - RAG-Powered SaaS Frontend

A production-ready React frontend for a RAG (Retrieval Augmented Generation) SaaS application. Built with modern React patterns, TailwindCSS, and a scalable feature-based architecture.

## 🚀 Features

- **Modern React Architecture**: Functional components with hooks, Context API for state management
- **Responsive Design**: Mobile-first design with TailwindCSS
- **Authentication System**: Complete auth flow with login, signup, and password reset
- **Bot Management**: Create, manage, and monitor AI-powered conversational agents
- **File Upload**: Mock file upload interface for document processing
- **Real-time UI**: Loading states, error handling, and smooth animations
- **Production Ready**: Clean code, proper error boundaries, and optimized performance

## 🏗️ Architecture

### Feature-Based Structure
```
src/
├── app/                    # App configuration and routing
├── core/                   # Shared components and utilities
│   ├── components/         # Reusable UI components
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom hooks
│   ├── layout/            # Layout components
│   └── utils/             # Constants and utilities
├── features/              # Feature-specific modules
│   ├── auth/              # Authentication
│   ├── bot/               # Bot management
│   └── landing/           # Landing page
└── assets/                # Static assets
```

### Core Components
- **Button**: Multiple variants (primary, secondary, outline, ghost, danger)
- **InputField**: Text, password, file upload with validation
- **Card**: Flexible card component with header, content, footer
- **Modal**: Accessible modal with backdrop and keyboard navigation
- **Loader**: Loading states for different contexts
- **Navbar**: Responsive navigation with mobile menu
- **Sidebar**: Collapsible dashboard navigation

## 🎨 Design System

### Color Palette
- **Primary**: Blue gradient (#3b82f6 to #2563eb)
- **Secondary**: Purple gradient (#a855f7 to #7c3aed)
- **Success**: Green (#10b981)
- **Warning**: Amber (#f59e0b)
- **Error**: Red (#ef4444)

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

## 🔧 Technology Stack

- **React 19.1.1** - Latest React with concurrent features
- **React Router v6** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Context API** - State management
- **Local Storage** - Data persistence
- **React Testing Library** - Testing utilities

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd recall_ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm start` - Start development server
- `npm test` - Run test suite
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App

## 🔐 Authentication

### Demo Credentials
- **Email**: `demo@example.com`
- **Password**: `password`

### Features
- Login/Signup forms with validation
- Password reset flow (UI only)
- Protected routes
- Persistent authentication state
- Automatic redirects

## 🤖 Bot Management

### Features
- Create new bots with name and description
- File upload interface (mock)
- Bot status tracking (active, training, error)
- Bot analytics (documents, queries)
- Delete confirmation modals
- Responsive bot cards

### Mock Data
The app includes sample bots to demonstrate the interface:
- Customer Support Bot
- Product Knowledge Bot

## 📱 Responsive Design

- **Mobile**: Optimized for touch interactions
- **Tablet**: Adaptive layouts for medium screens
- **Desktop**: Full-featured experience
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)

## 🎯 Key Features

### Landing Page
- Hero section with animated background
- Features showcase
- Call-to-action sections
- Professional footer

### Dashboard
- Collapsible sidebar navigation
- Bot creation form
- Bot management interface
- Analytics overview
- User profile dropdown

### State Management
- **AuthContext**: User authentication state
- **BotContext**: Bot management state
- **Local Storage**: Data persistence
- **Error Handling**: Comprehensive error states

## 🔒 Security Features

- Form validation
- Protected routes
- Error boundaries
- Input sanitization
- XSS protection

## 🚀 Performance

- Code splitting with React.lazy
- Optimized bundle size
- Lazy loading components
- Efficient re-renders
- Smooth animations

## 🧪 Testing

The project includes:
- React Testing Library setup
- Jest configuration
- Test utilities
- Mock data for testing

## 📦 Build & Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
- **Vercel**: Zero-config deployment
- **Netlify**: Drag-and-drop deployment
- **AWS S3**: Static hosting
- **Docker**: Containerized deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

---

**Built with ❤️ for developers who want to build intelligent AI applications.**

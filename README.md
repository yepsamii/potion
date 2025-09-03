# Notion Clone

A comprehensive Notion clone built with React, Vite, Tailwind CSS, and Convex. Features include real-time collaboration, block-based editing, hierarchical document organization, and GitHub integration.

## Features

### Core Functionality
- 🔐 **Authentication**: Sign up/login with email or GitHub OAuth
- 📝 **Rich Text Editor**: Block-based editor powered by BlockNote
- 🏢 **Workspaces**: Multiple workspace support with member management
- 📁 **Hierarchical Organization**: Nested folders and documents
- 🗑️ **Trash System**: Soft delete with restore functionality
- ⚡ **Real-time Sync**: Live collaboration using Convex

### Advanced Features
- 🔍 **Search**: Global search across all documents
- 🎨 **Customization**: Emoji icons, covers, and themes (light/dark)
- 🔗 **Sharing**: Document sharing with view/edit permissions
- 📱 **Responsive Design**: Works on desktop and mobile
- 🐙 **GitHub Integration**: Sync documents to GitHub repositories
- 📋 **Templates**: Pre-built page templates
- 💬 **Comments**: Inline comments on blocks (coming soon)
- 📜 **Version History**: Track and revert changes (coming soon)

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Convex (real-time database and serverless functions)
- **Authentication**: Convex Auth with GitHub OAuth
- **Editor**: BlockNote (block-based rich text editor)
- **Icons**: Lucide React
- **State Management**: Convex reactive queries + Zustand
- **Routing**: React Router DOM
- **Notifications**: React Hot Toast

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account (free at [convex.dev](https://convex.dev))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd notion-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will:
   - Create a new Convex project
   - Generate your Convex URL
   - Set up the database schema

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your Convex URL:
   ```
   VITE_CONVEX_URL=https://your-convex-deployment.convex.cloud
   ```

5. **Set up GitHub OAuth (optional)**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App with:
     - Homepage URL: `http://localhost:3000`
     - Authorization callback URL: `http://localhost:3000`
   - Add credentials to Convex dashboard environment variables:
     ```
     AUTH_GITHUB_ID=your_github_client_id
     AUTH_GITHUB_SECRET=your_github_client_secret
     ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open the app**
   Navigate to `http://localhost:3000`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Editor.jsx      # BlockNote editor wrapper
│   ├── Layout.jsx      # Main app layout
│   └── Sidebar.jsx     # Navigation sidebar
├── pages/              # Route components
│   ├── DocumentView.jsx # Document editor view
│   ├── Home.jsx        # Dashboard/home page
│   ├── Login.jsx       # Authentication page
│   ├── Settings.jsx    # User settings
│   └── Trash.jsx       # Deleted documents
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── App.jsx             # Main app component
├── main.jsx            # React app entry point
└── index.css           # Global styles

convex/
├── schema.js           # Database schema
├── auth.config.js      # Auth configuration
├── documents.js        # Document CRUD operations
├── workspaces.js       # Workspace management
└── _generated/         # Auto-generated Convex files
```

## Key Components

### Authentication
- Email/password and GitHub OAuth support
- Secure session management with Convex Auth
- User profile and settings management

### Document Editor
- Block-based editing with slash commands
- Real-time collaborative editing
- Auto-save functionality
- Rich formatting options (headings, lists, code, etc.)

### Workspace Management
- Multiple workspace support
- Member invitation and management
- Workspace-scoped documents and permissions

### Document Organization
- Hierarchical folder structure
- Drag-and-drop reorganization
- Nested documents with breadcrumb navigation
- Search and filtering

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run convex:dev      # Start Convex development

# Production
npm run build           # Build for production
npm run preview         # Preview production build
npm run convex:deploy   # Deploy Convex functions

# Code Quality
npm run lint            # Run ESLint
```

### Database Schema

The app uses Convex with the following main tables:
- `users` - User accounts and profiles
- `workspaces` - Workspace containers
- `documents` - Document content and metadata
- `folders` - Hierarchical folder structure
- `permissions` - Document access control
- `comments` - Document comments
- `templates` - Page templates
- `githubIntegrations` - GitHub sync configuration

### Adding New Features

1. **Database Changes**: Update `convex/schema.js`
2. **API Functions**: Add queries/mutations in `convex/`
3. **UI Components**: Create reusable components in `src/components/`
4. **Pages**: Add new routes in `src/pages/`
5. **Routing**: Update `src/App.jsx`

## Deployment

### Vercel (Recommended)

1. **Deploy Convex backend**
   ```bash
   npx convex deploy
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

3. **Configure environment variables in Vercel**
   - Add your production Convex URL
   - Add GitHub OAuth credentials if using

### Other Platforms

The app can be deployed to any static hosting service:
- Netlify
- Railway
- Render
- GitHub Pages

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Real-time collaboration cursors
- [ ] Advanced permissions system
- [ ] Database views and tables
- [ ] AI-powered content generation
- [ ] Mobile app (React Native)
- [ ] Offline support
- [ ] Advanced search with filters
- [ ] Page templates marketplace
- [ ] API for third-party integrations
- [ ] Import/export from other platforms

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/notion-clone/issues) page
2. Create a new issue with detailed information
3. Join our [Discord community](https://discord.gg/your-invite)

## Acknowledgments

- [Notion](https://notion.so) for the inspiration
- [BlockNote](https://www.blocknotejs.org/) for the amazing editor
- [Convex](https://convex.dev) for the real-time backend
- [Tailwind CSS](https://tailwindcss.com) for the styling system
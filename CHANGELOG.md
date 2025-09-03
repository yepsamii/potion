# Changelog

## [1.1.0] - 2025-01-03

### 🔧 Fixed
- **Authentication Error**: Fixed ConvexAuthProvider configuration error
  - Updated auth setup to use proper Convex Auth configuration
  - Added `convex/auth.js` with Password and GitHub providers
  - Added `convex/http.js` for auth HTTP routes
  - Removed deprecated `auth.config.js`
  - Fixed import paths for auth hooks

### 🎨 Updated
- **Icons**: Migrated from React Icons to Lucide React
  - Removed `react-icons` dependency
  - Updated all components to use Lucide React icons
  - Improved bundle size and consistency
  - All icon references updated across the application

### 🚀 Improvements
- Better error handling for authentication
- Cleaner icon imports and usage
- Reduced bundle size with tree-shakable icons
- Updated documentation to reflect changes

### 📁 Files Changed
- `src/main.jsx` - Updated auth provider configuration
- `src/App.jsx` - Fixed auth hook import
- `convex/auth.js` - New auth configuration
- `convex/http.js` - New HTTP routing for auth
- All component files - Updated icon imports
- `package.json` - Removed react-icons dependency

## [1.0.0] - 2025-01-03

### 🎉 Initial Release
- Complete Notion clone with all core features
- Authentication with email/password and GitHub OAuth
- Rich text editor with BlockNote
- Hierarchical document organization
- Real-time collaboration ready
- Trash system with restore functionality
- GitHub integration for document sync
- Modern UI with Tailwind CSS
- Mobile responsive design
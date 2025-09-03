# Deployment Guide

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Free Convex account at [convex.dev](https://convex.dev)

### Local Development

1. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd potion
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Initialize Convex Backend**
   ```bash
   npx convex dev
   ```
   - Create a free Convex account
   - Follow the prompts to set up your project
   - This generates your `.env.local` with CONVEX_URL

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   - App runs on `http://localhost:3001`

## Production Deployment

### 1. Deploy Convex Backend

```bash
# Deploy your Convex functions
npx convex deploy

# Note the production URL provided
```

### 2. Deploy Frontend to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# VITE_CONVEX_URL=your_production_convex_url
```

#### Option B: GitHub Integration
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### 3. Environment Variables

#### Development (.env.local)
```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment
```

#### Production (Vercel Dashboard)
```
VITE_CONVEX_URL=https://your-production-deployment.convex.cloud
```

#### Optional: GitHub OAuth
```
AUTH_GITHUB_ID=your_github_oauth_app_id
AUTH_GITHUB_SECRET=your_github_oauth_app_secret
```

## Features Testing Checklist

### Authentication
- [ ] Email/password signup
- [ ] Email/password login
- [ ] GitHub OAuth login
- [ ] Logout functionality

### Workspaces
- [ ] Create workspace
- [ ] Switch between workspaces
- [ ] Workspace member management

### Documents
- [ ] Create document
- [ ] Edit document title
- [ ] Rich text editing with BlockNote
- [ ] Auto-save functionality
- [ ] Delete document (soft delete)

### Folder Organization
- [ ] Create folders
- [ ] Nest folders (hierarchical structure)
- [ ] Organize documents in folders
- [ ] Drag and drop reordering

### Trash System
- [ ] View deleted items
- [ ] Restore documents from trash
- [ ] Permanently delete items
- [ ] Empty trash functionality

### UI/UX
- [ ] Responsive design (mobile/desktop)
- [ ] Dark mode toggle
- [ ] Search functionality
- [ ] Sidebar navigation
- [ ] Real-time updates

### Advanced Features
- [ ] Document sharing
- [ ] GitHub sync integration
- [ ] Version history
- [ ] Comments system
- [ ] Template system

## Common Issues & Solutions

### 1. Convex API Import Errors
**Problem**: `Cannot resolve import "../../convex/_generated/api"`

**Solution**: 
```bash
# Ensure Convex is running
npx convex dev

# Generated files should appear in convex/_generated/
```

### 2. Authentication Issues
**Problem**: Login/signup not working

**Solution**:
- Verify Convex deployment is active
- Check environment variables
- Ensure auth configuration is correct in `convex/auth.config.js`

### 3. Real-time Updates Not Working
**Problem**: Changes not syncing between sessions

**Solution**:
- Verify Convex connection in browser devtools
- Check that mutations are completing successfully
- Ensure queries are properly configured

### 4. Build Errors
**Problem**: Production build fails

**Solution**:
```bash
# Check for TypeScript errors
npm run lint

# Build locally to test
npm run build
npm run preview
```

## Performance Optimization

### Frontend
- [ ] Lazy load routes
- [ ] Optimize images
- [ ] Bundle size analysis
- [ ] Cache static assets

### Backend (Convex)
- [ ] Optimize database queries
- [ ] Use indexes effectively
- [ ] Implement pagination for large datasets
- [ ] Cache frequently accessed data

## Security Checklist

- [ ] Environment variables secured
- [ ] No hardcoded secrets
- [ ] Authentication properly configured
- [ ] API endpoints protected
- [ ] User input validated
- [ ] XSS protection enabled
- [ ] CSRF protection in place

## Monitoring & Analytics

### Convex Dashboard
- Monitor function performance
- Check database usage
- Review error logs
- Track user activity

### Vercel Analytics (Optional)
- Page performance metrics
- User engagement tracking
- Error monitoring
- Real user monitoring

## Scaling Considerations

### Database
- Convex automatically scales
- Monitor query performance
- Implement proper indexing
- Consider data archiving for old documents

### Frontend
- Use CDN for static assets
- Implement code splitting
- Optimize bundle size
- Consider server-side rendering for SEO

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Convex documentation
3. Check GitHub issues
4. Contact support team

## Version History

- v1.0.0: Initial release with core Notion features
- v1.1.0: Added GitHub integration
- v1.2.0: Enhanced collaboration features
- v1.3.0: Mobile optimization
- v2.0.0: Advanced permissions system
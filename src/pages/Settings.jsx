import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { User, Github, Trash2, RefreshCw, ExternalLink, Lock, Unlock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function Settings() {
  const { signOut } = useAuthActions()
  const currentUser = useQuery(api.users.getCurrentUser)
  
  // GitHub integration queries and mutations
  const githubIntegration = useQuery(api.github.getGitHubIntegration)
  const githubRepositories = useQuery(api.github.getGitHubRepositories)
  const connectGitHub = useMutation(api.github.connectGitHub)
  const disconnectGitHub = useMutation(api.github.disconnectGitHub)
  const fetchRepositories = useAction(api.github.fetchGitHubRepositories)
  const toggleRepository = useMutation(api.github.toggleRepository)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const handleConnectGitHub = () => {
    // For demo purposes, we'll simulate OAuth flow
    // In production, you'd implement proper GitHub OAuth
    const accessToken = prompt('Enter your GitHub Personal Access Token:')
    const username = prompt('Enter your GitHub username:')
    
    if (accessToken && username) {
      connectGitHub({ 
        accessToken, 
        username,
        email: currentUser?.email || '',
        avatarUrl: currentUser?.image || ''
      })
        .then(() => {
          toast.success('GitHub connected successfully!')
          // Fetch repositories after connecting
          return fetchRepositories()
        })
        .then(() => {
          toast.success('Repositories fetched successfully!')
        })
        .catch(error => {
          toast.error(`Failed to connect GitHub: ${error.message}`)
        })
    }
  }

  const handleDisconnectGitHub = async () => {
    try {
      await disconnectGitHub()
      toast.success('GitHub disconnected successfully!')
    } catch (error) {
      toast.error(`Failed to disconnect GitHub: ${error.message}`)
    }
  }

  const handleRefreshRepositories = async () => {
    try {
      await fetchRepositories()
      toast.success('Repositories refreshed successfully!')
    } catch (error) {
      toast.error(`Failed to refresh repositories: ${error.message}`)
    }
  }

  const handleToggleRepository = async (repositoryId, isEnabled) => {
    try {
      await toggleRepository({ repositoryId, isEnabled })
      toast.success(isEnabled ? 'Repository enabled for syncing' : 'Repository disabled for syncing')
    } catch (error) {
      toast.error(`Failed to update repository: ${error.message}`)
    }
  }

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences. Theme toggle is available in the sidebar.</p>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Update your profile information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={currentUser?.image} alt={currentUser?.name} />
                  <AvatarFallback className="text-lg">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{currentUser?.name || 'Loading...'}</h3>
                  <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={currentUser?.name || ''}
                  placeholder="Your Name"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Name is managed by your authentication provider
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentUser?.email || ''}
                  placeholder="your.email@example.com"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </CardContent>
          </Card>


          {/* GitHub Integration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                GitHub Integration
              </CardTitle>
              <CardDescription>
                Connect your GitHub account to sync documents to private repositories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!githubIntegration ? (
                // Not connected state
                <div className="text-center py-8">
                  <div className="p-4 bg-muted/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Github className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Connect GitHub Account</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your GitHub account to sync documents to your private repositories.
                  </p>
                  <Button onClick={handleConnectGitHub} className="gap-2">
                    <Github className="w-4 h-4" />
                    Connect GitHub
                  </Button>
                </div>
              ) : (
                // Connected state
                <div className="space-y-6">
                  {/* Account Info */}
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-green-900 dark:text-green-100">
                          Connected to @{githubIntegration.username}
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {githubIntegration.email || 'GitHub account connected'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshRepositories}
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Repos
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Disconnect
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect GitHub?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disconnect your GitHub account and remove all repository configurations. You won't be able to sync documents to GitHub until you reconnect.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDisconnectGitHub}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Repositories List */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">Private Repositories</h4>
                        <p className="text-sm text-muted-foreground">
                          Select repositories to enable for document syncing
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {githubRepositories?.filter(repo => repo.isEnabled).length || 0} enabled
                      </Badge>
                    </div>
                    
                    {githubRepositories && githubRepositories.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {githubRepositories
                          .sort((a, b) => {
                            // Sort by enabled status first, then by name
                            if (a.isEnabled && !b.isEnabled) return -1;
                            if (!a.isEnabled && b.isEnabled) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map((repo) => (
                            <div
                              key={repo._id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                repo.isEnabled 
                                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                                  : 'bg-muted/30 hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {repo.isPrivate ? (
                                    <Lock className="w-4 h-4 text-orange-600" />
                                  ) : (
                                    <Unlock className="w-4 h-4 text-green-600" />
                                  )}
                                  <div>
                                    <div className="font-medium text-sm">
                                      {repo.fullName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {repo.description || 'No description'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {repo.permissions.admin && (
                                    <Badge variant="outline" className="text-xs">Admin</Badge>
                                  )}
                                  {repo.permissions.push && (
                                    <Badge variant="outline" className="text-xs">Push</Badge>
                                  )}
                                  {!repo.permissions.push && !repo.permissions.admin && (
                                    <Badge variant="destructive" className="text-xs">Read Only</Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <a
                                  href={repo.htmlUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <Switch
                                  checked={repo.isEnabled}
                                  onCheckedChange={(enabled) => handleToggleRepository(repo._id, enabled)}
                                  disabled={!repo.permissions.push && !repo.permissions.admin}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-4">
                          No repositories found. Click "Refresh Repos" to load your repositories.
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleRefreshRepositories}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Load Repositories
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Sync Info */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      How syncing works:
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Only enabled repositories will appear in the sync options</li>
                      <li>• Documents are converted to Markdown format</li>
                      <li>• Files are saved in the `docs/` folder of your repository</li>
                      <li>• You need Push or Admin permissions to sync to a repository</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Sign Out</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign out of your account
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
              
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
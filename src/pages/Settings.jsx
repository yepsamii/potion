import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { User, Github, Trash2, Plus, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
  
  // State for GitHub forms
  const [githubUsername, setGithubUsername] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [showRepoForm, setShowRepoForm] = useState(false)
  
  // GitHub integration queries and mutations
  const githubProfile = useQuery(api.github.getGitHubProfile)
  const repoConnections = useQuery(api.github.getGitHubRepoConnections)
  const connectProfile = useMutation(api.github.connectGitHubProfile)
  const connectRepository = useMutation(api.github.connectGitRepository)
  const checkAccess = useAction(api.github.checkRepositoryAccess)
  const removeConnection = useMutation(api.github.removeRepoConnection)
  const disconnectProfile = useMutation(api.github.disconnectGitHubProfile)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  // STEP 1: Connect GitHub Profile
  const handleConnectProfile = async () => {
    if (!githubUsername.trim()) {
      toast.error('Please enter your GitHub username')
      return
    }

    try {
      await connectProfile({ username: githubUsername.trim() })
      toast.success('GitHub profile connected successfully!')
      setGithubUsername('')
    } catch (error) {
      toast.error(`Failed to connect profile: ${error.message}`)
    }
  }

  // STEP 2: Connect Repository
  const handleConnectRepo = async () => {
    if (!repoUrl.trim() || !accessToken.trim()) {
      toast.error('Please provide both repository URL and access token')
      return
    }

    try {
      await connectRepository({ 
        repoUrl: repoUrl.trim(), 
        accessToken: accessToken.trim() 
      })
      toast.success('Repository connection added successfully!')
      setRepoUrl('')
      setAccessToken('')
      setShowRepoForm(false)
    } catch (error) {
      toast.error(`Failed to connect repository: ${error.message}`)
    }
  }

  // STEP 3: Check Repository Access
  const handleCheckAccess = async (connectionId) => {
    try {
      const result = await checkAccess({ connectionId })
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Access check failed: ${error.message}`)
    }
  }

  // Remove repository connection
  const handleRemoveConnection = async (connectionId) => {
    try {
      await removeConnection({ connectionId })
      toast.success('Repository connection removed')
    } catch (error) {
      toast.error(`Failed to remove connection: ${error.message}`)
    }
  }

  // Disconnect GitHub profile entirely
  const handleDisconnectProfile = async () => {
    try {
      await disconnectProfile()
      toast.success('GitHub profile disconnected successfully!')
    } catch (error) {
      toast.error(`Failed to disconnect profile: ${error.message}`)
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
                Connect your GitHub profile and repositories using our 3-step process.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* STEP 1: Connect GitHub Profile */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center justify-center font-medium">1</div>
                  <h3 className="font-medium">Connect GitHub Profile</h3>
                </div>
                
                {!githubProfile ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Enter your GitHub username to connect your profile</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="GitHub username"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleConnectProfile}>
                        Connect Profile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Connected to @{githubProfile.username}</span>
                      <a
                        href={githubProfile.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: Connect Repository */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center justify-center font-medium">2</div>
                    <h3 className="font-medium">Connect Repository</h3>
                  </div>
                  {githubProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRepoForm(!showRepoForm)}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Repository
                    </Button>
                  )}
                </div>

                {!githubProfile ? (
                  <p className="text-sm text-muted-foreground">Complete step 1 first to enable repository connections.</p>
                ) : (
                  <div className="space-y-4">
                    {showRepoForm && (
                      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="repoUrl">Repository URL</Label>
                          <Input
                            id="repoUrl"
                            placeholder="https://github.com/owner/repo"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accessToken">Personal Access Token</Label>
                          <Input
                            id="accessToken"
                            type="password"
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Create a token at GitHub.com → Settings → Developer settings → Personal access tokens
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleConnectRepo} className="flex-1">
                            Connect Repository
                          </Button>
                          <Button variant="outline" onClick={() => setShowRepoForm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Connected Repositories List */}
                    {repoConnections && repoConnections.length > 0 && (
                      <div className="space-y-2">
                        {repoConnections.map((connection) => (
                          <div key={connection._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{connection.owner}/{connection.repoName}</div>
                              <div className="text-xs text-muted-foreground">{connection.repoUrl}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={connection.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveConnection(connection._id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!repoConnections || repoConnections.length === 0) && !showRepoForm && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No repositories connected yet. Click "Add Repository" to get started.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 3: Check Access */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center justify-center font-medium">3</div>
                  <h3 className="font-medium">Verify Repository Access</h3>
                </div>

                {!repoConnections || repoConnections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Complete steps 1 & 2 to verify repository access.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Check access permissions for your connected repositories:
                    </p>
                    
                    <div className="space-y-2">
                      {repoConnections.map((connection) => (
                        <div key={connection._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium text-sm">{connection.owner}/{connection.repoName}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                {connection.hasAccess === true ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    <span className="text-green-600">Access verified - {connection.accessLevel}</span>
                                  </>
                                ) : connection.hasAccess === false ? (
                                  <>
                                    <XCircle className="w-3 h-3 text-red-600" />
                                    <span className="text-red-600">Access denied</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span className="text-amber-600">Not checked yet</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCheckAccess(connection._id)}
                            className="gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Check Access
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Disconnect All */}
              {githubProfile && (
                <div className="pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Disconnect GitHub Profile
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect GitHub Profile?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will disconnect your GitHub profile and deactivate all repository connections. You'll need to reconnect everything to sync documents.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDisconnectProfile}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
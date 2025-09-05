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
import RepositoryApprovalRequest from '../components/RepositoryApprovalRequest'
import EmailTest from '../components/EmailTest'
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
  const [showTokenForm, setShowTokenForm] = useState('')
  const [needsApproval, setNeedsApproval] = useState(false)
  
  // GitHub integration queries and mutations
  const githubProfile = useQuery(api.github.getGitHubProfile)
  const globalRepositories = useQuery(api.github.getGlobalRepositories)
  const userRepositoryAccess = useQuery(api.github.getUserRepositoryAccess)
  const canAddRepo = useQuery(api.github.canAddRepositoryDirectly, repoUrl.trim() ? { repoUrl: repoUrl.trim() } : "skip")
  const connectProfile = useMutation(api.github.connectGitHubProfile)
  const addGlobalRepository = useMutation(api.github.addGlobalRepository)
  const addUserAccessToken = useAction(api.github.addUserAccessToken)
  const checkUserAccess = useAction(api.github.checkUserRepositoryAccess)
  const removeUserAccess = useMutation(api.github.removeUserAccess)
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

  // STEP 2: Add Global Repository (with approval check)
  const handleAddGlobalRepo = async () => {
    if (!repoUrl.trim()) {
      toast.error('Please provide repository URL')
      return
    }

    // Check if approval is needed first
    if (canAddRepo && !canAddRepo.canAdd) {
      if (canAddRepo.needsApproval) {
        setNeedsApproval(true)
        toast('This repository requires admin approval', { 
          icon: '⚠️',
          duration: 4000,
        })
        return
      } else {
        toast.error(canAddRepo.reason || 'Cannot add repository')
        return
      }
    }

    try {
      await addGlobalRepository({ 
        repoUrl: repoUrl.trim(),
        accessToken: accessToken.trim() || undefined
      })
      toast.success('Repository added to global registry!')
      setRepoUrl('')
      setAccessToken('')
      setShowRepoForm(false)
      setNeedsApproval(false)
    } catch (error) {
      if (error.message.includes('admin approval')) {
        setNeedsApproval(true)
        toast.info('Admin approval required - please fill out the form below')
      } else {
        toast.error(`Failed to add repository: ${error.message}`)
      }
    }
  }

  // STEP 3: Add User Access Token
  const handleAddAccessToken = async (repositoryId) => {
    if (!accessToken.trim()) {
      toast.error('Please provide access token')
      return
    }

    try {
      await addUserAccessToken({ 
        repositoryId, 
        accessToken: accessToken.trim() 
      })
      toast.success('Access token added successfully!')
      setAccessToken('')
      setShowTokenForm('')
    } catch (error) {
      toast.error(`Failed to add access token: ${error.message}`)
    }
  }

  // STEP 4: Check User Repository Access
  const handleCheckUserAccess = async (repositoryId) => {
    try {
      const result = await checkUserAccess({ repositoryId })
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Access check failed: ${error.message}`)
    }
  }

  // Remove user access to repository
  const handleRemoveUserAccess = async (repositoryId) => {
    try {
      await removeUserAccess({ repositoryId })
      toast.success('Repository access removed')
    } catch (error) {
      toast.error(`Failed to remove access: ${error.message}`)
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
                Connect your GitHub profile and repositories using our 4-step process for global repository sharing.
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

              {/* STEP 2: Add Global Repository */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center justify-center font-medium">2</div>
                    <h3 className="font-medium">Add Repository to Global Registry</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRepoForm(!showRepoForm)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Repository
                  </Button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Add repositories to the global registry visible to all users.</p>
                  
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
                        <p className="text-xs text-muted-foreground">
                          This repository will be visible to all users, but they need their own access tokens to use it.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="repoAccessToken">Access Token (for verification)</Label>
                        <Input
                          id="repoAccessToken"
                          type="password"
                          placeholder="ghp_your_token_here"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Used to verify you have access to the repository. Not stored permanently.
                        </p>
                      </div>

                      {canAddRepo && !canAddRepo.canAdd && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">{canAddRepo.reason}</span>
                          </div>
                          {canAddRepo.needsApproval && (
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              Fill out the approval request form below to proceed.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddGlobalRepo} 
                          className="flex-1"
                          disabled={canAddRepo && !canAddRepo.canAdd && !canAddRepo.needsApproval}
                        >
                          {canAddRepo && canAddRepo.needsApproval ? 'Request Approval' : 'Add to Global Registry'}
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setShowRepoForm(false)
                          setNeedsApproval(false)
                          setRepoUrl('')
                          setAccessToken('')
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Approval Request Form */}
                  {needsApproval && repoUrl && (
                    <div className="mt-4">
                      <RepositoryApprovalRequest 
                        repoUrl={repoUrl.trim()}
                        accessToken={accessToken.trim()}
                        onApprovalGranted={() => {
                          setNeedsApproval(false)
                          setShowRepoForm(false)
                          setRepoUrl('')
                          setAccessToken('')
                        }}
                      />
                    </div>
                  )}

                  {/* Global Repositories List */}
                  {globalRepositories && globalRepositories.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Global Repository Registry</h4>
                      {globalRepositories.map((repo) => (
                        <div key={repo._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{repo.owner}/{repo.repoName}</div>
                            <div className="text-xs text-muted-foreground">
                              Added by {repo.addedByUser?.name || 'Unknown'} • {repo.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={repo.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!globalRepositories || globalRepositories.length === 0) && !showRepoForm && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No repositories in global registry yet. Be the first to add one!
                    </p>
                  )}
                </div>
              </div>

              {/* STEP 3: Add Personal Access Token */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center justify-center font-medium">3</div>
                  <h3 className="font-medium">Add Personal Access Token</h3>
                </div>

                {!globalRepositories || globalRepositories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Complete step 2 to add your personal access tokens.</p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Add your personal access tokens to repositories you want to sync documents to.
                    </p>
                    
                    <div className="space-y-2">
                      {globalRepositories.map((repo) => {
                        const userAccessData = userRepositoryAccess?.find(item => item._id === repo._id);
                        const hasToken = userAccessData?.userAccess?.hasToken;
                        return (
                          <div key={repo._id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{repo.owner}/{repo.repoName}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                {hasToken ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    <span className="text-green-600">Token configured</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span className="text-amber-600">No token configured</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {!hasToken && showTokenForm === repo._id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="password"
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    className="w-48"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddAccessToken(repo._id)}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowTokenForm('')}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : !hasToken ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowTokenForm(repo._id)}
                                >
                                  Add Token
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveUserAccess(repo._id)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 4: Verify Repository Access */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center justify-center font-medium">4</div>
                  <h3 className="font-medium">Verify Repository Access</h3>
                </div>

                {!userRepositoryAccess || userRepositoryAccess.filter(item => item.userAccess?.hasToken).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Complete step 3 to verify your repository access.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Verify your personal access to repositories with configured tokens:
                    </p>
                    
                    <div className="space-y-2">
                      {userRepositoryAccess
                        .filter(item => item.userAccess?.hasToken)
                        .map((item) => {
                        return (
                          <div key={item._id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium text-sm">{item.owner}/{item.repoName}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  {item.userAccess.hasAccess === true ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 text-green-600" />
                                      <span className="text-green-600">Access verified - {item.userAccess.accessLevel}</span>
                                      {item.userAccess.lastChecked && (
                                        <span className="text-muted-foreground">• Checked {new Date(item.userAccess.lastChecked).toLocaleDateString()}</span>
                                      )}
                                    </>
                                  ) : item.userAccess.hasAccess === false ? (
                                    <>
                                      <XCircle className="w-3 h-3 text-red-600" />
                                      <span className="text-red-600">Access denied</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      <span className="text-amber-600">Not verified yet</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckUserAccess(item._id)}
                              className="gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Check Access
                            </Button>
                          </div>
                        );
                      })}
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

          {/* Email Test Section */}
          <EmailTest />
        </div>
      </div>
    </div>
  )
}
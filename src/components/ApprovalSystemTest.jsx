import { useState } from 'react'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import RepositoryApprovalRequest from './RepositoryApprovalRequest'
import { 
  Github, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Shield
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ApprovalSystemTest() {
  const [repoUrl, setRepoUrl] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [testingPhase, setTestingPhase] = useState('input') // input, approval, manual

  // Queries
  const canAddRepo = useQuery(
    api.github.canAddRepositoryDirectly, 
    repoUrl ? { repoUrl } : "skip"
  )
  const userRequests = useQuery(api.repositoryApproval.getUserApprovalRequests)
  const pendingRequests = useQuery(api.repositoryApproval.getPendingApprovalRequests)

  // Actions
  const addRepo = useMutation(api.github.addGlobalRepository)
  const processApproval = useMutation(api.repositoryApproval.processRepositoryApproval)

  const handleTestAddRepo = async () => {
    if (!repoUrl) {
      toast.error('Please enter a repository URL')
      return
    }

    try {
      await addRepo({ repoUrl, accessToken })
      toast.success('Repository added successfully!')
      setTestingPhase('input')
    } catch (error) {
      if (error.message.includes('admin approval')) {
        setTestingPhase('approval')
        toast.info('Repository requires approval - showing approval form')
      } else {
        toast.error(`Failed to add repository: ${error.message}`)
      }
    }
  }

  const handleManualApproval = async (requestId, action) => {
    const request = pendingRequests?.find(r => r._id === requestId)
    if (!request) return

    try {
      await processApproval({
        token: request.approvalToken,
        action,
        adminEmail: 'abrahmansw@gmail.com'
      })
      toast.success(`Repository ${action}d successfully!`)
      
      if (action === 'approve') {
        setTestingPhase('input')
        setRepoUrl('')
      }
    } catch (error) {
      toast.error(`Failed to ${action} repository: ${error.message}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Repository Approval System - Test Interface
          </CardTitle>
          <CardDescription>
            Test the admin approval workflow for repository additions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phase 1: Input Repository */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Try to Add Repository</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Repository URL</label>
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Access Token (Optional)</label>
                <Input
                  placeholder="ghp_your_token_here"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  type="password"
                />
              </div>
            </div>
            
            <Button onClick={handleTestAddRepo} disabled={!repoUrl}>
              <Github className="w-4 h-4 mr-2" />
              Try Add Repository
            </Button>

            {canAddRepo && (
              <Alert className={canAddRepo.canAdd ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Status:</strong> {canAddRepo.reason}
                  {canAddRepo.needsApproval && " - Use the form below to request approval."}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Phase 2: Approval Request */}
          {testingPhase === 'approval' && repoUrl && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 2: Request Admin Approval</h3>
              <RepositoryApprovalRequest 
                repoUrl={repoUrl}
                accessToken={accessToken}
                onApprovalGranted={() => setTestingPhase('manual')}
              />
            </div>
          )}

          {/* Phase 3: Manual Approval (Simulating Admin Action) */}
          {pendingRequests && pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 3: Admin Decision (Manual Test)</h3>
              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>For Testing:</strong> In production, admins would click email links. 
                  Here you can manually approve/reject to test the flow.
                </AlertDescription>
              </Alert>
              
              {pendingRequests.map((request) => (
                <Card key={request._id} className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>
                        <Github className="w-4 h-4 mr-2 inline" />
                        {request.owner}/{request.repoName}
                      </span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Requested by {request.requester?.name} ({request.requester?.email})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.justification && (
                      <div className="bg-muted/50 p-3 rounded">
                        <strong>Justification:</strong> {request.justification}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleManualApproval(request._id, 'approve')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve (Test)
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleManualApproval(request._id, 'reject')}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Reject (Test)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* User's Request History */}
          {userRequests && userRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Approval Requests</h3>
              <div className="space-y-2">
                {userRequests.slice(0, 5).map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{request.owner}/{request.repoName}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge 
                      variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
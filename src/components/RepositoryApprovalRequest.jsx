import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Clock, 
  AlertTriangle, 
  Send, 
  Github,
  Shield
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function RepositoryApprovalRequest({ repoUrl, accessToken, onApprovalGranted }) {
  const [justification, setJustification] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const requestApproval = useAction(api.repositoryApproval.requestRepositoryApproval)
  const checkCanAdd = useQuery(api.github.canAddRepositoryDirectly, repoUrl ? { repoUrl } : "skip")
  const userRequests = useQuery(api.repositoryApproval.getUserApprovalRequests)

  // Find existing request for this repository
  const existingRequest = userRequests?.find(req => 
    req.repoUrl === repoUrl && req.status === 'pending'
  )

  const handleSubmitRequest = async () => {
    if (!repoUrl || !accessToken) {
      toast.error('Repository URL and access token are required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await requestApproval({
        repoUrl,
        justification: justification.trim(),
        accessToken,
      })

      toast.success(result.message)
      setJustification('') // Clear form

      // Optional callback to parent component
      if (onApprovalGranted && result.success) {
        setTimeout(() => {
          onApprovalGranted(result.requestId)
        }, 1000)
      }

    } catch (error) {
      toast.error(`Failed to request approval: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't show if user can already add the repository
  if (checkCanAdd?.canAdd) {
    return null
  }

  // Show existing pending request
  if (existingRequest) {
    const timeLeft = existingRequest.expiresAt - Date.now()
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))

    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Clock className="w-5 h-5" />
            Approval Request Pending
          </CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            Your request to add this repository is awaiting admin approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-700 dark:text-amber-300">Status:</span>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-700 dark:text-amber-300">Requested:</span>
            <span className="text-sm text-amber-800 dark:text-amber-200">
              {new Date(existingRequest.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-700 dark:text-amber-300">Expires:</span>
            <span className="text-sm text-amber-800 dark:text-amber-200">
              {hoursLeft > 0 ? `In ${hoursLeft} hours` : 'Soon'}
            </span>
          </div>

          {existingRequest.justification && (
            <div>
              <span className="text-sm text-amber-700 dark:text-amber-300">Your justification:</span>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1 p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                &ldquo;{existingRequest.justification}&rdquo;
              </p>
            </div>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The admin will review your request and send you an email notification with their decision.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <Shield className="w-5 h-5" />
          Admin Approval Required
        </CardTitle>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          This repository requires admin approval before it can be added to the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Github className="h-4 w-4" />
          <AlertDescription>
            For security reasons, all repository additions must be approved by an administrator.
            Please provide a justification for why you need access to this repository.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="repository">Repository</Label>
          <Input
            id="repository"
            value={repoUrl}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="justification">
            Justification <span className="text-muted-foreground">(Optional)</span>
          </Label>
          <Textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Please explain why you need access to this repository (e.g., project requirements, documentation sync, etc.)"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {justification.length}/500 characters
          </p>
        </div>

        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            What happens next:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Your request will be sent to the admin via email</li>
            <li>• Admin will review your request and repository details</li>
            <li>• You&apos;ll receive notification when approved/rejected</li>
            <li>• Approved requests are valid for immediate use</li>
            <li>• Requests expire after 48 hours if not processed</li>
          </ul>
        </div>

        <Button 
          onClick={handleSubmitRequest} 
          disabled={isSubmitting || !repoUrl || !accessToken}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending Request...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Request Admin Approval
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
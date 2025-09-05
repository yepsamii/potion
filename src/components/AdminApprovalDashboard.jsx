import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  User, 
  Github, 
  ExternalLink,
  Shield,
  AlertTriangle
} from 'lucide-react'

export default function AdminApprovalDashboard() {
  const pendingRequests = useQuery(api.repositoryApproval.getPendingApprovalRequests)
  const userAuditLogs = useQuery(api.github.getUserSecurityAuditLogs, { limit: 10 })

  if (!pendingRequests) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Repository Approval Requests</h2>
          <p className="text-muted-foreground">
            Manage pending requests for repository access
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {pendingRequests.length} Pending
        </Badge>
      </div>

      {pendingRequests.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
              <p className="text-muted-foreground">
                All repository approval requests have been processed.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((request) => {
            const timeLeft = request.expiresAt - Date.now()
            const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
            const isExpiringSoon = hoursLeft < 12

            return (
              <Card key={request._id} className={isExpiringSoon ? "border-amber-200" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Github className="w-5 h-5" />
                        {request.owner}/{request.repoName}
                        {isExpiringSoon && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Expiring Soon
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {request.requester?.name || 'Unknown'} ({request.requester?.email})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Requested {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(request.repoUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Repository
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Expires in {hoursLeft} hours
                    </span>
                  </div>

                  {request.justification && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <h4 className="font-medium mb-2">User's Justification:</h4>
                      <p className="text-sm text-muted-foreground">
                        "{request.justification}"
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Approval Instructions:
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      An approval email has been sent to the admin email address. 
                      Click the approve/reject links in that email to process this request.
                      The decision will be automatically logged and the user will be notified.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Security Audit Log Summary */}
      {userAuditLogs && userAuditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Security Events</CardTitle>
            <CardDescription>
              Latest repository-related security events for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userAuditLogs.slice(0, 5).map((log) => (
                <div key={log._id} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {log.resource.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
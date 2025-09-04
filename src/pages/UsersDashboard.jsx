import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Users, Crown, UserCheck, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function UsersDashboard() {
  const allUsers = useQuery(api.users.getAllUsers)

  if (!allUsers) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Users Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage all users in the collaborative workspace
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allUsers.length}</div>
              <p className="text-xs text-muted-foreground">
                Active collaborative members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allUsers.length}</div>
              <p className="text-xs text-muted-foreground">
                All users have shared access
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workspace Type</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Shared</div>
              <p className="text-xs text-muted-foreground">
                Everyone can read & write
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Complete list of users with access to the collaborative workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback>
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {user._id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {user.email || 'No email'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user._creationTime ? formatDate(user._creationTime) : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user._creationTime ? formatDate(user._creationTime) : 'Unknown'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Workspace Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Access Level</h4>
                <p className="text-sm text-muted-foreground">
                  All users have full read and write access to all documents in the shared workspace. 
                  Every document shows who created it and who last edited it for transparency.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Collaboration Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Shared document editing</li>
                  <li>• Real-time authorship tracking</li>
                  <li>• Document creation by any user</li>
                  <li>• Full workspace visibility</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
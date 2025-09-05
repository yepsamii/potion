import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EmailTest() {
  const [isTesting, setIsTesting] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  
  const testEmail = useAction(api.testEmail.testEmailSend)

  const handleTestEmail = async () => {
    setIsTesting(true)
    setLastResult(null)

    try {
      const result = await testEmail({})
      setLastResult(result)
      
      if (result.success) {
        toast.success('Test email sent! Check your inbox.')
      } else {
        toast.error(`Test failed: ${result.message}`)
      }
    } catch (error) {
      const errorResult = {
        success: false,
        message: error.message,
      }
      setLastResult(errorResult)
      toast.error(`Test failed: ${error.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Resend Email Test
        </CardTitle>
        <CardDescription>
          Test the Resend email integration by sending a sample approval email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            This will send a test approval email to <strong>abrahmansw@gmail.com</strong> using Resend.
            Check your email inbox (and spam folder) after clicking send.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleTestEmail} 
          disabled={isTesting}
          className="w-full"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Test Email...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Test Email
            </>
          )}
        </Button>

        {lastResult && (
          <Alert className={lastResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {lastResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <div className={lastResult.success ? "text-green-800" : "text-red-800"}>
                  <strong>Result:</strong> {lastResult.message}
                </div>
                
                {lastResult.success && (
                  <div className="text-green-700 space-y-1">
                    <div><strong>Provider:</strong> {lastResult.provider}</div>
                    {lastResult.emailId && (
                      <div><strong>Email ID:</strong> {lastResult.emailId}</div>
                    )}
                    <div className="text-sm">
                      Check your inbox for the test approval email with working approve/reject buttons.
                    </div>
                  </div>
                )}

                {!lastResult.success && lastResult.error && (
                  <div className="text-red-700">
                    <strong>Error:</strong> {lastResult.error}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <h4 className="font-medium">Email Configuration:</h4>
          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <div><strong>Service:</strong> Resend</div>
            <div><strong>From:</strong> onboarding@resend.dev</div>
            <div><strong>To:</strong> abrahmansw@gmail.com</div>
            <div><strong>API Key:</strong> ✅ Configured (server-side)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brand } from "@/components/brand"
import { SignUpForm } from "@/components/sign-up-form"
import { listPublicSites } from "./actions"

// Always fetch the latest sites list — admins can add/remove sites at any time
// and we don't want the sign-up page serving a stale cached copy.
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SignUpPage() {
  const sites = await listPublicSites()

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create your guard account</CardTitle>
            <CardDescription>
              Sign up as a security guard to start marking attendance. Admin accounts are created by your agency
              administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm sites={sites} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

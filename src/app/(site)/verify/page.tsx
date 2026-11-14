import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OtpForm } from "@/features/auth/components/otp-form";
import { getPendingLogin } from "@/features/auth/actions";
import { maskPhone } from "@/lib/format";

export const metadata: Metadata = { title: "אימות קוד", robots: { index: false } };

export default async function VerifyPage() {
  const pending = await getPendingLogin();
  if (!pending) redirect("/login");
  return (
    <div className="container-page py-10 sm:py-16">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle as="h1">הזנת קוד האימות</CardTitle>
          <CardDescription>הקוד תקף למספר דקות בלבד</CardDescription>
        </CardHeader>
        <CardContent>
          <OtpForm maskedPhone={maskPhone(pending.phone)} />
        </CardContent>
      </Card>
    </div>
  );
}

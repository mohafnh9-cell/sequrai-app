import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your subscription and usage.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Current Plan</CardTitle>
                <CardDescription className="text-xs">Free during beta</CardDescription>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">Free Beta</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            SequrAI is currently free while in beta. Paid plans with advanced features will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

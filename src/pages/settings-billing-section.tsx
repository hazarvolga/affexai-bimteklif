import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

/** Billing is the single source for plan, quota, payment and renewal information. */
export function SettingsBillingSection() {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader><CardTitle>Abonelik ve kullanım</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Mevcut planınızı, kullanım haklarınızı ve ödeme durumunuzu faturalandırma sayfasında takip edin.</p>
        <Link className={buttonVariants()} to="/app/billing">Paket ve kullanım bilgilerini görüntüle</Link>
      </CardContent>
    </Card>
  );
}

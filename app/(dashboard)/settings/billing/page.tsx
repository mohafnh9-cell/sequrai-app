import { redirect } from "next/navigation";

// Billing is at /billing - redirect to keep URLs clean
export default function SettingsBillingRedirect() {
  redirect("/billing");
}

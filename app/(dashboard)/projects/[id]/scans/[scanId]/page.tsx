import type { Metadata } from "next";
import { ScanDetailView } from "@/features/security-scanner/components/ScanDetailView";

export const metadata: Metadata = {
  title: "Security scan",
};

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string; scanId: string }>;
}) {
  const { id, scanId } = await params;
  return <ScanDetailView projectId={id} scanId={scanId} />;
}

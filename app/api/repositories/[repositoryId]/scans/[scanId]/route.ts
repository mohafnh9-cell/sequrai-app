import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getScanRequestContext,
  ScanRequestError,
} from "@/server/security-scanner/request-context";

const paramsSchema = z.object({
  repositoryId: z.string().uuid(),
  scanId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ repositoryId: string; scanId: string }> }
) {
  try {
    const parsed = paramsSchema.safeParse(await params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid repository or scan id" }, { status: 400 });
    }
    const { supabase } = await getScanRequestContext(parsed.data.repositoryId);
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("*")
      .eq("id", parsed.data.scanId)
      .eq("repository_id", parsed.data.repositoryId)
      .maybeSingle();
    if (scanError) throw new Error(scanError.message);
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const { data: findings, error: findingsError } = await supabase
      .from("scan_findings")
      .select("*")
      .eq("scan_id", scan.id)
      .order("severity", { ascending: true })
      .order("file_path", { ascending: true });
    if (findingsError) throw new Error(findingsError.message);
    return NextResponse.json({ scan, findings });
  } catch (error) {
    if (error instanceof ScanRequestError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error({
      component: "scan-detail-api",
      event: "request_failed",
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "Could not load scan" }, { status: 500 });
  }
}

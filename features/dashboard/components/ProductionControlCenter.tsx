import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardFocus } from "@/lib/dashboard/pick-primary-project";
import { verdictHeadlineDisplay } from "@/brain/production-verdict/status-ui";

type ProductionControlCenterProps = {
  greeting: string;
  focus: DashboardFocus;
  labels: {
    canDeployQuestion: string;
    deployYes: string;
    deployNo: string;
    almostReady: string;
    fixThisFirst: string;
    fixIssue: string;
    reviewProject: string;
    allReady: string;
  };
};

export function ProductionControlCenter({
  greeting,
  focus,
  labels,
}: ProductionControlCenterProps) {
  const { primary, orgCanDeploy, topPriority } = focus;
  const projectHref = `/projects/${primary.projectId}`;
  const statusHeadline = verdictHeadlineDisplay(primary.status);
  const isAlmostReady = primary.status === "almost_ready";

  const deployAnswer = orgCanDeploy
    ? labels.deployYes
    : isAlmostReady
      ? labels.almostReady
      : labels.deployNo;

  const statusLine = orgCanDeploy
    ? labels.allReady
    : primary.status === "ready_to_ship"
      ? labels.allReady
      : isAlmostReady
        ? labels.almostReady
        : labels.reviewProject;

  return (
    <section className="product-hero min-h-[min(72vh,640px)] flex flex-col justify-center py-16 sm:py-24">
      <div className="space-y-10 sm:space-y-14 max-w-3xl">
        <p className="text-lg sm:text-xl text-muted-foreground font-medium tracking-tight">
          {greeting}
        </p>

        <div className="space-y-4">
          <p className="text-base sm:text-lg text-muted-foreground">{statusLine}</p>
          {!orgCanDeploy && topPriority && (
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                {labels.fixThisFirst}
              </p>
              <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {topPriority.title}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            {labels.canDeployQuestion}
          </p>
          <p
            className={`text-5xl sm:text-7xl md:text-8xl font-semibold tracking-tighter leading-none ${
              orgCanDeploy
                ? "text-brand-success"
                : isAlmostReady
                  ? "text-brand-warning"
                  : "text-foreground"
            }`}
          >
            {deployAnswer}
          </p>
          {!orgCanDeploy && (
            <p className="text-sm text-muted-foreground pt-1">{statusHeadline}</p>
          )}
        </div>

        <div className="pt-4">
          <Button size="lg" className="h-12 px-8 text-base rounded-xl shadow-premium" asChild>
            <Link href={projectHref}>
              {orgCanDeploy ? labels.reviewProject : labels.fixIssue}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import { ExplainTerm } from "@/components/ExplainTerm";
import { METRIC_EXPLANATIONS } from "@/lib/metric-explanations";

type MetricTermProps = {
  /** Key into METRIC_EXPLANATIONS. Omit when using `text` only. */
  metric?: string;
  text?: string;
  children?: ReactNode;
};

export function MetricTerm({ metric, text, children }: MetricTermProps) {
  const explanation = text ?? (metric ? METRIC_EXPLANATIONS[metric] : undefined);
  const label = children ?? metric ?? "";

  if (!explanation) return <>{label}</>;

  return <ExplainTerm text={explanation}>{label}</ExplainTerm>;
}

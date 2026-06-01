import type { Client } from "@/lib/mock-data";

export type OutreachTemplate = {
  id: string;
  key: string;
  name: string;
  category: string;
  body: string;
};

export function defaultTemplateKey(client: Client): string {
  if (client.status === "Lapsed" || client.status === "Win-back") return "winback";
  if (client.status === "New") return "welcome";
  return "atRisk";
}

export function fillOutreachTemplate(body: string, client: Client) {
  const firstName = client.name.split(" ")[0] ?? "";
  return body
    .replaceAll("{firstName}", firstName)
    .replaceAll("{favoriteInstructor}", client.favoriteInstructor ?? "your instructor")
    .replaceAll("{lastClassDate}", `${client.daysSinceLast ?? 0} days ago`);
}

export function toTemplateSendType(
  key: string
): "atRisk" | "winback" | "welcome" | "milestone" | "reminder" {
  if (key === "atRisk" || key === "winback" || key === "welcome" || key === "milestone" || key === "reminder") {
    return key;
  }
  return "atRisk";
}

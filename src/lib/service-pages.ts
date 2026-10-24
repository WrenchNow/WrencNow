import services from "@/content/services.json";

export type ServicePage = {
  slug: string;
  app: string;
  name: string;
  title: string;
  desc: string;
  h1: string;
  lede: string;
  signs: string[];
  onsite: string[];
  note: string;
  related: string[];
  /** Catalog slug used by search/booking. */
  book: string;
};

export const SERVICE_PAGES: ServicePage[] = services;

export function servicePage(slug: string): ServicePage | undefined {
  return SERVICE_PAGES.find((s) => s.slug === slug);
}

/** Questions shared by every service page; shown on the page and mirrored in FAQ JSON-LD. */
export function serviceFaq(s: ServicePage) {
  const thing = s.name.charAt(0).toLowerCase() + s.name.slice(1);
  return [
    {
      q: `How much does a ${thing} cost on WrenchNow?`,
      a: "Each mechanic sets their own hourly rate, shown on their profile. Before you book you see an estimate for the job, and your card is never charged more than the estimate you approve. Parts are billed at the receipt price plus a small handling charge.",
    },
    {
      q: "Who does the work?",
      a: "Independent mechanics who have passed a background check and shown current proof of insurance. Mechanics can only take jobs their skill tier covers.",
    },
    {
      q: "What if something goes wrong?",
      a: "Report it from your booking and WrenchNow support will contact your mechanic and help sort it out. Mechanics are independent contractors; some offer their own warranty on their work, shown on their profile.",
    },
    {
      q: "How do I pay?",
      a: "Through the app only. We place a hold on your card when you book and charge the final amount when the job is done. Never pay a mechanic in cash or through another app.",
    },
  ];
}

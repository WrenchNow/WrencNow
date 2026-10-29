import { checkFeeRefundJobs, onboardingFeePerJobCents, onboardingFeeTotalCents, platformFeeBps } from "@/lib/env";
import { processingLabel } from "@/lib/fee-copy";
import { platformFeeCents } from "@/lib/fees";
import { money } from "@/lib/format";

export type Faq = { q: string; a: string };

/** Fees come from env (PLATFORM_FEE_BPS etc.), so this answer is built, never hard-coded. */
function joinCostAnswer(): string {
  const bps = platformFeeBps();
  const keep = 10000 - platformFeeCents(10000, bps);
  return `No monthly fee to be listed. On each completed job WrenchNow keeps a ${bps / 100}% platform fee on your labor — that's it. Customers pay the card processing (${processingLabel()}) as a service fee, so on a $100 job you keep ${money(keep)}. The rest is paid out to your bank through Stripe. The background check is optional: it costs ${money(onboardingFeeTotalCents(), { whole: true })} up front and you get ${money(onboardingFeePerJobCents(), { whole: true })} back on each of your first ${checkFeeRefundJobs()} completed jobs.`;
}

export const CUSTOMER_FAQ: Faq[] = [
  {
    q: "How do I know the price is fair?",
    a: "Every mechanic's hourly rate is posted upfront, and each service shows an estimated time range. When you book, you see the maximum you could pay before you confirm. Your mechanic can't charge more than that estimate.",
  },
  {
    q: "Are these mechanics actually any good?",
    a: "We review every mechanic's profile, experience and insurance before they can take jobs. Mechanics who pass our background check get a “Background checked” badge, and if a mechanic hasn't, you're told before you book. Basic-tier mechanics can only take simple jobs like oil changes and batteries; complex work is limited to certified mechanics. Reviews come only from customers with a completed booking.",
  },
  {
    q: "What if I have no idea what's wrong with my car?",
    a: "Most people don't — that's fine. Use “Not sure what's wrong?” on the Find a mechanic page: describe what you're noticing (“weird noise,” “won't start,” “yellow light on”) and we'll show the likely causes and what to book. Your mechanic reads your description before they come. You can also book an in-person estimate visit — some mechanics do them free — and get a written estimate before any work.",
  },
  {
    q: "When am I charged?",
    a: "When you book, we place a hold on your card for the estimated maximum. You're only charged when the job is marked complete, for the final amount — which can't exceed the estimate. If you cancel before your mechanic heads out, the hold is released.",
  },
  {
    q: "How are parts priced?",
    a: "Before buying anything, your mechanic sends an itemized parts list for you to approve in the app. You're charged the price on the store receipt (never more than you approved) plus a small, disclosed handling charge, and you can see every receipt. WrenchNow may earn a referral fee from parts stores when mechanics shop through our links; that never changes what you pay.",
  },
  {
    q: "Can I pay the mechanic directly?",
    a: "No — never. All payments go through WrenchNow so your booking is protected, you're never charged more than your estimate, and we can help if anything goes wrong. If a mechanic asks for cash, Venmo, Zelle, or anything else, don't pay and report it from your booking. See our Payment protection page for details.",
  },
  {
    q: "How do I know it's really my mechanic?",
    a: "When your mechanic accepts, your booking page shows their photo, name, and a 4-digit arrival code. Check that the person matches, then read them the code. They can't start the job without it.",
  },
  {
    q: "What if my mechanic doesn't show up?",
    a: "If they haven't started the job with your arrival code 30 minutes after the booked time, report a no-show from your booking page. The hold on your card is released, and the no-show is recorded on the mechanic's public profile.",
  },
  {
    q: "What if the problem comes back?",
    a: "Use “Report a problem” on your booking. Many mechanics offer their own warranty — their profile and your receipt say how long it lasts and whether it covers labor, parts, or both. If a mechanic doesn't honor their warranty, WrenchNow can refund you and take it out of the mechanic's next payout.",
  },
  {
    q: "Where do you operate?",
    a: "We're launching in the Denver metro area first, with more cities to follow.",
  },
];

export const MECHANIC_FAQ: Faq[] = [
  {
    q: "What does it cost to join?",
    a: joinCostAnswer(),
  },
  {
    q: "What do I need to get started?",
    a: "A valid driver's license, your own tools and transportation, a profile photo, liability insurance (we verify your certificate and you renew it before it expires), and a smartphone. You'll also need to connect a bank account through Stripe.",
  },
  {
    q: "I'm newer to the trade. Can I still join?",
    a: "Yes. You can start at the Basic tier, which covers jobs like oil changes, batteries, wipers, filters, and bulbs. As you build experience and certifications, you can move up to certified work.",
  },
  {
    q: "How do I get paid?",
    a: "Customers pay through the app. When you mark a job complete, the payment is captured and your share is transferred to your connected Stripe account.",
  },
  {
    q: "Do I have to accept every job?",
    a: "No. Go online when you want work, accept the jobs you want, and go offline when you're done. Declining a request is free — but once you accept a job, you're committed. Customers count on it.",
  },
];

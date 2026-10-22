export type Faq = { q: string; a: string };

export const CUSTOMER_FAQ: Faq[] = [
  {
    q: "How do I know the price is fair?",
    a: "Every mechanic's hourly rate is posted upfront, and each service shows an estimated time range. When you book, you see the maximum you could pay before you confirm. Your mechanic can't charge more than that estimate.",
  },
  {
    q: "Are these mechanics actually any good?",
    a: "Every mechanic passes a background check and we review their experience before they can take jobs. Basic-tier mechanics can only take simple jobs like oil changes and batteries; complex work is limited to certified mechanics. Reviews come only from customers with a completed booking.",
  },
  {
    q: "What if I have no idea what's wrong with my car?",
    a: "Most people don't — that's fine. Describe what you're noticing (“weird noise,” “won't start,” “yellow light on”) and book a diagnosis. Your mechanic figures it out on-site and explains it in plain English before touching anything.",
  },
  {
    q: "When am I charged?",
    a: "When you book, we place a hold on your card for the estimated maximum. You're only charged when the job is marked complete, for the final amount — which can't exceed the estimate. If you cancel before your mechanic heads out, the hold is released.",
  },
  {
    q: "Can I pay the mechanic directly?",
    a: "No. All payments go through WrenchNow so your booking is protected, reviews stay honest, and there's a record if anything goes wrong.",
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
    a: "Contact your mechanic first — they're independent professionals who stand behind their work. If that doesn't resolve it, WrenchNow can help mediate.",
  },
  {
    q: "Where do you operate?",
    a: "We're launching in the Denver metro area first, with more cities to follow.",
  },
];

export const MECHANIC_FAQ: Faq[] = [
  {
    q: "What does it cost to join?",
    a: "Applying is free. WrenchNow takes a platform fee on each completed job; the rest is paid out to your bank through Stripe.",
  },
  {
    q: "What do I need to get started?",
    a: "A valid driver's license, your own tools and transportation, a profile photo, liability insurance (we verify your certificate and you renew it before it expires), and a smartphone. You'll also need to pass a background check and connect a bank account through Stripe.",
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

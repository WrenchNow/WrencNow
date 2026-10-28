// "Not sure what's wrong?" — turns a plain-English description into likely causes and what to book.
// Pure and rule-based (no AI service, nothing sent anywhere). It's a starting point, never a diagnosis:
// the mechanic reads the customer's own words and confirms on site.

export type Safety = "stop" | "soon" | "ok";

export type LikelyCause = { cause: string; why: string };

export type SymptomMatch = {
  id: string;
  title: string;
  causes: LikelyCause[];
  /** Service slugs to book, best first. */
  services: string[];
  safety: Safety;
  advice?: string;
  score: number;
};

type Rule = Omit<SymptomMatch, "score"> & { patterns: RegExp[] };

const RULES: Rule[] = [
  {
    id: "no-start-click",
    title: "Won't start / clicking",
    patterns: [/won'?t start|wont start|doesn'?t start|not start|no start|dead|click(ing)?|won'?t turn over|cranks? slow|slow crank/i],
    causes: [
      { cause: "Weak or dead battery", why: "The most common reason a car won't start, especially in cold weather or after sitting." },
      { cause: "Corroded or loose battery cables", why: "A poor connection can act like a dead battery." },
      { cause: "Failing starter", why: "A single loud click with full dash lights often points to the starter." },
      { cause: "Alternator not charging", why: "If the battery keeps dying, the alternator may not be recharging it." },
    ],
    services: ["jump-start", "battery", "starter-alternator"],
    safety: "ok",
    advice: "Need to get going now? Book a jump start — your mechanic can test the battery and charging system while there.",
  },
  {
    id: "brakes",
    title: "Brake noise or feel",
    patterns: [/brak/i, /squeal|squeak|grind(ing)?/i, /pedal (is )?(soft|spongy|low)|spongy/i],
    causes: [
      { cause: "Worn brake pads", why: "Pads have a built-in squealer that makes noise when they get thin." },
      { cause: "Worn or warped rotors", why: "Grinding or a pulsing pedal usually means the rotors need work." },
      { cause: "Low or leaking brake fluid", why: "A soft or sinking pedal can mean air or a leak in the brake lines." },
    ],
    services: ["brakes"],
    safety: "soon",
    advice: "Grinding or a soft pedal means get it looked at right away and drive as little as possible.",
  },
  {
    id: "check-engine",
    title: "Check engine light",
    patterns: [/check engine|engine light|cel\b|warning light|light (is |came )?on|code/i],
    causes: [
      { cause: "Loose gas cap", why: "Surprisingly common — the evap system sees a leak." },
      { cause: "Oxygen sensor or catalytic converter", why: "Emissions faults are the most frequent check-engine codes." },
      { cause: "Misfire (spark plugs or ignition coil)", why: "A flashing light usually means a misfire." },
    ],
    services: ["check-engine", "spark-plugs"],
    safety: "soon",
    advice: "A flashing check engine light means a serious misfire — avoid driving until it's checked.",
  },
  {
    id: "overheating",
    title: "Overheating or coolant leak",
    patterns: [/overheat|temp(erature)? (gauge|light)|running hot|steam|smok(e|ing) from (the )?hood|coolant|antifreeze|sweet smell/i],
    causes: [
      { cause: "Low coolant or a leak", why: "A sweet smell or green/orange puddle points to a coolant leak." },
      { cause: "Failing thermostat or water pump", why: "Either can stop coolant from circulating." },
      { cause: "Radiator or cooling fan problem", why: "Overheating in traffic but fine on the highway often means the fan." },
    ],
    services: ["cooling-system"],
    safety: "stop",
    advice: "Stop driving if the temperature gauge is in the red — an overheating engine can be ruined quickly. Don't open a hot radiator cap.",
  },
  {
    id: "ac-heat",
    title: "AC or heat not working",
    patterns: [/\bac\b|a\/c|air condition|not (blowing )?cold|blows? warm|heat(er)? (not|isn'?t|doesn'?t)|no heat/i],
    causes: [
      { cause: "Low refrigerant (AC)", why: "AC that slowly stopped cooling usually has a small leak." },
      { cause: "AC compressor or clutch", why: "Warm air with a clicking or no-engage compressor." },
      { cause: "Low coolant or thermostat (heat)", why: "No heat in winter is often a cooling system issue." },
      { cause: "Blend door or blower motor", why: "Air not coming out, or the wrong temperature, can be a control problem." },
    ],
    services: ["ac-heat"],
    safety: "ok",
  },
  {
    id: "electrical",
    title: "Electrical problems",
    patterns: [/lights? (flicker|dim)|flicker|electrical|fuse|power window|radio (dies|off)|battery (light|keeps dying)|drain/i],
    causes: [
      { cause: "Alternator or charging system", why: "Dimming lights and a battery light point to charging problems." },
      { cause: "Parasitic battery drain", why: "Something staying on overnight can flatten the battery." },
      { cause: "Blown fuse or bad ground", why: "One circuit dead while the rest works is often a fuse or wiring fault." },
    ],
    services: ["electrical", "starter-alternator", "battery"],
    safety: "ok",
  },
  {
    id: "noise-suspension",
    title: "Clunks, rattles, or pulling",
    patterns: [/clunk|knock(ing)? over bumps|rattle|pulls? to|pulling|bouncy|bounc(es|ing)|wander|loose steering|steering wheel (shakes|vibrat)/i],
    causes: [
      { cause: "Worn suspension parts", why: "Clunks over bumps often come from ball joints, links or bushings." },
      { cause: "Worn shocks or struts", why: "A bouncy, floaty ride or nose-dive when braking." },
      { cause: "Alignment or tire wear", why: "Pulling to one side usually means alignment or uneven tires." },
    ],
    services: ["suspension", "tire-rotation"],
    safety: "soon",
  },
  {
    id: "squeal-belt",
    title: "Squeal from the engine",
    patterns: [/squeal(s|ing)? (when|on) (start|starting)|belt|chirp/i],
    causes: [
      { cause: "Worn or loose serpentine belt", why: "A squeal at start-up or when turning the wheel is classic belt noise." },
      { cause: "Failing belt tensioner or pulley", why: "A chirp that changes with engine speed." },
    ],
    services: ["serpentine-belt"],
    safety: "soon",
    advice: "If the belt breaks you can lose power steering and charging, so don't wait too long.",
  },
  {
    id: "rough-running",
    title: "Rough idle, misfire, or poor power",
    patterns: [/rough idle|idles? rough|misfir|stall(s|ing)?|hesitat|sputter|shak(es|ing) at idle|loss of power|no power|poor (gas|fuel) mileage/i],
    causes: [
      { cause: "Worn spark plugs or ignition coils", why: "The most common cause of a rough idle or misfire." },
      { cause: "Dirty air filter or vacuum leak", why: "The engine gets the wrong mix of air and fuel." },
      { cause: "Fuel delivery problem", why: "Hesitation under load can come from a weak fuel pump or clogged injector." },
    ],
    services: ["check-engine", "spark-plugs", "air-filters"],
    safety: "soon",
  },
  {
    id: "transmission",
    title: "Shifting problems",
    patterns: [/transmission|shift(ing)? (hard|late|rough)|slipping|slips|won'?t (go into|shift)|jerks? (when|between)|gear/i],
    causes: [
      { cause: "Low or old transmission fluid", why: "Slipping or harsh shifts often start with fluid." },
      { cause: "Transmission solenoid or sensor", why: "Electronic faults can cause late or harsh shifts." },
      { cause: "Worn clutch (manual)", why: "Engine revs climb but the car doesn't speed up." },
    ],
    services: ["transmission", "check-engine"],
    safety: "soon",
  },
  {
    id: "leak",
    title: "Fluid leak",
    patterns: [/leak|puddle|drip(ping)?|spot(s)? under/i],
    causes: [
      { cause: "Oil leak (brown/black)", why: "Valve cover and oil pan gaskets are common sources." },
      { cause: "Coolant leak (green/orange/pink, sweet smell)", why: "Hoses, radiator or water pump." },
      { cause: "AC condensation (clear water)", why: "Clear water under the front on a hot day is normal." },
    ],
    services: ["estimate-visit", "cooling-system", "oil-change"],
    safety: "soon",
    advice: "Note the color and where it drips — it tells your mechanic a lot.",
  },
  {
    id: "maintenance",
    title: "Routine maintenance",
    patterns: [/oil (change|light)|due for|maintenance|service light|tune.?up|wiper|headlight (out|burnt)|bulb|filter/i],
    causes: [{ cause: "Scheduled maintenance", why: "Oil, filters, wipers and bulbs are quick jobs a mobile mechanic does on the spot." }],
    services: ["oil-change", "air-filters", "wipers", "bulbs"],
    safety: "ok",
  },
];

const SAFETY_RANK: Record<Safety, number> = { stop: 0, soon: 1, ok: 2 };

/** Likely matches for a description, best first (at most `limit`). Empty when nothing matches. */
export function analyzeSymptoms(description: string, limit = 2): SymptomMatch[] {
  const text = description.trim().slice(0, 2000);
  if (text.length < 3) return [];
  return RULES.map(({ patterns, ...rule }) => ({ ...rule, score: patterns.filter((p) => p.test(text)).length }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || SAFETY_RANK[a.safety] - SAFETY_RANK[b.safety])
    .slice(0, limit);
}

export const SAFETY_LABEL: Record<Safety, string> = {
  stop: "Stop driving — get it checked before you go anywhere",
  soon: "Get it checked soon",
  ok: "Usually safe to drive to your appointment",
};

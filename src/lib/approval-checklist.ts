// What an admin confirms by hand before approving a mechanic. The server requires every item.
export const APPROVAL_CHECKLIST = [
  { key: "photo", label: "Profile photo is a real, clear headshot of this person (not a logo, car, cartoon or stock photo)" },
  { key: "name", label: "Name looks real and matches the insurance certificate" },
  { key: "phone", label: "Phone number is a real, reachable number" },
  { key: "experience", label: "Bio and years of experience are believable and fit the tier assigned" },
  { key: "area", label: "Base location is in an area we serve, and the travel radius is reasonable" },
  { key: "tools", label: "Confirmed they have their own tools and transportation" },
] as const;

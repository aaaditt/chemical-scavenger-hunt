/** Player-facing copy for RPC error codes. Says what happened and what to do next. */
const MESSAGES: Record<string, string> = {
  not_registered: "Your lab isn't set up yet. Sign in again.",
  disqualified: "This lab has been disqualified by the organizers.",
  game_closed: "The lab is closed right now. Watch the Insta for when it opens.",
  frozen: "Your lab is frozen. Wait for the timer, then try again.",
  slow_down: "Too fast. Wait a couple of seconds and try again.",
  invalid_code: "That code doesn't exist. Check it and try again.",
  not_active: "This isotope hasn't been released yet. Watch for the drop.",
  expired: "Too late — this isotope has decayed.",
  capped_out: "Someone beat you to it. Every sample of this one is claimed.",
  empty_recipe: "Add at least one element to the flask.",
  bad_quantity: "Quantities must be between 1 and 99.",
  unknown_element: "That element isn't in this game.",
  missing_element: "You don't have every element in that mix.",
  bad_catalyst_code: "That catalyst code doesn't exist.",
  code_used: "That catalyst code has already been used. Ask for a fresh one.",
  code_expired: "That catalyst code expired. Ask for a fresh one.",
  too_many_codes: "You have too many active codes. Wait for some to be used or expire.",
  not_giftable: "That element can't be gifted.",
  no_gifts_left: "You've used all your gift links.",
  own_gift: "You can't redeem your own gift.",
  gift_used: "That gift has already been claimed.",
  already_have: "You already have this element — pass the link to someone else.",
  bad_name: "Pick a name between 2 and 24 characters.",
  already_in_alliance: "You're already in an alliance. Leave it first.",
  cannot_rejoin: "You left this alliance. There's no going back.",
  alliance_full: "That alliance is full.",
  alliance_dissolved: "That alliance no longer exists.",
  not_in_alliance: "You're not in an alliance.",
  market_closed: "The black market is closed.",
  already_played: "You've already made your deal at this market.",
  admin_only: "Organizers only.",
  network: "Can't reach the lab. Check your connection and try again.",
};

export function errorMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Try again.";
}

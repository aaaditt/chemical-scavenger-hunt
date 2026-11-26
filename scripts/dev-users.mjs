// LOCAL DEV ONLY: creates password users so you can play without Google.
//   admin@dubai.bits-pilani.ac.in (organizer) + player1..4@dubai.bits-pilani.ac.in, password "devpassword".
// Also opens the game. Usage: node scripts/dev-users.mjs   (local supabase must be running)
import { execSync } from "node:child_process";

const status = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8" }).replace(/^[^{]*/, ""));
const url = status.API_URL;
const key = status.SERVICE_ROLE_KEY;
if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("Refusing to run against a non-local Supabase.");

const sql = (q) => execSync(`docker exec -i supabase_db_chemical-scavenger-hunt psql -U postgres -qtA`, { input: q, encoding: "utf8" });
sql(`insert into admin_emails (email) values ('admin@dubai.bits-pilani.ac.in') on conflict do nothing;
     update game_settings set game_open = true;`);

const users = ["admin", "player1", "player2", "player3", "player4"];
for (const u of users) {
  const email = `${u}@dubai.bits-pilani.ac.in`;
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "devpassword", email_confirm: true, user_metadata: { full_name: u === "admin" ? "Lab Admin" : `Player ${u.slice(-1)}` } }),
  });
  const body = await res.json();
  console.log(res.ok ? `created ${email}` : `${email}: ${body.msg ?? body.message ?? JSON.stringify(body)}`);
}
console.log("Game opened. Password for all: devpassword");

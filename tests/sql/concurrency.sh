#!/usr/bin/env bash
# Race test: N players claim a cap-5 QR simultaneously; exactly 5 must succeed.
# Run against LOCAL supabase only (creates throwaway users, then deletes them).
set -euo pipefail
DB=supabase_db_chemical-scavenger-hunt
N=${N:-30}
psql() { docker exec -i "$DB" psql -U postgres -qtA -v ON_ERROR_STOP=1 "$@"; }

psql <<SQL
update game_settings set game_open = true, scan_cooldown_seconds = 0;
insert into qr_codes (code, kind, element, cap, location_label) values ('RACE-TEST', 'element', 'Au', 5, 'race');
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'race' || i || '@dubai.bits-pilani.ac.in', now(), now()
from generate_series(1, $N) i;
SQL

ids=$(psql -c "select id from players where email like 'race%'")
for id in $ids; do
  psql -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"$id\",\"role\":\"authenticated\"}', false); select coalesce(claim_qr('RACE-TEST')->>'status', claim_qr('RACE-TEST')->>'error');" 2>&1 | tail -1 &
done > /tmp/race-results.txt
wait

ok=$(grep -c new_element /tmp/race-results.txt || true)
capped=$(grep -c capped_out /tmp/race-results.txt || true)
count=$(psql -c "select claimed_count from qr_codes where code = 'RACE-TEST'")

psql <<SQL
delete from auth.users where email like 'race%@dubai.bits-pilani.ac.in';
delete from qr_codes where code = 'RACE-TEST';
update game_settings set game_open = false, scan_cooldown_seconds = 3;
SQL

echo "players=$N succeeded=$ok capped_out=$capped claimed_count=$count"
[ "$ok" = "5" ] && [ "$count" = "5" ] && echo "RACE TEST PASSED" || { echo "RACE TEST FAILED"; exit 1; }

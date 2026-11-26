-- Organizer view of the full catalog (recipes included), for hint-QR creation and answer keys.
create or replace function public.admin_compounds() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _require_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'formula', c.formula, 'recipe', c.recipe, 'catalyst', c.catalyst,
    'tier', c.tier, 'points', c.points, 'locked_hint', c.locked_hint,
    'first_by', (select display_name from players where id = c.first_by),
    'made_by', (select count(*) from syntheses s where s.compound = c.id)) order by c.points desc), '[]')
  from compounds c);
end $$;
revoke execute on function public.admin_compounds() from public, anon;
grant execute on function public.admin_compounds() to authenticated;

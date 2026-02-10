-- ============================================================
-- Instagram RLS fix:
-- - aligns DB policies with RBAC permission map (access_profile_permissions)
-- - supports custom profiles with instagram view/create/edit/delete
-- ============================================================

create or replace function public.can_manage_instagram(action text default 'view')
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    left join public.access_profiles ap on ap.id = p.access_profile_id
    left join public.access_profile_permissions app
      on app.profile_id = ap.id
      and app.page_key = 'instagram'
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'editor')
        or coalesce(ap.is_admin, false) = true
        or (
          case action
            when 'view' then coalesce(app.can_view, false)
            when 'create' then coalesce(app.can_create, false)
            when 'edit' then coalesce(app.can_edit, false)
            when 'delete' then coalesce(app.can_delete, false)
            else false
          end
        )
      )
  );
$$ language sql security definer stable
set search_path = public;

-- instagram_instances
drop policy if exists "instagram_instances_select_authenticated" on public.instagram_instances;
create policy "instagram_instances_select_authenticated"
on public.instagram_instances for select
to authenticated
using (public.can_manage_instagram('view'));

drop policy if exists "instagram_instances_editor_admin_manage" on public.instagram_instances;
drop policy if exists "instagram_instances_insert_manage" on public.instagram_instances;
create policy "instagram_instances_insert_manage"
on public.instagram_instances for insert
to authenticated
with check (public.can_manage_instagram('create'));

drop policy if exists "instagram_instances_update_manage" on public.instagram_instances;
create policy "instagram_instances_update_manage"
on public.instagram_instances for update
to authenticated
using (public.can_manage_instagram('edit'))
with check (public.can_manage_instagram('edit'));

drop policy if exists "instagram_instances_delete_manage" on public.instagram_instances;
create policy "instagram_instances_delete_manage"
on public.instagram_instances for delete
to authenticated
using (public.can_manage_instagram('delete'));

-- instagram_post_drafts
drop policy if exists "instagram_post_drafts_select_authenticated" on public.instagram_post_drafts;
create policy "instagram_post_drafts_select_authenticated"
on public.instagram_post_drafts for select
to authenticated
using (public.can_manage_instagram('view'));

drop policy if exists "instagram_post_drafts_editor_admin_insert" on public.instagram_post_drafts;
create policy "instagram_post_drafts_editor_admin_insert"
on public.instagram_post_drafts for insert
to authenticated
with check (public.can_manage_instagram('create') and created_by = auth.uid());

drop policy if exists "instagram_post_drafts_editor_admin_update" on public.instagram_post_drafts;
create policy "instagram_post_drafts_editor_admin_update"
on public.instagram_post_drafts for update
to authenticated
using (public.can_manage_instagram('edit'))
with check (public.can_manage_instagram('edit'));

drop policy if exists "instagram_post_drafts_delete_manage" on public.instagram_post_drafts;
create policy "instagram_post_drafts_delete_manage"
on public.instagram_post_drafts for delete
to authenticated
using (public.can_manage_instagram('delete'));

-- instagram_post_assets
drop policy if exists "instagram_post_assets_select_authenticated" on public.instagram_post_assets;
create policy "instagram_post_assets_select_authenticated"
on public.instagram_post_assets for select
to authenticated
using (public.can_manage_instagram('view'));

drop policy if exists "instagram_post_assets_editor_admin_manage" on public.instagram_post_assets;
drop policy if exists "instagram_post_assets_insert_manage" on public.instagram_post_assets;
create policy "instagram_post_assets_insert_manage"
on public.instagram_post_assets for insert
to authenticated
with check (public.can_manage_instagram('create'));

drop policy if exists "instagram_post_assets_update_manage" on public.instagram_post_assets;
create policy "instagram_post_assets_update_manage"
on public.instagram_post_assets for update
to authenticated
using (public.can_manage_instagram('edit'))
with check (public.can_manage_instagram('edit'));

drop policy if exists "instagram_post_assets_delete_manage" on public.instagram_post_assets;
create policy "instagram_post_assets_delete_manage"
on public.instagram_post_assets for delete
to authenticated
using (public.can_manage_instagram('delete'));

-- instagram_post_jobs
drop policy if exists "instagram_post_jobs_select_authenticated" on public.instagram_post_jobs;
create policy "instagram_post_jobs_select_authenticated"
on public.instagram_post_jobs for select
to authenticated
using (public.can_manage_instagram('view'));

drop policy if exists "instagram_post_jobs_editor_admin_insert" on public.instagram_post_jobs;
create policy "instagram_post_jobs_editor_admin_insert"
on public.instagram_post_jobs for insert
to authenticated
with check (public.can_manage_instagram('create') and created_by = auth.uid());

drop policy if exists "instagram_post_jobs_editor_admin_update" on public.instagram_post_jobs;
create policy "instagram_post_jobs_editor_admin_update"
on public.instagram_post_jobs for update
to authenticated
using (public.can_manage_instagram('edit'))
with check (public.can_manage_instagram('edit'));

drop policy if exists "instagram_post_jobs_delete_manage" on public.instagram_post_jobs;
create policy "instagram_post_jobs_delete_manage"
on public.instagram_post_jobs for delete
to authenticated
using (public.can_manage_instagram('delete'));

-- storage policy for uploads
drop policy if exists "instagram_posts_editor_admin_upload" on storage.objects;
create policy "instagram_posts_editor_admin_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'instagram_posts'
  and public.can_manage_instagram('edit')
);

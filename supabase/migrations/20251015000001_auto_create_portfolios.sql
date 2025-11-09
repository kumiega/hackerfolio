-- Modify handle_new_user function to also create default portfolio for new users
create or replace function public.handle_new_user()
returns trigger as $$
declare
  avatar_url text;
begin
  -- Get avatar URL from user metadata if available (GitHub OAuth)
  avatar_url := (new.raw_user_meta_data->>'avatar_url');

  -- Create user profile
  insert into public.user_profiles (id, username, is_onboarded)
  values (new.id, null, false)
  on conflict (id) do nothing;

  -- Create default portfolio with bio components
  insert into public.portfolios (user_id, draft_data)
  values (
    new.id,
    jsonb_build_object(
      'full_name', '',
      'position', '',
      'avatar_url', null,
      'bio', jsonb_build_array(
        jsonb_build_object(
          'id', 'default-personal-info',
          'type', 'personal_info',
          'data', jsonb_build_object('full_name', '', 'position', ''),
          'visible', true
        ),
        jsonb_build_object(
          'id', 'default-avatar',
          'type', 'avatar',
          'data', jsonb_build_object('avatar_url', coalesce(avatar_url, '')),
          'visible', true
        ),
        jsonb_build_object(
          'id', 'default-social-links',
          'type', 'social_links',
          'data', jsonb_build_object('github', '', 'linkedin', '', 'x', '', 'website', jsonb_build_array()),
          'visible', true
        ),
        jsonb_build_object(
          'id', 'default-bio-text',
          'type', 'text',
          'data', jsonb_build_object('content', ''),
          'visible', true
        )
      ),
      'sections', jsonb_build_array()
    )
  )
  on conflict do nothing;

  return new;
exception
  when others then
    raise log 'Error creating user profile/portfolio for user %: %', new.id, SQLERRM;
    return new;
end;
$$ language plpgsql security definer;

# Database Schema Plan

## 1. Tables

### 1.1 users
- Managed by Supabase Auth for GitHub OAuth and email/password

### 1.2 user_profiles
- id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
- username TEXT UNIQUE (subdomain for portfolio)
- avatar_url TEXT
- is_onboarded BOOLEAN NOT NULL DEFAULT false
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

Constraints:
- username_length: `username is null or (char_length(username) >= 3 and char_length(username) <= 30)`
- username_format: `username is null or username ~* '^[a-z0-9-]+$'`

### 1.3 portfolios
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE
- draft_data JSONB NOT NULL DEFAULT '{"sections": []}'
- published_data JSONB DEFAULT NULL
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
- last_published_at TIMESTAMPTZ DEFAULT NULL

#### JSONB Structure (draft_data and published_data):
```json
{
  "sections": [
    {
      "id": "uuid",
      "title": "string",
      "slug": "string",
      "description": "string",
      "visible": true,
      "components": [
        {
          "id": "uuid",
          "type": "text|card|pills|social_links|list|image|bio",
          "data": {
            // Component-specific data
          }
        }
      ]
    }
  ]
}
```

Component types and their data structures:
- `text`: `{ "content": "string (max 2000 chars)" }`
- `card`: `{ "repo_url": "string", "title": "string (max 100)", "summary": "string (max 500)", "tech": ["string"] }`
- `pills`: `{ "items": ["string (max 30 items, 20 chars each)"] }`
- `social_links`: `{ "github": "url", "linkedin": "url", "x": "url", "website": [{ "name": "string", "url": "string" }] }`
- `list`: `{ "items": [{ "label": "string (max 80)", "url": "string" }] }`
- `image`: `{ "url": "string", "alt": "string (max 120)", "maxSizeMB": 2 }`
- `bio`: `{ "headline": "string (max 120)", "about": "string (max 2000)" }`

### 1.4 oauth_tokens (optional for GitHub integration)
- user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE
- provider TEXT NOT NULL
- access_token TEXT NOT NULL
- refresh_token TEXT
- expires_at TIMESTAMPTZ
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.5 error tracking

#### 1.5.1 Enums
```sql
CREATE TYPE error_severity AS ENUM ('debug','info','warn','error','fatal');
CREATE TYPE error_source   AS ENUM ('frontend','api','edge','worker','db','other');
```

#### 1.5.2 app_errors
- id BIGSERIAL PRIMARY KEY
- occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
- severity error_severity NOT NULL DEFAULT 'error'
- source error_source NOT NULL DEFAULT 'other'
- user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL
- request_id TEXT
- session_id TEXT
- route TEXT
- endpoint TEXT
- error_code TEXT
- message TEXT NOT NULL
- stack TEXT
- context JSONB NOT NULL DEFAULT '{}'
- client_ip INET
- user_agent TEXT
- username TEXT
- portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL

## 2. Relations

- **auth.users** 1 — 1 **user_profiles** (auth.users.id = user_profiles.id)
- **user_profiles** 1 — 1 **portfolios** (user_profiles.id = portfolios.user_id)
- **user_profiles** 1 — 1 **oauth_tokens** (user_profiles.id = oauth_tokens.user_id)
- **portfolios** contain sections and components as JSONB (no separate tables)

## 3. Indexes

- B-tree on `user_profiles(username)` (unique)
- B-tree on `portfolios(user_id)` (unique)
- GIN on `portfolios(draft_data)` for JSONB queries
- GIN on `portfolios(published_data)` for JSONB queries
- B-tree on `app_errors(occurred_at desc)`, `app_errors(severity)`, `app_errors(source)`, `app_errors(user_id)`, `app_errors(request_id)`, `app_errors(portfolio_id)`
- GIN on `app_errors(context)`

## 4. RLS Policies

### 4.1 Enable RLS
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;
```

### 4.2 Policies

#### user_profiles
```sql
-- Authenticated users can read their own profile
CREATE POLICY user_profiles_select_authenticated ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Authenticated users can insert their own profile (handled by trigger)
CREATE POLICY user_profiles_insert_authenticated ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Authenticated users can update their own profile
CREATE POLICY user_profiles_update_authenticated ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Authenticated users can delete their own profile
CREATE POLICY user_profiles_delete_authenticated ON user_profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

-- Anonymous users cannot access profiles
CREATE POLICY user_profiles_anon_deny_all ON user_profiles
  FOR ALL TO anon
  USING (false);
```

#### portfolios
```sql
-- Authenticated users can read their own portfolio
CREATE POLICY portfolios_select_authenticated ON portfolios
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can insert their own portfolio
CREATE POLICY portfolios_insert_authenticated ON portfolios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Authenticated users can update their own portfolio
CREATE POLICY portfolios_update_authenticated ON portfolios
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Authenticated users can delete their own portfolio
CREATE POLICY portfolios_delete_authenticated ON portfolios
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Anonymous users cannot access unpublished portfolios
CREATE POLICY portfolios_select_anon ON portfolios
  FOR SELECT TO anon
  USING (false);

-- Public read access to published portfolios (for SSR)
-- This will be handled via service role for SSR endpoints
```

#### oauth_tokens
```sql
-- Authenticated users can only access their own tokens
CREATE POLICY oauth_tokens_select_authenticated ON oauth_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY oauth_tokens_insert_authenticated ON oauth_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY oauth_tokens_update_authenticated ON oauth_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY oauth_tokens_delete_authenticated ON oauth_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Anonymous users cannot access tokens
CREATE POLICY oauth_tokens_anon_deny_all ON oauth_tokens
  FOR ALL TO anon
  USING (false);
```

#### app_errors
```sql
-- Insert-only from anon/auth to allow client and API logging
CREATE POLICY app_errors_insert_anon ON app_errors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY app_errors_insert_authenticated ON app_errors FOR INSERT TO authenticated WITH CHECK (true);

-- No read/update/delete for anon/auth (service role only via bypass RLS)
CREATE POLICY app_errors_select_anon ON app_errors FOR SELECT TO anon USING (false);
CREATE POLICY app_errors_select_authenticated ON app_errors FOR SELECT TO authenticated USING (false);
CREATE POLICY app_errors_update_any ON app_errors FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY app_errors_delete_any ON app_errors FOR DELETE TO authenticated USING (false);
```

## 5. Helper Functions

### 5.1 User Profile Management
```sql
-- Auto-create profile on signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, is_onboarded)
  VALUES (new.id, null, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set username during onboarding (one-time only)
CREATE FUNCTION public.set_username(username_input TEXT)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result public.user_profiles;
BEGIN
  IF username_input IS NULL OR char_length(username_input) < 3 OR char_length(username_input) > 30 THEN
    RAISE EXCEPTION 'Username must be between 3 and 30 characters';
  END IF;
  
  IF NOT (username_input ~* '^[a-z0-9-]+$') THEN
    RAISE EXCEPTION 'Username can only contain lowercase letters, numbers, and hyphens';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE username = username_input) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;
  
  UPDATE public.user_profiles
  SET username = username_input
  WHERE id = auth.uid()
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  RETURN result;
END;
$$;

-- Complete onboarding
CREATE FUNCTION public.complete_onboarding()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
  SET is_onboarded = true
  WHERE id = auth.uid();
END;
$$;
```

### 5.2 Portfolio Management
```sql
-- Auto-update updated_at timestamp
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Publish portfolio (copy draft_data to published_data)
CREATE FUNCTION public.publish_portfolio(portfolio_id UUID)
RETURNS public.portfolios
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result public.portfolios;
BEGIN
  UPDATE public.portfolios
  SET 
    published_data = draft_data,
    last_published_at = now()
  WHERE id = portfolio_id AND user_id = auth.uid()
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portfolio not found or access denied';
  END IF;

  RETURN result;
END;
$$;
```

### 5.3 Error Logging
```sql
-- Log application errors
CREATE FUNCTION public.log_app_error(
  p_severity error_severity,
  p_source error_source,
  p_message TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}',
  p_client_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_portfolio_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  error_id BIGINT;
BEGIN
  INSERT INTO public.app_errors (
    severity, source, message, error_code, route, endpoint,
    request_id, session_id, stack, context, client_ip, user_agent,
    user_id, portfolio_id
  )
  VALUES (
    p_severity, p_source, p_message, p_error_code, p_route, p_endpoint,
    p_request_id, p_session_id, p_stack, p_context, p_client_ip, p_user_agent,
    auth.uid(), p_portfolio_id
  )
  RETURNING id INTO error_id;
  
  RETURN error_id;
END;
$$;

-- Cleanup old errors
CREATE FUNCTION public.app_errors_cleanup(retain_days INT DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.app_errors
  WHERE occurred_at < now() - (retain_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
```

## 6. Additional Notes

- **Limits**: Max 10 sections and 15 components per portfolio enforced at application level (validate draft_data before save)
- **JSONB Validation**: Structure validation occurs at application layer using Zod schemas
- **Draft/Publish Workflow**: 
  - New portfolios have `published_data = NULL` until first publish
  - Publishing copies `draft_data` → `published_data` and sets `last_published_at`
  - Users continue editing `draft_data`, can republish to update `published_data`
- **Public Access**: SSR endpoints use service role to read `published_data` by username
- **Preview Access**: Middleware validates owner access to view `draft_data` at `/preview/{username}`
- **Error Logging**: Available via `public.log_app_error()` function, cleanup utility: `public.app_errors_cleanup(retain_days int)`
- **Scalability**: Consider partitioning app_errors table in future iterations

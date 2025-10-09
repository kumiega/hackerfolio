# Database Schema Plan

## 1. Tables

### 1.1 users
- will be managed by Supabase Auth for GitHub.

### 1.2 portfolios
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE
- is_published BOOLEAN NOT NULL DEFAULT false
- published_at TIMESTAMPTZ
- title VARCHAR(100) NOT NULL
- description TEXT
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()

### 1.3 sections
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE
- name VARCHAR(150) NOT NULL
- position INT NOT NULL
- visible BOOLEAN NOT NULL DEFAULT true

### 1.4 component_type ENUM
```sql
CREATE TYPE component_type AS ENUM (
  'text',
  'project_card',
  'tech_list',
  'social_links',
  'link_list',
  'ordered_list',
  'gallery',
  'bio'
);
```

### 1.5 components
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE
- type component_type NOT NULL
- position INT NOT NULL
- data JSONB NOT NULL

## 2. Relations

- **user_profiles** 1 — 1 **portfolios** (user_profiles.id = portfolios.user_id)
- **portfolios** 1 — * **sections** (portfolios.id = sections.portfolio_id)
- **sections** 1 — * **components** (sections.id = components.section_id)

## 3. Indexes

- B-tree on `portfolios(user_id)`
- B-tree on `sections(portfolio_id)`, `sections(position)`
- B-tree on `components(section_id)`, `components(position)`
- GIN on `components(data)`

## 4. RLS Policies

### 4.1 Enable RLS
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
```

### 4.2 Policies

#### user_profiles
```sql
CREATE POLICY user_profile_owner ON user_profiles
  USING (id = auth.uid());
```

#### portfolios
```sql
CREATE POLICY portfolio_owner ON portfolios
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

#### sections
```sql
CREATE POLICY section_owner ON sections
  USING (
    EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.id = sections.portfolio_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.id = sections.portfolio_id
        AND p.user_id = auth.uid()
    )
  );
```

#### components
```sql
CREATE POLICY component_owner ON components
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN portfolios p ON p.id = s.portfolio_id
      WHERE s.id = components.section_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN portfolios p ON p.id = s.portfolio_id
      WHERE s.id = components.section_id
        AND p.user_id = auth.uid()
    )
  );
```

## 5. Additional Notes

- Limits on max sections (10) and max components (15) per portfolio to be enforced at application level or via additional database triggers/policies as needed.
- JSONB `data` field can store component-specific attributes; structure validation to occur at application or via JSON schema integration.
- Consider partitioning or auditing in future iterations for scalability.

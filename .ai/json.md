# Portfolio JSON Templates for LLM Generation

This file contains JSON templates for generating portfolio content using LLM prompts. Each template shows the expected structure for different portfolio elements.

## Portfolio Overview Structure

```json
{
  "bio": {
    "full_name": "string",
    "position": "string (optional)",
    "summary": "string",
  },
  "sections": [
    {
      "id": "string (UUID)",
      "title": "string",
      "slug": "string",
      "description": "string",
      "visible": true,
      "components": [
        {
          "id": "string (UUID)",
          "type": "component_type",
          "data": {}
        }
      ]
    }
  ]
}
```

## Bio Component Templates

### Personal Info Component
```json
{
  "id": "uuid-string",
  "type": "personal_info",
  "data": {
    "full_name": "John Doe",
    "position": "Full Stack Developer"
  }
}
```

### Bio Text Component
```json
{
  "id": "uuid-string",
  "type": "bio",
  "data": {
    "headline": "<position>",
    "about": "<<Detailed description about the person's background, experience, and interests. Can be up to 2000 characters long.>>"
  }
}
```

## Section Component Templates

### Text Component
```json
{
  "id": "uuid-string",
  "type": "text",
  "data": {
    "content": "<Text. Limited to 2000 characters.>"
  }
}
```

### Project Cards Component
```json
{
  "id": "uuid-string",
  "type": "cards",
  "data": {
    "cards": [
      {
        "repo_url": "https://github.com/username/project-name",
        "title": "Project Title",
        "summary": "Brief description of the project and its purpose. Max 500 characters.",
        "tech": ["Technology 1", "Technology 2", "Technology 3"]
      }
    ]
  }
}
```

### Pills Component
```json
{
  "id": "uuid-string",
  "type": "pills",
  "data": {
    "items": [
      "Pill 1",
      "Pill 2",
      "Pill 3",
    ]
  }
}
```

### Social Links Component
```json
{
  "id": "uuid-string",
  "type": "social_links",
  "data": {
    "github": "https://github.com/username",
    "linkedin": "https://linkedin.com/in/username",
    "x": "https://twitter.com/username",
    "website": [
      {
        "name": "Personal Blog",
        "url": "https://blog.example.com"
      },
      {
        "name": "Company Website",
        "url": "https://company.com"
      }
    ]
  }
}
```

### Link List Component
```json
{
  "id": "uuid-string",
  "type": "list",
  "data": {
    "items": [
      {
        "label": "My Blog",
        "url": "https://blog.example.com"
      },
      {
        "label": "LinkedIn Profile",
        "url": "https://linkedin.com/in/username"
      },
      {
        "label": "GitHub",
        "url": "https://github.com/username"
      }
    ]
  }
}
```

### Image Component
```json
{
  "id": "uuid-string",
  "type": "image",
  "data": {
    "url": "https://example.com/image.jpg",
    "alt": "Descriptive alt text for accessibility",
  }
}
```

## Complete Section Template

```json
{
  "id": "uuid-string",
  "title": "Section Title",
  "slug": "section-slug",
  "description": "Brief description of what this section contains",
  "visible": true,
  "components": [
    {
      "id": "uuid-string",
      "type": "text",
      "data": {
        "content": "Component content here"
      }
    }
  ]
}
```

## LLM Generation Instructions

When generating portfolio JSON using these templates:

1. **Always include valid UUIDs** for id fields (use format like "550e8400-e29b-41d4-a716-446655440000")

2. **Respect character limits**:
   - Titles: max 100 characters
   - Descriptions/Summaries: max 500 characters
   - Content/About text: max 2000 characters
   - Labels: max 80 characters
   - Items: max 20 characters each

3. **Component type validation**:
   - Use only the specified component types: text, pills

4. **Array limits**:
   - Pills: max 30 items
   - Link lists: no specific limit but keep reasonable

5. **Required fields**:
   - Bio: full_name is required
   - Text components: content is required
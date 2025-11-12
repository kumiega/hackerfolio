/**
 * JSON Schema for AI-generated portfolio response format
 * Only includes fields that AI generates (bio basics and sections)
 */
export const aiPortfolioResponseSchema = {
  type: "object",
  properties: {
    bio: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        position: { type: "string" },
        summary: { type: "string", maxLength: 500 },
      },
      required: ["full_name", "position", "summary"],
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", maxLength: 100 },
          slug: { type: "string" },
          visible: { type: "boolean" },
          components: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string", enum: ["text", "pills"] },
                data: { type: "object" },
              },
              required: ["id", "type", "data"],
            },
          },
        },
        required: ["id", "title", "slug", "visible", "components"],
      },
    },
  },
  required: ["bio", "sections"],
};

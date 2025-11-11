export const replacePlaceholders = (prompt: string, data: Record<string, string>) => {
  return prompt.replace(/{(\w+)}/g, (match, key) => data[key] || match);
};

// Backend validation before sending to LLM
export const sanitizeInput = (input: string): string => {
  // Remove or escape prompt injection attempts
  const dangerous = [
    /ignore (previous|all|above) instructions?/gi,
    /system prompt/gi,
    /you are now/gi,
    /new instructions?:/gi,
    /forget (everything|all|previous)/gi,
    /\[SYSTEM\]/gi,
    /<\|im_start\|>/gi, // Model-specific tokens
  ];

  let sanitized = input;
  dangerous.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "");
  });

  return sanitized.trim();
};

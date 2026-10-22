// Har provider ke alag errors ko ek jaise codes mein badalta hai.
// Frontend sirf in codes ko dekhta hai, provider ko nahi.
//
// code: "config" | "auth" | "quota" | "model" | "blocked" | "timeout" | "network" | "provider"

export class AIError extends Error {
  constructor(code, message, { status, retryAfterSeconds } = {}) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// HTTP status -> hamara code
export function httpStatusToCode(status) {
  if (status === 429) return "quota";
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "model";
  return "provider";
}

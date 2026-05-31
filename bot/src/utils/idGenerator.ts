// ============================================================
// ALPHANUMERIC ID GENERATOR
// Generates unique 5-char IDs with platform prefix
// ============================================================

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateRandomId(length: number = 5): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC.charAt(Math.floor(Math.random() * ALPHANUMERIC.length));
  }
  return result;
}

export async function generateUniqueAlphanumericId(
  initials: string = "BUCHI"
): Promise<string> {
  const supabase = (await import("./supabase")).supabase;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const id = `${initials}-${generateRandomId(5)}`;
    
    const { data } = await supabase
      .from("users")
      .select("alphanumeric_id")
      .eq("alphanumeric_id", id)
      .single();

    if (!data) {
      return id; // Unique ID found
    }

    attempts++;
  }

  // Fallback with timestamp
  return `${initials}-${generateRandomId(5)}${Date.now().toString(36).toUpperCase().slice(-3)}`;
}

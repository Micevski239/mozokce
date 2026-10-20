/** Исто правило како во базата (profiles.username): 3–24 знаци, латиница/кирилица, бројки, _ . - */
export const USERNAME_PATTERN = /^[A-Za-z0-9_.\-А-Яа-яЃѓЅѕЈјЉљЊњЌќЏџЀѐЍѝ]{3,24}$/;

export function validateUsername(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 3) return "Корисничкото име мора да има најмалку 3 знаци.";
  if (name.length > 24) return "Корисничкото име може да има најмногу 24 знаци.";
  if (!USERNAME_PATTERN.test(name)) return "Дозволени се букви, бројки и знаците _ . -, без празни места.";
  return null;
}

export function validatePasswords(password: string, confirm: string): string | null {
  if (password.length < 8) return "Лозинката мора да има најмалку 8 знаци.";
  if (password !== confirm) return "Лозинките не се совпаѓаат.";
  return null;
}

/** Иницијал за аватар. */
export function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

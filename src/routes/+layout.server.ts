import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    return { user: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _, ...safeUser } = user;

  return {
    user: safeUser,
  };
};

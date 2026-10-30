import { logoutAction } from '@/app/actions/auth';

export function SignOut() {
  return (
    <form action={logoutAction}>
      <button className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-paper/60 hover:bg-paper/5 hover:text-paper">Sign out</button>
    </form>
  );
}

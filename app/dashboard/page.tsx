import { createClient } from "../../lib/supabase/server";
import { signOutAction } from "./actions";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <section className="home-card">
      <h1>Warehouse Dashboard</h1>
      <p>Authenticated with Supabase SSR.</p>
      <p>
        <strong>User:</strong> {user?.email}
      </p>
      <p>
        <strong>User ID:</strong> {user?.id}
      </p>
      <form action={signOutAction}>
        <button type="submit">Sign Out</button>
      </form>
    </section>
  );
}

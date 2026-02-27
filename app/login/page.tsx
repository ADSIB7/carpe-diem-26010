import { signInAction, signUpAction } from "./actions";

type Props = {
  searchParams?:
    | {
        error?: string;
        message?: string;
      }
    | Promise<{
        error?: string;
        message?: string;
      }>;
};

async function resolveSearchParams(
  searchParams: Props["searchParams"]
) {
  if (!searchParams) {
    return {};
  }
  if (typeof (searchParams as Promise<unknown>).then === "function") {
    return await (searchParams as Promise<{
      error?: string;
      message?: string;
    }>);
  }
  return searchParams;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await resolveSearchParams(searchParams);
  return (
    <section className="home-card">
      <h1>Warehouse Portal Login</h1>
      {params.error ? <p style={{ color: "#b42318" }}>{params.error}</p> : null}
      {params.message ? <p>{params.message}</p> : null}

      <div style={{ display: "grid", gap: "1rem" }}>
        <form action={signInAction} style={{ display: "grid", gap: "0.6rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Sign In</h2>
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Sign In</button>
        </form>

        <form action={signUpAction} style={{ display: "grid", gap: "0.6rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Create Account</h2>
          <input name="fullName" type="text" placeholder="Full Name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Sign Up</button>
        </form>
      </div>
    </section>
  );
}

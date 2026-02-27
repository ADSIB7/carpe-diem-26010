import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <section className="home-card">
      <h1>Warehouse Owner Portal</h1>
      <p>Clerk is configured with App Router and keyless mode support.</p>
      <SignedOut>
        <p>Use Sign In or Sign Up in the top bar to create your first test user.</p>
      </SignedOut>
      <SignedIn>
        <p>You are signed in. Open the profile icon in the top bar.</p>
      </SignedIn>
    </section>
  );
}

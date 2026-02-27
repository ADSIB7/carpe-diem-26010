"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

function fail(message: string) {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    fail("Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    fail(error.message);
  }

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!fullName || !email || !password) {
    fail("Name, email, and password are required.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "Warehouse Owner"
      }
    }
  });

  if (error) {
    fail(error.message);
  }

  if (data.user && data.session) {
    await supabase.from("warehouse_profiles").upsert(
      {
        user_id: data.user.id,
        name: fullName,
        member_since: `Member since ${new Date().getFullYear()}`
      },
      { onConflict: "user_id" }
    );
    redirect("/dashboard");
  }

  redirect("/login?message=Registration+successful.+Check+email+for+confirmation.");
}


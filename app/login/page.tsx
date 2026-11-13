import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSessionStudent } from "@/backend/services/authService";
import { LoginForm } from "@/components/auth/LoginForm";

// Reads the session cookie to redirect signed-in students.
export const instant = false;

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to GapFinder AI.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection();
  const student = await getSessionStudent();
  if (student) redirect("/dashboard");
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "login";
  return <LoginForm initialMode={mode} />;
}

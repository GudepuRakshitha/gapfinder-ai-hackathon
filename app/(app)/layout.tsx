import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSessionStudent, buildAuthSession } from "@/backend/services/authService";
import { AppShell } from "@/components/layout/AppShell";

// Every page under this layout requires a session cookie.
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Stop prerendering here: the entire authenticated shell is per-request.
  await connection();
  const student = await getSessionStudent();
  if (!student) {
    redirect("/login");
  }
  const session = await buildAuthSession(student);
  return <AppShell session={session}>{children}</AppShell>;
}

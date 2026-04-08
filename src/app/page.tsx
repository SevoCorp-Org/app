import { getDashboardUrl } from "@/lib/session";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LandingPage } from "./LandingPage";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect(getDashboardUrl(session.user.role));
  return <LandingPage />;
}

import { redirect } from "next/navigation";

export default function DashboardPage() {
  // Redirect to companies page by default
  redirect("/dashboard/companies");
}
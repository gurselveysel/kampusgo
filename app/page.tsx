import { redirect } from "next/navigation";

export default function HomePage() {
  // /pilot.html remains the untouched public DPÜ v15 demo. The account-based
  // Preview starts at the shared entry screen.
  redirect("/giris");
}

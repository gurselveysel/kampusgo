import { redirect } from "next/navigation";

export default function HomePage() {
  // The interactive pilot is shipped as a real HTML/CSS/JS application in
  // public/pilot.html. Keep the explicit extension: Vercel's cleanUrls
  // redirect previously collapsed this URL to /pilot, which has no App Router
  // page and therefore returned 404.
  redirect("/pilot.html");
}

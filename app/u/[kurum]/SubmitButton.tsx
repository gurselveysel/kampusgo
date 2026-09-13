"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "İşleniyor…" : children}</button>;
}

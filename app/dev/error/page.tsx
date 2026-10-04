import { notFound } from "next/navigation";

/**
 * Development-only route to preview app/error.tsx.
 * Visit /dev/error while `npm run dev` is running.
 */
export default function DevErrorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  throw new Error("Intentional error to preview the error page.");
}

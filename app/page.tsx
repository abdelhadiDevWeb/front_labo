import { redirect } from "next/navigation";

/** Root URL → home (avoids a separate heavy page chunk for `/`). */
export default function RootPage() {
  redirect("/home");
}

import { redirect } from "next/navigation";

/** Root URL always goes to /home — avoids a fragile re-export of a huge client page. */
export default function RootPage() {
  redirect("/home");
}

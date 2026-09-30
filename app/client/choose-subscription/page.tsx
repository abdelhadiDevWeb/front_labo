import { redirect } from "next/navigation";

/** Labs do not choose a subscription: the admin activates the account after the document upload. */
export default function ClientChooseSubscriptionPage() {
  redirect("/home");
}

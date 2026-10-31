import { redirect } from "next/navigation";

/** Admin home → straight to the License Keys manager. */
export default function AdminIndexPage() {
  redirect("/admin/keys");
}

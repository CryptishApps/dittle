import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/features/notes/AccountPage";

export const Route = createFileRoute("/_app/notes/account")({
  component: AccountRoute,
});

function AccountRoute() {
  const { account } = Route.useRouteContext();
  return <AccountPage account={account} />;
}

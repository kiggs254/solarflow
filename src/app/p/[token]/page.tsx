import { PublicProposalClient } from "./public-proposal-client";

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicProposalClient token={token} />;
}

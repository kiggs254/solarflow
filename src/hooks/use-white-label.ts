import useSWR from "swr";

export type WhiteLabelData = {
  logoUrl: string | null;
  faviconUrl: string | null;
  themeColor: string;
  companyName: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWhiteLabel() {
  const { data, error, isLoading, mutate } = useSWR<WhiteLabelData>(
    "/api/settings/white-label",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return {
    settings: data ?? {
      logoUrl: null,
      faviconUrl: null,
      themeColor: "#f59e0b",
      companyName: "SolarFlow",
    },
    isLoading,
    isError: !!error,
    mutate,
  };
}

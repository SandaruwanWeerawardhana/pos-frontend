import { OfflineBanner } from "@/components/shared/OfflineBanner";

export default function PosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 flex-col">
      <OfflineBanner />
      {children}
    </div>
  );
}

import { AppHeader } from "@/components/shell/app-header";
import { CommandPalette } from "@/components/shell/command-palette";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppHeader />
      <CommandPalette />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden pt-14 [&>*]:min-w-0 [&>*]:flex-1">{children}</div>
    </>
  );
}

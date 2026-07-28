import Nav from "@/components/Nav";
import NetworkWarning from "@/components/NetworkWarning";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <Nav />
      <div className="flex flex-col flex-1 items-center gap-4 px-4 py-10">
        <NetworkWarning />
        {children}
      </div>
    </div>
  );
}

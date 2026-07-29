import Nav from "@/components/Nav";
import NetworkWarning from "@/components/NetworkWarning";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <Nav />
      <NetworkWarning />
      {children}
    </div>
  );
}

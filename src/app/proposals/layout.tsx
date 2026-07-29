export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 items-center gap-4 w-full px-4 pt-4 pb-16">
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url(/voting-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="fixed inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, rgba(6,8,18,0.55), rgba(6,8,18,0.75))" }}
      />
      {children}
    </div>
  );
}

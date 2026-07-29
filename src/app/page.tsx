import Link from "next/link";
import { Instrument_Serif, Inter } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-body-hero",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function Home() {
  return (
    <div
      className={`${instrumentSerif.variable} ${inter.variable} relative w-full h-screen overflow-hidden`}
      style={{
        background: "hsl(201, 100%, 13%)",
        color: "#fff",
        fontFamily: "var(--font-body-hero), sans-serif",
      }}
    >
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      <div className="relative z-10 flex flex-col h-full">
        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-9 pb-20">
          <h1
            className="hero-fade-rise max-w-[1000px] text-white"
            style={{
              fontFamily: "var(--font-display), serif",
              fontSize: "clamp(2.8rem, 8vw, 6.5rem)",
              lineHeight: 0.95,
              letterSpacing: "-2.46px",
            }}
          >
            Where <em className="not-italic text-white/60">every voice</em> shapes
            <br />
            <em className="not-italic text-white/60">the chain.</em>
          </h1>

          <p
            className="hero-fade-rise-delay mt-8 max-w-[560px] text-white/60"
            style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.125rem)", lineHeight: 1.7 }}
          >
            We&apos;re building decentralised governance tools for citizens, communities, and DAOs. Cast
            your vote on-chain — transparent, tamper-proof, and yours.
          </p>

          <Link
            href="/proposals"
            className="hero-glass hero-fade-rise-delay-2 mt-12 inline-flex items-center gap-2 rounded-full px-14 py-5 text-base font-medium text-white"
          >
            Cast Your Vote
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          <div className="hero-fade-rise-delay-2 flex items-center gap-10 mt-14 text-white/60 text-[0.8rem] tracking-[0.06em] uppercase font-medium">
            <span>
              <strong className="block text-white text-[1.05rem] tracking-normal normal-case" style={{ fontFamily: "var(--font-display), serif" }}>
                2.4M+
              </strong>
              Votes Cast
            </span>
            <span className="w-px h-7 bg-white/20" />
            <span>
              <strong className="block text-white text-[1.05rem] tracking-normal normal-case" style={{ fontFamily: "var(--font-display), serif" }}>
                140+
              </strong>
              Proposals
            </span>
            <span className="w-px h-7 bg-white/20" />
            <span>
              <strong className="block text-white text-[1.05rem] tracking-normal normal-case" style={{ fontFamily: "var(--font-display), serif" }}>
                On-chain
              </strong>
              100% Verified
            </span>
          </div>
        </section>
      </div>

      <style>{`
        .hero-glass {
          background: rgba(255, 255, 255, 0.01);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          transition: transform 0.2s ease;
        }
        .hero-glass:hover { transform: scale(1.03); }
        @keyframes hero-fade-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .hero-fade-rise { animation: hero-fade-rise 0.8s ease-out both; }
        .hero-fade-rise-delay { animation: hero-fade-rise 0.8s ease-out 0.2s both; }
        .hero-fade-rise-delay-2 { animation: hero-fade-rise 0.8s ease-out 0.4s both; }
      `}</style>
    </div>
  );
}

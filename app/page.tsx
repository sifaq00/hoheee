import AnnounceBar from "@/components/landing/AnnounceBar";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Ticker from "@/components/landing/Ticker";
import PoweredBy from "@/components/landing/PoweredBy";
import Principles from "@/components/landing/Principles";
import LiveDemo from "@/components/landing/LiveDemo";
import ReportAnatomy from "@/components/landing/ReportAnatomy";
import StatsLedger from "@/components/landing/StatsLedger";
import Faq from "@/components/landing/Faq";
import CtaBand from "@/components/landing/CtaBand";
import Footer from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-full bg-white text-zinc-900">
      <AnnounceBar />
      <Navbar />
      <main>
        <Hero />
        <Ticker />
        <PoweredBy />
        <Principles />
        <LiveDemo />
        <ReportAnatomy />
        <StatsLedger />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

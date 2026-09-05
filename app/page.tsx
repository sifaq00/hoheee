import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Ticker from "@/components/landing/Ticker";
import Pipeline from "@/components/landing/Pipeline";
import LiveDemo from "@/components/landing/LiveDemo";
import Features from "@/components/landing/Features";
import Faq from "@/components/landing/Faq";
import CtaBanner from "@/components/landing/CtaBanner";
import Footer from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-full">
      <Navbar />
      <main>
        <Hero />
        <Ticker />
        <Pipeline />
        <LiveDemo />
        <Features />
        <Faq />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}

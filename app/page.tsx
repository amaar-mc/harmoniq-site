import Experience from '@/components/experience/Experience';
import AppSection from '@/components/sections/AppSection';
import Close from '@/components/sections/Close';
import DesignStory from '@/components/sections/DesignStory';
import Footer from '@/components/sections/Footer';
import Founder from '@/components/sections/Founder';
import Hero from '@/components/sections/Hero';
import Loop from '@/components/sections/Loop';
import Nav from '@/components/sections/Nav';
import Research from '@/components/sections/Research';
import Reveal from '@/components/sections/Reveal';

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <Experience />
      <main id="main" className="content">
        <Hero />
        <Reveal />
        <DesignStory />
        <Loop />
        <AppSection />
        <Research />
        <Founder />
        <Close />
      </main>
      <Footer />
    </>
  );
}

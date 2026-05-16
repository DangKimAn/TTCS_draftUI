import HomeNavbar from '../components/HomeNavbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Process from '../components/Process';
import DashboardPreview from '../components/DashboardPreview';
import Benefits from '../components/Benefits';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';

function HomePage() {
  return (
    <div className="app-shell home-page" id="home">
      {/* Decorative background glow for a polished landing page look */}
      <div className="page-glow page-glow-left" />
      <div className="page-glow page-glow-right" />
      <HomeNavbar />
      <main className="home-page__main">
        <Hero />
        <Features />
        <Process />
        <DashboardPreview />
        <Benefits />
        <Testimonials />
      </main>
      {/* Footer groups project info and contact details */}
      <Footer />
    </div>
  );
}

export default HomePage;

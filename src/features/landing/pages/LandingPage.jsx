import React from 'react';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import Plansandpricing from '../components/PricingPlans';
import Footer from '../components/Footer';

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <Plansandpricing />
      <Footer />
    </div>
  );
};

export default LandingPage;

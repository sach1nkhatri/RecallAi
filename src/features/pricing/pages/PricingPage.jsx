import React from 'react';
import PricingPlans from '../../landing/components/PricingPlans';
import '../css/PricingPage.css';

const PricingPage = () => {
  return (
    <div className="pricing-page">
      <div className="pricing-page-container">
        <PricingPlans />
      </div>
    </div>
  );
};

export default PricingPage;


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/PricingPlans.css';
import tick from '../../../assets/tick.png';
import no from '../../../assets/no.png';

const PricingPlans = () => {
    const [activePlan, setActivePlan] = useState('daily');
    const navigate = useNavigate();

    const pricing = {
        daily: {
            basic: 'NPR.50/day',
            premium: 'NPR.100/day',
        },
        weekly: {
            basic: 'NPR.180/week',
            premium: 'NPR.400/week',
        },
        monthly: {
            basic: 'NPR.300/month',
            premium: 'NPR.600/month',
        }
    };

    const getValueMessage = () => {
        if (activePlan === 'weekly') return 'Save 49% compared to daily!';
        if (activePlan === 'monthly') return 'Save 65% compared to daily! Best value.';
        return '';
    };

    const getDuration = () => activePlan.charAt(0).toUpperCase() + activePlan.slice(1);

    return (
        <section className="pricing-section" id="pricing">
            <h2 className="pricing-title">Plans & Pricing</h2>

            <div className="toggle-container">
                <div className="plan-toggle">
                    {['daily', 'weekly', 'monthly'].map((plan) => (
                        <button
                            key={plan}
                            className={`toggle-btn ${activePlan === plan ? 'active' : ''}`}
                            onClick={() => setActivePlan(plan)}
                        >
                            {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
            <div className="plans-grid">
                {/* FREE PLAN */}
                <div className="plan-card">
                    <h3>Free Trial</h3>
                    <p className="price-label">No need to pay</p>
                    <ul>
                        <li><img src={tick} alt="✔"/> Access to Constitution, Civil Code, Criminal Code, and more</li>
                        <li><img src={tick} alt="✔"/> 500 words per day or 10 chatbot interactions</li>
                        <li><img src={tick} alt="✔"/> Includes legal news and articles</li>
                        <li><img src={tick} alt="✔"/> Lawyer Search</li>
                        <li><img src={no} alt="✖"/> No 24/7 tech Support</li>
                    </ul>
                    <button
                        className="choose-btn"
                        onClick={() => navigate('/login')}
                    >
                        Choose Plan
                    </button>
                </div>

                {/* BASIC PLAN */}
                <div className="plan-card">
                <h3>Basic Plan</h3>
                    <p className="price-label">{pricing[activePlan].basic}</p>
                    <p className="value-label">{getValueMessage()}</p>
                    <ul>
                        <li><img src={tick} alt="✔" /> Everything in Free Plan +</li>
                        <li><img src={tick} alt="✔" /> Unlimited AI chat access with smarter legal responses</li>
                        <li><img src={tick} alt="✔" /> Includes legal news and articles</li>
                        <li><img src={tick} alt="✔" /> Lawyer Booking and Appointment</li>
                        <li><img src={tick} alt="✔" /> Great for students, citizens, and regular users</li>
                        <li><img src={no} alt="✖" /> No 24/7 tech Support</li>
                    </ul>
                    {activePlan === 'daily' && (
                        <span className="hover-tooltip">Use daily often? Save big with a weekly plan.</span>
                    )}
                    <button
                        className="choose-btn"
                        onClick={() =>
                            navigate('/checkout', {
                                state: {
                                    planName: 'Basic Plan',
                                    planPrice: pricing[activePlan].basic,
                                    planDuration: getDuration(),
                                },
                            })
                        }
                    >
                        Choose Plan
                    </button>
                </div>

                {/* PREMIUM PLAN */}
                <div className="plan-card">
                    <h3>Premium Plan</h3>
                    <p className="price-label">{pricing[activePlan].premium}</p>
                    <p className="value-label">{getValueMessage()}</p>
                    {activePlan === 'monthly' && (
                        <div className="badge-popular">Most Popular</div>
                    )}
                    <ul>
                        <li><img src={tick} alt="✔" /> Everything in Basic Plan +</li>
                        <li><img src={tick} alt="✔" /> Advanced legal reasoning and document analysis</li>
                        <li><img src={tick} alt="✔" /> Tools for lawyers, researchers, and professionals</li>
                        <li><img src={tick} alt="✔" /> Best For lawyers & LawFirms</li>
                        <li><img src={tick} alt="✔" /> 24/7 Tech Support</li>
                    </ul>
                    <button
                        className="choose-btn"
                        onClick={() =>
                            navigate('/checkout', {
                                state: {
                                    planName: 'Premium Plan',
                                    planPrice: pricing[activePlan].premium,
                                    planDuration: getDuration(),
                                },
                            })
                        }
                    >
                        Choose Plan
                    </button>
                </div>
            </div>
        </section>
    );
};

export default PricingPlans;

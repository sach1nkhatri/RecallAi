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
            basic: 'NPR.80/day',
            pro: 'NPR.150/day',
        },
        weekly: {
            basic: 'NPR.280/week',
            pro: 'NPR.500/week',
        },
        monthly: {
            basic: 'NPR.400/month',
            pro: 'NPR.700/month',
        }
    };

    const getValueMessage = () => {
        if (activePlan === 'weekly') return 'Save 50% compared to daily!';
        if (activePlan === 'monthly') return 'Save 66% compared to daily! Best value.';
        return '';
    };

    const getDuration = () => activePlan.charAt(0).toUpperCase() + activePlan.slice(1);

    return (
        <section className="pricing-section" id="pricing">
            <h2 className="pricing-title">Recall Everything. Perfectly Priced.</h2>

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
                    <h3>Starter</h3>
                    <p className="price-label">Free Forever</p>
                    <ul>
                        <li><img src={tick} alt="✔"/> Store up to 100 documents</li>
                        <li><img src={tick} alt="✔"/> 10 AI queries per day</li>
                        <li><img src={tick} alt="✔"/> Basic code & file recall</li>
                        <li><img src={tick} alt="✔"/> 500MB storage</li>
                        <li><img src={no} alt="✖"/> No sales analytics</li>
                        <li><img src={no} alt="✖"/> No team collaboration</li>
                        <li><img src={no} alt="✖"/> No API access</li>
                    </ul>
                    <button
                        className="choose-btn"
                        onClick={() => navigate('/login')}
                    >
                        Get Started
                    </button>
                </div>

                {/* BASIC PLAN */}
                <div className="plan-card">
                    <h3>Professional</h3>
                    <p className="price-label">{pricing[activePlan].basic}</p>
                    <p className="value-label">{getValueMessage()}</p>
                    <ul>
                        <li><img src={tick} alt="✔" /> Everything in Starter +</li>
                        <li><img src={tick} alt="✔" /> Store up to 1,000 documents</li>
                        <li><img src={tick} alt="✔" /> Unlimited AI queries</li>
                        <li><img src={tick} alt="✔" /> Advanced code search & recall</li>
                        <li><img src={tick} alt="✔" /> 5GB storage</li>
                        <li><img src={tick} alt="✔" /> Basic sales & performance tracking</li>
                        <li><img src={tick} alt="✔" /> Email support</li>
                        <li><img src={no} alt="✖" /> Limited API calls (100/day)</li>
                    </ul>
                    {activePlan === 'daily' && (
                        <span className="hover-tooltip">Using daily? Save 50% with a weekly plan.</span>
                    )}
                    <button
                        className="choose-btn"
                        onClick={() =>
                            navigate('/checkout', {
                                state: {
                                    planName: 'Professional Plan',
                                    planType: 'pro',
                                    planPrice: pricing[activePlan].basic,
                                    planDuration: getDuration(),
                                },
                            })
                        }
                    >
                        Upgrade Now
                    </button>
                </div>

                {/* PREMIUM PLAN */}
                <div className="plan-card">
                    <h3>Enterprise</h3>
                    <p className="price-label">{pricing[activePlan].pro}</p>
                    <p className="value-label">{getValueMessage()}</p>
                    {activePlan === 'monthly' && (
                        <div className="badge-popular">Most Popular</div>
                    )}
                    <ul>
                        <li><img src={tick} alt="✔" /> Everything in Professional +</li>
                        <li><img src={tick} alt="✔" /> Unlimited document storage</li>
                        <li><img src={tick} alt="✔" /> Advanced RAG with multi-source recall</li>
                        <li><img src={tick} alt="✔" /> 50GB storage with auto-backup</li>
                        <li><img src={tick} alt="✔" /> Advanced analytics dashboard</li>
                        <li><img src={tick} alt="✔" /> Team collaboration (up to 10 members)</li>
                        <li><img src={tick} alt="✔" /> Full API access & webhooks</li>
                        <li><img src={tick} alt="✔" /> 24/7 priority support</li>
                    </ul>
                    <button
                        className="choose-btn"
                        onClick={() =>
                            navigate('/checkout', {
                                state: {
                                    planName: 'Enterprise Plan',
                                    planType: 'enterprise',
                                    planPrice: pricing[activePlan].pro,
                                    planDuration: getDuration(),
                                },
                            })
                        }
                    >
                        Go Premium
                    </button>
                </div>
            </div>
        </section>
    );
};

export default PricingPlans;
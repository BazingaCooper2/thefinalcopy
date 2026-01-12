import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="geri-footer">
            <div className="footer-container">
                {/* Column 1: About Geri-Assist */}
                <div className="footer-column">
                    <h3 className="footer-heading">About Geri-Assist</h3>
                    <ul className="footer-links">
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/our-mission">Our Mission</Link></li>
                        <li><Link to="/team">Our Team</Link></li>
                        <li><Link to="/careers">Careers</Link></li>
                        <li><Link to="/testimonials">Testimonials</Link></li>
                        <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                        <li><Link to="/terms">Terms & Conditions</Link></li>
                    </ul>
                </div>

                {/* Column 2: Quick Links */}
                <div className="footer-column">
                    <h3 className="footer-heading">Quick Links</h3>
                    <ul className="footer-links">
                        <li><Link to="/">Dashboard</Link></li>
                        <li><Link to="/schedule">Schedule</Link></li>
                        <li><Link to="/employee">Employee Management</Link></li>
                        <li><Link to="/client">Client Management</Link></li>
                        <li><Link to="/monthlySchedule">Monthly Planning</Link></li>
                        <li><Link to="/masterSchedule">Master Schedule</Link></li>
                        <li><Link to="/injuryReport">Injury Reports</Link></li>
                    </ul>
                </div>

                {/* Column 3: Our Services */}
                <div className="footer-column">
                    <h3 className="footer-heading">Our Services</h3>
                    <ul className="footer-links">
                        <li><a href="#scheduling">Smart Scheduling</a></li>
                        <li><a href="#geofencing">Geofence Tracking</a></li>
                        <li><a href="#employee-management">Employee Management</a></li>
                        <li><a href="#client-care">Client Care Plans</a></li>
                        <li><a href="#reporting">Real-time Reporting</a></li>
                        <li><a href="#availability">Availability Management</a></li>
                        <li><a href="#injury-tracking">Injury Tracking</a></li>
                    </ul>
                </div>

                {/* Column 4: Support */}
                <div className="footer-column">
                    <h3 className="footer-heading">Support</h3>
                    <ul className="footer-links">
                        <li><a href="#help">Help Center</a></li>
                        <li><a href="#faq">FAQs</a></li>
                        <li><a href="#contact">Contact Us</a></li>
                        <li><a href="#training">Training Resources</a></li>
                        <li><a href="#documentation">Documentation</a></li>
                    </ul>
                    <div className="footer-contact-info mt-3">
                        <p><i className="bi bi-telephone-fill"></i> <strong>Support:</strong> 1800-123-4567</p>
                        <p><i className="bi bi-envelope-fill"></i> <strong>Email:</strong> support@geri-assist.com</p>
                    </div>
                </div>

                {/* Column 5: Locations */}
                <div className="footer-column">
                    <h3 className="footer-heading">Our Locations</h3>
                    <ul className="footer-links">
                        <li><a href="#outreach">Outreach</a></li>
                        <li><a href="#85-neeve">85 Neeve</a></li>
                        <li><a href="#87-neeve">87 Neeve</a></li>
                        <li><a href="#willow-place">Willow Place</a></li>
                    </ul>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="footer-bottom">
                <div className="footer-bottom-content">
                    {/* Logo Section */}
                    <div className="footer-logo-section">
                        <div className="footer-logo">
                            <i className="bi bi-heart-pulse-fill"></i>
                            <span>Geri-Assist</span>
                        </div>
                        <p className="footer-tagline">Compassionate Care, Simplified Management</p>
                    </div>

                    {/* App Download Section */}
                    <div className="footer-app-section">
                        <p className="footer-app-title">Get Geri-Assist Mobile App</p>
                        <div className="app-badges">
                            <a href="#google-play" className="app-badge">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                                    alt="Get it on Google Play"
                                />
                            </a>
                            <a href="#app-store" className="app-badge">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                                    alt="Download on the App Store"
                                />
                            </a>
                        </div>
                    </div>

                    {/* Social Media Section */}
                    <div className="footer-social-section">
                        <p className="footer-social-title">Connect with us</p>
                        <div className="social-icons">
                            <a href="#facebook" className="social-icon" aria-label="Facebook">
                                <i className="bi bi-facebook"></i>
                            </a>
                            <a href="#twitter" className="social-icon" aria-label="Twitter">
                                <i className="bi bi-twitter-x"></i>
                            </a>
                            <a href="#linkedin" className="social-icon" aria-label="LinkedIn">
                                <i className="bi bi-linkedin"></i>
                            </a>
                            <a href="#youtube" className="social-icon" aria-label="YouTube">
                                <i className="bi bi-youtube"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright Section */}
            <div className="footer-copyright">
                <p>© 2024 Geri-Assist. All Rights Reserved.</p>
            </div>
        </footer>
    );
}

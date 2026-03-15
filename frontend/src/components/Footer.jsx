import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Facebook, Instagram } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="text-2xl font-bold mb-4">
              Hotel<span className="text-secondary">Bridge</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Connecting exceptional hotels with the thriving Indian travel market.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-secondary transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-secondary transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-secondary transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/why-us" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  Why Work With Us
                </Link>
              </li>
              <li>
                <Link to="/partnerships" className="text-gray-300 hover:text-secondary transition-colors text-sm">
                  Hotel Partnerships
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Our Services</h3>
            <ul className="space-y-2">
              <li className="text-gray-300 text-sm">Hotel Sales Representation</li>
              <li className="text-gray-300 text-sm">Market Development</li>
              <li className="text-gray-300 text-sm">Group Contracting</li>
              <li className="text-gray-300 text-sm">Tour Operator Partnerships</li>
              <li className="text-gray-300 text-sm">Hospitality Consulting</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2 text-gray-300 text-sm">
                <Mail size={16} className="mt-1 flex-shrink-0" />
                <span>info@hotelbridge.com</span>
              </li>
              <li className="flex items-start space-x-2 text-gray-300 text-sm">
                <Phone size={16} className="mt-1 flex-shrink-0" />
                <span>+91 (0) 123 456 7890</span>
              </li>
              <li className="flex items-start space-x-2 text-gray-300 text-sm">
                <MapPin size={16} className="mt-1 flex-shrink-0" />
                <span>Mumbai, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} HotelBridge. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link to="#" className="text-gray-400 hover:text-secondary text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="#" className="text-gray-400 hover:text-secondary text-sm transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

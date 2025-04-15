import { motion } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  Github,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,

} from 'lucide-react';


const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-gray-50 to-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-exam-purple to-exam-blue flex items-center justify-center text-white text-xl font-bold">
                  E
                </div>
                <h3 className="ml-2 text-xl font-bold bg-gradient-to-r from-exam-purple to-exam-blue bg-clip-text text-transparent">
                  EXAMprep.
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Our AI-powered platform helps students prepare for exams more effectively with personalized learning materials, interactive mind maps, and audio podcasts.
              </p>
              <div className="flex space-x-4">
                {[
                  { icon: <Github size={18} />, href: "#", label: "GitHub" },
                  { icon: <Twitter size={18} />, href: "#", label: "Twitter" },
                  { icon: <Instagram size={18} />, href: "#", label: "Instagram" },
                  { icon: <Linkedin size={18} />, href: "#", label: "LinkedIn" },
                  { icon: <Facebook size={18} />, href: "#", label: "Facebook" },
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:text-exam-purple hover:border-exam-purple transition-colors duration-300"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Products
              </h3>
              <ul className="space-y-3">
                {["Features", "Pricing", "Case Studies", "Reviews", "Updates"].map((item, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-600 hover:text-exam-purple transition-colors duration-300">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Resources */}
          <div className="col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul className="space-y-3">
                {["Blog", "Help Center", "Tutorials", "FAQs", "Community"].map((item, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-600 hover:text-exam-purple transition-colors duration-300">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Contact */}
          <div className="col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Contact Us
              </h3>
              <ul className="space-y-3">
                <li className="flex">
                  <Mail className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0" />
                  <a href="mailto:support@aceexams.com" className="text-gray-600 hover:text-exam-purple transition-colors duration-300">
                    support@bitbrains.fun
                  </a>
                </li>
                <li className="flex">
                  <Phone className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0" />
                  <a href="tel:+18001234567" className="text-gray-600 hover:text-exam-purple transition-colors duration-300">
                    7004559534
                  </a>
                </li>
                <li className="flex">
                  <MapPin className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0" />
                  <span className="text-gray-600">
                    Ashok Rajpath, Patna, Bihar, India
                  </span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Badal Kumar. All rights reserved.
            </p>
            <div className="flex space-x-6">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Sitemap"].map((item, index) => (
                <a 
                  key={index} 
                  href="#" 
                  className="text-gray-500 text-sm hover:text-exam-purple transition-colors duration-300"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Accent Bar */}
      <div className="h-1 bg-gradient-to-r from-exam-purple via-exam-blue to-exam-pink"></div>
    </footer>
  );
};

export default Footer;
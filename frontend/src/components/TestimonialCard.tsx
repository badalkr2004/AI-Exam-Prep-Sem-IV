
import { motion } from 'framer-motion';

interface TestimonialCardProps {
  name: string;
  role: string;
  text: string;
  avatar: string;
  index: number;
}

const TestimonialCard = ({ name, role, text, avatar, index }: TestimonialCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-all duration-300 group"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-exam-purple to-exam-blue transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
      
      <div className="flex items-center mb-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full overflow-hidden">
            <img
              className="h-full w-full object-cover"
              src={avatar}
              alt={name}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-exam-purple rounded-full p-1 border-2 border-white">
            <svg className="w-3 h-3 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17L4 12"></path>
            </svg>
          </div>
        </div>
        
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">{role}</p>
        </div>
      </div>
      
      <p className="text-gray-700 relative pl-3 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-exam-purple before:to-exam-blue">
        "{text}"
      </p>
      
      <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-gradient-to-bl from-exam-purple/20 to-exam-blue/10 -translate-y-1/2 translate-x-1/2 opacity-30 blur-2xl"></div>
    </motion.div>
  );
};

export default TestimonialCard;

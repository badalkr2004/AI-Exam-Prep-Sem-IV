import { motion } from 'framer-motion';
import GradientButton from './GradientButton';
import FeatureCard from './FeaturedCard';
import TestimonialCard from './TestimonialCard';
import { 
  Book, 
  Brain, 
  GraduationCap, 
  Headphones, 
  ArrowRight, 
  CheckCircle,
  Users,
  BarChart3,
  Sparkles,
  ChevronDown,

} from 'lucide-react';
import { Button } from "./ui/button";
import Footer from './Footer';

const features = [
  {
    name: 'RAG-Based Analysis',
    description: 'Upload exam papers and leverage AI to extract and analyze questions, trends, and patterns.',
    icon: <Book className="w-6 h-6" />,
  },
  {
    name: 'Interactive Mind Maps',
    description: 'Visualize complex concepts with AI-generated mind maps to enhance understanding and retention.',
    icon: <Brain className="w-6 h-6" />,
  },
  {
    name: 'Smart Learning Modules',
    description: 'Get personalized learning content that adapts to your study needs and focuses on exam-relevant material.',
    icon: <GraduationCap className="w-6 h-6" />,
  },
  {
    name: 'Audio Podcasts',
    description: 'Convert study materials into audio podcasts for learning on the go.',
    icon: <Headphones className="w-6 h-6" />,
  },
];

const testimonials = [
  {
    name: 'James Wilson',
    role: 'Computer Science Student',
    text: 'This tool completely transformed how I prepare for exams. The mind maps helped me understand complex relationships between topics.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Elena Rodriguez',
    role: 'Mathematics Major',
    text: 'The RAG-based analysis of past papers helped me identify patterns in exam questions that I would have never noticed on my own.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Michael Chang',
    role: 'Engineering Student',
    text: 'I love the podcast feature! I can listen to my study materials while commuting and it has significantly increased my study time.',
    avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
];

const stats = [
  { value: '94%', label: 'Improved Grades' },
  { value: '12K+', label: 'Active Students' },
  { value: '250+', label: 'Universities' },
];

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {

  
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };


  return (
    <div className="overflow-hidden bg-gradient-to-br from-white to-purple-50">
      {/* Hero Section */}
      <motion.div
        className="relative min-h-screen flex flex-col justify-center"
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,rgba(255,255,255,0)_60%)]"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,rgba(255,255,255,0)_50%)]"></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-exam-pink opacity-5 blur-3xl animate-pulse-slow"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-exam-purple mb-6">
                <Sparkles className="mr-1 h-3 w-3" />
                AI-Powered Learning Platform
              </span>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
                <span className="inline-block">Ace Your Exams</span>{' '}
                <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-exam-purple to-exam-blue bg-clip-text text-transparent inline-block">With AI Assistance</span>
              </h1>
              
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-600">
                Transform your study experience with our intelligent platform that analyzes past papers, creates mind maps, and generates personalized learning materials.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <GradientButton onClick={onGetStarted} className="px-8 py-5 text-lg cursor-pointer">
                Get started <ArrowRight className="ml-2 h-4 w-4 inline" />
              </GradientButton>
              
              <Button variant="outline" onClick={scrollToFeatures} className="px-8 py-3 text-lg cursor-pointer">
                Learn more
              </Button>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="relative mx-auto max-w-5xl"
          >
            {/* Bento Grid for Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
                  whileHover={{ 
                    rotate: index % 2 === 0 ? 1 : -1, 
                    scale: 1.02,
                    transition: { duration: 0.2 } 
                  }}
                  className={`relative p-8 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 backdrop-blur-sm
                             ${index === 0 ? 'bg-gradient-to-br from-exam-purple/20 to-exam-blue/20 border border-exam-purple/20' : ''}
                             ${index === 1 ? 'bg-gradient-to-br from-exam-blue/20 to-exam-teal/20 border border-exam-blue/20' : ''}
                             ${index === 2 ? 'bg-gradient-to-br from-exam-teal/20 to-exam-purple/20 border border-exam-teal/20' : ''}
                             ${index === 3 ? 'bg-gradient-to-br from-exam-pink/20 to-exam-purple/20 border border-exam-pink/20' : ''}
                            `}
                >
                  {/* Glowing effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-md
                              from-exam-purple via-exam-blue to-exam-teal"></div>
                  
                  <div className="relative z-10">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 text-white
                                  ${index === 0 ? 'bg-gradient-to-br from-exam-purple to-exam-blue' : ''}
                                  ${index === 1 ? 'bg-gradient-to-br from-exam-blue to-exam-teal' : ''}
                                  ${index === 2 ? 'bg-gradient-to-br from-exam-teal to-exam-purple' : ''}
                                  ${index === 3 ? 'bg-gradient-to-br from-exam-pink to-exam-purple' : ''}
                                `}>
                      {feature.icon}
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {feature.name}
                    </h3>
                    
                    <p className="text-gray-700">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Animated hover effects */}
                  <div className="absolute -bottom-2 -right-2 w-32 h-32 bg-gradient-to-br opacity-20 rounded-full blur-2xl
                              from-exam-purple to-exam-blue transform scale-0 group-hover:scale-100 transition-all duration-700"></div>
                </motion.div>
              ))}
            </div>
            
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={scrollToFeatures}
                  className="rounded-full shadow-md h-12 w-12 flex items-center justify-center bg-white cursor-pointer"
                >
                  <ChevronDown className="h-6 w-6 text-exam-purple" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="relative inline-flex">
                  <span className="text-5xl font-bold bg-gradient-to-r from-exam-purple to-exam-blue bg-clip-text text-transparent">
                    {stat.value}
                  </span>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-exam-purple/10 animate-pulse-slow"></div>
                </div>
                <p className="mt-2 text-lg text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div id="features" className="py-24 bg-gradient-to-br from-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-exam-purple mb-4">
                Key Features
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Study Smarter, Not Harder
              </h2>
              <p className="text-xl text-gray-600">
                Our AI-powered platform offers innovative tools to enhance your study experience and maximize your exam performance.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.name}
                icon={feature.icon}
                title={feature.name}
                description={feature.description}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-exam-blue mb-4">
                How It Works
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Simple Process, Amazing Results
              </h2>
              <p className="text-xl text-gray-600">
                Get started in minutes and transform your study habits with our AI-powered platform.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Upload Materials",
                description: "Upload your study materials, past papers, and notes to our platform."
              },
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "AI Analysis",
                description: "Our AI analyzes your materials to identify key concepts and patterns."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Study Efficiently",
                description: "Use our personalized tools to study efficiently and ace your exams."
              }
            ].map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center text-center p-6"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-exam-blue to-exam-purple flex items-center justify-center text-white">
                    {step.icon}
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full rounded-full bg-exam-purple/30 animate-ripple"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-24 left-[calc(50%+5rem)] right-[calc(50%-5rem)] h-0.5">
                    <div className="h-full bg-gradient-to-r from-exam-purple to-exam-blue"></div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-gradient-to-br from-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-600 mb-4">
                Testimonials
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Students Love Our Platform
              </h2>
              <p className="text-xl text-gray-600">
                Hear from students who have transformed their study experience with our AI-powered platform.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={testimonial.name}
                name={testimonial.name}
                role={testimonial.role}
                text={testimonial.text}
                avatar={testimonial.avatar}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-exam-purple mb-4">
                Why Choose Us
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Benefits That Make a Difference
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Our platform is designed to help you achieve your academic goals with less stress and more efficiency.
              </p>
              
              <div className="space-y-4">
                {[
                  "AI-powered analysis of past exam papers",
                  "Personalized study plans based on your strengths and weaknesses",
                  "Interactive mind maps for better concept understanding",
                  "Audio podcasts for learning on the go",
                  "Regular updates with new features and improvements"
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start"
                  >
                    <CheckCircle className="h-6 w-6 text-exam-purple mr-2 flex-shrink-0" />
                    <p className="text-gray-700">{benefit}</p>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-10">
                <GradientButton className='cursor-pointer' onClick={onGetStarted}>
                  Start your journey now <ArrowRight className="ml-2 h-4 w-4 inline" />
                </GradientButton>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-exam-purple/10">
                <div className="aspect-w-16 aspect-h-9">
                  <img 
                    src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80" 
                    alt="Student using laptop" 
                    className="object-cover w-full h-full rounded-2xl"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white text-xl font-medium">
                    "I improved my grades by 20% after just one month of using this platform."
                  </p>
                </div>
              </div>
              
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-exam-purple/10 rounded-full blur-2xl"></div>
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-exam-blue/10 rounded-full blur-xl"></div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="py-24 bg-gradient-to-r from-exam-purple to-exam-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm p-12 shadow-xl border border-white/10">
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="text-white"
                >
                  <h2 className="text-4xl font-bold mb-6">
                    Ready to Transform Your Study Experience?
                  </h2>
                  <p className="text-xl text-white/80 mb-8">
                    Join thousands of students who have already improved their grades with our AI-powered platform. Start your journey today!
                  </p>
                  
                  <div className="space-y-4 mb-8">
                    {[
                      "Free 14-day trial - no credit card required",
                      "Unlimited access to all features during trial",
                      "Simple pricing plans for individuals and groups",
                      "24/7 support and dedicated onboarding",
                      "Cancel anytime - no commitments"
                    ].map((benefit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center"
                      >
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 text-white" />
                        <p className="text-white/90">{benefit}</p>
                      </motion.div>
                    ))}
                  </div>
                  
                  <GradientButton 
                    variant="secondary" 
                    onClick={onGetStarted} 
                    className="px-8 py-3 text-lg shadow-xl cursor-pointer"
                  >
                    Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4 inline" />
                  </GradientButton>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 backdrop-blur-md"
                >
                  <div className="p-8">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-white">Student Discount</h3>
                      <p className="text-white/80 mt-2">Use your school email for 50% off</p>
                    </div>
                    
                    <div className="space-y-6">
                      {[
                        { title: "Individual License", price: "$9.99", period: "/month" },
                        { title: "Study Group", price: "$19.99", period: "/month (up to 5 users)" },
                        { title: "School License", price: "Contact us", period: "for custom pricing" }
                      ].map((plan, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.1 }}
                          viewport={{ once: true }}
                          className="p-4 rounded-lg border border-white/20 hover:border-white/40 transition-all duration-300"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold text-white">{plan.title}</h4>
                              <p className="text-white/60 text-sm">{plan.period}</p>
                            </div>
                            <div className="text-white font-bold text-xl">{plan.price}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    <div className="mt-6 text-center">
                      <Button 
                        onClick={onGetStarted} 
                        variant="secondary" 
                        className="border-white/30 bg-blue-500 text-white hover:bg-white/20 w-full cursor-pointer"
                      >
                        View Pricing Details
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
            
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_60%)]"></div>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-exam-pink/30 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-exam-blue/30 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-exam-purple mb-4">
                Common Questions
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600">
                Everything you need to know about our AI-powered exam preparation platform.
              </p>
            </motion.div>
          </div>

          <div className="max-w-3xl mx-auto">
            {[
              {
                question: "How does the AI analyze exam papers?",
                answer: "Our AI uses sophisticated RAG (Retrieval-Augmented Generation) technology to analyze patterns in past exam papers, identify key concepts, and create tailored study materials based on your specific exam needs."
              },
              {
                question: "Is my data secure on your platform?",
                answer: "Absolutely. We take data security very seriously. All your study materials and personal information are encrypted and securely stored. We never share your data with third parties without your explicit consent."
              },
              {
                question: "Can I use the platform without internet?",
                answer: "While most features require an internet connection, you can download study materials, mind maps, and audio podcasts for offline use when you're on the go."
              },
              {
                question: "How much does it cost after the free trial?",
                answer: "We offer flexible pricing plans starting at $9.99/month for individual students. We also have special discounts for study groups and institutional licenses. Check our pricing page for detailed information."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="mb-6 border-b border-gray-200 pb-6 last:border-0"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-600">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;
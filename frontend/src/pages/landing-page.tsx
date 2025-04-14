

import LandingPage from '../components/LandingPage';
import { toast } from 'sonner';

const Landing = ({ onGetStarted }: { onGetStarted: () => void }) => {
  // const handleGetStarted = () => {
  //   toast.success("Welcome aboard! 🚀", {
  //     description: "You're now ready to start your AI-powered learning journey.",
  //   });
  // };

  return <LandingPage onGetStarted={onGetStarted} />;
};

export default Landing;
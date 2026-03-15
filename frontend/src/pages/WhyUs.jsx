import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { benefits } from '../data/mockData';
import { 
  Globe, 
  Network, 
  BarChart3, 
  TrendingUp,
  Clock,
  Shield,
  HeadphonesIcon,
  Target
} from 'lucide-react';

export const WhyUs = () => {
  const iconMap = {
    Globe,
    Network,
    BarChart3,
    TrendingUp
  };

  const additionalBenefits = [
    {
      icon: Clock,
      title: "Time-Tested Expertise",
      description: "Years of experience in both hospitality and Indian travel market dynamics."
    },
    {
      icon: Shield,
      title: "Risk Mitigation",
      description: "We vet all partners thoroughly, ensuring reliable payment and professional conduct."
    },
    {
      icon: HeadphonesIcon,
      title: "Dedicated Support",
      description: "Your dedicated account manager is always available to address concerns and opportunities."
    },
    {
      icon: Target,
      title: "Strategic Focus",
      description: "We target the right segments for your property – no wasted effort on mismatched clients."
    }
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1554366347-897a5113f6ab)',
          }}
        >
          <div className="absolute inset-0 bg-primary/85"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Why Work With Us</h1>
          <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto">
            Discover the competitive advantages that make HotelBridge the preferred partner for hotel sales representation.
          </p>
        </div>
      </section>

      {/* Main Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
              Key Advantages
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              The HotelBridge Advantage
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We deliver measurable results through established relationships, market expertise, and a genuine commitment to your success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {benefits.map((benefit) => {
              const IconComponent = iconMap[benefit.icon] || Globe;
              
              return (
                <Card key={benefit.id} className="hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-4">
                      <div className="w-14 h-14 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-7 h-7 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-primary mb-2">{benefit.title}</h3>
                        <p className="text-gray-600 mb-4">{benefit.description}</p>
                        <div className="bg-secondary/5 rounded-lg p-4 border-l-4 border-secondary">
                          <div className="text-3xl font-bold text-secondary mb-1">{benefit.stat}</div>
                          <div className="text-sm text-gray-600">{benefit.statLabel}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Benefits */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              More Reasons to Partner With Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalBenefits.map((item, index) => {
              const IconComponent = item.icon;
              
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-7 h-7 text-secondary" />
                    </div>
                    <h4 className="text-lg font-semibold text-primary mb-2">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
                Compare Options
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Why Choose Professional Representation?
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                See how partnering with HotelBridge compares to other market entry approaches.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Approach</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">DIY</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Generic Sales Agency</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold bg-secondary/10 text-secondary">HotelBridge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-900">Market Knowledge</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">Limited</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">General</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-secondary">Specialized</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">Tour Operator Network</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">None</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">Broad</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-secondary">200+ Vetted Partners</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-900">Time to Results</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">12-18 months</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">6-12 months</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-secondary">3-6 months</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">Cultural Expertise</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">Trial & Error</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">Basic</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-secondary">Deep Understanding</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-900">Dedicated Support</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">N/A</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">Shared</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-secondary">Personal Account Manager</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">Success Rate</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">Low</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">Medium</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-secondary">95% Partner Satisfaction</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-12">
              Proven Track Record
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl font-bold text-secondary mb-2">200+</div>
                <div className="text-sm text-gray-600">Hotel Partners</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-secondary mb-2">15+</div>
                <div className="text-sm text-gray-600">Countries</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-secondary mb-2">500K+</div>
                <div className="text-sm text-gray-600">Room Nights/Year</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-secondary mb-2">40%</div>
                <div className="text-sm text-gray-600">Avg. Revenue Growth</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Experience the Difference
          </h2>
          <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
            Join successful hotels across Europe who have transformed their revenue with HotelBridge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white">
              <Link to="/partnerships">Start Your Partnership</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-gray-100 border-0">
              <Link to="/contact">Talk to Our Team</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WhyUs;

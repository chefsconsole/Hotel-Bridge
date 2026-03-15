import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Handshake, 
  Lightbulb,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { services } from '../data/mockData';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

export const Services = () => {
  const iconMap = {
    Building2,
    TrendingUp,
    Users,
    Handshake,
    Lightbulb
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1611892440504-42a792e24d32)',
          }}
        >
          <div className="absolute inset-0 bg-primary/85"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
          <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto">
            Comprehensive solutions to establish and grow your presence in the Indian travel market.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
              What We Offer
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              End-to-End Hotel Sales Solutions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From market entry to sustained growth, we handle every aspect of your hotel's representation in the Indian market.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            {services.map((service) => {
              const IconComponent = iconMap[service.icon] || Building2;
              
              return (
                <Card key={service.id} className="hover:shadow-xl transition-all duration-300 border-gray-200">
                  <CardHeader>
                    <div className="w-16 h-16 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-8 h-8 text-secondary" />
                    </div>
                    <CardTitle className="text-2xl text-primary">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-6">{service.description}</p>
                    <div className="space-y-3">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
              Our Process
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              How We Work With Hotels
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A proven, step-by-step approach to ensure successful market entry and sustained growth.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Discovery & Strategy</h3>
                  <p className="text-sm text-gray-600">
                    We assess your property, identify target markets, and create a customized sales strategy.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    2
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Market Activation</h3>
                  <p className="text-sm text-gray-600">
                    Connect with our network of tour operators, negotiate contracts, and establish your presence.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    3
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Growth & Support</h3>
                  <p className="text-sm text-gray-600">
                    Ongoing relationship management, performance tracking, and continuous optimization.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
                FAQ
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Frequently Asked Questions
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:text-secondary">
                  What types of hotels do you work with?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  We primarily work with 3-star and 4-star hotels in Europe and select international destinations. We look for properties that offer good value, quality service, and are well-positioned to serve group travelers. Properties should have group accommodation capabilities and be located in destinations appealing to Indian travelers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:text-secondary">
                  How long does it take to see results?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Most hotels start seeing bookings within 3-6 months of partnership. However, building sustained momentum typically takes 6-12 months as we establish relationships, negotiate contracts, and build awareness among tour operators. The Indian travel market operates on advance booking cycles, so patience and consistent effort yield the best results.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:text-secondary">
                  What is your fee structure?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  We work on a performance-based commission structure aligned with industry standards. This means we only succeed when you do. There are no upfront fees – our success is directly tied to delivering bookings and revenue to your property. Specific terms are discussed during our partnership consultation.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:text-secondary">
                  Do I need to speak Hindi or have Indian staff?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Not at all. While cultural awareness is helpful, it's not required. We provide guidance on adapting your service for Indian guests, including dietary considerations, preferences, and cultural nuances. Most Indian tour groups have English-speaking guides, and communication is rarely an issue. We'll help you prepare your team with simple, practical guidance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:text-secondary">
                  How do you select tour operator partners?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  We maintain strict criteria for tour operator partnerships. We work only with established, reputable companies with proven track records, financial stability, and professional operations. Our network includes IATA-certified agents, members of leading travel associations, and operators we've personally vetted. Quality over quantity is our approach.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Hotel's Revenue?
            </h2>
            <p className="text-lg text-gray-200 mb-8">
              Let's discuss how our services can help your property tap into the Indian travel market.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white">
                <Link to="/contact">Schedule a Consultation</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-gray-100 border-0">
                <Link to="/partnerships">View Partnership Options <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;

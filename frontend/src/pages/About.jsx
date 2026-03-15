import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { Target, Users, Globe, Award } from 'lucide-react';

export const About = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/29649745/pexels-photo-29649745.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-primary/85"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About HotelBridge</h1>
          <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto">
            Your trusted partner in connecting exceptional hotels with the thriving Indian travel market.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
              Our Mission
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              Bridging Excellence in Hospitality
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              HotelBridge specializes in connecting premium hotels with the rapidly expanding Indian outbound travel market. We act as a strategic sales partner, bringing together world-class hospitality properties with India's leading tour operators, travel agencies, and destination management companies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-2xl font-bold text-primary mb-4">Who We Are</h3>
              <p className="text-gray-600 mb-4">
                Founded by hospitality and travel industry veterans, HotelBridge emerged from a simple observation: exceptional hotels across Europe and international destinations were missing out on one of the world's fastest-growing travel markets.
              </p>
              <p className="text-gray-600 mb-4">
                With deep roots in both the Indian travel industry and international hospitality, we uniquely understand the needs, preferences, and business practices of both sides. This dual expertise allows us to create meaningful, profitable partnerships that last.
              </p>
              <p className="text-gray-600">
                Today, we represent over 200 hotels across 15 countries, managing more than 500,000 room nights annually and maintaining relationships with India's most respected tour operators and travel companies.
              </p>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1573164574572-cb89e39749b4"
                alt="Team Meeting"
                className="rounded-lg shadow-xl w-full h-[400px] object-cover"
              />
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold text-primary mb-2">Results-Driven</h4>
                <p className="text-sm text-gray-600">
                  We measure our success by your growth. Every action is focused on driving bookings and revenue.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold text-primary mb-2">Partnership</h4>
                <p className="text-sm text-gray-600">
                  We're not just a service provider – we're an extension of your sales team.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold text-primary mb-2">Global Perspective</h4>
                <p className="text-sm text-gray-600">
                  International expertise combined with deep Indian market knowledge.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold text-primary mb-2">Excellence</h4>
                <p className="text-sm text-gray-600">
                  We represent only quality properties and work with reputable operators.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Indian Market Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
              Market Opportunity
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              Why the Indian Travel Market?
            </h2>
            <div className="space-y-6 text-gray-600">
              <p className="text-lg leading-relaxed">
                India is home to one of the world's fastest-growing outbound travel markets. With a rising middle class, increasing disposable income, and a cultural affinity for travel, Indian tourists are exploring destinations across the globe in record numbers.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-secondary mb-2">27M+</div>
                  <div className="text-sm text-gray-600">Outbound travelers in 2023</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-secondary mb-2">15%</div>
                  <div className="text-sm text-gray-600">Annual growth rate</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-secondary mb-2">$30B+</div>
                  <div className="text-sm text-gray-600">Travel spend annually</div>
                </div>
              </div>
              <p className="leading-relaxed">
                Indian travelers prefer group tours, especially for international destinations, making them ideal for hotels that can accommodate groups. They value service quality, cultural experiences, and value for money – all areas where the right hotel partnership can thrive.
              </p>
              <p className="leading-relaxed">
                However, accessing this market requires local knowledge, established relationships, and cultural understanding. That's where HotelBridge comes in. We bridge the gap between your property and this lucrative market, handling everything from initial outreach to contract negotiations and ongoing relationship management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Let's Grow Together
          </h2>
          <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
            Partner with HotelBridge and unlock the potential of the Indian travel market.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white">
              <Link to="/partnerships">Become a Partner</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-gray-100 border-0">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;

import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowRight, Building2, TrendingUp, Users, Globe, Star, CheckCircle2 } from 'lucide-react';
import { services, stats, testimonials } from '../data/mockData';

export const Home = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1677129667171-92abd8740fa3)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/70"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <Badge className="mb-4 bg-secondary text-white hover:bg-secondary/90">
            Your Bridge to the Indian Travel Market
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Helping Hotels Access the<br />Indian Group Travel Market
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto text-gray-100">
            Connect with 200+ tour operators and unlock consistent group bookings from one of the world's fastest-growing travel markets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white">
              <Link to="/partnerships">Partner With Us</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-gray-100 border-0">
              <Link to="/services">Explore Services</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-y">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
              What We Do
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Comprehensive Hotel Sales Services
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From market entry to revenue growth, we provide end-to-end solutions to help your hotel thrive in the Indian market.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.slice(0, 6).map((service) => {
              const IconComponent = {
                Building2,
                TrendingUp,
                Users,
                Globe
              }[service.icon] || Building2;

              return (
                <Card key={service.id} className="hover:shadow-xl transition-all duration-300 border-gray-200 hover:border-secondary">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-secondary" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-3">{service.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                    <Link 
                      to="/services" 
                      className="text-secondary font-medium text-sm inline-flex items-center hover:gap-2 transition-all"
                    >
                      Learn More <ArrowRight className="ml-1 w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
              <Link to="/services">View All Services</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
                Why HotelBridge
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                Your Gateway to India's Booming Travel Market
              </h2>
              <p className="text-gray-600 mb-8">
                With over 20 million Indian travelers exploring the world annually, now is the time to tap into this lucrative market. We make it simple and profitable.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-primary mb-1">Established Network</h4>
                    <p className="text-sm text-gray-600">Direct relationships with 200+ tour operators and DMCs across India.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-primary mb-1">Proven Results</h4>
                    <p className="text-sm text-gray-600">Our partners see an average 40% revenue increase within the first year.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-primary mb-1">Group Booking Expertise</h4>
                    <p className="text-sm text-gray-600">Specialized in high-volume group contracts that ensure consistent occupancy.</p>
                  </div>
                </div>
              </div>
              <Button asChild size="lg" className="mt-8 bg-secondary hover:bg-secondary/90">
                <Link to="/why-us">Discover All Benefits</Link>
              </Button>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216"
                alt="Business Partnership"
                className="rounded-lg shadow-2xl w-full h-[500px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
              Success Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Trusted by Leading Hotels
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See what hotel partners across Europe say about working with HotelBridge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center space-x-3">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-primary text-sm">{testimonial.name}</div>
                      <div className="text-xs text-gray-500">{testimonial.position}</div>
                      <div className="text-xs text-gray-500">{testimonial.hotel}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Expand Your Hotel's Reach?
          </h2>
          <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
            Join 200+ hotels that have successfully entered the Indian travel market with HotelBridge.
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

export default Home;

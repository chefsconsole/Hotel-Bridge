import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { caseStudies } from '../data/mockData';
import { CheckCircle2, MapPin, Calendar, TrendingUp } from 'lucide-react';

export const Partnerships = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/5256820/pexels-photo-5256820.jpeg)',
          }}
        >
          <div className="absolute inset-0 bg-primary/90"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <Badge className="mb-4 bg-secondary text-white hover:bg-secondary/90">
            Partner With Us
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Expand Your Hotel's Reach
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto text-gray-100">
            Join 200+ hotels that have successfully tapped into the Indian travel market. Let's grow your revenue together.
          </p>
          <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white">
            <Link to="/contact">Start Your Partnership Journey</Link>
          </Button>
        </div>
      </section>

      {/* Ideal Partner Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
                Partnership Criteria
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Is Your Hotel a Good Fit?
              </h2>
              <p className="text-gray-600">
                We partner with quality hotels that align with Indian traveler preferences and group tour requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <CheckCircle2 className="w-10 h-10 text-secondary mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">Hotel Category</h3>
                  <p className="text-sm text-gray-600">
                    3-star and 4-star properties with quality service standards and good value positioning.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <CheckCircle2 className="w-10 h-10 text-secondary mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">Location</h3>
                  <p className="text-sm text-gray-600">
                    Europe (priority), North America, Middle East, or other international destinations popular with Indian travelers.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <CheckCircle2 className="w-10 h-10 text-secondary mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">Group Capacity</h3>
                  <p className="text-sm text-gray-600">
                    Ability to accommodate groups (15-50 rooms), with appropriate meeting spaces and dining facilities.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <CheckCircle2 className="w-10 h-10 text-secondary mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">Service Flexibility</h3>
                  <p className="text-sm text-gray-600">
                    Willingness to accommodate specific dietary needs (vegetarian options) and cultural preferences.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-6 text-center">
              <p className="text-gray-700 font-medium">
                If your property meets these criteria, we'd love to explore a partnership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
              Success Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Real Results from Hotel Partners
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See how we've helped hotels like yours achieve remarkable growth in the Indian market.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {caseStudies.map((study) => (
              <Card key={study.id} className="hover:shadow-xl transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={study.image}
                    alt={study.hotelName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-secondary text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {study.year}
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-primary mb-2">{study.hotelName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {study.location}
                    </span>
                  </div>
                  <Badge className="mb-4 bg-primary/10 text-primary">
                    {study.category}
                  </Badge>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Challenge:</h4>
                    <p className="text-sm text-gray-600">{study.challenge}</p>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Solution:</h4>
                    <p className="text-sm text-gray-600">{study.solution}</p>
                  </div>

                  <div className="bg-secondary/5 rounded-lg p-4 border-l-4 border-secondary">
                    <h4 className="font-semibold text-sm text-secondary mb-2 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Results:
                    </h4>
                    <ul className="space-y-1">
                      {study.results.map((result, idx) => (
                        <li key={idx} className="text-xs text-gray-700 flex items-start">
                          <CheckCircle2 className="w-3 h-3 mr-2 mt-0.5 text-secondary flex-shrink-0" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Process */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
                How to Begin
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Your Partnership Journey
              </h2>
              <p className="text-gray-600">
                From initial contact to your first bookings – here's what to expect.
              </p>
            </div>

            <div className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Initial Consultation</h3>
                      <p className="text-sm text-gray-600">
                        We discuss your property, goals, and assess fit. This is a no-obligation conversation to explore possibilities.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Property Evaluation</h3>
                      <p className="text-sm text-gray-600">
                        We review your property details, positioning, and competitive landscape to create a tailored strategy.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Agreement & Onboarding</h3>
                      <p className="text-sm text-gray-600">
                        Once we're aligned, we formalize the partnership and gather all materials needed for market representation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      4
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Market Activation</h3>
                      <p className="text-sm text-gray-600">
                        We begin outreach to our tour operator network, negotiate contracts, and establish your market presence.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      5
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Ongoing Growth</h3>
                      <p className="text-sm text-gray-600">
                        Continuous relationship management, performance tracking, and strategic optimization for long-term success.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Revenue?
          </h2>
          <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto">
            Take the first step toward accessing the Indian travel market. Let's discuss how we can help your hotel thrive.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-white">
              <Link to="/contact">Schedule a Consultation</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-gray-100 border-0">
              <Link to="/services">Learn About Our Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Partnerships;

import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { contactReasons } from '../data/mockData';
import { toast } from 'sonner';

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    hotelName: '',
    location: '',
    reason: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReasonChange = (value) => {
    setFormData(prev => ({ ...prev, reason: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Mock submission - will be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Thank you for your inquiry!', {
        description: 'We\'ll get back to you within 24 hours.',
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        hotelName: '',
        location: '',
        reason: '',
        message: ''
      });
    } catch (error) {
      toast.error('Something went wrong', {
        description: 'Please try again or contact us directly.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1758519290233-a03c1d17ecc9)',
          }}
        >
          <div className="absolute inset-0 bg-primary/85"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto">
            Let's discuss how we can help your hotel access the Indian travel market.
          </p>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-8">
                  <div className="mb-6">
                    <Badge className="mb-4 bg-secondary/10 text-secondary hover:bg-secondary/20">
                      Get In Touch
                    </Badge>
                    <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
                      Send Us a Message
                    </h2>
                    <p className="text-gray-600">
                      Fill out the form below and we'll respond within 24 hours.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name">Your Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="John Doe"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="john@hotel.com"
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+1 (555) 000-0000"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hotelName">Hotel Name</Label>
                        <Input
                          id="hotelName"
                          name="hotelName"
                          value={formData.hotelName}
                          onChange={handleChange}
                          placeholder="Grand Hotel"
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="location">Hotel Location</Label>
                        <Input
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="Paris, France"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason for Contact *</Label>
                        <Select onValueChange={handleReasonChange} value={formData.reason} required>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {contactReasons.map((reason, index) => (
                              <SelectItem key={index} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder="Tell us about your hotel and what you'd like to achieve..."
                        rows={6}
                        className="mt-2"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full bg-secondary hover:bg-secondary/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-primary mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-secondary mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Email</div>
                        <a href="mailto:info@hotelbridge.com" className="text-sm text-gray-600 hover:text-secondary">
                          info@hotelbridge.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Phone className="w-5 h-5 text-secondary mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Phone</div>
                        <a href="tel:+910123456789" className="text-sm text-gray-600 hover:text-secondary">
                          +91 (0) 123 456 7890
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-secondary mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Office</div>
                        <p className="text-sm text-gray-600">
                          Mumbai, India
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-secondary mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Business Hours</div>
                        <p className="text-sm text-gray-600">
                          Mon - Fri: 9:00 AM - 6:00 PM IST<br />
                          Sat: 10:00 AM - 2:00 PM IST
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary/5 border-secondary/20">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-primary mb-3">Quick Response</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    We typically respond to all inquiries within 24 hours during business days.
                  </p>
                  <p className="text-sm text-gray-600">
                    For urgent matters, please call us directly during business hours.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-primary mb-3">Book a Consultation</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Prefer a scheduled call? Book a 30-minute consultation to discuss your hotel's potential in the Indian market.
                  </p>
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white">
                    Schedule a Call
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map or Additional Info */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Whether you're a hotel looking for representation or a tour operator seeking partnerships, we're here to help create successful collaborations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-secondary mb-2">24h</div>
                  <div className="text-sm text-gray-600">Response Time</div>
                </CardContent>
              </Card>
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-secondary mb-2">Free</div>
                  <div className="text-sm text-gray-600">Initial Consultation</div>
                </CardContent>
              </Card>
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-secondary mb-2">Global</div>
                  <div className="text-sm text-gray-600">Reach & Support</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;

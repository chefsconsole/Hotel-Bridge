import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Toaster } from "./components/ui/sonner";
import { CustomCursor } from "./components/CustomCursor";
import { FloatingActions } from "./components/FloatingActions";
import { CookieBanner } from "./components/CookieBanner";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import WhyUs from "./pages/WhyUs";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import CRMLayout from "./pages/CRM/CRMLayout";
import Dashboard from "./pages/CRM/Dashboard";
import HotelsList from "./pages/CRM/HotelsList";
import OperatorsList from "./pages/CRM/OperatorsList";
import BookingsList from "./pages/CRM/BookingsList";
import RevenueList from "./pages/CRM/RevenueList";
import AIAssistant from "./pages/CRM/AIAssistant";
import LeadsList from "./pages/CRM/LeadsList";
import TasksList from "./pages/CRM/TasksList";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem('isAuthenticated');
  return isAuth ? children : <Navigate to="/login" replace />;
};

// On the CRM subdomain (app.hotelbridge.co) the root should open the CRM,
// not the public marketing homepage. No-op on hotelbridge.co.
const CrmHostGate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const isAppHost =
      typeof window !== 'undefined' && /^app\./i.test(window.location.hostname);
    if (isAppHost && location.pathname === '/') {
      navigate('/crm', { replace: true });
    }
  }, [location.pathname, navigate]);
  return null;
};

function App() {
  return (
    <div className="App">
      <CustomCursor />
      <BrowserRouter>
        <CrmHostGate />
        <FloatingActions />
        <CookieBanner />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <>
              <Header />
              <main className="min-h-screen">
                <Home />
              </main>
              <Footer />
              <Toaster />
            </>
          } />
          <Route path="/about" element={
            <>
              <Header />
              <main className="min-h-screen">
                <About />
              </main>
              <Footer />
              <Toaster />
            </>
          } />
          <Route path="/services" element={
            <>
              <Header />
              <main className="min-h-screen">
                <Services />
              </main>
              <Footer />
              <Toaster />
            </>
          } />
          <Route path="/why-us" element={
            <>
              <Header />
              <main className="min-h-screen">
                <WhyUs />
              </main>
              <Footer />
              <Toaster />
            </>
          } />
          <Route path="/privacy" element={
            <>
              <Header />
              <main className="min-h-screen">
                <Privacy />
              </main>
              <Footer />
              <Toaster />
            </>
          } />
          <Route path="/terms" element={
            <>
              <Header />
              <main className="min-h-screen">
                <Terms />
              </main>
              <Footer />
              <Toaster />
            </>
          } />
          <Route path="/contact" element={
            <>
              <Header />
              <main className="min-h-screen">
                <Contact />
              </main>
              <Footer />
              <Toaster />
            </>
          } />
          
          {/* Login Route */}
          <Route path="/login" element={<><Login /><Toaster /></>} />
          
          {/* Protected CRM Routes */}
          <Route path="/crm" element={
            <ProtectedRoute>
              <CRMLayout />
              <Toaster />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<LeadsList />} />
            <Route path="tasks" element={<TasksList />} />
            <Route path="hotels" element={<HotelsList />} />
            <Route path="operators" element={<OperatorsList />} />
            <Route path="bookings" element={<BookingsList />} />
            <Route path="revenue" element={<RevenueList />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
          </Route>

          {/* Catch-all: redirect unknown URLs to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;


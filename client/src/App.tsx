import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Screens from "@/pages/Screens";
import Groups from "@/pages/Groups";
import Media from "@/pages/Media";
import Schedule from "@/pages/Schedule";
import Player from "@/pages/Player";
import Login from "@/pages/Login";
import Subscriptions from "@/pages/Subscriptions";
import Activate from "@/pages/Activate";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminInvoices from "@/pages/admin/AdminInvoices";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminScreens from "@/pages/admin/AdminScreens";
import AdminActivity from "@/pages/admin/AdminActivity";
import AdminAdmins from "@/pages/admin/AdminAdmins";
import AdminPlans from "@/pages/admin/AdminPlans";
import AdminDiscountCodes from "@/pages/admin/AdminDiscountCodes";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminPopups from "@/pages/admin/AdminPopups";
import AdminEmailCampaigns from "@/pages/admin/AdminEmailCampaigns";
import AdminLayout from "@/components/admin/AdminLayout";
import Team from "@/pages/Team";
import Settings from "@/pages/Settings";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import InvoiceView from "@/pages/InvoiceView";
import LandingPage from "@/pages/LandingPage";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import ContactUs from "@/pages/ContactUs";
import { PopupNotifications } from "@/components/PopupNotifications";

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <>
      <PopupNotifications />
      <Component />
    </>
  );
}

// Redirect logged-in users from public pages to dashboard
function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

// Admin Protected Route Wrapper
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const { data: adminCheck, isLoading: adminLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ['/api/admin/check'],
    enabled: !!user,
  });

  if (isLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!adminCheck?.isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/player/:id" component={Player} />
      <Route path="/activate" component={Activate} />

      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/screens">
        <ProtectedRoute component={Screens} />
      </Route>
      <Route path="/media">
        <ProtectedRoute component={Media} />
      </Route>
      <Route path="/schedule">
        <ProtectedRoute component={Schedule} />
      </Route>
      <Route path="/groups">
        <ProtectedRoute component={Groups} />
      </Route>
      <Route path="/subscriptions">
        <ProtectedRoute component={Subscriptions} />
      </Route>
      <Route path="/invoice/:id">
        <ProtectedRoute component={InvoiceView} />
      </Route>
      <Route path="/team">
        <ProtectedRoute component={Team} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      {/* Admin Routes */}
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/users">
        <AdminRoute component={AdminUsers} />
      </Route>
      <Route path="/admin/invoices">
        <AdminRoute component={AdminInvoices} />
      </Route>
      <Route path="/admin/subscriptions">
        <AdminRoute component={AdminSubscriptions} />
      </Route>
      <Route path="/admin/screens">
        <AdminRoute component={AdminScreens} />
      </Route>
      <Route path="/admin/activity">
        <AdminRoute component={AdminActivity} />
      </Route>
      <Route path="/admin/admins">
        <AdminRoute component={AdminAdmins} />
      </Route>
      <Route path="/admin/plans">
        <AdminRoute component={AdminPlans} />
      </Route>
      <Route path="/admin/discount-codes">
        <AdminRoute component={AdminDiscountCodes} />
      </Route>
      <Route path="/admin/settings">
        <AdminRoute component={AdminSettings} />
      </Route>
      <Route path="/admin/messages">
        <AdminRoute component={AdminMessages} />
      </Route>
      <Route path="/admin/popups">
        <AdminRoute component={AdminPopups} />
      </Route>
      <Route path="/admin/email-campaigns">
        <AdminRoute component={AdminEmailCampaigns} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;

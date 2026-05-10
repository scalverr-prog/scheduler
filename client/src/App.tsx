import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserProvider, useUser } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
import LoginModal from "./components/LoginModal";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Schedule from "./pages/Schedule";
import Calendar from "./pages/Calendar";
import PatientTimeline from "./pages/PatientTimeline";
import AuditLog from "./pages/AuditLog";
import Staff from "./pages/Staff";
import Rooms from "./pages/Rooms";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/patients"} component={Patients} />
      <Route path={"/schedule"} component={Schedule} />
      <Route path={"/calendar"} component={Calendar} />
      <Route path={"/timeline"} component={PatientTimeline} />
      <Route path={"/audit"} component={AuditLog} />
      <Route path={"/staff"} component={Staff} />
      <Route path={"/rooms"} component={Rooms} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function AuthenticatedApp() {
  const { currentUser, allUsers, login } = useUser();

  if (!currentUser) {
    return <LoginModal onLogin={login} existingUsers={allUsers} />;
  }

  return <Router />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <UserProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <AuthenticatedApp />
            </TooltipProvider>
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

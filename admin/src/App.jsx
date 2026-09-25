import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { ProtectedRoute } from './auth/ProtectedRoute.jsx'
import { GuestRoute } from './auth/GuestRoute.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'

// Core & Operations Views
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BuyersManagement from './pages/BuyersManagement.jsx'
import SellersManagement from './pages/SellersManagement.jsx'
import DealersManagement from './pages/DealersManagement.jsx'
import CarsManagement from './pages/CarsManagement.jsx'
import PartsManagement from './pages/PartsManagement.jsx'
import TaxonomyManagement from './pages/TaxonomyManagement.jsx'
import InventoryManagement from './pages/InventoryManagement.jsx'
import ListingModeration from './pages/ListingModeration.jsx'
import KycManagement from './pages/KycManagement.jsx'
import SellerApplications from './pages/SellerApplications.jsx'
import AppointmentMonitoring from './pages/AppointmentMonitoring.jsx'
import ChatModeration from './pages/ChatModeration.jsx'
import PromotionsManagement from './pages/PromotionsManagement.jsx'
import OrdersManagement from './pages/OrdersManagement.jsx'
import PayoutsManagement from './pages/PayoutsManagement.jsx'
import DisputesManagement from './pages/DisputesManagement.jsx'
import VerificationsManagement from './pages/VerificationsManagement.jsx'
import ReviewsModeration from './pages/ReviewsModeration.jsx'
import GaragesManagement from './pages/GaragesManagement.jsx'
import NotificationsBroadcasting from './pages/NotificationsBroadcasting.jsx'
import SupportTickets from './pages/SupportTickets.jsx'
import UsersManagement from './pages/UsersManagement.jsx'
import AnalyticsReports from './pages/AnalyticsReports.jsx'
import AuditLogs from './pages/AuditLogs.jsx'
import CacheManager from './pages/CacheManager.jsx'
import SystemHealth from './pages/SystemHealth.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import Unauthorized from './pages/Unauthorized.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Guest Only Routes */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="buyers" element={<BuyersManagement />} />
            <Route path="sellers" element={<SellersManagement />} />
            <Route path="dealers" element={<DealersManagement />} />
            <Route path="cars" element={<CarsManagement />} />
            <Route path="moderation" element={<ListingModeration />} />
            <Route path="kyc" element={<KycManagement />} />
            <Route path="seller-applications" element={<SellerApplications />} />
            <Route path="verifications" element={<KycManagement />} />
            <Route path="taxonomy" element={<TaxonomyManagement />} />
            <Route path="parts" element={<PartsManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="orders" element={<OrdersManagement />} />
            <Route path="appointments" element={<AppointmentMonitoring />} />
            <Route path="chat-moderation" element={<ChatModeration />} />
            <Route path="promotions" element={<PromotionsManagement />} />
            <Route path="payouts" element={<PayoutsManagement />} />
            <Route path="disputes" element={<DisputesManagement />} />
            <Route path="verifications" element={<VerificationsManagement />} />
            <Route path="reviews" element={<ReviewsModeration />} />
            <Route path="garages" element={<GaragesManagement />} />
            <Route path="notifications" element={<NotificationsBroadcasting />} />
            <Route path="support" element={<SupportTickets />} />
            <Route path="users" element={<UsersManagement initialRole="staff_admin" title="Admin Users & Permissions" />} />
            <Route path="admin-users" element={<UsersManagement initialRole="staff_admin" title="Admin Users & Permissions" />} />
            <Route path="analytics" element={<AnalyticsReports />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="cache-manager" element={<CacheManager />} />
            <Route path="system" element={<SystemHealth />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

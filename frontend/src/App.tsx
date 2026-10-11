import { BrowserRouter, Route, Routes } from "react-router"

import { Layout } from "@/components/Layout"
import { RequireAuth } from "@/components/RequireAuth"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"
import { LoginPage, RegisterPage } from "@/pages/AuthPages"
import { Checkout } from "@/pages/Checkout"
import { EventPage } from "@/pages/EventPage"
import { Home } from "@/pages/Home"
import { MyListings } from "@/pages/MyListings"
import { MyTickets } from "@/pages/MyTickets"
import { NotFound } from "@/pages/NotFound"
import { Sell } from "@/pages/Sell"
import { SellConfirm } from "@/pages/SellConfirm"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="events/:slug" element={<EventPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="sell" element={<RequireAuth><Sell /></RequireAuth>} />
            <Route path="sell/:listingId" element={<RequireAuth><SellConfirm /></RequireAuth>} />
            <Route path="checkout/:orderId" element={<RequireAuth><Checkout /></RequireAuth>} />
            <Route path="my/tickets" element={<RequireAuth><MyTickets /></RequireAuth>} />
            <Route path="my/listings" element={<RequireAuth><MyListings /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  )
}

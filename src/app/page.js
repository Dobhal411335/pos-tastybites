import React from "react";
import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import SearchFilter from "@/components/sections/SearchFilter";
import AboutUs from "@/components/sections/AboutUs";
import Notices from "@/components/sections/Notices";
import ProductCards from "@/components/sections/ProductCards";
import DealsCarousel from "@/components/sections/DealsCarousel";
import PromoGrid from "@/components/sections/PromoGrid";
import BookingForm from "@/components/sections/BookingForm";
import Footer from "@/components/sections/Footer";
import { Toaster } from "sonner";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] font-sans overflow-x-hidden antialiased">
      <Toaster position="top-right" richColors />
      
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Interactive Search Section */}
      <SearchFilter />

      {/* Main Content Area */}
      <main className="flex-1 py-12 space-y-6">
        
        {/* About Us section */}
        <AboutUs />

        {/* Notices Section */}
        <Notices />

        {/* Product Menu Cards */}
        <ProductCards />

        {/* Deals Carousel */}
        <DealsCarousel />

        {/* Promo Grid */}
        <PromoGrid />

        {/* Booking Section */}
        <BookingForm />

      </main>

      {/* Footer Section */}
      <Footer />
    </div>
  );
}

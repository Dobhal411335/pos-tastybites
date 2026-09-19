import React from "react";
import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import Footer from "@/components/sections/Footer";
import PopUpBanner from "@/components/sections/PopUpBanner";
import QuickOrderBar from "@/components/ordering/QuickOrderBar";
import CategoryCarousel from "@/components/ordering/CategoryCarousel";
import BrowseMenuLanding from "@/components/ordering/BrowseMenuLanding";
import SpecialOfferBanner from "@/components/ordering/SpecialOfferBanner";
import RestaurantStory from "@/components/ordering/RestaurantStory";
import PickupHowItWorks from "@/components/ordering/PickupHowItWorks";
import BookTableForm from "@/components/ordering/BookTableForm";
import FinalOrderCta from "@/components/ordering/FinalOrderCta";
import LocalBusinessJsonLd from "@/components/ordering/LocalBusinessJsonLd";
import SmoothScroll from "@/components/ordering/SmoothScroll";

export const metadata = {
  title: "Order Online for Same-Day Pickup",
  description:
    "Order from Tasty Bites online. Browse the menu, customize your meal, and pick up the same day.",
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-(--customer-surface) text-(--customer-ink) antialiased">
      <SmoothScroll />
      <LocalBusinessJsonLd />
      <PopUpBanner />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <QuickOrderBar />
        <CategoryCarousel />
        <BrowseMenuLanding />
        <SpecialOfferBanner />
        <RestaurantStory />
        <PickupHowItWorks />
        {/* <CustomerReviews /> */}
        <BookTableForm />
        <FinalOrderCta />
      </main>
      <Footer />
    </div>
  );
}

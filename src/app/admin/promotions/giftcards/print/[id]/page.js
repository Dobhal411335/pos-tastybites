"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import GiftCardTemplate from "@/components/giftcards/GiftCardTemplate";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function PrintGiftCardsPage({ params }) {
  const router = useRouter();
  const { id: batchId } = use(params);
  
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch(`/api/menu/giftcards/${batchId}`);
        const json = await res.json();
        if (json.success) {
          setCards(json.data);
        } else {
          toast.error(json.message);
        }
      } catch (e) {
        toast.error("Failed to load gift cards for printing");
      } finally {
        setLoading(false);
      }
    }
    fetchCards();
  }, [batchId]);

  // Group into pages of 4
  const pages = [];
  for (let i = 0; i < cards.length; i += 4) {
    pages.push(cards.slice(i, i + 4));
  }

  const handlePrint = () => {
    const printRoot = document.getElementById("print-root");
    const originalParent = printRoot.parentNode;
    const placeholder = document.createElement("div");
    placeholder.id = "print-placeholder";
    
    // Hide all other root elements
    document.body.classList.add("printing");
    
    // Move to body to escape layout constraints
    originalParent.replaceChild(placeholder, printRoot);
    document.body.appendChild(printRoot);
    
    // Trigger print
    window.print();
    
    // Restore DOM
    document.body.removeChild(printRoot);
    originalParent.replaceChild(printRoot, placeholder);
    document.body.classList.remove("printing");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-500 mb-4">No gift cards found for this batch.</p>
        <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 text-black">
      
      {/* Non-printable header */}
      <div className="bg-white border-b border-gray-300 p-4 flex justify-between items-center shadow-sm print:hidden sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="font-bold text-lg">Print Gift Cards</h1>
            <p className="text-sm text-gray-500">Batch ID: {batchId} • {cards.length} Cards</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="bg-blue-600 text-white hover:bg-blue-700">
          <Printer className="w-4 h-4 mr-2" /> Print Now
        </Button>
      </div>

      {/* Printable Area */}
      <div id="print-root" className="print:m-0 print:p-0 p-8 flex flex-col items-center gap-8">
        
        {/* Print specific CSS */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          body.printing > *:not(#print-root) {
            display: none !important;
          }
        `}} />

        {pages.map((pageCards, pageIndex) => (
          <div 
            key={pageIndex} 
            className="w-[297mm] h-[210mm] bg-white shadow-lg print:shadow-none mx-auto box-border pt-[10mm] px-[5mm]"
            style={{ pageBreakAfter: "always" }}
          >
            {/* 2x2 Grid for 4 cards */}
            <div className="grid grid-cols-2 gap-x-[3mm] gap-y-[15mm] w-full place-items-center">
              {pageCards.map((card, cardIndex) => (
                <div key={card._id} className="w-full h-[65mm]">
                  <GiftCardTemplate card={card} index={(pageIndex * 4 ) + cardIndex} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

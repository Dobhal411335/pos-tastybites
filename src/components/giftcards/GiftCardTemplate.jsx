"use client";

import Image from "next/image";
import React from "react";
// import QRCode from "react-qr-code";
import { Yellowtail } from "next/font/google";

const yellowtail = Yellowtail({
  subsets: ["latin"],
  weight: "400",
});
export default function GiftCardTemplate({ card, index }) {
  const qrData = JSON.stringify({
    number: card.code,
    name: "Tasty Bites",
    amount: card.value,
    expires: card.validUntil ? new Date(card.validUntil).toLocaleDateString() : "Never"
  });

  const issueDate = card.validFrom ? new Date(card.validFrom).toLocaleDateString() : new Date(card.createdAt).toLocaleDateString();
  const amountStr = `$${parseFloat(card.value).toFixed(2)}`;
  const displayCode = `TB-${String(index + 1).padStart(6, '0')}`; // Example display number

  return (
    <div className="flex w-full h-full bg-white text-black font-sans box-border overflow-hidden rounded shadow-sm border border-gray-300 relative print:border-none print:shadow-none">

      {/* LEFT STUB (30%) */}
      <div className="w-[30%] flex flex-col h-full relative">
        {/* Top Header */}
        <div className="bg-black text-white px-3 py-2 flex flex-col justify-center h-[20%] print:!bg-black print:text-white print:color-adjust-exact">
          <div className={`${yellowtail.className} text-[#E3B12F] text-[22px] leading-none print:text-[#E3B12F]`}>Tasty Bites</div>
          <div className="text-[9px] mt-1 font-bold flex gap-1 items-end">
            Card Number:
            <span className="flex-1 border-b border-[#FFD700] pb-3 px-2 inline-block h-2">{displayCode}</span>
          </div>
        </div>

        {/* Middle Body */}
        <div className="flex-1 bg-white p-2 flex flex-col justify-between text-[10px] leading-tight font-bold text-black border-r-2 border-dashed border-[#FFD700]">
          <div className="flex items-end"><span className="w-8">Date:</span> <span className="border-b-2 border-black border-dotted flex-1 text-center font-normal"></span></div>
          <div className="flex items-end gap-1"><span className="w-6">For:</span> <span className="border-b-2 border-black border-dotted flex-1"></span></div>
          <div className="border-b-2 border-black border-dotted w-full h-px"></div>
          <div className="flex items-end gap-1"><span className="w-12">Amount:</span> <span className="border-b-2 border-black border-dotted flex-1 text-center text-[12px] font-normal">{amountStr}</span></div>
          <div className="flex items-end gap-1"><span className="w-12 whitespace-nowrap">Signature:</span> <span className="border-b-2 border-black border-dotted flex-1"></span>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="h-[15%] bg-[#7B0F13] flex items-center justify-center border-r-2 border-dashed border-[#FFD700] print:!bg-[#7B0F13]">
        </div>
      </div>

      {/* MAIN CARD (70%) */}
      <div className="w-[70%] flex flex-col h-full relative">

        {/* Ribbon Image (Absolute) */}
        <div className="absolute top-0 right-0 w-40 h-44 z-10 pointer-events-none translate-x-[10%] -translate-y-[1%]">
          {/* Using a highly stylized internet image for the rosette/ribbon */}
          <Image
            width={500}
            height={500}
            src="/flower.png"
            alt="Rosette"
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>

        {/* Top Header */}
        <div className="bg-black text-white px-4 py-1 flex justify-between h-[20%] relative print:!bg-black print:text-white print:color-adjust-exact">
          <div className="flex flex-col justify-center">
            <div className={` ${yellowtail.className} text-[#E3B12F] text-[22px] leading-none print:text-[#E3B12F]  `}> Tasty Bites</div>
            <div className="text-[11px] mt-1 font-bold flex gap-2 items-center">
              Card Number:
              <span className="bg-[#FFD700] text-black px-2 py-0.5 min-w-[100px] text-center font-bold print:!bg-[#FFD700] print:text-black">
                {displayCode}
              </span>
            </div>
          </div>
          <div className="text-[10px] font-bold z-20 text-white drop-shadow-md">
            HST #740811146RT0001
          </div>
        </div>

        {/* Middle Body */}
        <div className="h-[65%] bg-white p-2 flex flex-col justify-between text-black relative">
          <h1 className="text-3xl font-extrabold tracking-tight">Gift Certificate</h1>
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 flex flex-col gap-2.5 text-[12px] font-bold">
              <div className="flex items-end gap-2">
                <span className="w-12">Date:</span>
                <span className="border-b-2 border-black border-dotted flex-1 font-normal text-center"></span>
                <span className="w-16 ml-4">Amount:</span>
                <span className="bg-[#FFD700] border-2 border-black min-w-[80px] h-6 flex items-center justify-center font-bold px-2 print:!bg-[#FFD700] print:border-black">{amountStr}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="w-8">For:</span>
                <span className="border-b-2 border-black border-dotted flex-1 pb-1"></span>
              </div>
              <div className="flex items-end gap-2">
                <span className="whitespace-nowrap">Authorised Signature:</span>
                <span className="border-b-2 border-black border-dotted flex-1 pb-1"></span>
              </div>
            </div>

            {/* QR Code (Temporarily disabled)
            <div className="w-16 h-16 bg-white p-1 border border-gray-200 mt-1 flex-shrink-0 relative z-0">
              <QRCode value={qrData} size={64} style={{ width: "100%", height: "100%" }} />
            </div>
            */}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="h-[15%] bg-[#7B0F13] text-white px-3 flex items-center justify-between print:!bg-[#7B0F13] print:text-white print:color-adjust-exact">
          <div className="text-[9px] font-bold leading-tight">
            345 MAIN ST. S. EXETER, ON NOM 1S6<br />
            www.tastybitesrestaurant.com
          </div>
          <div className="text-sm font-extrabold">
            (519) 235-0050
          </div>
        </div>
      </div>

    </div>
  );
}

"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function Notices() {
    const [offerDetails, setOfferDetails] = useState(null);
      useEffect(() => {
        fetch("/api/web/offerDetails")
            .then(res => res.json())
            .then(data => { if (data) setOfferDetails(data); })
            .catch(() => { });
    }, []);
  return (
    <section className="w-full md:w-[95%] mx-auto py-4 space-y-3 px-3 sm:px-4 md:px-0">
      {/* Banner 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-linear-to-r from-[#fde8e2] via-[#fdf0ec] to-[#fef6f4] rounded-xl px-4 sm:px-5 py-4 shadow-sm border border-orange-100/60">

        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Image src="/clockImage.png" alt="clock" width={40} height={40} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />

          <div>
            <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
              {offerDetails?.lastMinuteDeal?.heading || 'Last Minute Deal'}
            </h4>
            <p className="text-xs sm:text-sm text-gray-500">
              {offerDetails?.lastMinuteDeal?.description || 'Up to 75% off on selected hotels'}
            </p>
          </div>
        </div>

        <Link href={offerDetails?.lastMinuteDeal?.link || ''}
          className="w-full sm:w-auto text-center text-sm text-nowrap bg-white font-medium text-gray-700 border border-gray-300 rounded-full px-4 sm:px-5 py-2 hover:bg-gray-800 hover:text-white transition-all duration-200"
        >
          Know More
        </Link>
      </div>

      {/* Banner 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-linear-to-r from-[#ede4f5] via-[#f3eef9] to-[#f8f5fc] rounded-xl px-4 sm:px-5 py-4 shadow-sm border border-purple-100/60">

        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Image src="/banner1.png" alt="card" width={40} height={40} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />

          <p className="text-xs sm:text-sm md:text-base text-gray-700">
            {offerDetails?.promoBanner?.description || 'Save ₹2,000 on Hotels by using Adani One ICICI Bank credit card.'}
          </p>
        </div>

        <Link
          href={offerDetails?.promoBanner?.link || ''}
          className="w-full sm:w-auto text-center text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full px-5 py-2 hover:bg-gray-800 hover:text-white transition-all duration-200"
        >
          Apply
        </Link>
      </div>

    </section>
  );
}

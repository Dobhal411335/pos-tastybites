"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NewOrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const type = searchParams.get("type"); // "dine-in" or "takeaway"
  const table = searchParams.get("table");
  const name = searchParams.get("name");
  const phone = searchParams.get("phone");

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center font-sans p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100">
        <h1 className="text-2xl font-black mb-2">Order Menu</h1>
        <p className="text-zinc-500 mb-6">This section is currently under construction.</p>
        
        <div className="bg-orange-50 rounded-xl p-4 text-left mb-8 text-orange-900 border border-orange-100">
          <p className="font-bold text-sm mb-1 uppercase tracking-wider text-orange-600">Order Context Received:</p>
          <ul className="space-y-1 font-medium">
            <li>Type: <span className="font-bold">{type === 'dine-in' ? 'Dine-In' : 'Takeaway'}</span></li>
            {type === 'dine-in' && <li>Table: <span className="font-bold">{table}</span></li>}
            {type === 'takeaway' && <li>Guest: <span className="font-bold">{name}</span> {phone && `(${phone})`}</li>}
          </ul>
        </div>

        <Button 
          onClick={() => router.push("/employee/dashboard")}
          className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

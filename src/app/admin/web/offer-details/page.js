"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {toast} from "sonner";
import { Save, Loader2 } from "lucide-react";

const OfferDetailsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [moreOffers, setMoreOffers] = useState({
        title: "More offers",
        description: "",
        knowMoreLink: "/packages",
    });

    const [lastMinuteDeal, setLastMinuteDeal] = useState({
        heading: "Last Minute Deal",
        description: "",
        link: "/packages",
    });

    const [promoBanner, setPromoBanner] = useState({
        description: "",
        link: "/packages",
    });

    // Fetch existing data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/web/offerDetails");
                const data = await res.json();
                if (data?.moreOffers) setMoreOffers(data.moreOffers);
                if (data?.lastMinuteDeal) setLastMinuteDeal(data.lastMinuteDeal);
                if (data?.promoBanner) setPromoBanner(data.promoBanner);
            } catch (error) {
                console.error("Failed to fetch offer details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/web/offerDetails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ moreOffers, lastMinuteDeal, promoBanner }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Offer details saved successfully!");
            } else {
                toast.error(data.error || "Failed to save");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-10 flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 w-full space-y-8">
            {/* Section 1: More Offers */}
            <div className="bg-white shadow-lg rounded-xl p-6 space-y-4 border">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-3">
                    📢 Section 1 — More Offers Card
                </h2>
                <p className="text-sm text-gray-500">This appears in the search section sidebar on homepage.</p>

                <div className="space-y-3">
                    <div>
                        <Label className="font-semibold">Title</Label>
                        <Input
                            value={moreOffers.title}
                            onChange={(e) => setMoreOffers({ ...moreOffers, title: e.target.value })}
                            placeholder="e.g. More offers"
                        />
                    </div>
                    <div>
                        <Label className="font-semibold">Description</Label>
                        <Textarea
                            value={moreOffers.description}
                            onChange={(e) => setMoreOffers({ ...moreOffers, description: e.target.value })}
                            placeholder="e.g. Last Minute Deals! Upto 40% off on Hotels"
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label className="font-semibold">Know More Link URL</Label>
                        <Input
                            value={moreOffers.knowMoreLink}
                            onChange={(e) => setMoreOffers({ ...moreOffers, knowMoreLink: e.target.value })}
                            placeholder="/packages"
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: Last Minute Deal */}
            <div className="bg-white shadow-lg rounded-xl p-6 space-y-4 border">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-3">
                    ⏱️ Section 2 — Last Minute Deal Banner
                </h2>
                <p className="text-sm text-gray-500">This appears as the orange gradient banner in the about section.</p>

                <div className="space-y-3">
                    <div>
                        <Label className="font-semibold">Heading</Label>
                        <Input
                            value={lastMinuteDeal.heading}
                            onChange={(e) => setLastMinuteDeal({ ...lastMinuteDeal, heading: e.target.value })}
                            placeholder="e.g. Last Minute Deal"
                        />
                    </div>
                    <div>
                        <Label className="font-semibold">Description</Label>
                        <Textarea
                            value={lastMinuteDeal.description}
                            onChange={(e) => setLastMinuteDeal({ ...lastMinuteDeal, description: e.target.value })}
                            placeholder="e.g. Up to 75% off on selected hotels"
                            rows={2}
                        />
                    </div>
                    <div>
                        <Label className="font-semibold">Link URL</Label>
                        <Input
                            value={lastMinuteDeal.link}
                            onChange={(e) => setLastMinuteDeal({ ...lastMinuteDeal, link: e.target.value })}
                            placeholder="/packages"
                        />
                    </div>
                </div>
            </div>

            {/* Section 3: Promo Banner */}
            <div className="bg-white shadow-lg rounded-xl p-6 space-y-4 border">
                <h2 className="text-xl font-bold text-gray-900 border-b pb-3">
                    💳 Section 3 — Promo Banner
                </h2>
                <p className="text-sm text-gray-500">This appears as the purple gradient banner in the about section.</p>

                <div className="space-y-3">
                    <div>
                        <Label className="font-semibold">Description</Label>
                        <Textarea
                            value={promoBanner.description}
                            onChange={(e) => setPromoBanner({ ...promoBanner, description: e.target.value })}
                            placeholder='e.g. Save ₹2,000 on Hotels by using Adani One ICICI Bank credit card.'
                            rows={2}
                        />
                    </div>
                    <div>
                        <Label className="font-semibold">Link URL</Label>
                        <Input
                            value={promoBanner.link}
                            onChange={(e) => setPromoBanner({ ...promoBanner, link: e.target.value })}
                            placeholder="/packages"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 text-base font-semibold rounded-lg"
                >
                    {saving ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin h-4 w-4" /> Saving...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Save className="h-4 w-4" /> Save All Sections
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default OfferDetailsPage;
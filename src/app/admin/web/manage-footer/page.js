"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ManageFooterForm } from "./ManageFooterForm";

export default function ManageFooterPage() {
  const [values, setValues] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchFooter = async () => {
    try {
      const res = await fetch("/api/web/footer");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setValues({
          thankYou: json.data.thankYou || "Thank you for visiting",
          description: json.data.description || "",
          columns: json.data.columns || [],
        });
      }
    } catch (err) {
      toast.error(err.message || "Failed to load footer settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFooter();
  }, []);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setErrors({});
    setIsSaving(true);

    try {
      const res = await fetch("/api/web/footer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save footer settings");
      }
      toast.success("Footer settings saved successfully");
    } catch (err) {
      toast.error(err.message || "Failed to save footer settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex w-full max-w-full flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl text-heading md:text-4xl">
            Manage Footer
          </h1>
          <p className="font-body text-sm text-muted">
            Configure the landing page footer brand description, thank-you note, and dynamic columns.
          </p>
        </div>

        <Button
          type="submit"
          form="manage-footer-form"
          disabled={isSaving || isLoading}
          className="gap-2 shrink-0"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <ManageFooterForm
          values={values}
          errors={errors}
          onChange={setValues}
          onSubmit={handleSubmit}
          formId="manage-footer-form"
        />
      )}
    </div>
  );
}

"use client";

import React from "react";
import { FileText, Columns3, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

function createEmptyColumn() {
  return {
    title: "",
    order: 0,
    active: true,
    links: [],
  };
}

function createEmptyLink() {
  return {
    label: "",
    url: "",
    order: 0,
    active: true,
  };
}

export function ManageFooterForm({
  values,
  errors = {},
  onChange,
  onSubmit,
  formId = "manage-footer-form",
}) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/70 pb-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Brand / Description</CardTitle>
          </div>
          <CardDescription>
            Thank-you line and short brand description. Logo and social links come
            from Company Basic Info.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="footer-thank-you">Thank-you line</Label>
            <Input
              id="footer-thank-you"
              value={values.thankYou || ""}
              onChange={(event) =>
                onChange({ ...values, thankYou: event.target.value })
              }
              placeholder="Thank you for visiting"
              className="h-11"
              aria-invalid={Boolean(errors.thankYou)}
            />
            {errors.thankYou ? (
              <p className="text-xs text-destructive">{errors.thankYou}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="footer-description">Description</Label>
            <Textarea
              id="footer-description"
              value={values.description || ""}
              onChange={(event) =>
                onChange({ ...values, description: event.target.value })
              }
              placeholder="Short brand description shown in the footer"
              className="min-h-28"
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/70 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Columns3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Columns & Links</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Add, reorder, and edit footer link columns.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() =>
                onChange({
                  ...values,
                  columns: [...(values.columns || []), createEmptyColumn()],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add column
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {errors.columns ? (
            <p className="text-xs text-destructive">{errors.columns}</p>
          ) : null}
          {(!values.columns || values.columns.length === 0) ? (
            <p className="text-sm text-muted-foreground">
              No columns yet. Add a column to manage footer links.
            </p>
          ) : null}
          {(values.columns || []).map((column, columnIndex) => (
            <div
              key={`column-${columnIndex}`}
              className="space-y-4 rounded-xl border border-border bg-muted/20 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_120px]">
                  <div className="grid gap-2">
                    <Label>Column title</Label>
                    <Input
                      value={column.title || ""}
                      onChange={(event) => {
                        const columns = values.columns.map((item, index) =>
                          index === columnIndex
                            ? { ...item, title: event.target.value }
                            : item,
                        );
                        onChange({ ...values, columns });
                      }}
                      placeholder="e.g. Our policies"
                      className="h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      value={column.order ?? 0}
                      onChange={(event) => {
                        const columns = values.columns.map((item, index) =>
                          index === columnIndex
                            ? { ...item, order: event.target.value }
                            : item,
                        );
                        onChange({ ...values, columns });
                      }}
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1 sm:pt-7">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={column.active ?? true}
                      onCheckedChange={(checked) => {
                        const columns = values.columns.map((item, index) =>
                          index === columnIndex ? { ...item, active: checked } : item,
                        );
                        onChange({ ...values, columns });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() =>
                      onChange({
                        ...values,
                        columns: values.columns.filter(
                          (_, index) => index !== columnIndex,
                        ),
                      })
                    }
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Links</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      const columns = values.columns.map((item, index) =>
                        index === columnIndex
                          ? { ...item, links: [...(item.links || []), createEmptyLink()] }
                          : item,
                      );
                      onChange({ ...values, columns });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add link
                  </Button>
                </div>
                {(column.links || []).map((link, linkIndex) => (
                  <div
                    key={`link-${columnIndex}-${linkIndex}`}
                    className="grid gap-3 rounded-lg border border-border/70 bg-background p-3 sm:grid-cols-[1fr_1fr_100px_auto]"
                  >
                    <div className="grid gap-2">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={link.label || ""}
                        onChange={(event) => {
                          const columns = values.columns.map((item, index) => {
                            if (index !== columnIndex) return item;
                            return {
                              ...item,
                              links: item.links.map((entry, entryIndex) =>
                                entryIndex === linkIndex
                                  ? { ...entry, label: event.target.value }
                                  : entry,
                              ),
                            };
                          });
                          onChange({ ...values, columns });
                        }}
                        placeholder="Shipping"
                        className="h-10"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={link.url || ""}
                        onChange={(event) => {
                          const columns = values.columns.map((item, index) => {
                            if (index !== columnIndex) return item;
                            return {
                              ...item,
                              links: item.links.map((entry, entryIndex) =>
                                entryIndex === linkIndex
                                  ? { ...entry, url: event.target.value }
                                  : entry,
                              ),
                            };
                          });
                          onChange({ ...values, columns });
                        }}
                        placeholder="/policies/shipping"
                        className="h-10"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Order</Label>
                      <Input
                        type="number"
                        value={link.order ?? 0}
                        onChange={(event) => {
                          const columns = values.columns.map((item, index) => {
                            if (index !== columnIndex) return item;
                            return {
                              ...item,
                              links: item.links.map((entry, entryIndex) =>
                                entryIndex === linkIndex
                                  ? { ...entry, order: event.target.value }
                                  : entry,
                              ),
                            };
                          });
                          onChange({ ...values, columns });
                        }}
                        className="h-10"
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <Switch
                        checked={link.active ?? true}
                        onCheckedChange={(checked) => {
                          const columns = values.columns.map((item, index) => {
                            if (index !== columnIndex) return item;
                            return {
                              ...item,
                              links: item.links.map((entry, entryIndex) =>
                                entryIndex === linkIndex
                                  ? { ...entry, active: checked }
                                  : entry,
                              ),
                            };
                          });
                          onChange({ ...values, columns });
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          const columns = values.columns.map((item, index) => {
                            if (index !== columnIndex) return item;
                            return {
                              ...item,
                              links: item.links.filter(
                                (_, entryIndex) => entryIndex !== linkIndex,
                              ),
                            };
                          });
                          onChange({ ...values, columns });
                        }}
                        aria-label="Remove link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </form>
  );
}

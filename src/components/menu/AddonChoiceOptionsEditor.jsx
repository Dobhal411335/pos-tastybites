"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const DEFAULT_ADDON_CHOICE_GROUP = {
  name: "",
  subChoices: ["", "", "", ""],
};

export function normalizeAddonChoiceOptionsForForm(choiceOptions) {
  if (!Array.isArray(choiceOptions) || choiceOptions.length === 0) {
    return [{ ...DEFAULT_ADDON_CHOICE_GROUP, subChoices: ["", "", "", ""] }];
  }
  return choiceOptions.map((group) => ({
    name: group.name || "",
    subChoices: group.subChoices?.length
      ? [...group.subChoices]
      : ["", "", "", ""],
  }));
}

export function serializeAddonChoiceOptions(choiceOptions) {
  return (Array.isArray(choiceOptions) ? choiceOptions : [])
    .map((group) => ({
      name: (group.name || "").trim(),
      subChoices: (group.subChoices || []).map((value) => value.trim()).filter(Boolean),
    }))
    .filter((group) => group.name && group.subChoices.length > 0);
}

export default function AddonChoiceOptionsEditor({
  choiceOptions = [],
  onChange,
  className = "",
}) {
  const groups =
    choiceOptions.length > 0
      ? choiceOptions
      : [{ ...DEFAULT_ADDON_CHOICE_GROUP }];

  const updateGroups = (nextGroups) => {
    onChange(nextGroups);
  };

  return (
    <div className={`space-y-4 pt-4 border-t border-zinc-100 ${className}`}>
      <label className="text-[13px] font-semibold text-zinc-900 block">
        Choice Options
      </label>
      {groups.map((group, groupIndex) => (
        <div
          key={`addon-choice-group-${groupIndex}`}
          className="space-y-3 border border-zinc-200 rounded-lg p-3 bg-white"
        >
          <div className="flex items-center justify-between gap-3">
            <label className="text-[12px] font-semibold text-zinc-700">
              Choice Option
            </label>
            {groups.length > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const next = [...groups];
                  next.splice(groupIndex, 1);
                  updateGroups(next);
                }}
                className="h-8 w-8 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <Input
            type="text"
            placeholder="Example: Topping Options Name Title"
            value={group.name}
            onChange={(e) => {
              const next = [...groups];
              next[groupIndex] = { ...next[groupIndex], name: e.target.value };
              updateGroups(next);
            }}
            className="h-10 text-[14px] bg-white rounded-full px-4"
          />
          <div className="space-y-2">
            <label className="text-[12px] font-semibold text-zinc-700">
              Add Option :
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(group.subChoices || []).map((option, optionIndex) => (
                <Input
                  key={`addon-choice-${groupIndex}-${optionIndex}`}
                  type="text"
                  placeholder="Type Choice"
                  value={option}
                  onChange={(e) => {
                    const next = [...groups];
                    const subChoices = [...(next[groupIndex].subChoices || [])];
                    subChoices[optionIndex] = e.target.value;
                    next[groupIndex] = { ...next[groupIndex], subChoices };
                    updateGroups(next);
                  }}
                  className="h-9 text-[13px] bg-white rounded-full px-3"
                />
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <span className="text-[12px] font-medium text-zinc-600">
                Need More Choice Option
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const next = [...groups];
                  next[groupIndex] = {
                    ...next[groupIndex],
                    subChoices: [...(next[groupIndex].subChoices || []), ""],
                  };
                  updateGroups(next);
                }}
                className="h-9 w-9 p-0 shrink-0 text-zinc-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateGroups([
              ...groups,
              { name: "", subChoices: ["", "", "", ""] },
            ])
          }
          className="h-8 px-3 text-[13px] font-semibold text-zinc-700"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Choice Option
        </Button>
      </div>
    </div>
  );
}

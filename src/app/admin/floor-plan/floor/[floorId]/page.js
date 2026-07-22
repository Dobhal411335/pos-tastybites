"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3x3,
  Save,
  Square,
  Circle,
  RectangleHorizontal,
  Armchair,
  UtensilsCrossed,
  DoorOpen,
  SplitSquareHorizontal,
  CreditCard,
  AlignLeft,
  Copy,
  Lock,
  Unlock,
  Move,
  Trash2,
  MousePointer2,
  Eye,
  Minus,
  LayoutGrid,
  Box
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DndContext,
  useDraggable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

const TOOL_CATEGORIES = [
  {
    name: "Tables & Seating",
    icon: LayoutGrid,
    items: [
      { id: "rectangle", icon: RectangleHorizontal, label: "Rectangle Table", desc: "Standard 4-8 seats", w: 120, h: 80 },
      { id: "round", icon: Circle, label: "Round Table", desc: "Standard 2-4 seats", w: 80, h: 80 },
      { id: "square", icon: Square, label: "Square Table", desc: "Standard 2-4 seats", w: 80, h: 80 },
      { id: "booth", icon: Armchair, label: "Booth", desc: "Wall seating 4-6", w: 120, h: 80 },
    ]
  },
  {
    name: "Structural Elements",
    icon: Box,
    items: [
      { id: "kitchen", icon: UtensilsCrossed, label: "Kitchen", desc: "Preparation area", w: 200, h: 200 },
      { id: "door", icon: DoorOpen, label: "Door", desc: "Entrance or Exit", w: 80, h: 20 },
      { id: "wall", icon: Minus, label: "Wall", desc: "Physical boundary", w: 200, h: 10 },
      { id: "register", icon: CreditCard, label: "Cash Counter", desc: "POS Terminal", w: 80, h: 60 },
      { id: "bar", icon: SplitSquareHorizontal, label: "Bar", desc: "Modular bar segment", w: 200, h: 60 },
      { id: "divider", icon: AlignLeft, label: "Section Divider", desc: "Visual separator", w: 200, h: 4 },
    ]
  }
];

const STATUS_COLORS = {
  Available: "bg-emerald-500",
  Occupied: "bg-orange-500",
  Reserved: "bg-blue-500",
  Cleaning: "bg-purple-500",
  Inactive: "bg-stone-400",
};

// ---------------------------------------------------------------------------
// DRAGGABLE TOOL COMPONENT (Left Sidebar)
// ---------------------------------------------------------------------------

function ToolItem({ tool, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tool-${tool.id}`,
    data: { type: "tool", tool },
  });
  const Icon = tool.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick && onClick(tool)}
      className={`
        group flex w-full items-center gap-4 rounded-xl border bg-white px-4 py-3 text-left 
        transition-colors duration-200 cursor-grab active:cursor-grabbing
        hover:border-orange-200 hover:bg-orange-50 hover:shadow-sm
        ${isDragging ? "opacity-50" : ""}
      `}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 transition-colors group-hover:bg-orange-100">
        <Icon className="h-5 w-5 text-stone-700 group-hover:text-orange-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900">
          {tool.label}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-stone-500">
          {tool.desc}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CANVAS TABLE COMPONENT
// ---------------------------------------------------------------------------

function CanvasTable({ table, isSelected, onSelect, onResizeStart, zoom, isPreviewMode }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `table-${table.id}`,
    data: { type: "table", table },
    disabled: table.locked || isPreviewMode,
  });

  const style = {
    position: "absolute",
    left: table.x,
    top: table.y,
    width: table.w,
    height: table.h,
    transform: `rotate(${table.r}deg) ${transform ? `translate3d(${transform.x / zoom}px, ${transform.y / zoom}px, 0)` : ""
      }`,
    zIndex: isSelected ? 10 : isDragging ? 50 : 1,
  };

  const statusColor = STATUS_COLORS[table.status] || "bg-stone-300";
  const isStructural = ["kitchen", "door", "register", "bar", "wall", "divider"].includes(table.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center justify-center bg-white transition-colors
        ${table.type === "round" ? "rounded-full" : "rounded-[10px]"}
        ${isSelected ? "ring-2 ring-orange-500 ring-offset-2 shadow-lg" : "border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300"}
        ${isDragging ? "opacity-80 scale-105 shadow-xl ring-2 ring-orange-500" : ""}
        ${table.locked || isPreviewMode ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
      `}
      {...(table.locked || isPreviewMode ? {} : listeners)}
      {...(table.locked || isPreviewMode ? {} : attributes)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(table.id);
        if (!table.locked && !isPreviewMode && listeners?.onPointerDown) {
          listeners.onPointerDown(e);
        }
      }}
    >
      {!isStructural && (
        <div className={`absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${statusColor}`} />
      )}

      {/* Resize Handles */}
      {isSelected && !table.locked && !isPreviewMode && (
        <>
          <div 
            onPointerDown={(e) => onResizeStart(e, table)}
            className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-orange-500 bg-white cursor-se-resize z-20 shadow-sm" 
          />
        </>
      )}

      <div className="flex flex-col items-center justify-center p-2 text-center select-none w-full h-full overflow-hidden">
        <span className="text-[13px] font-bold text-stone-900 leading-tight">{table.name}</span>
        {!isStructural && (
          <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mt-0.5">{table.seats} Seats</span>
        )}
        {table.assignedEmployee && (
          <div className="mt-1 flex items-center justify-center gap-1 bg-white/90 px-1.5 py-0.5 rounded-full border shadow-sm max-w-full overflow-hidden" style={{ borderColor: table.assignedEmployee.employeeColor || '#ccc' }}>
             <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: table.assignedEmployee.employeeColor || '#ccc' }} />
             <span className="text-[9px] font-bold text-stone-700 truncate">{table.assignedEmployee.firstName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ---------------------------------------------------------------------------

export default function FloorPlanEditorPage({ params }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const floorId = unwrappedParams.floorId || "f1";

  const [tables, setTables] = useState([]);
  const [unassignedTables, setUnassignedTables] = useState([]);
  const [floorData, setFloorData] = useState(null);
  const [allFloors, setAllFloors] = useState([]);

  useEffect(() => {
    const fetchLayoutAndTables = async () => {
      try {
        const [layoutRes, tablesRes, floorsRes] = await Promise.all([
          fetch(`/api/floor/layout?floorId=${floorId}`),
          fetch(`/api/floor/tables`),
          fetch(`/api/floor`)
        ]);
        const layoutJson = await layoutRes.json();
        const tablesJson = await tablesRes.json();
        const floorsJson = await floorsRes.json();
        
        if (floorsJson.success) {
          setAllFloors(floorsJson.data);
        }
        
        if (layoutJson.success && layoutJson.data.length > 0) {
          const floor = layoutJson.data[0];
          setFloorData(floor);
          
          const mappedTables = floor.tables.map(t => ({
            id: t._id,
            floorId: floor._id,
            name: t.tableNumber,
            type: t.shape === "rectangle" && t.width > 100 ? "booth" : t.shape,
            seats: t.seats,
            section: t.section || "Main",
            status: t.status,
            x: t.x,
            y: t.y,
            w: t.width,
            h: t.height,
            r: t.rotation,
            locked: false,
            assignedEmployee: t.assignedEmployee,
            isShape: false
          }));
          setTables(mappedTables);
        }

        if (tablesJson.success) {
          setUnassignedTables(tablesJson.data.filter(t => !t.floor));
        }

      } catch (err) {
        toast.error("Failed to fetch floor data");
      }
    };
    fetchLayoutAndTables();
  }, [floorId]);

  // Editor State
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridMode, setGridMode] = useState("lines"); // "lines" | "dots" | "none"
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [history, setHistory] = useState({ past: [], future: [] });
  const [currentSection, setCurrentSection] = useState("Dining Hall");

  const tablesRef = useRef(tables);
  useEffect(() => { tablesRef.current = tables; }, [tables]);

  const saveHistory = () => {
    setHistory(h => ({
      past: [...h.past, tablesRef.current],
      future: []
    }));
  };

  const undo = () => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory(h => ({
      past: h.past.slice(0, -1),
      future: [tablesRef.current, ...h.future]
    }));
    setTables(previous);
    setSelectedTableId(null);
  };

  const redo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory(h => ({
      past: [...h.past, tablesRef.current],
      future: h.future.slice(1)
    }));
    setTables(next);
    setSelectedTableId(null);
  };

  // Computed
  const currentFloor = floorData || [];
  const currentFloorTables = tables;
  const selectedTable = tables.find((t) => t.id === selectedTableId);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  // Prevent accidental refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // --- Handlers: Editor Actions ---
  const handleResizeStart = (e, table) => {
    e.stopPropagation();
    e.preventDefault();
    
    saveHistory(); // Save state before resizing begins

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = table.w;
    const startH = table.h;

    const onPointerMove = (moveEvent) => {
      let newW = startW + (moveEvent.clientX - startX) / zoom;
      let newH = startH + (moveEvent.clientY - startY) / zoom;

      // Minimum size
      newW = Math.max(20, newW);
      newH = Math.max(20, newH);

      // Snap logic
      if (snapToGrid) {
        newW = Math.round(newW / 20) * 20;
        newH = Math.round(newH / 20) * 20;
      }

      setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, w: newW, h: newH } : t)));
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleDragEnd = (event) => {
    const { active, delta } = event;
    if (!active) return;

    saveHistory(); // Save state before drop

    const snap = (val) => (snapToGrid ? Math.round(val / 20) * 20 : Math.round(val));

    if (active.data.current?.type === "tool") {
      // Create new element from sidebar
      const tool = active.data.current.tool;
      const x = snap(pan.x * -1 + 300); // Approximate drop center
      const y = snap(pan.y * -1 + 200);

      const newElement = {
        id: `shape-${Date.now()}`,
        floorId: currentFloor._id || currentFloor.id,
        name: "Unassigned",
        type: tool.id,
        seats: tool.id.includes("round") ? 4 : 2,
        section: currentSection,
        status: "Available",
        x,
        y,
        w: tool.w,
        h: tool.h,
        r: 0,
        locked: false,
        isShape: true, // Mark it as an unassigned shape
      };
      
      setTables([...tables, newElement]);
      setSelectedTableId(newElement.id);
    } else if (active.data.current?.type === "table") {
      // Move existing table
      const id = active.id.replace("table-", "");
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              x: snap(t.x + delta.x / zoom),
              y: snap(t.y + delta.y / zoom),
            };
          }
          return t;
        })
      );
    }
  };

  const handleToolClick = (tool) => {
    saveHistory();
    const snap = (val) => (snapToGrid ? Math.round(val / 20) * 20 : Math.round(val));
    
    // Calculate a position near the center of the current view
    const x = snap((pan.x * -1 + 400) / zoom);
    const y = snap((pan.y * -1 + 300) / zoom);

    const newElement = {
      id: `shape-${Date.now()}`,
      floorId: currentFloor._id || currentFloor.id,
      name: "Unassigned",
      type: tool.id,
      seats: tool.id.includes("round") ? 4 : 2,
      section: currentSection,
      status: "Available",
      x,
      y,
      w: tool.w,
      h: tool.h,
      r: 0,
      locked: false,
      isShape: true,
    };
    
    setTables([...tables, newElement]);
    setSelectedTableId(newElement.id);
  };

  const deleteTable = () => {
    if (!selectedTableId) return;
    saveHistory();
    setTables((prev) => prev.filter((t) => t.id !== selectedTableId));
    setSelectedTableId(null);
    toast.success("Element deleted.");
  };

  const assignTable = async (dbTable) => {
    if (!selectedTable) return;
    try {
      const res = await fetch("/api/floor/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: dbTable._id,
          floor: floorId,
          x: selectedTable.x,
          y: selectedTable.y,
          width: selectedTable.w,
          height: selectedTable.h,
          rotation: selectedTable.r,
          shape: selectedTable.type === "booth" ? "rectangle" : selectedTable.type,
          seats: selectedTable.seats,
          section: selectedTable.section
        })
      });
      const json = await res.json();
      if (json.success) {
        setTables(prev => prev.map(t => t.id === selectedTable.id ? { 
          ...t, 
          id: dbTable._id, 
          name: dbTable.tableNumber,
          isShape: false 
        } : t));
        setSelectedTableId(dbTable._id);
        setUnassignedTables(prev => prev.filter(t => t._id !== dbTable._id));
        toast.success(`Assigned ${dbTable.tableNumber} successfully!`);
      } else {
        toast.error(json.message || "Failed to assign table");
      }
    } catch (err) {
      toast.error("Error assigning table");
    }
  };

  const updateSelectedTable = (updates) => {
    if (!selectedTableId) return;
    saveHistory();
    setTables((prev) =>
      prev.map((t) => (t.id === selectedTableId ? { ...t, ...updates } : t))
    );
  };

  const duplicateTable = () => {
    if (!selectedTable) return;
    saveHistory();
    const newTable = {
      ...selectedTable,
      id: `t${Date.now()}`,
      name: `${selectedTable.name} (Copy)`,
      x: selectedTable.x + 40,
      y: selectedTable.y + 40,
    };
    setTables([...tables, newTable]);
    setSelectedTableId(newTable.id);
  };


  const saveLayout = async () => {
    try {
      const updates = tables.map(t => ({
        _id: t.id,
        x: t.x,
        y: t.y,
        width: t.w,
        height: t.h,
        rotation: t.r,
        seats: t.seats,
        section: t.section,
        shape: t.type === "booth" ? "rectangle" : t.type
      })).filter(t => !t._id.startsWith("shape-") && !t._id.startsWith("temp-"));

      const res = await fetch("/api/floor/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorId: currentFloor._id || currentFloor.id, updates })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Layout saved successfully.");
      } else {
        toast.error(json.message || "Failed to save layout");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50 font-sans text-stone-900 w-full">

      {/* ─── TOP TOOLBAR ────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
        
        {isPreviewMode ? (
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-bold text-[#1e40af] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                <Eye className="inline-block mr-2 h-4 w-4" /> Preview Mode
              </span>
              <span className="text-[13px] text-stone-500 font-medium">Read-only view of the current floor plan layout.</span>
            </div>
            <Button onClick={() => setIsPreviewMode(false)} className="h-10 px-6 font-bold text-white transition-transform hover:scale-[1.02] shadow-sm bg-stone-900 hover:bg-stone-800">
              Exit Preview
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push("/admin/floor-plan/floor")} className="text-white bg-[#1e40af] hover:bg-red-600 h-10 px-3">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back To Floor
              </Button>

              <Separator orientation="vertical" className="h-8 mx-2 bg-stone-200" />

              <div className="flex items-center gap-3">
                <Select value={currentFloor.id || currentFloor._id} onValueChange={(val) => router.push(`/admin/floor-plan/floor/${val}`)}>
                  <SelectTrigger className="w-45 h-10 font-bold bg-white focus:ring-[#1e40af]">
                    <SelectValue placeholder="Select Floor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {allFloors.length > 0
                      ? allFloors.map(f => <SelectItem key={f.id} value={f.id}>{f.floorName}</SelectItem>)
                      : <SelectItem value={currentFloor.id || currentFloor._id}>{currentFloor.name || currentFloor.floorName}</SelectItem>
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-stone-50 border border-stone-200 rounded-lg p-1">
                <Button variant="ghost" size="icon" onClick={undo} disabled={history.past.length === 0} className="h-8 w-8 text-stone-600 hover:text-stone-900 rounded-md disabled:opacity-30"><Undo className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={redo} disabled={history.future.length === 0} className="h-8 w-8 text-stone-600 hover:text-stone-900 rounded-md disabled:opacity-30"><Redo className="h-4 w-4" /></Button>
              </div>

              <Separator orientation="vertical" className="h-8 mx-2 bg-stone-200" />

              <div className="flex items-center bg-stone-50 border border-stone-200 rounded-lg p-1">
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="h-8 w-8 text-stone-600 hover:text-stone-900 rounded-md"><ZoomOut className="h-4 w-4" /></Button>
                <span className="text-[13px] font-bold text-stone-700 w-14 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="h-8 w-8 text-stone-600 hover:text-stone-900 rounded-md"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="h-8 w-8 text-stone-600 hover:text-stone-900 rounded-md" title="Reset Zoom"><Maximize className="h-4 w-4" /></Button>
              </div>

              <Separator orientation="vertical" className="h-8 mx-2 bg-stone-200" />

              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg p-1">
                <Button variant={snapToGrid ? "secondary" : "ghost"} size="sm" onClick={() => setSnapToGrid(!snapToGrid)} className={`h-8 px-3 rounded-md text-[13px] font-semibold ${snapToGrid ? 'bg-orange-600 shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}>
                  Snap
                </Button>
                <Button 
                  variant={gridMode !== "none" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setGridMode(prev => prev === "lines" ? "dots" : prev === "dots" ? "none" : "lines")} 
                  className={`h-8 px-3 rounded-md text-[13px] font-semibold ${gridMode !== "none" ? 'bg-orange-600 shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
                >
                  {gridMode === "lines" ? "Lines" : gridMode === "dots" ? "Dots" : "Grid Off"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => { setIsPreviewMode(true); setSelectedTableId(null); }} variant="outline" className="h-10 px-4 text-stone-700 border-stone-300 font-bold bg-white hover:bg-stone-50">
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button onClick={saveLayout} className="h-10 px-6 font-bold text-white transition-transform hover:scale-[1.02] shadow-sm" style={{ backgroundColor: "#1e40af" }}>
                <Save className="mr-2 h-4 w-4" /> Save Layout
              </Button>
            </div>
          </>
        )}
      </header>

      {/* ─── WORKSPACE (3 COLUMNS) ────────────────────────────────────────── */}
      <DndContext onDragEnd={handleDragEnd} sensors={sensors} modifiers={[restrictToWindowEdges]}>
        <div className="flex flex-1 items-stretch w-full overflow-hidden">

          {/* LEFT SIDEBAR */}
          {!isPreviewMode && (
            <aside className="w-80 shrink-0 border-r border-stone-200 bg-[#FCFBF8] flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="border-b border-stone-200 px-5 py-2">
                <h2 className="text-lg font-semibold text-stone-900">
                  Layout Tools
                </h2>
                <p className="mt-1 text-xs leading-6 text-stone-500">
                  Add restaurant elements and build your floor layout.
                </p>
              </div>

              {/* Tool Categories */}
              <div className="flex-1 overflow-y-auto px-2 py-5">
                <Accordion
                  type="multiple"
                  defaultValue={["Tables & Seating", "Structural Elements"]}
                  className="space-y-4"
                >
                  {TOOL_CATEGORIES.map((category) => (
                    <AccordionItem
                      key={category.name}
                      value={category.name}
                      className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                    >
                      <AccordionTrigger
                        className="
                px-5
                py-4
                hover:no-underline
                hover:bg-stone-50
                [&>svg]:h-4
                [&>svg]:w-4
              "
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                            <category.icon className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="text-left">
                            <p className="text-[15px] font-semibold text-stone-900">
                              {category.name}
                            </p>
                            <p className="text-xs text-stone-500">
                              {category.items.length} Tools
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="border-t border-stone-100 bg-stone-100 px-3 py-3">
                        <div className="space-y-2">
                          {category.items.map((tool) => (
                            <ToolItem key={tool.id} tool={tool} onClick={handleToolClick} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Footer */}
              <div className="border-t border-stone-200 bg-white px-6 py-2">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-2">
                  <p className="text-xs font-semibold text-stone-900">
                    💡 Quick Tip
                  </p>
                  <p className="mt-2 text-xs leading-5 text-stone-600">
                    Drag tables onto the canvas, then select them to edit seats,
                    sections, rotation, size and other properties.
                  </p>
                </div>
              </div>
            </aside>
          )}

          {/* CENTER CANVAS */}
          <main
            className="flex-1 relative bg-[#FCFBF8] shadow-inner overflow-hidden"
            onPointerDown={() => setSelectedTableId(null)}
          >
            {/* Grid Pattern */}
            {gridMode !== "none" && !isPreviewMode && (
              <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                  opacity: gridMode === "lines" ? 0.6 : 0.8,
                  backgroundImage: gridMode === "lines"
                    ? "linear-gradient(to right, #9ca3af 1px, transparent 1px), linear-gradient(to bottom, #9ca3af 1px, transparent 1px)"
                    : "radial-gradient(#64748b 2px, transparent 2px)",
                  backgroundSize: gridMode === "lines" ? "40px 40px" : "20px 20px",
                  transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                  transformOrigin: "0 0"
                }}
              />
            )}

            <div
              className="absolute inset-0 transition-transform duration-75 origin-top-left"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              {currentFloorTables.map(table => (
                <CanvasTable
                  key={table.id}
                  table={table}
                  isSelected={selectedTableId === table.id}
                  onSelect={setSelectedTableId}
                  onResizeStart={handleResizeStart}
                  zoom={zoom}
                  isPreviewMode={isPreviewMode}
                />
              ))}
            </div>
          </main>

          {/* RIGHT SIDEBAR: Properties Panel */}
          {!isPreviewMode && (
            <aside className="w-75 bg-white border-l border-stone-200 shrink-0 z-10 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-5 border-b border-stone-200 bg-stone-50/50">
                <h2 className="text-[16px] font-bold text-stone-900">Properties</h2>
                <p className="text-[13px] text-stone-500 mt-1">Configure selected element</p>
              </div>

            <div className="flex-1 overflow-y-auto">
              {!selectedTable ? (
                <div className="p-5 text-center flex flex-col items-center justify-center h-full text-stone-400">
                  <div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <MousePointer2 className="h-6 w-6 text-stone-300" />
                  </div>
                  <h3 className="text-[15px] font-bold text-stone-700 mb-1">No element selected</h3>
                  <p className="text-[13px] leading-relaxed">Select an object on the canvas to edit its properties, alignment, and capacity.</p>
                </div>
              ) : (
                <Accordion type="multiple" defaultValue={["general", "appearance", "actions"]} className="w-full">

                  {/* General Settings */}
                  <AccordionItem value="general" className="border-stone-200 px-5">
                    <AccordionTrigger className="text-[14px] font-bold text-stone-900 hover:no-underline py-4">General</AccordionTrigger>
                    <AccordionContent className="space-y-5 pb-5">
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-stone-700">Table Name / Assignment</label>
                        {selectedTable.isShape ? (
                          <Select
                            onValueChange={(val) => {
                              const t = unassignedTables.find(tbl => tbl._id === val);
                              if (t) assignTable(t);
                            }}
                          >
                            <SelectTrigger className="w-full h-10 bg-white focus:ring-[#1e40af]">
                              <SelectValue placeholder="Select a table..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {unassignedTables.map(t => (
                                <SelectItem key={t._id} value={t._id}>{t.tableNumber}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={selectedTable.name}
                            onChange={(e) => updateSelectedTable({ name: e.target.value })}
                            className="h-10 text-[14px] bg-white border-stone-200 focus:ring-[#1e40af] focus:border-[#1e40af]"
                            disabled={!["kitchen", "door", "register", "bar", "wall", "divider"].includes(selectedTable.type)}
                          />
                        )}
                      </div>
                      {!["kitchen", "door", "register", "bar", "wall", "divider"].includes(selectedTable.type) && (
                        <div className="space-y-2">
                          <label className="text-[13px] font-bold text-stone-700">Seats</label>
                          <Input type="number" value={selectedTable.seats} onChange={(e) => updateSelectedTable({ seats: parseInt(e.target.value) || 0 })} className="h-10 text-[14px] bg-white border-stone-200 focus:ring-[#1e40af] focus:border-[#1e40af]" />
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Appearance */}
                  <AccordionItem value="appearance" className="border-stone-200 px-5">
                    <AccordionTrigger className="text-[14px] font-bold text-stone-900 hover:no-underline py-4">Appearance</AccordionTrigger>
                    <AccordionContent className="space-y-5 pb-5">
                      <div className="flex items-center gap-3">
                        <div className="space-y-2 flex-1">
                          <label className="text-[13px] font-bold text-stone-700">Width</label>
                          <Input type="number" value={selectedTable.w} onChange={(e) => updateSelectedTable({ w: parseInt(e.target.value) || 20 })} className="h-10 text-[14px] bg-white border-stone-200 focus:ring-[#1e40af] focus:border-[#1e40af]" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <label className="text-[13px] font-bold text-stone-700">Height</label>
                          <Input type="number" value={selectedTable.h} onChange={(e) => updateSelectedTable({ h: parseInt(e.target.value) || 20 })} className="h-10 text-[14px] bg-white border-stone-200 focus:ring-[#1e40af] focus:border-[#1e40af]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-stone-700">Rotation (deg)</label>
                        <Input type="number" value={selectedTable.r} onChange={(e) => updateSelectedTable({ r: parseInt(e.target.value) || 0 })} className="h-10 text-[14px] bg-white border-stone-200 focus:ring-[#1e40af] focus:border-[#1e40af]" />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Actions */}
                  <AccordionItem value="actions" className="border-transparent px-5">
                    <AccordionTrigger className="text-[14px] font-bold text-stone-900 hover:no-underline py-4">Actions</AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-5">
                      <Button variant="outline" onClick={duplicateTable} className="w-full h-10 justify-start text-[14px] font-bold text-stone-700 border-stone-200 hover:bg-stone-50">
                        <Copy className="mr-2 h-4 w-4 text-stone-400" /> Duplicate
                      </Button>
                      <Button variant="outline" onClick={() => updateSelectedTable({ locked: !selectedTable.locked })} className="w-full h-10 justify-start text-[14px] font-bold text-stone-700 border-stone-200 hover:bg-stone-50">
                        {selectedTable.locked ? <Unlock className="mr-2 h-4 w-4 text-stone-400" /> : <Lock className="mr-2 h-4 w-4 text-stone-400" />}
                        {selectedTable.locked ? "Unlock" : "Lock"}
                      </Button>
                      <Button variant="outline" onClick={deleteTable} className="w-full h-10 justify-start text-[14px] font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Element
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>

          </aside>
          )}

        </div>
      </DndContext>
    </div>
  );
}
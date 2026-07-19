"use client";

import React, { useState } from "react";
import { Trash2, Edit, List, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function EmployeeCreateOrderPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [callNumber, setCallNumber] = useState("");
  const [tableNo, setTableNo] = useState("");

  const menuItems = [
    { id: 1, name: "Pizza Margherita", price: 20.54, tax: 4.30, hasOptions: true },
    { id: 2, name: "Bolognese Pasta", price: 20.54, tax: 4.30, hasOptions: true },
    { id: 3, name: "Garlic Bread", price: 20.54, tax: 4.30, hasOptions: false },
    { id: 4, name: "Caesar Salad", price: 20.54, tax: 4.30, hasOptions: false },
    { id: 5, name: "Tiramisu", price: 20.54, tax: 4.30, hasOptions: true },
  ];

  const handleOpenOptions = (item) => {
    setSelectedItem(item);
    setIsOptionModalOpen(true);
  };

  const handleAddToCart = (item) => {
    if (item.hasOptions) {
      handleOpenOptions(item);
    } else {
      setCart([...cart, { ...item, cartId: Date.now(), qty: 1, size: "Standard" }]);
      toast.success(`${item.name} added to cart.`);
    }
  };

  const addOptionToCart = () => {
    setCart([...cart, { ...selectedItem, cartId: Date.now(), qty: 1, size: "Medium: 32cm" }]);
    setIsOptionModalOpen(false);
    toast.success(`${selectedItem.name} added to cart.`);
  };

  const handlePlaceOrderClick = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    if (!guestName && !tableNo) {
      toast.error("Please provide Guest Name or Table No.");
      return;
    }
    
    // In a real app, this would post to /api/employee/orders
    toast.success("Order confirmed and sent to kitchen!");
    setIsConfirmModalOpen(false);
    setCart([]);
    setGuestName("");
    setCallNumber("");
    setTableNo("");
    // router.push("/employee/orders/today");
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price + item.tax, 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Create Order</h1>
          <p className="text-sm text-zinc-500 mt-1">Select items and build the guest&apos;s order</p>
        </div>
      </div>

      <div className="bg-white rounded-[14px] shadow-sm border border-zinc-200 overflow-hidden">
        {/* Menu Header */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex justify-between items-center">
          <span className="font-semibold text-zinc-800">Menu Category</span>
          <select className="bg-white border border-zinc-200 text-zinc-800 text-sm rounded-md px-3 py-1.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all">
            <option>All Categories</option>
            <option>Mains</option>
            <option>Appetizers</option>
          </select>
        </div>

        {/* Menu List */}
        <div className="divide-y divide-zinc-100">
          {menuItems.map((item) => (
            <div key={item.id} className="flex items-center hover:bg-zinc-50 transition-colors">
              <div className="flex-1 px-6 py-4 font-medium text-sm text-zinc-900">{item.name}</div>
              <div className="w-32 px-4 py-4 text-sm text-zinc-600 border-l border-zinc-100">${item.price.toFixed(2)}</div>
              <div className="w-32 px-4 py-4 text-sm text-zinc-500 border-l border-zinc-100">Tax: ${item.tax.toFixed(2)}</div>
              
              <div 
                className="w-40 px-4 py-4 border-l border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors flex items-center gap-2"
                onClick={() => handleOpenOptions(item)}
              >
                {item.hasOptions ? (
                  <><LogIn className="h-4 w-4 text-zinc-400" /> <span className="text-sm font-medium text-zinc-700">Item Option</span></>
                ) : (
                  <><List className="h-4 w-4 text-zinc-400" /> <span className="text-sm font-medium text-zinc-500">No Option</span></>
                )}
              </div>
              
              <div className="w-36 border-l border-zinc-100">
                <button 
                  onClick={() => handleAddToCart(item)}
                  className="w-full h-full py-4 text-sm font-medium text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[14px] shadow-sm border border-zinc-200 overflow-hidden mt-8">
        <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4">
          <h2 className="font-semibold text-zinc-800">Order Cart</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-white text-zinc-500 border-b border-zinc-100">
                <th className="px-6 py-3 font-medium">Item Name</th>
                <th className="px-6 py-3 font-medium text-center">Size</th>
                <th className="px-6 py-3 font-medium text-center">Qty</th>
                <th className="px-6 py-3 font-medium text-right">Price</th>
                <th className="px-6 py-3 font-medium text-right">Tax & Fee</th>
                <th className="px-6 py-3 font-medium text-right">Discount</th>
                <th className="px-6 py-3 font-medium text-right">Total</th>
                <th className="px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-zinc-400">Cart is empty</td>
                </tr>
              ) : (
                cart.map((c) => (
                  <tr key={c.cartId} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 font-medium text-zinc-900">{c.name}</td>
                    <td className="px-6 py-4 text-zinc-600 text-center">{c.size}</td>
                    <td className="px-6 py-4 text-zinc-600 text-center">{c.qty}</td>
                    <td className="px-6 py-4 text-zinc-600 text-right">${c.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-zinc-600 text-right">${c.tax.toFixed(2)}</td>
                    <td className="px-6 py-4 text-zinc-600 text-right">-</td>
                    <td className="px-6 py-4 font-semibold text-zinc-900 text-right">${(c.price + c.tax).toFixed(2)}</td>
                    <td className="px-6 py-4 flex items-center justify-end gap-3">
                      <button className="text-zinc-400 hover:text-zinc-600 transition-colors"><Edit className="h-4 w-4" /></button>
                      <button className="text-zinc-400 hover:text-red-600 transition-colors" onClick={() => setCart(cart.filter(x => x.cartId !== c.cartId))}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6 items-start">
          <div className="bg-white rounded-[14px] shadow-sm border border-zinc-200 p-6 space-y-4">
            <Label className="text-zinc-700 font-medium text-base">Any Special Note</Label>
            <textarea 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-[10px] min-h-[120px] p-4 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all resize-none placeholder:text-zinc-400"
              placeholder="e.g. No onions, extra spicy..."
            ></textarea>
          </div>

          <div className="bg-white rounded-[14px] shadow-sm border border-zinc-200 p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-zinc-700 font-medium text-base">Discount & Coupons</Label>
              <div className="flex gap-3">
                <Input placeholder="Promo code" className="flex-1 rounded-[10px] bg-zinc-50" />
                <Button variant="outline" className="rounded-[10px]">Apply</Button>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-6 space-y-3">
              <div className="flex justify-between text-zinc-600 text-sm">
                <span>Subtotal</span>
                <span>${(totalAmount - cart.reduce((s, i) => s + i.tax, 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 text-sm">
                <span>Tax</span>
                <span>${cart.reduce((s, i) => s + i.tax, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-semibold text-zinc-900 pt-3 border-t border-zinc-100 mt-3">
                <span>Total Amount</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              onClick={handlePlaceOrderClick}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-[10px] text-lg font-medium transition-colors"
            >
              Place Order
            </Button>
          </div>
        </div>
      )}

      {/* Item Option Modal */}
      {isOptionModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100">
              <h3 className="text-lg font-semibold text-zinc-900">{selectedItem.name}</h3>
              <button onClick={() => setIsOptionModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <Trash2 className="h-5 w-5" style={{display: 'none'}} />
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex text-xs font-medium text-zinc-500 mb-2 px-3">
                <div className="flex-1">Options</div>
                <div className="w-24 text-right">Discount</div>
                <div className="w-24 text-right">Price</div>
              </div>

              {/* Radio Options */}
              {['Small: 26cm', 'Medium: 32cm', 'Large: 45cm'].map((size, idx) => (
                <label key={idx} className="flex items-center border border-zinc-200 p-3 rounded-[10px] cursor-pointer hover:border-orange-500 transition-colors has-checked:border-orange-500">
                  <div className="flex-1 flex items-center gap-3 text-sm font-medium text-zinc-700">
                    <input type="radio" name="size" defaultChecked={idx === 1} className="w-4 h-4 accent-orange-500" />
                    <span>{size}</span>
                  </div>
                  <div className="w-24 text-right text-emerald-600 font-medium text-sm">
                    {idx === 0 ? 'None' : '10% Off'}
                  </div>
                  <div className="w-24 text-right font-medium text-zinc-900 text-sm">
                    ${selectedItem.price.toFixed(2)}
                  </div>
                </label>
              ))}

              <label className="flex items-center border border-zinc-200 p-3 rounded-[10px] cursor-pointer hover:border-orange-500 transition-colors mt-4">
                <div className="flex-1 flex items-center gap-3 text-sm font-medium text-zinc-700">
                  <input type="checkbox" className="w-4 h-4 accent-orange-500 rounded" />
                  <span>Extra Cheese (+$2.00)</span>
                </div>
              </label>
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3 bg-zinc-50/50">
              <Button variant="outline" className="flex-1 rounded-[10px]" onClick={() => setIsOptionModalOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 rounded-[10px]" onClick={addOptionToCart}>
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Final Confirm Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsConfirmModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
               <span className="text-2xl leading-none">&times;</span>
            </button>
            
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Confirm Order</h3>
              <div className="text-sm text-zinc-500 flex justify-center gap-4">
                <span>Order ID: #ORD-089</span>
                <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>

            <div className="space-y-5 mb-8">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Guest Name</Label>
                <Input 
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest name" 
                  className="rounded-[10px] h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Call Number / Phone</Label>
                <Input 
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                  placeholder="Optional" 
                  className="rounded-[10px] h-11"
                />
              </div>
              
              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-zinc-200"></div>
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">OR</span>
                <div className="flex-1 h-px bg-zinc-200"></div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-medium">Table No.</Label>
                <select 
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-[10px] px-3 h-11 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Select Table</option>
                  <option value="1">Table 1</option>
                  <option value="2">Table 2</option>
                  <option value="3">Table 3</option>
                  <option value="VIP">VIP Room</option>
                </select>
              </div>
            </div>

            <Button 
              onClick={handleFinalConfirm}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-[10px] text-base"
            >
              Submit Order to Kitchen
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

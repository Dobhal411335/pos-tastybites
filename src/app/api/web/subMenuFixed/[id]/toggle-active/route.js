import connectDB from "@/lib/db"
import SubMenuFixed from "@/models/Web/SubMenuFixed"
import { NextResponse } from "next/server"

export async function PUT(req, { params }) {
    await connectDB()
    try {
        const { id } = await params
        const { type, parentId, active } = await req.json()
        if (type === "category") {
            const category = await SubMenuFixed.findByIdAndUpdate(
                id,
                { active },
                { new: true }
            )
            if (!category) {
                return NextResponse.json({ error: "Category not found" }, { status: 404 })
            }
            return NextResponse.json({ message: "Category status updated" })
        }

        if (type === "subcategory") {
            const category = await SubMenuFixed.findOne({ _id: parentId })
            if (!category) {
                return NextResponse.json({ error: "Category not found" }, { status: 404 })
            }

            const subCategory = category.subCat.id(id)
            subCategory.active = active
            await category.save()
            return NextResponse.json({ message: "Subcategory status updated" })
        }

        if (type === "package") {
            const category = await SubMenuFixed.findOne({ "subCat._id": parentId })
            if (!category) {
                return NextResponse.json({ error: "Subcategory not found" }, { status: 404 })
            }

            const subCategory = category.subCat.id(parentId)
            const pkg = subCategory.subCatPackage.id(id)
            pkg.active = active
            await category.save()
            return NextResponse.json({ message: "Package status updated" })
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    } catch (error) {
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
    }
}
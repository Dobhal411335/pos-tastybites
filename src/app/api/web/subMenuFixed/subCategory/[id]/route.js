import connectDB from "@/lib/db"
import SubMenuFixed from "@/models/Web/SubMenuFixed"
import { NextResponse } from "next/server"

export async function PUT(req, { params }) {
    await connectDB()
    try {
        const { id } = await params
        const { categoryId, title } = await req.json()
        const category = await SubMenuFixed.findOne({ _id: categoryId })
        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        const subCategory = category.subCat.id(id)
        subCategory.title = title
        await category.save()

        return NextResponse.json({ message: "Subcategory updated successfully" })
    } catch (error) {
        return NextResponse.json({ error: "Failed to update subcategory" }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    await connectDB()
    try {
        const { id } = await params
        const { searchParams } = new URL(req.url)
        const categoryId = searchParams.get('categoryId')
        const category = await SubMenuFixed.findOne({ _id: categoryId })
        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        category.subCat.pull(id)
        await category.save()

        return NextResponse.json({ message: "Subcategory deleted successfully" })
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete subcategory" }, { status: 500 })
    }
}
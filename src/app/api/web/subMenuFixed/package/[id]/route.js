import connectDB from "@/lib/db"
import SubMenuFixed from "@/models/Web/SubMenuFixed"
import { NextResponse } from "next/server"

export async function PUT(req, { params }) {
    await connectDB()
    try {
        const { id } = await params
        const { subCategoryId, title, url } = await req.json()
        const category = await SubMenuFixed.findOne({ "subCat._id": subCategoryId })
        if (!category) {
            return NextResponse.json({ error: "Subcategory not found" }, { status: 404 })
        }

        const subCategory = category.subCat.id(subCategoryId)
        const pkg = subCategory.subCatPackage.id(id)
        pkg.title = title
        pkg.url = url
        await category.save()

        return NextResponse.json({ message: "Package updated successfully" })
    } catch (error) {
        return NextResponse.json({ error: "Failed to update package" }, { status: 500 })
    }
}

export async function DELETE(req, { params }) {
    await connectDB()
    try {
        const { id } = await params
        const { searchParams } = new URL(req.url)
        const subCategoryId = searchParams.get('subCategoryId')
        const category = await SubMenuFixed.findOne({ "subCat._id": subCategoryId })
        if (!category) {
            return NextResponse.json({ error: "Subcategory not found" }, { status: 404 })
        }

        const subCategory = category.subCat.id(subCategoryId)
        subCategory.subCatPackage.pull(id)
        await category.save()

        return NextResponse.json({ message: "Package deleted successfully" })
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete package" }, { status: 500 })
    }
}
import { NextResponse } from 'next/server';
import connectDB from "@/lib/db";
import ManageBanner from "@/models/Web/ManageBanners";
import { deleteImage } from '@/lib/cloudinary/deleteImage';

export const PUT = async (req, { params }) => {
    try {
        await connectDB();
        const { id } = await params; // Await the params
        
        const body = await req.json();
        const { title, image, link } = body;

        const updateData = { 
            ...(title && { title }),
            ...(link && { link }),
            ...(image && image.url && { 
                image: { 
                    url: image.url, 
                    key: image.key || '' 
                } 
            })
        };

        const updatedPackage = await ManageBanner.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedPackage) {
            return NextResponse.json(
                { success: false, message: 'Package not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updatedPackage
        });

    } catch (error) {
        console.error('Error updating featured package:', error);
        return NextResponse.json(
            { 
                success: false, 
                message: 'Failed to update package',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
};

export const DELETE = async (req, { params }) => {
    try {
        await connectDB();
        const { id } = await params; // Await the params

        const deletedPackage = await ManageBanner.findByIdAndDelete(id);
        
        if (!deletedPackage) {
            return NextResponse.json(
                { success: false, message: 'Package not found' },
                { status: 404 }
            );
        }

        // Delete image from Cloudinary if exists
        if (deletedPackage.image?.key) {
            try {
                await deleteImage(deletedPackage.image.key);
            } catch (cloudinaryError) {
                console.error('Error deleting image from Cloudinary:', cloudinaryError);
                // Don't fail the request if image deletion fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Package deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting featured package:', error);
        return NextResponse.json(
            { 
                success: false, 
                message: 'Failed to delete package',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
};
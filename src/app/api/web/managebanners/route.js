import { NextResponse } from 'next/server';
import connectDB from "@/lib/db";
import ManageBanner from "@/models/Web/ManageBanners";

// Function to shuffle array (Fisher-Yates algorithm)
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export const GET = async (req) => {
    try {
        await connectDB();
        const packages = await ManageBanner.find({}).sort({ createdAt: -1 });
        const shuffledPackages = shuffleArray(packages);
        return NextResponse.json({
            success: true,
            data: shuffledPackages
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch packages' },
            { status: 500 }
        );
    }
};

export const POST = async (req) => {
    try {
        await connectDB();
        const body = await req.json();
        const { title, image, link } = body;

        if (!title || !image?.url) {
            return NextResponse.json(
                { success: false, message: 'Title and image are required' },
                { status: 400 }
            );
        }

        // Create new package
        const newPackage = new ManageBanner({
            title,
            link: link || '',
            image: {
                url: image.url,
                key: image.key || ''
            }
        });

        await newPackage.save();

        return NextResponse.json(
            { 
                success: true, 
                data: newPackage 
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Error creating package:', error);
        return NextResponse.json(
            { 
                success: false, 
                message: 'Failed to create package',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
};
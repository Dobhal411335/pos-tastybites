import {
  createCustomerReview,
  deleteCustomerReview,
  listCustomerReviews,
  updateCustomerReview,
} from "@/components/services/customerReviews.service";

export const GET = async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "1";
    const data = await listCustomerReviews({ activeOnly });

    return Response.json(
      {
        success: true,
        message: "Customer reviews fetched successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message || "Failed to fetch customer reviews",
        data: [],
      },
      { status: 500 }
    );
  }
};

export const POST = async (req) => {
  try {
    const body = await req.json();
    const data = await createCustomerReview(body);

    return Response.json(
      {
        success: true,
        message: "Customer review created successfully",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error.message?.includes("required") ||
      error.message?.includes("Stars")
      ? 400
      : 500;

    return Response.json(
      {
        success: false,
        message: error.message || "Failed to create customer review",
        data: null,
      },
      { status }
    );
  }
};

export const PATCH = async (req) => {
  try {
    const body = await req.json();
    const { id, ...updates } = body || {};

    if (!id) {
      return Response.json(
        {
          success: false,
          message: "Review id is required",
          data: null,
        },
        { status: 400 }
      );
    }

    const data = await updateCustomerReview(id, updates);
    return Response.json(
      {
        success: true,
        message: "Customer review updated successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    const status =
      error.message === "Review not found"
        ? 404
        : error.message?.includes("required") ||
            error.message?.includes("Stars")
          ? 400
          : 500;

    return Response.json(
      {
        success: false,
        message: error.message || "Failed to update customer review",
        data: null,
      },
      { status }
    );
  }
};

export const DELETE = async (req) => {
  try {
    const body = await req.json();
    const { id } = body || {};

    if (!id) {
      return Response.json(
        {
          success: false,
          message: "Review id is required",
          data: null,
        },
        { status: 400 }
      );
    }

    const data = await deleteCustomerReview(id);
    return Response.json(
      {
        success: true,
        message: "Customer review deleted successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    const status = error.message === "Review not found" ? 404 : 500;
    return Response.json(
      {
        success: false,
        message: error.message || "Failed to delete customer review",
        data: null,
      },
      { status }
    );
  }
};

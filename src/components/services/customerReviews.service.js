import connectDB from "@/lib/db";
import CustomerReview from "@/models/Web/CustomerReview";

function serializeReview(doc) {
  if (!doc) return null;
  return {
    _id: String(doc._id),
    name: doc.name || "",
    designation: doc.designation || "",
    review: doc.review || "",
    stars: Number(doc.stars) || 1,
    active: Boolean(doc.active),
    order: Number(doc.order) || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeStars(value) {
  const stars = Number(value);
  if (!Number.isFinite(stars)) return null;
  const rounded = Math.round(stars);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export async function listCustomerReviews({ activeOnly = false } = {}) {
  await connectDB();
  const query = activeOnly ? { active: true } : {};
  const reviews = await CustomerReview.find(query)
    .sort({ order: 1, createdAt: -1 })
    .lean();
  return reviews.map(serializeReview);
}

export async function createCustomerReview(input = {}) {
  const name = String(input.name || "").trim();
  const designation = String(input.designation || "").trim();
  const review = String(input.review || "").trim();
  const stars = sanitizeStars(input.stars);

  if (!name) throw new Error("Customer name is required");
  if (!review) throw new Error("Review is required");
  if (!stars) throw new Error("Stars must be a number from 1 to 5");

  await connectDB();
  const created = await CustomerReview.create({
    name,
    designation,
    review,
    stars,
    active: typeof input.active === "boolean" ? input.active : true,
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
  });

  return serializeReview(created);
}

export async function updateCustomerReview(id, input = {}) {
  if (!id) throw new Error("Review id is required");

  const update = {};
  if (typeof input.name === "string") {
    const name = input.name.trim();
    if (!name) throw new Error("Customer name is required");
    update.name = name;
  }
  if (typeof input.designation === "string") {
    update.designation = input.designation.trim();
  }
  if (typeof input.review === "string") {
    const review = input.review.trim();
    if (!review) throw new Error("Review is required");
    update.review = review;
  }
  if (input.stars !== undefined) {
    const stars = sanitizeStars(input.stars);
    if (!stars) throw new Error("Stars must be a number from 1 to 5");
    update.stars = stars;
  }
  if (typeof input.active === "boolean") {
    update.active = input.active;
  }
  if (input.order !== undefined && Number.isFinite(Number(input.order))) {
    update.order = Number(input.order);
  }

  await connectDB();
  const updated = await CustomerReview.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!updated) throw new Error("Review not found");
  return serializeReview(updated);
}

export async function deleteCustomerReview(id) {
  if (!id) throw new Error("Review id is required");

  await connectDB();
  const deleted = await CustomerReview.findByIdAndDelete(id);
  if (!deleted) throw new Error("Review not found");
  return serializeReview(deleted);
}

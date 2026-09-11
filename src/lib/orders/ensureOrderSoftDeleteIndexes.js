import Order from "@/models/Order";
import connectDB from "@/lib/db";
import { logger } from "@/utils/logger";

let ensuredVersion = 0;
let ensurePromise = null;
const ENSURE_VERSION = 4;

async function migrateDeletedPlaceholders() {
  const staleDeleted = await Order.find({
    isActive: false,
    $or: [
      { orderNumber: { $not: /^DEL-/i } },
      {
        invoiceNumber: {
          $exists: true,
          $nin: [null, ""],
          $not: /^DEL-INV-/i,
        },
      },
      // Already using DEL-INV placeholder but missing original invoice ref
      {
        invoiceNumber: /^DEL-INV-/i,
        $or: [
          { originalInvoiceNumber: null },
          { originalInvoiceNumber: { $exists: false } },
          { originalInvoiceNumber: "" },
        ],
      },
    ],
  })
    .select("_id orderNumber invoiceNumber originalOrderNumber originalInvoiceNumber")
    .lean();

  for (const row of staleDeleted) {
    const $set = {};
    if (!/^DEL-/i.test(String(row.orderNumber || ""))) {
      $set.originalOrderNumber = row.originalOrderNumber || row.orderNumber;
      $set.orderNumber = `DEL-${row._id}`;
    }
    if (
      row.invoiceNumber &&
      !/^DEL-INV-/i.test(String(row.invoiceNumber || ""))
    ) {
      $set.originalInvoiceNumber =
        row.originalInvoiceNumber || row.invoiceNumber;
      $set.invoiceNumber = `DEL-INV-${row._id}`;
    } else if (
      /^DEL-INV-/i.test(String(row.invoiceNumber || "")) &&
      !row.originalInvoiceNumber
    ) {
      // Backfill from original order # when invoice original was never stored
      const orderRef =
        row.originalOrderNumber &&
        !/^DEL-/i.test(String(row.originalOrderNumber))
          ? row.originalOrderNumber
          : null;
      if (orderRef) {
        $set.originalInvoiceNumber = orderRef;
      }
    }
    if (Object.keys($set).length) {
      await Order.updateOne({ _id: row._id }, { $set });
    }
  }

  if (staleDeleted.length) {
    logger.info(
      `Migrated ${staleDeleted.length} soft-deleted order/invoice placeholders`
    );
  }
}

async function dropConflictingPairIndexes(field) {
  const indexes = await Order.collection.indexes();
  for (const idx of indexes) {
    const keys = idx.key || {};
    const isPair =
      keys.restaurantId === 1 &&
      keys[field] === 1 &&
      Object.keys(keys).length === 2;

    if (!isPair || !idx.name) continue;

    const activeName = `restaurantId_1_${field}_1_active`;
    if (idx.name === activeName) continue;

    const isLegacyFullUnique = idx.unique && !idx.partialFilterExpression;
    const isUnnamedOrLegacyPartial =
      idx.unique &&
      (idx.name === `restaurantId_1_${field}_1` ||
        (idx.partialFilterExpression && idx.name !== activeName));

    if (isLegacyFullUnique || isUnnamedOrLegacyPartial) {
      try {
        await Order.collection.dropIndex(idx.name);
        logger.info(`Dropped Order index ${idx.name}`);
      } catch (dropErr) {
        if (dropErr?.code !== 27 && dropErr?.codeName !== "IndexNotFound") {
          logger.error(`Failed dropping Order index ${idx.name}`, dropErr);
        }
      }
    }
  }
}

async function ensureActivePartialUnique(field) {
  const name = `restaurantId_1_${field}_1_active`;
  try {
    await Order.collection.createIndex(
      { restaurantId: 1, [field]: 1 },
      {
        unique: true,
        partialFilterExpression: { isActive: true },
        name,
      }
    );
  } catch (indexErr) {
    if (
      indexErr?.code !== 85 &&
      indexErr?.code !== 86 &&
      indexErr?.codeName !== "IndexOptionsConflict" &&
      indexErr?.codeName !== "IndexKeySpecsConflict"
    ) {
      logger.error(`createIndex ${name} failed`, indexErr);
    }
  }
}

/**
 * Drop legacy full unique order/invoice indexes and ensure partial unique
 * indexes on active orders only. Migrates deleted placeholders.
 */
export async function ensureOrderSoftDeleteIndexes() {
  if (ensuredVersion >= ENSURE_VERSION) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    await connectDB();
    try {
      await migrateDeletedPlaceholders();
      await dropConflictingPairIndexes("orderNumber");
      await dropConflictingPairIndexes("invoiceNumber");
      await ensureActivePartialUnique("orderNumber");
      await ensureActivePartialUnique("invoiceNumber");

      try {
        await Order.syncIndexes();
      } catch (syncErr) {
        logger.error("Order.syncIndexes failed", syncErr);
      }

      ensuredVersion = ENSURE_VERSION;
    } catch (error) {
      logger.error("ensureOrderSoftDeleteIndexes failed", error);
      ensuredVersion = 0;
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

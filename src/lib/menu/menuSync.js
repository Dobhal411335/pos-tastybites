import Category from '@/models/menu/Category';
import Product from '@/models/menu/Product';
import Offer from '@/models/menu/Offer';
import Head from '@/models/menu/Head';
import ProductHead from '@/models/menu/ProductHead';
import Tax from '@/models/tax/Tax';
import MenuDeletion from '@/models/menu/MenuDeletion';

function toId(value) {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String(value._id);
  }
  return String(value);
}

function isActiveStatus(status) {
  if (status === true) return true;
  if (status === false) return false;
  const s = String(status ?? 'Active');
  return s !== 'Inactive' && s !== 'false';
}

function normalizeTax(raw) {
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? 'Tax'),
    type: String(raw.type ?? 'percent'),
    value: Number(raw.value) || 0,
    status: raw.status != null ? String(raw.status) : 'Active',
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
  };
}

function normalizeCategory(raw) {
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? ''),
    status: raw.status ? String(raw.status) : 'Active',
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
  };
}

function normalizeChoiceOptions(raw) {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((group) => ({
      name: String(group?.name ?? '').trim(),
      subChoices: Array.isArray(group?.subChoices)
        ? group.subChoices.map((s) => String(s)).filter(Boolean)
        : [],
    }))
    .filter((g) => g.name);
}

function normalizeAddon(raw) {
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? ''),
    price: Number(raw.price) || 0,
    size: raw.size ? String(raw.size) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    choiceOptions: normalizeChoiceOptions(raw.choiceOptions),
  };
}

function normalizeVariant(raw) {
  return {
    size: String(raw.size ?? 'Standard'),
    price: Number(raw.price) || 0,
    status: raw.status != null ? String(raw.status) : undefined,
  };
}

function normalizeProduct(raw) {
  const categoryRaw = raw.category;
  const category =
    categoryRaw && typeof categoryRaw === 'object'
      ? normalizeCategory(categoryRaw)
      : { id: toId(categoryRaw), name: 'ITEMS', status: 'Active' };

  const variants = Array.isArray(raw.variants)
    ? raw.variants.map(normalizeVariant)
    : undefined;
  const addons = Array.isArray(raw.addons)
    ? raw.addons.map(normalizeAddon)
    : undefined;
  const taxes = Array.isArray(raw.taxes)
    ? raw.taxes.map((t) =>
        typeof t === 'object' && t !== null
          ? normalizeTax(t)
          : { id: toId(t), name: 'Tax', type: 'percent', value: 0 }
      )
    : undefined;

  const price = variants?.length
    ? Math.min(...variants.map((v) => v.price))
    : Number(raw.price) || 0;

  const salesImage = raw.salesImage;
  const imageUrl =
    salesImage && typeof salesImage === 'object' && salesImage.url
      ? String(salesImage.url)
      : undefined;

  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? ''),
    productCode: raw.productCode ? String(raw.productCode) : undefined,
    productType:
      String(raw.productType || 'KITCHEN').toUpperCase() === 'BAR'
        ? 'BAR'
        : 'KITCHEN',
    status: raw.status ? String(raw.status) : 'Active',
    category,
    price,
    variants,
    addons,
    choiceOptions: normalizeChoiceOptions(raw.choiceOptions),
    preparationStyles: Array.isArray(raw.preparationStyles)
      ? raw.preparationStyles.map((s) => String(s))
      : undefined,
    taxes,
    taxData: raw.taxData || undefined,
    imageUrl,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
  };
}

function normalizeOffer(raw) {
  const image = raw.image;
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? 'Offer'),
    price: Number(raw.price) || 0,
    inclusions: Array.isArray(raw.inclusions)
      ? raw.inclusions.map((v) => String(v))
      : undefined,
    choices: Array.isArray(raw.choices)
      ? raw.choices.map((v) => String(v))
      : undefined,
    drinks: Array.isArray(raw.drinks)
      ? raw.drinks.map((v) => String(v))
      : undefined,
    taxes: Array.isArray(raw.taxes)
      ? raw.taxes.map((t) =>
          typeof t === 'object' && t !== null
            ? normalizeTax(t)
            : { id: toId(t), name: 'Tax', type: 'percent', value: 0 }
        )
      : undefined,
    taxData: raw.taxData || undefined,
    status:
      raw.status === true || raw.status === false
        ? raw.status
          ? 'Active'
          : 'Inactive'
        : String(raw.status ?? 'Active'),
    imageUrl:
      image && typeof image === 'object' && image.url
        ? String(image.url)
        : undefined,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
  };
}

function normalizeHead(raw) {
  const image = raw.image;
  return {
    id: toId(raw._id ?? raw.id),
    name: String(raw.name ?? ''),
    status: raw.status ? String(raw.status) : 'Active',
    imageUrl:
      image && typeof image === 'object' && image.url
        ? String(image.url)
        : undefined,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
  };
}

function normalizeProductHead(raw) {
  const headRaw = raw.head;
  const headName =
    headRaw && typeof headRaw === 'object'
      ? String(headRaw.name ?? '')
      : '';
  const categories = Array.isArray(raw.categories) ? raw.categories : [];
  const productIds = categories.flatMap((entry) => {
    if (!Array.isArray(entry?.products)) return [];
    return entry.products.map((pid) => toId(pid)).filter(Boolean);
  });

  return {
    id: toId(raw._id ?? raw.id),
    headName,
    status: raw.status ? String(raw.status) : 'Active',
    productIds,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
  };
}

function emptyDeleted() {
  return {
    products: [],
    categories: [],
    offers: [],
    heads: [],
    productHeads: [],
    taxes: [],
  };
}

function mapDeletions(rows) {
  const deleted = emptyDeleted();
  for (const row of rows) {
    const id = String(row.entityId);
    switch (row.entityType) {
      case 'product':
        deleted.products.push(id);
        break;
      case 'category':
        deleted.categories.push(id);
        break;
      case 'offer':
        deleted.offers.push(id);
        break;
      case 'head':
        deleted.heads.push(id);
        break;
      case 'productHead':
        deleted.productHeads.push(id);
        break;
      case 'tax':
        deleted.taxes.push(id);
        break;
      default:
        break;
    }
  }
  return deleted;
}

/**
 * Build a full or incremental menu sync payload for the Sales POS.
 * @param {string} restaurantId - from JWT (request.restaurant)
 * @param {string|null} sinceIso - ISO timestamp of last successful sync
 */
export async function buildMenuSyncPayload(restaurantId, sinceIso) {
  const serverTime = new Date();
  const version = serverTime.toISOString();
  const sinceDate = sinceIso ? new Date(sinceIso) : null;
  const sinceValid =
    sinceDate instanceof Date && !Number.isNaN(sinceDate.getTime());
  const fullSync = !sinceValid;

  const restaurantFilter = { restaurant: restaurantId };

  if (fullSync) {
    const [categories, products, offers, heads, productHeads, taxes] =
      await Promise.all([
        Category.find({ ...restaurantFilter, status: 'Active' })
          .select('name status updatedAt')
          .lean(),
        Product.find({ ...restaurantFilter, status: 'Active' })
          .select(
            'name productCode productType status category price taxes taxData salesImage variants addons choiceOptions preparationStyles updatedAt'
          )
          .populate('category', 'name status')
          .populate('taxes', 'name type value status')
          .lean(),
        Offer.find({
          ...restaurantFilter,
          status: true,
        })
          .select(
            'name price inclusions choices drinks taxes taxData status image updatedAt'
          )
          .populate('taxes', 'name type value status')
          .lean(),
        Head.find({ ...restaurantFilter, status: 'Active' })
          .select('name status image updatedAt')
          .lean(),
        ProductHead.find({ ...restaurantFilter, status: 'Active' })
          .select('head categories status updatedAt')
          .populate('head', 'name status')
          .lean(),
        Tax.find({ ...restaurantFilter, status: 'Active' })
          .select('name type value status updatedAt')
          .lean(),
      ]);

    // Offers may use boolean status
    const activeOffers = offers.filter((o) => isActiveStatus(o.status));

    return {
      version,
      serverTime: version,
      fullSync: true,
      categories: categories.map(normalizeCategory),
      products: products.map(normalizeProduct),
      offers: activeOffers.map(normalizeOffer),
      heads: heads.map(normalizeHead),
      productHeads: productHeads.map(normalizeProductHead),
      taxes: taxes.map(normalizeTax),
      deleted: emptyDeleted(),
    };
  }

  const updatedFilter = {
    ...restaurantFilter,
    updatedAt: { $gt: sinceDate },
  };

  const [
    categories,
    products,
    offers,
    heads,
    productHeads,
    taxes,
    deletionRows,
  ] = await Promise.all([
    Category.find(updatedFilter).lean(),
    Product.find(updatedFilter)
      .populate('category', 'name status')
      .populate('taxes', 'name type value status')
      .lean(),
    Offer.find(updatedFilter)
      .populate('taxes', 'name type value status')
      .lean(),
    Head.find(updatedFilter).lean(),
    ProductHead.find(updatedFilter).populate('head', 'name status').lean(),
    Tax.find(updatedFilter).lean(),
    MenuDeletion.find({
      restaurant: restaurantId,
      deletedAt: { $gt: sinceDate },
    })
      .select('entityType entityId')
      .lean(),
  ]);

  return {
    version,
    serverTime: version,
    fullSync: false,
    categories: categories.map(normalizeCategory),
    products: products.map(normalizeProduct),
    offers: offers.map(normalizeOffer),
    heads: heads.map(normalizeHead),
    productHeads: productHeads.map(normalizeProductHead),
    taxes: taxes.map(normalizeTax),
    deleted: mapDeletions(deletionRows),
  };
}

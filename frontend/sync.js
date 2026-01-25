const fs = require("fs");
const path = require("path");
const Readable = require("stream").Readable;
const writeFile = require("fs").promises.writeFile;

const NODE_ENV = process.env.NODE_ENV || "development";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

let STRAPI_URL;

if (NODE_ENV === "production") {
  STRAPI_URL = process.env.STRAPI_URL;
} else {
  STRAPI_URL = "http://localhost:1337";
}

const CONTENT_DIR = path.join(__dirname, "content");
const DATA_DIR = path.join(__dirname, "data");
const STATIC_DIR = path.join(__dirname, "static");
const IMAGES_DIR = path.join(STATIC_DIR, "images");

const STRAPI_DISABLE_PAGINATION = "pagination[limit]=999";
const STRAPI_POPULATE_ALL = "populate=*";

const COLLECTION_CONTENT_MAP = {
  allerlei: {
    dataUrlPath: `/products?filters[type][$eq]=Allerlei&${STRAPI_DISABLE_PAGINATION}&${STRAPI_POPULATE_ALL}`,
    contentTitle: "Dies & Das",
    contentType: "products",
    additionalContentProperties: [
      { key: "price" },
      { key: "isReserved" },
      { key: "isSold" },
      {
        key: "cover",
        transform: async (image) => downloadImage(image),
      },
      {
        key: "images",
        transform: async (images) => downloadImages(images),
      },
    ],
  },
  clutches: {
    dataUrlPath: `/products?filters[type][$eq]=Clutch&${STRAPI_DISABLE_PAGINATION}&${STRAPI_POPULATE_ALL}`,
    contentTitle: "Clutches",
    contentType: "products",
    additionalContentProperties: [
      { key: "price" },
      { key: "isReserved" },
      { key: "isSold" },
      {
        key: "cover",
        transform: async (image) => downloadImage(image),
      },
      {
        key: "images",
        transform: async (images) => downloadImages(images),
      },
    ],
  },
  handytaschen: {
    dataUrlPath: `/products?filters[type][$eq]=Handytasche&${STRAPI_DISABLE_PAGINATION}&${STRAPI_POPULATE_ALL}`,
    contentTitle: "Handytaschen",
    contentType: "products",
    additionalContentProperties: [
      { key: "price" },
      { key: "isReserved" },
      { key: "isSold" },
      {
        key: "cover",
        transform: async (image) => downloadImage(image),
      },
      {
        key: "images",
        transform: async (images) => downloadImages(images),
      },
    ],
  },
  necessaires: {
    dataUrlPath: `/products?filters[type][$eq]=Necessaire&${STRAPI_DISABLE_PAGINATION}&${STRAPI_POPULATE_ALL}`,
    contentTitle: "Necessaires",
    contentType: "products",
    additionalContentProperties: [
      { key: "price" },
      { key: "isReserved" },
      { key: "isSold" },
      {
        key: "cover",
        transform: async (image) => downloadImage(image),
      },
      {
        key: "images",
        transform: async (images) => downloadImages(images),
      },
    ],
  },
  sacs: {
    dataUrlPath: `/products?filters[type][$eq]=Sac&${STRAPI_DISABLE_PAGINATION}&${STRAPI_POPULATE_ALL}`,
    contentTitle: "Wäschesäcke",
    contentType: "products",
    additionalContentProperties: [
      { key: "price" },
      { key: "isReserved" },
      { key: "isSold" },
      {
        key: "cover",
        transform: async (image) => downloadImage(image),
      },
      {
        key: "images",
        transform: async (images) => downloadImages(images),
      },
    ],
  },
};

const SINGLE_CONTENT_MAP = {
  about: {
    dataUrlPath: `/about?${STRAPI_POPULATE_ALL}`,
    additionalContentProperties: [
      {
        key: "image",
        transform: async (image) => downloadImage(image),
      },
    ],
  },
  imprint: { dataUrlPath: `/imprint?${STRAPI_POPULATE_ALL}` },
  landing: {
    dataUrlPath: `/landing?${STRAPI_POPULATE_ALL}`,
    contentFileName: "_index.md",
    additionalContentProperties: [
      {
        key: "images",
        transform: async (images) => downloadImages(images),
      },
    ],
  },
  privacy: { dataUrlPath: `/privacy?${STRAPI_POPULATE_ALL}` },
  term_condition: { dataUrlPath: `/term-condition?${STRAPI_POPULATE_ALL}` },
};

async function downloadImages(items) {
  if (!items) {
    return [];
  }

  const downloadPromises = items.map(async (item) => {
    return await downloadImage(item);
  });
  const localPaths = await Promise.all(downloadPromises);
  return localPaths;
}

async function downloadImage(item) {
  if (!item) {
    return;
  }

  const imageName = `${item.hash}${item.ext}`;
  const imagePath = path.join(IMAGES_DIR, imageName);

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  try {
    console.log(`📥 Download image "${imageName}"`);

    const response = await fetch(
      `${STRAPI_URL}${item.formats?.large?.url || item.url}`,
    );
    if (!response.ok) {
      console.log(
        `❌ ERROR downloading image ${imageName}: ${response.statusText}`,
      );
      return `${STRAPI_URL}${item.formats.large.url || item.url}`;
    }

    await writeFile(imagePath, Readable.fromWeb(response.body));
    return `/images/${imageName}`;
  } catch (error) {
    console.error(`❌ ERROR downloading image ${imageName}:`, error.message);
    return `${STRAPI_URL}${item.formats?.large?.url || item.url}`;
  }
}

async function generateFrontmatter(item, contentConfig) {
  let frontMatter = "---\n";
  frontMatter += `title: "${item.title || contentConfig.contentTitle}"\n`;
  frontMatter += `date: "${item.publishedAt || new Date().toISOString()}"\n`;
  frontMatter += "draft: false\n";
  if (contentConfig.contentType) {
    frontMatter += `type: "${contentConfig.contentType}"\n`;
  }
  frontMatter += "generated: true\n";
  if (contentConfig.additionalContentProperties) {
    for (const prop of contentConfig.additionalContentProperties) {
      if (item.hasOwnProperty(prop.key)) {
        const result =
          prop.transform && typeof prop.transform === "function"
            ? await prop.transform(item[prop.key])
            : item[prop.key];

        const value =
          typeof result === "object" || typeof result === "string"
            ? JSON.stringify(result)
            : result;

        frontMatter += `${prop.key}: ${value}\n`;
      }
    }
  }
  frontMatter += "---\n";

  return frontMatter;
}

async function generateDetailPage(key, targetDir, contentConfig, item) {
  const slug = item.slug;
  if (!slug) {
    console.warn(`⚠️ WARNING: Skipping item with ID ${item.id} without slug`);
    return;
  }

  const pageName = `${slug}.md`;
  const pagePath = path.join(targetDir, pageName);

  const frontMatter = await generateFrontmatter(item, contentConfig);
  const contentBody = item.content || "";
  const fullContent = `${frontMatter}\n\n${contentBody}\n`;

  fs.writeFileSync(pagePath, fullContent, "utf8");
  console.log(`✅ Content page ${pageName} generated.`);
}

async function generateCollectionPage(key, targetDir, contentConfig, item) {
  const pageName = "_index.md";
  const pagePath = path.join(targetDir, pageName);

  const frontMatter = await generateFrontmatter(item, contentConfig);
  const fullContent = `${frontMatter}\n`;

  fs.writeFileSync(pagePath, fullContent, "utf8");
  console.log(`✅ Content page ${pageName} generated.`);
}

async function generateCollectionContent(key, contentConfig) {
  console.log(`📥 Generate content for "${key}"`);

  const dataFileName = key + ".json";
  const dataPath = path.join(DATA_DIR, dataFileName);

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ ERROR: Data file for ${key} not found at ${dataPath}`);
    return;
  }

  const targetDir = path.join(CONTENT_DIR, key);
  fs.mkdirSync(targetDir, { recursive: true });

  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  await generateCollectionPage(key, targetDir, contentConfig, data);
  const items = data ? data.data || [] : [];
  for (const item of items) {
    await generateDetailPage(key, targetDir, contentConfig, item);
  }
}

async function generateSingleContent(key, contentConfig) {
  console.log(`📥 Generate content for "${key}"`);

  const dataFileName = key + ".json";
  const dataPath = path.join(DATA_DIR, dataFileName);

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ ERROR: Data file for ${key} not found at ${dataPath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const item = data.data;

  const pageName = contentConfig.contentFileName || key + ".md";
  const pagePath = path.join(CONTENT_DIR, pageName);

  const frontMatter = await generateFrontmatter(item, contentConfig);
  const contentBody = data.data.content || "";
  const fullContent = `${frontMatter}\n\n${contentBody}\n`;

  fs.writeFileSync(pagePath, fullContent, "utf8");
  console.log(`✅ Content page ${pageName} generated.`);
}

async function syncContent() {
  console.log(`🚀 Starting Hugo content generation (${NODE_ENV})`);

  for (const key in SINGLE_CONTENT_MAP) {
    if (SINGLE_CONTENT_MAP.hasOwnProperty(key)) {
      await generateSingleContent(key, SINGLE_CONTENT_MAP[key]);
    }
  }

  for (const key in COLLECTION_CONTENT_MAP) {
    if (COLLECTION_CONTENT_MAP.hasOwnProperty(key)) {
      await generateCollectionContent(key, COLLECTION_CONTENT_MAP[key]);
    }
  }

  console.log("✅ Hugo content generation completed");
}

async function fetchAndSave(key, dataConfig) {
  const fileName = key + ".json";
  const filePath = path.join(DATA_DIR, fileName);
  const url = STRAPI_URL + "/api" + dataConfig.dataUrlPath;

  console.log(`📥 Fetching "${key}" from ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${STRAPI_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status} for ${key}`);
    }

    const data = await response.json();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    console.log(`✅ ${fileName} saved.`);
  } catch (error) {
    console.error(`❌ ERROR fetching ${key}:`, error.message);
    return;
  }
}

async function syncData() {
  if (!STRAPI_TOKEN) {
    console.error(
      "❌ ERROR: STRAPI_API_TOKEN environment variable is not set. Cannot authenticate with Strapi.",
    );
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } else {
    fs.readdirSync(DATA_DIR).forEach((file) => {
      fs.unlinkSync(path.join(DATA_DIR, file));
    });
  }

  console.log(`🚀 Starting Strapi data sync (${NODE_ENV})`);

  const dataMap = { ...COLLECTION_CONTENT_MAP, ...SINGLE_CONTENT_MAP };
  for (const key in dataMap) {
    if (dataMap.hasOwnProperty(key)) {
      await fetchAndSave(key, dataMap[key]);
    }
  }

  console.log("✅ Stapi data sync completed");
}

async function sync() {
  await syncData();
  await syncContent();
}

sync();

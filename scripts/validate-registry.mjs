import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const projectsDir = join(root, "projects");
const schema = JSON.parse(readFileSync(join(root, "project.schema.json"), "utf8"));
const chains = schema.properties.chains.items.properties.chain_id.enum;
const primaryCategories = schema.properties.primary_category_id.enum;
const subcategories = schema.properties.subcategory_id.enum;
const parentBySubcategory = {
  "dex-trading": "defi",
  lending: "defi",
  yield: "defi",
  derivatives: "defi",
  "liquid-staking": "defi",
  stablecoins: "defi",
  "games-games": "games",
  "virtual-worlds": "games",
  "game-infrastructure": "games",
  "nft-marketplaces": "nfts",
  "nft-collections": "nfts",
  "creator-tools": "nfts",
  "data-analytics": "infrastructure",
  oracles: "infrastructure",
  "rpc-nodes": "infrastructure",
  identity: "infrastructure",
  "developer-tools": "infrastructure",
  "ai-agents": "ai-depin",
  "compute-storage": "ai-depin",
  wireless: "ai-depin",
  "physical-infrastructure": "ai-depin",
  "tokenized-funds": "real-world-assets",
  "tokenized-credit": "real-world-assets",
  "tokenized-commodities": "real-world-assets"
};

const errors = [];
const seenSlugs = new Set();
const seenAddresses = new Map();
const projectFiles = readdirSync(projectsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

function fail(file, message) {
  errors.push(file + ": " + message);
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

for (const filename of projectFiles) {
  const file = "projects/" + filename;
  let project;
  try {
    project = JSON.parse(readFileSync(join(projectsDir, filename), "utf8"));
  } catch (error) {
    fail(file, "invalid JSON (" + error.message + ")");
    continue;
  }

  if (!project || Array.isArray(project) || typeof project !== "object") {
    fail(file, "manifest must be a JSON object");
    continue;
  }

  const required = [
    "schema_version", "slug", "name", "tagline", "description", "logo_url",
    "website_url", "social_links", "primary_category_id", "tags", "chains"
  ];
  for (const key of required) {
    if (!(key in project)) fail(file, "missing required field " + key);
  }
  if (!hasOnlyKeys(project, required.concat(["subcategory_id"]))) {
    fail(file, "contains an unsupported top-level field");
  }

  if (project.schema_version !== 1) fail(file, "schema_version must be 1");
  if (typeof project.slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) ||
      project.slug.length > 64) {
    fail(file, "slug must use lowercase letters, numbers, and single hyphens");
  } else {
    if (project.slug + ".json" !== basename(filename)) fail(file, "filename must match the manifest slug");
    if (seenSlugs.has(project.slug)) fail(file, "duplicate slug " + project.slug);
    seenSlugs.add(project.slug);
  }

  for (const [field, min, max] of [
    ["name", 2, 100],
    ["tagline", 2, 160],
    ["description", 20, 5000]
  ]) {
    if (typeof project[field] !== "string" ||
        project[field].length < min || project[field].length > max) {
      fail(file, field + " must contain " + min + "-" + max + " characters");
    }
  }
  for (const field of ["logo_url", "website_url"]) {
    if (typeof project[field] !== "string" || !isHttpsUrl(project[field])) {
      fail(file, field + " must be an HTTPS URL");
    }
  }

  if (!project.social_links || Array.isArray(project.social_links) ||
      typeof project.social_links !== "object") {
    fail(file, "social_links must be an object");
  } else {
    const socialKeys = ["x", "discord", "telegram", "github", "medium", "youtube", "docs"];
    if (!hasOnlyKeys(project.social_links, socialKeys)) {
      fail(file, "social_links contains an unsupported field");
    }
    for (const [key, value] of Object.entries(project.social_links)) {
      if (typeof value !== "string" || !isHttpsUrl(value)) {
        fail(file, "social_links." + key + " must be an HTTPS URL");
      }
    }
  }

  if (!primaryCategories.includes(project.primary_category_id)) {
    fail(file, "primary_category_id is not in the supported taxonomy");
  }
  if (project.subcategory_id !== undefined) {
    if (!subcategories.includes(project.subcategory_id)) {
      fail(file, "subcategory_id is not in the supported taxonomy");
    } else if (parentBySubcategory[project.subcategory_id] !== project.primary_category_id) {
      fail(file, "subcategory_id does not belong to primary_category_id");
    }
  }

  if (!Array.isArray(project.tags) || project.tags.length > 3) {
    fail(file, "tags must be an array with at most three entries");
  } else {
    const tags = new Set();
    for (const tag of project.tags) {
      if (typeof tag !== "string" ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag) ||
          tag.length > 32) {
        fail(file, "invalid tag " + String(tag));
      }
      if (tags.has(tag)) fail(file, "duplicate tag " + tag);
      tags.add(tag);
    }
  }

  if (!Array.isArray(project.chains) || project.chains.length === 0) {
    fail(file, "chains must contain at least one chain");
    continue;
  }
  const projectChains = new Set();
  for (const chain of project.chains) {
    if (!chain || typeof chain !== "object" || Array.isArray(chain) ||
        !hasOnlyKeys(chain, ["chain_id", "addresses"])) {
      fail(file, "each chain must contain only chain_id and addresses");
      continue;
    }
    if (!chains.includes(chain.chain_id)) {
      fail(file, "unsupported chain_id " + String(chain.chain_id));
      continue;
    }
    if (projectChains.has(chain.chain_id)) fail(file, "duplicate chain " + chain.chain_id);
    projectChains.add(chain.chain_id);
    if (!Array.isArray(chain.addresses) || chain.addresses.length === 0) {
      fail(file, chain.chain_id + " must contain at least one address");
      continue;
    }

    for (const item of chain.addresses) {
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          !hasOnlyKeys(item, ["address", "address_kind", "start_position"])) {
        fail(file, chain.chain_id + " address has unsupported fields");
        continue;
      }
      if (typeof item.address !== "string" ||
          item.address.length === 0 || item.address.length > 128) {
        fail(file, chain.chain_id + " address must be a non-empty string of at most 128 characters");
        continue;
      }
      const isSolana = chain.chain_id === "solana";
      const addressPattern = isSolana
        ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
        : /^0x[0-9a-fA-F]{40}$/;
      if (!addressPattern.test(item.address)) fail(file, chain.chain_id + " address has an invalid format");
      const expectedKind = isSolana ? "program" : "contract";
      if (item.address_kind !== expectedKind) {
        fail(file, chain.chain_id + " addresses must use address_kind " + expectedKind);
      }
      if (item.start_position !== undefined &&
          (!Number.isSafeInteger(item.start_position) || item.start_position < 0)) {
        fail(file, "start_position must be a non-negative safe integer");
      }

      const normalized = isSolana ? item.address : item.address.toLowerCase();
      const addressKey = chain.chain_id + ":" + normalized;
      if (seenAddresses.has(addressKey)) {
        fail(file, "address is already listed by " + seenAddresses.get(addressKey) +
          " on " + chain.chain_id);
      } else {
        seenAddresses.set(addressKey, file);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => "- " + error).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Validated " + projectFiles.length + " project manifest(s).");
}

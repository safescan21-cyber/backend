// productPaths: the pages sent to IndexNow when a shop machine is added, changed or removed
const test = require("node:test");
const assert = require("node:assert");
const { productPaths } = require("../src/utils/indexnow");

test("productPaths: the machine in every country version, the shop and its lists", () => {
  const paths = productPaths({ _id: "6ae95f73c204ed5db98778c3", category: "checkweigher" });
  assert.ok(paths.includes("/shop/6ae95f73c204ed5db98778c3"));
  assert.ok(paths.includes("/en-us/shop/6ae95f73c204ed5db98778c3"));
  assert.ok(paths.includes("/products/inspection")); // checkweighers are on the inspection page
  for (const p of ["/shop", "/products", "/pharma-machinery", "/food-machinery"]) assert.ok(paths.includes(p));
});

test("productPaths: no category page when the website has none; nothing without an id", () => {
  assert.ok(!productPaths({ _id: "x", category: "hvac" }).some((p) => p.startsWith("/products/")));
  assert.deepStrictEqual(productPaths({}), []);
});

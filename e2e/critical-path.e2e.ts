import { expect, test } from "@playwright/test";

test("worked example supports source search and textless browser persistence", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "The right quote, page, and question at the right moment.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

  await page.getByRole("button", { name: "Evidence", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evidence cards" })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Written admission: contracted work not delivered",
    }).first(),
  ).toBeVisible();

  await page
    .getByPlaceholder(/Search records or commands/i)
    .fill("contracted reporting work");
  await page.getByRole("button", { name: "Search records" }).click();
  await expect(page.getByRole("heading", { name: "Record search" })).toBeVisible();
  await expect(page.getByText("Exact lane", { exact: true }).first()).toBeVisible();

  const privateMarker = "E2E_PRIVATE_SOURCE_TEXT_MUST_NOT_PERSIST";
  await page.evaluate((marker) => {
    window.localStorage.setItem(
      "sourcedeck.documents",
      JSON.stringify([
        {
          id: "privacy-smoke-document",
          title: "Privacy smoke document",
          type: "TXT",
          date: "2026-08-31",
          author: "Test fixture",
          pages: 1,
          exhibit: "Test",
          tags: [],
          status: "Indexed",
          extractedText: marker,
          pageTexts: [{ page: 1, text: marker }],
        },
      ]),
    );
  }, privateMarker);
  await page.reload();
  await expect(page.getByText("SourceDeck", { exact: true })).toBeVisible();
  const persistedDocuments = await page.evaluate(() =>
    window.localStorage.getItem("sourcedeck.documents"),
  );
  expect(persistedDocuments).not.toContain(privateMarker);
  expect(consoleErrors).toEqual([]);
});

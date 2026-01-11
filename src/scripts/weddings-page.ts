import { bootWeddingPage } from "../lib/weddings/client";

const el = document.getElementById("weddingPageScript");

if (!el) {
  console.error("Missing weddingPageScript element");
} else {
  const detailsUrl = el.getAttribute("data-details-url") || "";
  const calendarUrl = el.getAttribute("data-calendar-url") || "";
  const slug = el.getAttribute("data-slug") || "";
  bootWeddingPage({ detailsUrl, calendarUrl, slug });
}

import { bootWeddingPage } from "../lib/weddings/client";

declare global {
  interface Window {
    __WEDDING_PAGE__?: { detailsUrl: string; calendarUrl: string; slug: string };
  }
}

const cfg = window.__WEDDING_PAGE__;
if (cfg) {
  bootWeddingPage(cfg);
}

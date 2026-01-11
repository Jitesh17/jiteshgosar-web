// src/lib/weddings/client.ts

type Theme = {
  background?: "gradient" | "image";
  gradient?: string;
  imageUrl?: string;
  decor?: {
    enabled?: boolean;
    imageUrl?: string;
    opacityDark?: number;
    opacityLight?: number;
    size?: number;
    rotate?: boolean;
    baseRotation?: number;
    corners?: Record<string, { imageUrl?: string; rotation?: number }>;
  };
};

type Media = {
  couplePhoto?: {
    enabled?: boolean;
    src?: string;
    alt?: string;
    shape?: "circle" | "rounded";
    size?: number;
  };
};

type Rsvp = {
  enabled?: boolean;
  title?: string;
  deadline?: string;
  mode?: "button" | "embed";
  showButton?: boolean;
  formUrl?: string;
  embedUrl?: string;
  buttonText?: string;
  openInNewTabText?: string;
};

type ScheduleEvent = {
  title: string;
  start: string;
  end: string;
  locationName?: string;
  address?: string;
  notes?: string;
  mapUrl?: string;
};

type Details = {
  coupleNames: string;
  tagline?: string;
  lastUpdated: string;
  password: string | number;
  passwordHint?: string;

  primaryEvent: { title: string; start: string };
  primaryVenue: { mapUrl: string };

  schedule?: ScheduleEvent[];
  updates?: { when: string; text: string }[];
  contacts?: { name: string; role: string; phone: string }[];

  theme?: Theme;
  media?: Media;
  rsvp?: Rsvp;
};

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function mustEl<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = el<T>(id);
  if (!node) throw new Error(`Missing element: #${id}`);
  return node;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatLocal(iso: string): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  return d.toLocaleString(undefined, opts);
}

function renderCountdown(targetEl: HTMLElement, targetIso: string, label: string): number {
  const tick = () => {
    const ms = new Date(targetIso).getTime() - Date.now();
    if (ms <= 0) {
      targetEl.textContent = `${label}: happening now`;
      return;
    }
    const s = Math.floor(ms / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    targetEl.textContent = `${days}d ${pad2(hours)}h ${pad2(mins)}m ${pad2(secs)}s`;
  };

  tick();
  return window.setInterval(tick, 1000);
}

function buildGoogleCalendarLink(ev: Partial<ScheduleEvent>): string {
  const start = new Date(ev.start ?? "");
  const end = new Date(ev.end ?? "");

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "https://calendar.google.com/calendar/";
  }

  const fmt = (d: Date) => {
    const y = d.getUTCFullYear();
    const mo = pad2(d.getUTCMonth() + 1);
    const da = pad2(d.getUTCDate());
    const h = pad2(d.getUTCHours());
    const mi = pad2(d.getUTCMinutes());
    const ss = pad2(d.getUTCSeconds());
    return `${y}${mo}${da}T${h}${mi}${ss}Z`;
  };

  const dates = `${fmt(start)}/${fmt(end)}`;
  const title = encodeURIComponent(String(ev.title || "Event"));
  const notes = encodeURIComponent(String(ev.notes || ""));
  const locationStr = [ev.locationName, ev.address].filter(Boolean).join(", ");
  const location = encodeURIComponent(locationStr);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${notes}&location=${location}`;
}

function applyTheme(theme?: Theme) {
  const wrapper = el<HTMLElement>("themeWrapper");
  if (!wrapper || !theme) return;

  wrapper.classList.add("relative", "min-h-screen");

  wrapper.style.backgroundImage = "";
  wrapper.style.backgroundSize = "";
  wrapper.style.backgroundPosition = "";
  wrapper.style.backgroundRepeat = "";

  // Remove previous gradient classes (best effort)
  wrapper.classList.remove("bg-gradient-to-br");
  [...wrapper.classList].forEach((c) => {
    if (c.startsWith("from-") || c.startsWith("via-") || c.startsWith("to-")) wrapper.classList.remove(c);
  });

  if (theme.background === "gradient" && theme.gradient) {
    wrapper.classList.add("bg-gradient-to-br");
    theme.gradient.split(" ").forEach((c) => wrapper.classList.add(c));
    return;
  }

  if (theme.background === "image" && theme.imageUrl) {
    wrapper.style.backgroundImage = `url('${theme.imageUrl}')`;
    wrapper.style.backgroundSize = "cover";
    wrapper.style.backgroundPosition = "center";
    wrapper.style.backgroundRepeat = "no-repeat";
  }
}

function applyDecor(theme?: Theme) {
  const root = el<HTMLElement>("decorCorners");
  const tl = el<HTMLElement>("decorTL");
  const tr = el<HTMLElement>("decorTR");
  const bl = el<HTMLElement>("decorBL");
  const br = el<HTMLElement>("decorBR");
  if (!root || !tl || !tr || !bl || !br) return;

  root.classList.add("hidden");
  for (const node of [tl, tr, bl, br]) {
    node.style.backgroundImage = "";
    node.style.backgroundRepeat = "no-repeat";
    node.style.backgroundSize = "";
    node.style.width = "";
    node.style.height = "";
    node.style.opacity = "";
    node.style.transform = "";
  }

  const d = theme?.decor;
  if (!d?.enabled || !d.imageUrl) return;

  const isDark = document.documentElement.classList.contains("dark");
  const opacity = isDark ? (d.opacityDark ?? 0.16) : (d.opacityLight ?? 0.28);
  const size = Number(d.size || 360);

  const pick = (key: "tl" | "tr" | "bl" | "br") => d.corners?.[key]?.imageUrl || d.imageUrl || "";
  const rot = (key: "tl" | "tr" | "bl" | "br", fallbackDeg: number) => {
    const v = d.corners?.[key]?.rotation;
    return Number.isFinite(Number(v)) ? Number(v) : fallbackDeg;
  };

  const setCorner = (node: HTMLElement, url: string, rotationDeg: number) => {
    if (!url) return;
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    node.style.opacity = String(opacity);
    node.style.backgroundImage = `url('${url}')`;
    node.style.backgroundSize = "contain";
    node.style.backgroundRepeat = "no-repeat";
    node.style.backgroundPosition = "center";
    node.style.transform = `rotate(${rotationDeg}deg)`;
  };

const base = Number(d.baseRotation || 0);
const autoRotate = d.rotate !== false;

setCorner(tl, pick("tl"), rot("tl", base + 0));
setCorner(tr, pick("tr"), rot("tr", base + (autoRotate ? 90 : 0)));
setCorner(bl, pick("bl"), rot("bl", base + (autoRotate ? -90 : 0)));
setCorner(br, pick("br"), rot("br", base + (autoRotate ? 180 : 0)));


  if (pick("tl") || pick("tr") || pick("bl") || pick("br")) root.classList.remove("hidden");
}

function renderCouplePhoto(media?: Media) {
  const wrap = el<HTMLElement>("couplePhotoWrap");
  const img = el<HTMLImageElement>("couplePhoto");
  if (!wrap || !img) return;

  wrap.classList.add("hidden");
  img.removeAttribute("src");
  img.alt = "";
  img.style.width = "";
  img.style.height = "";

  const photo = media?.couplePhoto;
  if (!photo?.enabled || !photo.src) return;

  img.src = photo.src;
  img.alt = photo.alt || "";

  img.classList.remove("rounded-full", "rounded-2xl");
  const shape = String(photo.shape || "circle").toLowerCase();
  img.classList.add(shape === "rounded" ? "rounded-2xl" : "rounded-full");

  const size = Number(photo.size || 112);
  img.style.width = `${size}px`;
  img.style.height = `${size}px`;

  wrap.classList.remove("hidden");
}

function renderRsvp(rsvp?: Rsvp) {
  const section = el<HTMLElement>("rsvpSection");
  const title = el<HTMLElement>("rsvpTitle");
  const deadlineText = el<HTMLElement>("rsvpDeadlineText");
  const buttonWrap = el<HTMLElement>("rsvpButtonWrap");
  const button = el<HTMLAnchorElement>("rsvpButton");
  const openNewTab = el<HTMLAnchorElement>("rsvpOpenInNewTab");
  const embedWrap = el<HTMLElement>("rsvpEmbedWrap");
  const iframe = el<HTMLIFrameElement>("rsvpIframe");

  if (!section || !title || !deadlineText || !buttonWrap || !button || !openNewTab || !embedWrap || !iframe) return;

  section.style.display = "none";
  buttonWrap.style.display = "none";
  embedWrap.style.display = "none";
  deadlineText.style.display = "none";

  if (!rsvp?.enabled) return;

  section.style.display = "block";
  title.textContent = rsvp.title || "RSVP";

  if (rsvp.deadline) {
    deadlineText.textContent = `RSVP deadline: ${formatLocal(rsvp.deadline)}`;
    deadlineText.style.display = "block";
  }

  const mode = String(rsvp.mode || "button").toLowerCase();
  const showButton = rsvp.showButton !== false;

  if (rsvp.formUrl) {
    openNewTab.href = rsvp.formUrl;
    openNewTab.textContent = rsvp.openInNewTabText || "Open in Google Forms";
  }

  if (mode === "button") {
    if (!rsvp.formUrl) return;
    button.textContent = rsvp.buttonText || "RSVP Now";
    button.href = rsvp.formUrl;
    button.target = "_blank";
    button.rel = "noopener";
    buttonWrap.style.display = "block";
    return;
  }

  if (!rsvp.embedUrl) return;

  let iframeLoaded = false;

  if (!showButton) {
    iframe.src = rsvp.embedUrl;
    embedWrap.style.display = "block";
    return;
  }

  buttonWrap.style.display = "block";
  button.textContent = rsvp.buttonText || "RSVP (open form here)";
  button.href = "#";
  button.target = "";
  button.rel = "";

  button.onclick = (e) => {
    e.preventDefault();
    embedWrap.style.display = "block";
    if (!iframeLoaded) {
      iframe.src = rsvp.embedUrl!;
      iframeLoaded = true;
    }
    embedWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

function renderInvite(details: Details, calendarUrl: string) {
  // These are required; if missing, better to throw early than half-render silently
  mustEl("coupleNames").textContent = details.coupleNames;
  mustEl("weddingDate").textContent = formatLocal(details.primaryEvent.start);
  mustEl("lastUpdated").textContent = formatLocal(details.lastUpdated);

  const tagline = el("tagline");
  if (tagline) tagline.textContent = details.tagline || "";

  const mapBtn = el<HTMLAnchorElement>("mapBtn");
  if (mapBtn) mapBtn.href = details.primaryVenue.mapUrl;

  const httpsIcs = new URL(calendarUrl, window.location.href).toString();
  const subscribeBtn = el<HTMLAnchorElement>("subscribeBtn");
  if (subscribeBtn) subscribeBtn.href = httpsIcs.replace(/^https:/, "webcal:");

  const countdown = el("countdown");
  if (countdown) renderCountdown(countdown, details.primaryEvent.start, details.primaryEvent.title);

  // NOTE: You still use innerHTML below. It works, but it’s injection-prone.
  // If you want, I can rewrite schedule/updates rendering using createElement + textContent only.
  const schedule = el<HTMLElement>("schedule");
  if (schedule) {
    schedule.innerHTML = "";
    for (const ev of details.schedule || []) {
      const card = document.createElement("div");
      card.className = "rounded-2xl border p-4 dark:border-neutral-800";

      const timeText = `${formatLocal(ev.start)} to ${new Date(ev.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      card.innerHTML = `
        <div class="flex flex-wrap justify-between gap-2">
          <div class="font-semibold"></div>
          <div class="text-sm text-amber-600 dark:text-amber-400"></div>
        </div>
        <div class="mt-2 text-sm text-neutral-500"></div>
        <div class="mt-3 flex gap-2 text-sm">
          <a class="rounded-xl border px-3 py-1 dark:border-neutral-800" target="_blank" rel="noopener">Maps</a>
          <a class="rounded-xl border px-3 py-1 dark:border-neutral-800" target="_blank" rel="noopener">Add to Google Calendar</a>
        </div>
      `;

      (card.querySelector(".font-semibold") as HTMLElement).textContent = ev.title;
      (card.querySelector(".text-amber-600") as HTMLElement).textContent = timeText;
      (card.querySelector(".text-neutral-500") as HTMLElement).textContent = [ev.locationName, ev.address].filter(Boolean).join(", ");

      const links = card.querySelectorAll("a");
      (links[0] as HTMLAnchorElement).href = ev.mapUrl || details.primaryVenue.mapUrl;
      (links[1] as HTMLAnchorElement).href = buildGoogleCalendarLink(ev);

      schedule.appendChild(card);
    }
  }

  const updates = el<HTMLElement>("updates");
  if (updates) {
    updates.innerHTML = "";
    for (const u of details.updates || []) {
      const row = document.createElement("div");
      row.className = "rounded-2xl border p-4 text-sm dark:border-neutral-800";
      row.innerHTML = `
        <div class="text-xs text-neutral-500"></div>
        <div class="mt-1"></div>
      `;
      (row.children[0] as HTMLElement).textContent = formatLocal(u.when);
      (row.children[1] as HTMLElement).textContent = u.text;
      updates.appendChild(row);
    }
  }

  const contacts = el<HTMLElement>("contacts");
  if (contacts) {
    contacts.innerHTML = "";
    for (const c of details.contacts || []) {
      const row = document.createElement("div");
      row.innerHTML = `<strong></strong> <span></span>`;
      (row.querySelector("strong") as HTMLElement).textContent = c.name;
      (row.querySelector("span") as HTMLElement).textContent = `(${c.role}) · ${c.phone}`;
      contacts.appendChild(row);
    }
  }

  applyTheme(details.theme);
  applyDecor(details.theme);
  renderCouplePhoto(details.media);
  renderRsvp(details.rsvp);
}

const observer = new MutationObserver(() => {
  applyDecor(DETAILS?.theme);
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});


export async function bootWeddingPage(args: { detailsUrl: string; calendarUrl: string; slug: string }) {
  const { detailsUrl, calendarUrl, slug } = args;

  const lockScreen = el<HTMLElement>("lockScreen");
  const content = el<HTMLElement>("protectedContent");
  const input = el<HTMLInputElement>("passwordInput");
  const btn = el<HTMLButtonElement>("unlockBtn");
  const error = el<HTMLElement>("errorMsg");
  const missing = el<HTMLElement>("missingMsg");
  const lockHint = el<HTMLElement>("lockHint");

  input?.addEventListener("input", () => error?.classList.add("hidden"));

  let details: Details | null = null;

  const storageKey = `weddings-${slug}-unlocked`;

  const showContent = () => {
    lockScreen?.classList.add("hidden");
    content?.classList.remove("hidden");
  };

  const showLock = () => {
    lockScreen?.classList.remove("hidden");
    content?.classList.add("hidden");
  };

  const load = async () => {
    const res = await fetch(detailsUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("DETAILS_NOT_FOUND");
    details = (await res.json()) as Details;
  };

  const setLockHintFromJson = () => {
    if (details?.passwordHint && lockHint) lockHint.textContent = details.passwordHint;
  };

  const checkPassword = (pw: string) => details && String(pw) === String(details.password);

  const attemptUnlock = () => {
    if (!input || !error || !details) return;
    if (checkPassword(input.value || "")) {
      localStorage.setItem(storageKey, "true");
      showContent();
      renderInvite(details, calendarUrl);
    } else {
      error.classList.remove("hidden");
    }
  };

  try {
    await load();
    setLockHintFromJson();

    if (localStorage.getItem(storageKey) === "true") {
      showContent();
      renderInvite(details!, calendarUrl);
      return;
    }

    btn?.addEventListener("click", attemptUnlock);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attemptUnlock();
    });

    showLock();
  } catch {
    showLock();
    missing?.classList.remove("hidden");
  }
}

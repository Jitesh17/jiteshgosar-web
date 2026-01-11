// src/lib/weddings/client.ts

type DecorCornerKey = "tl" | "tr" | "bl" | "br";

type DecorConfig = {
  enabled?: boolean;
  mode?: "corners" | "tile";
  imageUrl?: string;
  opacityDark?: number;
  opacityLight?: number;
  size?: number;
  rotate?: boolean;
  baseRotation?: number; // starting rotation offset in degrees
  corners?: Partial<Record<DecorCornerKey, { imageUrl?: string; rotation?: number }>>;
};

type Theme = {
  background?: "gradient" | "image";
  gradient?: string; // e.g. "from-rose-50 via-white to-amber-50"
  imageUrl?: string;
  decor?: DecorConfig;
};

type Media = {
  couplePhoto?: {
    enabled?: boolean;
    src?: string;
    alt?: string;
    shape?: "circle" | "rounded";
    size?: number; // px
  };
};

type Rsvp = {
  enabled?: boolean;
  title?: string;
  deadline?: string;
  mode?: "button" | "embed";
  showButton?: boolean; // for embed mode: show button first, then reveal iframe
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
  cityLine?: string;

  lastUpdated: string;
  password: string | number;
  passwordHint?: string;

  primaryEvent: { title: string; start: string; end?: string };
  primaryVenue: { name?: string; address?: string; mapUrl: string };

  schedule?: ScheduleEvent[];
  updates?: { when: string; text: string }[];
  contacts?: { name: string; role: string; phone: string }[];

  theme?: Theme;

  // Support your current JSON where decor is top-level
  decor?: DecorConfig;

  media?: Media;
  rsvp?: Rsvp;
};

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
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

  // Clear styles we control
  wrapper.style.backgroundImage = "";
  wrapper.style.backgroundSize = "";
  wrapper.style.backgroundPosition = "";
  wrapper.style.backgroundRepeat = "";

  // Remove previous gradient classes
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

function getDecor(details: Details): DecorConfig | undefined {
  return details.theme?.decor ?? details.decor;
}

function applyDecor(theme: any) {
  const root = document.getElementById("decorCorners");
  const tl = document.getElementById("decorTL");
  const tr = document.getElementById("decorTR");
  const bl = document.getElementById("decorBL");
  const br = document.getElementById("decorBR");
  if (!root || !tl || !tr || !bl || !br) return;

  root.classList.add("hidden");

  const resetCorner = (el: HTMLElement) => {
    el.style.backgroundImage = "";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundSize = "";
    el.style.backgroundPosition = "";
    el.style.width = "";
    el.style.height = "";
    el.style.opacity = "";
    el.style.transform = "";
  };

  [tl, tr, bl, br].forEach(resetCorner);

  const d = theme?.decor;
  if (!d || d.enabled !== true || (d.mode || "corners") !== "corners") return;

  const isDark = document.documentElement.classList.contains("dark");
  const opacity = isDark ? (d.opacityDark ?? 0.16) : (d.opacityLight ?? 0.28);
  const size = Number(d.size ?? 360);

  // This is the key bit
  const base = Number(d.baseRotation ?? 0);

  const pickUrl = (key: "tl" | "tr" | "bl" | "br") =>
    d.corners?.[key]?.imageUrl || d.imageUrl || "";

  const cornerExtra = (key: "tl" | "tr" | "bl" | "br") => {
    const v = d.corners?.[key]?.rotation;
    return Number.isFinite(Number(v)) ? Number(v) : 0;
  };

  const autoRotate = d.rotate !== false;

  const autoCorner = (key: "tl" | "tr" | "bl" | "br") => {
    if (!autoRotate) return 0;
    if (key === "tr") return 90;
    if (key === "bl") return -90;
    if (key === "br") return 180;
    return 0; // tl
  };

  const setCorner = (el: HTMLElement, key: "tl" | "tr" | "bl" | "br") => {
    const url = pickUrl(key);
    if (!url) return;

    const finalRotation = base + autoCorner(key) + cornerExtra(key);

    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.opacity = String(opacity);
    el.style.backgroundImage = `url('${url}')`;
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center";
    el.style.transform = `rotate(${finalRotation}deg)`;
  };

  setCorner(tl, "tl");
  setCorner(tr, "tr");
  setCorner(bl, "bl");
  setCorner(br, "br");

  // show if anything is set
  if (pickUrl("tl") || pickUrl("tr") || pickUrl("bl") || pickUrl("br")) {
    root.classList.remove("hidden");
  }
}


function renderCouplePhoto(media?: Media) {
  const wrap = el<HTMLElement>("couplePhotoWrap");
  const img = el<HTMLImageElement>("couplePhoto");
  if (!wrap || !img) return;

  // No placeholder if missing
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
  const coupleNames = el<HTMLElement>("coupleNames");
  if (coupleNames) coupleNames.textContent = details.coupleNames;

  const tagline = el<HTMLElement>("tagline");
  if (tagline) tagline.textContent = details.tagline || "";

  const cityLine = el<HTMLElement>("cityLine");
  if (cityLine) {
    if (details.cityLine) {
      cityLine.textContent = details.cityLine;
      cityLine.classList.remove("hidden");
    } else {
      cityLine.textContent = "";
      cityLine.classList.add("hidden");
    }
  }

  const weddingDate = el<HTMLElement>("weddingDate");
  if (weddingDate) weddingDate.textContent = formatLocal(details.primaryEvent.start);

  const lastUpdated = el<HTMLElement>("lastUpdated");
  if (lastUpdated) lastUpdated.textContent = formatLocal(details.lastUpdated);

  const mapBtn = el<HTMLAnchorElement>("mapBtn");
  if (mapBtn) mapBtn.href = details.primaryVenue.mapUrl;

  const httpsIcs = new URL(calendarUrl, window.location.href).toString();
  const subscribeBtn = el<HTMLAnchorElement>("subscribeBtn");
  if (subscribeBtn) subscribeBtn.href = httpsIcs.replace(/^https:/, "webcal:");

  // Countdown (clear previous if any)
  const countdown = el<HTMLElement>("countdown");
  const countdownHolder = (window as unknown as { __weddingCountdownId?: number });
  if (countdown && details.primaryEvent.start) {
    if (countdownHolder.__weddingCountdownId) window.clearInterval(countdownHolder.__weddingCountdownId);
    countdownHolder.__weddingCountdownId = renderCountdown(countdown, details.primaryEvent.start, details.primaryEvent.title);
  }

  // Schedule
  const scheduleWrap = el<HTMLElement>("schedule");
  if (scheduleWrap) {
    scheduleWrap.innerHTML = "";
    for (const ev of details.schedule || []) {
      const card = document.createElement("div");
      card.className = "rounded-2xl border p-4 dark:border-neutral-800";

      const top = document.createElement("div");
      top.className = "flex flex-wrap justify-between gap-2";

      const title = document.createElement("div");
      title.className = "font-semibold";
      title.textContent = ev.title;

      const time = document.createElement("div");
      time.className = "text-sm text-amber-600 dark:text-amber-400";
      time.textContent = `${formatLocal(ev.start)} to ${new Date(ev.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      top.appendChild(title);
      top.appendChild(time);

      const place = document.createElement("div");
      place.className = "mt-2 text-sm text-neutral-500";
      place.textContent = [ev.locationName, ev.address].filter(Boolean).join(", ");

      card.appendChild(top);
      card.appendChild(place);

      if (ev.notes) {
        const notes = document.createElement("div");
        notes.className = "mt-2 text-sm text-neutral-500";
        notes.textContent = ev.notes;
        card.appendChild(notes);
      }

      const links = document.createElement("div");
      links.className = "mt-3 flex gap-2 text-sm";

      const maps = document.createElement("a");
      maps.className = "rounded-xl border px-3 py-1 dark:border-neutral-800";
      maps.textContent = "Maps";
      maps.href = ev.mapUrl || details.primaryVenue.mapUrl;
      maps.target = "_blank";
      maps.rel = "noopener";

      const gcal = document.createElement("a");
      gcal.className = "rounded-xl border px-3 py-1 dark:border-neutral-800";
      gcal.textContent = "Add to Google Calendar";
      gcal.href = buildGoogleCalendarLink(ev);
      gcal.target = "_blank";
      gcal.rel = "noopener";

      links.appendChild(maps);
      links.appendChild(gcal);
      card.appendChild(links);

      scheduleWrap.appendChild(card);
    }
  }

  // Updates
  const updatesWrap = el<HTMLElement>("updates");
  if (updatesWrap) {
    updatesWrap.innerHTML = "";
    for (const u of details.updates || []) {
      const row = document.createElement("div");
      row.className = "rounded-2xl border p-4 text-sm dark:border-neutral-800";

      const when = document.createElement("div");
      when.className = "text-xs text-neutral-500";
      when.textContent = formatLocal(u.when);

      const text = document.createElement("div");
      text.className = "mt-1";
      text.textContent = u.text;

      row.appendChild(when);
      row.appendChild(text);
      updatesWrap.appendChild(row);
    }
  }

  // Contacts
  const contactsWrap = el<HTMLElement>("contacts");
  if (contactsWrap) {
    contactsWrap.innerHTML = "";
    for (const c of details.contacts || []) {
      const row = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = c.name;

      const span = document.createElement("span");
      span.textContent = ` (${c.role}) · ${c.phone}`;

      row.appendChild(strong);
      row.appendChild(span);
      contactsWrap.appendChild(row);
    }
  }

  applyTheme(details.theme);
  applyDecor(details);
  renderCouplePhoto(details.media);
  renderRsvp(details.rsvp);
}

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

    // Re-apply decor when dark mode toggles (fixes opacityDark not updating)
    const observer = new MutationObserver(() => {
      if (details) applyDecor(details);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

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

/**
 * Generate iCalendar (.ics) files from wedding JSON data.
 * Input:  public/weddings/data/<slug>.json
 * Output: public/weddings/calendars/<slug>.ics
 *
 * Keeps stable UIDs using event.id (recommended).
 */

import fs from "node:fs";
import path from "node:path";

const SITE_DOMAIN = "jiteshgosar.com";
const TIMEZONE = "Asia/Kolkata";

const root = process.cwd();
const dataDir = path.join(root, "public", "weddings", "data");
const outDir = path.join(root, "public", "weddings", "calendars");

fs.mkdirSync(outDir, { recursive: true });

function listJsonSlugs() {
  const files = fs.readdirSync(dataDir);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((s) => s !== "template");
}

function escapeICS(text) {
  // RFC5545 escaping for TEXT
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function dtstampUtc() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${da}T${h}${mi}${s}Z`;
}

function formatInTimeZone(iso, timeZone) {
  // Produces YYYYMMDDTHHMMSS in the specified time zone
  const d = new Date(iso);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";

  const y = get("year");
  const mo = get("month");
  const da = get("day");
  const h = get("hour");
  const mi = get("minute");
  const s = get("second");

  return `${y}${mo}${da}T${h}${mi}${s}`;
}

function buildCalendar(slug, data) {
  const calName = data.coupleNames ? `${data.coupleNames} Wedding` : `${slug} Wedding`;

  // Ensure we include primaryEvent in schedule if not already present
  const schedule = Array.isArray(data.schedule) ? [...data.schedule] : [];

  const primary = data.primaryEvent;
  if (primary && primary.start && primary.end) {
    const alreadyHasCeremony = schedule.some((e) => (e.id || "").toLowerCase() === "ceremony");
    if (!alreadyHasCeremony) {
      schedule.push({
        id: "ceremony",
        title: primary.title || "Wedding Ceremony",
        start: primary.start,
        end: primary.end,
        locationName: data.primaryVenue?.name,
        address: data.primaryVenue?.address,
        mapUrl: data.primaryVenue?.mapUrl,
        notes: ""
      });
    }
  }

  const dtstamp = dtstampUtc();

  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(`PRODID:-//${SITE_DOMAIN}//Wedding Invite//EN`);
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${escapeICS(calName)}`);
  lines.push(`X-WR-TIMEZONE:${TIMEZONE}`);

  lines.push("BEGIN:VTIMEZONE");
  lines.push(`TZID:${TIMEZONE}`);
  lines.push("BEGIN:STANDARD");
  lines.push("TZOFFSETFROM:+0530");
  lines.push("TZOFFSETTO:+0530");
  lines.push("TZNAME:IST");
  lines.push("DTSTART:19700101T000000");
  lines.push("END:STANDARD");
  lines.push("END:VTIMEZONE");

  for (const ev of schedule) {
    if (!ev || !ev.start || !ev.end || !ev.title) continue;

    const id = ev.id ? String(ev.id) : String(ev.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const uid = `${slug}-${id}@${SITE_DOMAIN}`;

    const dtStart = formatInTimeZone(ev.start, TIMEZONE);
    const dtEnd = formatInTimeZone(ev.end, TIMEZONE);

    const location = [ev.locationName, ev.address].filter(Boolean).join(", ");
    const descriptionParts = [];
    if (ev.notes) descriptionParts.push(ev.notes);
    if (ev.mapUrl) descriptionParts.push(`Map: ${ev.mapUrl}`);
    const description = descriptionParts.join("\n");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeICS(uid)}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;TZID=${TIMEZONE}:${dtStart}`);
    lines.push(`DTEND;TZID=${TIMEZONE}:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICS(ev.title)}`);
    if (location) lines.push(`LOCATION:${escapeICS(location)}`);
    if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function main() {
  const slugs = listJsonSlugs();

  for (const slug of slugs) {
    const jsonPath = path.join(dataDir, `${slug}.json`);
    const outPath = path.join(outDir, `${slug}.ics`);

    const raw = fs.readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(raw);

    if (!data.password) {
      // Not required for calendar generation, but helps you catch incomplete configs early.
      console.warn(`[warn] ${slug}.json missing "password"`);
    }

    const ics = buildCalendar(slug, data);
    fs.writeFileSync(outPath, ics, "utf-8");
    console.log(`[ok] wrote ${path.relative(root, outPath)}`);
  }
}

main();

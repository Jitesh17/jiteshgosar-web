[![Website](https://img.shields.io/website?url=https%3A%2F%2Fjiteshgosar.com)](https://jiteshgosar.com)
[![Blog](https://img.shields.io/badge/blog-%2Fblog-blue)](https://jiteshgosar.com/blog)
[![Built with Astro](https://img.shields.io/badge/Astro-SSG-orange)](https://astro.build)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-deployed-f38020)](https://pages.cloudflare.com)
![Last commit](https://img.shields.io/github/last-commit/Jitesh17/jiteshgosar-web)
![Repo size](https://img.shields.io/github/repo-size/Jitesh17/jiteshgosar-web)

# jiteshgosar-web

Personal website built with **Astro** and **Tailwind CSS**, served at **https://jiteshgosar.com**.

This repository hosts the main site pages available on **jiteshgosar.com**:
- Home (`/`)
- Blog (`/blog`) — Markdown-based posts
- About (`/about`)
- Resume (`/resume`)
- Contact (`/contact`)

Interactive demos and experimental projects live in a **separate repository** and are served from a subdomain.

---

## Tech Stack
- **Astro** → static site generation
- **Tailwind CSS** → styling
- **Markdown / MDX** → blog content
- **Giscus** → blog comments (GitHub Discussions)
- **Cloudflare Pages** → hosting

---

## Repository Structure

```
src/
  components/      # UI components (Nav, Footer, TOC, etc.)
  content/
    blog/           # Blog posts (.md files)
  layouts/          # Base and post layouts
  pages/            # Route-based pages
public/             # Static assets (images, icons)
```

---

## Blog

All blog posts are published under:
```
https://jiteshgosar.com/blog
```

## Writing a New Blog Post

All blog posts are plain Markdown files committed to Git.

1. Create a new file in:
   ```
   src/content/blog/
   ```
2. Use this frontmatter format:
   ```md
   ---
   title: "Post title"
   description: "Short summary for SEO"
   pubDate: 2025-01-01
   tags: ["tag1", "tag2"]
   draft: true
   ---
   ```
3. Write content using Markdown headings (`##`, `###`).
4. Set `draft: false` when ready to publish.
5. Commit and push.

---

## Local Development

```bash
npm install
npm run dev
```

Build the site:
```bash
npm run build
```

---

## Demos & Projects

Live demos and experimental projects are intentionally **not** hosted in this repository.

They live in a separate repo and are served from:
```
demos.jiteshgosar.com
```

This keeps the main site clean and fast.

---

## Deployment

The site is deployed on **Cloudflare Pages** directly from the `main` branch.

Every push triggers an automatic build and deploy.

---

## License

Personal website content. Not intended for reuse without permission.


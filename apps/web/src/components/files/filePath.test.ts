import { describe, expect, it } from "vite-plus/test";

import {
  adjacentImages,
  breadcrumbPathOf,
  fileBreadcrumbChildren,
  fileBreadcrumbs,
  fileFolderListing,
  isListableHostFolder,
  retainedBreadcrumbTrail,
} from "./filePath";

describe("fileBreadcrumbs", () => {
  it("starts host paths outside the workspace at the filesystem root", () => {
    expect(fileBreadcrumbs("t3code", "/tmp/t3-cleanup/report.md")).toEqual([
      { label: "tmp", path: "/tmp", kind: "directory" },
      { label: "t3-cleanup", path: "/tmp/t3-cleanup", kind: "directory" },
      { label: "report.md", path: "/tmp/t3-cleanup/report.md", kind: "file" },
    ]);
    expect(fileBreadcrumbs("t3code", "C:\\Temp\\report.md")).toEqual([
      { label: "C:", path: "C:\\", kind: "directory" },
      { label: "Temp", path: "C:\\Temp", kind: "directory" },
      { label: "report.md", path: "C:\\Temp\\report.md", kind: "file" },
    ]);
    expect(fileBreadcrumbs("t3code", "\\\\server\\share\\report.md").map((c) => c.path)).toEqual([
      "\\\\server",
      "\\\\server\\share",
      "\\\\server\\share\\report.md",
    ]);
  });

  it("builds home-relative breadcrumbs with navigable folders", () => {
    expect(fileBreadcrumbs("t3code", "~/.claude/CLAUDE.md")).toEqual([
      { label: "~", path: "~/", kind: "directory" },
      { label: ".claude", path: "~/.claude", kind: "directory" },
      { label: "CLAUDE.md", path: "~/.claude/CLAUDE.md", kind: "file" },
    ]);
    expect(isListableHostFolder("~/")).toBe(true);
    expect(isListableHostFolder("~/.claude")).toBe(true);
  });

  it("keeps a project folder named ~ inside the project", () => {
    expect(fileBreadcrumbs("t3code", "~").map((crumb) => crumb.path)).toEqual(["", "~"]);
  });
});

describe("breadcrumbPathOf", () => {
  it("keeps the home root listable", () => {
    expect(breadcrumbPathOf("~/")).toBe("~/");
  });
});

describe("fileBreadcrumbChildren", () => {
  const entries = [
    { path: "README.md", kind: "file" as const },
    { path: "src", kind: "directory" as const },
    { path: "src-old", kind: "directory" as const },
    { path: "src/index.ts", kind: "file" as const },
    { path: "src/lib", kind: "directory" as const },
    { path: "src/lib/file10.ts", kind: "file" as const },
    { path: "src/lib/file2.ts", kind: "file" as const },
    { path: "src-old/index.ts", kind: "file" as const },
  ];

  it("honors segment boundaries and sorts folders before files", () => {
    expect(fileBreadcrumbChildren(entries, "src")).toEqual([
      { path: "src/lib", kind: "directory", label: "lib" },
      { path: "src/index.ts", kind: "file", label: "index.ts" },
    ]);
  });
});

describe("retainedBreadcrumbTrail", () => {
  it.each([
    ["apps/web/src", "apps/web", "apps/web/src"],
    ["apps/web/src", "", "apps/web/src"],
    ["apps/web/src", "apps/web/src", "apps/web/src"],
    ["apps/web/src", "apps/mobile", "apps/mobile"],
    ["src/lib", "src-old", "src-old"],
    ["apps/web", "apps/web/src/main.tsx", "apps/web/src/main.tsx"],
    ["apps/web/src", "/tmp/report", "/tmp/report"],
    ["/tmp/report", "", ""],
    ["C:\\Temp\\a", "", ""],
    ["/Users/me/projects/scope", "/Users/me", "/Users/me/projects/scope"],
    ["/Users/me/projects/scope", "/Users/me/proj", "/Users/me/proj"],
    ["/Volumes/Work/a", "/Volumes/Work/a/", "/Volumes/Work/a"],
    ["C:\\Users\\me\\scope", "C:\\", "C:\\Users\\me\\scope"],
    ["C:\\Users\\me\\scope", "C:\\Users", "C:\\Users\\me\\scope"],
    ["C:\\Users\\me\\scope", "D:\\", "D:\\"],
    ["\\\\nas\\share\\docs\\notes", "\\\\nas\\share", "\\\\nas\\share\\docs\\notes"],
  ])("from trail %j to %j keeps %j", (trail, path, expected) => {
    expect(retainedBreadcrumbTrail(trail, path)).toBe(expected);
  });
});

describe("image folder navigation", () => {
  it("lists the folder that holds a workspace or host file", () => {
    const listing = (path: string) => {
      const { openPath, ...rest } = fileFolderListing("/repo", path);
      return { ...rest, reopened: openPath("b.png") };
    };
    expect(listing("shots/a.png")).toEqual({
      cwd: "/repo",
      directoryPath: "shots",
      name: "a.png",
      reopened: "b.png",
    });
    expect(listing("a.png")).toMatchObject({ cwd: "/repo", directoryPath: "" });
    expect(listing("/tmp/shots/a.png")).toMatchObject({
      cwd: "/tmp/shots",
      directoryPath: "",
      reopened: "/tmp/shots/b.png",
    });
    expect(listing("/a.png")).toMatchObject({ cwd: "/", reopened: "/b.png" });
    expect(listing("C:\\a.png")).toMatchObject({ cwd: "C:\\", reopened: "C:\\b.png" });
  });

  it("steps through images only, in natural order, wrapping at both ends", () => {
    const entries = [
      { path: "shots/10-c.png", kind: "file" as const },
      { path: "shots/2-b.jpg", kind: "file" as const },
      { path: "shots/1-a.png", kind: "file" as const },
      { path: "shots/clip.mp4", kind: "file" as const },
      { path: "shots/notes.md", kind: "file" as const },
      { path: "shots/nested", kind: "directory" as const },
      { path: "shots/nested/x.png", kind: "file" as const },
    ];
    expect(adjacentImages(entries, "shots", "1-a.png")).toEqual({
      previous: "shots/10-c.png",
      next: "shots/2-b.jpg",
      position: 1,
      count: 3,
      paths: ["shots/1-a.png", "shots/2-b.jpg", "shots/10-c.png"],
    });
    expect(adjacentImages(entries, "shots", "10-c.png")?.next).toBe("shots/1-a.png");
    expect(adjacentImages(entries.slice(0, 1), "shots", "10-c.png")).toBeNull();
  });
});

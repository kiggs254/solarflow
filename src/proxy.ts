import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Next.js 16+ network boundary (replaces deprecated middleware.ts).
 * See https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicFormPage = pathname.startsWith("/f/");
  const isPublicFormApi = /^\/api\/forms\/[^/]+\/(public|submit|embed\.js)$/.test(pathname);
  const isPublicProposalPage = pathname.startsWith("/p/");
  const isPublicProposalApi = pathname.startsWith("/api/public/proposals/");
  const isPublic =
    isAuthPage ||
    isApiAuth ||
    pathname === "/" ||
    isPublicFormPage ||
    isPublicFormApi ||
    isPublicProposalPage ||
    isPublicProposalApi;

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbsProps {
  pathname?: string;
}

export function Breadcrumbs({ pathname }: BreadcrumbsProps) {
  // Normalize pathname by removing trailing slash
  const normalizedPath = (pathname || "").replace(/\/$/, "") || "/dashboard";

  const getBreadcrumbData = (path: string) => {
    switch (path) {
      case "/dashboard":
        return { label: "Dashboard", href: "/dashboard" };
      case "/dashboard/editor":
        return { label: "Editor", href: "/dashboard/editor" };
      case "/dashboard/settings":
        return { label: "Settings", href: "/dashboard/settings" };
      case "/dashboard/theme":
        return { label: "Theme", href: "/dashboard/theme" };
      case "/dashboard/bio":
        return { label: "Bio", href: "/dashboard/bio" };
      default:
        return { label: "Dashboard", href: "/dashboard" };
    }
  };

  const breadcrumbData = getBreadcrumbData(normalizedPath);

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        {normalizedPath !== "/dashboard" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={breadcrumbData.href}>{breadcrumbData.label}</BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

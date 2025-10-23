import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbsProps {
  currentPath?: string;
}

export function Breadcrumbs({ currentPath }: BreadcrumbsProps) {
  const getBreadcrumbData = (path?: string) => {
    switch (path) {
      case "/dashboard":
        return { label: "Dashboard", href: "/dashboard" };
      case "/dashboard/editor":
        return { label: "Editor", href: "/dashboard/editor" };
      case "/dashboard/settings":
        return { label: "Settings", href: "/dashboard/settings" };
      default:
        return { label: "Dashboard", href: "/dashboard" };
    }
  };

  const breadcrumbData = getBreadcrumbData(currentPath);

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        {currentPath !== "/dashboard" && (
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

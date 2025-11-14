import { cn } from "@/lib/utils";

const Logo = ({ className, link }: { className?: string; link?: boolean }) => {
  const classNames = cn("text-xl sm:text-2xl font-semibold leading-none", className);

  if (link) {
    return (
      <a href="/">
        <span className="font-mono font-normal">hacker</span>folio
      </a>
    );
  }

  return (
    <p className={classNames}>
      <span className="font-mono font-normal">hacker</span>folio
    </p>
  );
};

export { Logo };

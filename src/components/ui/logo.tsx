import { cn } from "@/lib/utils";

const Logo = ({ className, link }: { className?: string; link?: boolean }) => {
  const classNames = cn("text-xl sm:text-2xl font-semibold leading-none", className);

  if (link) {
    return (
      <a href="/">
        <span className="font-mono font-normal">coder</span>page
      </a>
    );
  }

  return (
    <p className={classNames}>
      <span className="font-mono font-normal">coder</span>page
    </p>
  );
};

export { Logo };

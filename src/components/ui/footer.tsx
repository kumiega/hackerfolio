import { Callout } from "./callout";

const Footer = () => {
  return (
    <footer className="py-4 px-page bg-foreground text-xs">
      <div className="container mx-auto flex flex-col gap-4 sm:text-base sm:flex-row sm:items-center sm:justify-between">
        <p className="text-background">
          © 2025 <span className="font-mono">Hacker</span>folio. All rights reserved.
        </p>
        <Callout className="text-background/50 sm:text-xs">
          Made with <span className="text-primary">♥</span> for devs, by devs.
        </Callout>
      </div>
    </footer>
  );
};

export { Footer };

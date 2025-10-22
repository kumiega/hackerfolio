import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-md font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        light: "bg-primary-foreground text-foreground",
        glass: "bg-background/15 backdrop-blur-sm",
        dark: "bg-foreground text-background",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-7 gap-1.5 px-3 has-[>svg]:px-2.5 text-sm",
        lg: "h-12 px-6 has-[>svg]:px-4 text-xl",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    href?: string;
  };

function Button({ className, variant, size, asChild = false, href, ...props }: ButtonProps) {
  // If asChild, delegate to Slot as usual
  if (asChild) {
    return <Slot data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }

  if (href) {
    const { disabled, children, ...anchorProps } = props as React.ComponentProps<"a">;
    return (
      <a
        href={href}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }), disabled ? "pointer-events-none opacity-50" : "")}
        tabIndex={disabled ? -1 : undefined}
        aria-disabled={disabled ? true : undefined}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  // Default to <button>
  return (
    <button type="button" data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };

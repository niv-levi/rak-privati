"use client";
import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("border-b border-border", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & { headingLevel?: 2 | 3 | 4 }
>(({ className, children, headingLevel = 3, ...props }, ref) => {
  const Heading = `h${headingLevel}` as const;
  return (
    <AccordionPrimitive.Header asChild>
      <Heading className="flex font-semibold text-base m-0">
        <AccordionPrimitive.Trigger
          ref={ref}
          className={cn(
            "flex flex-1 items-center justify-between gap-4 py-4 text-start font-semibold transition-all hover:text-primary focus-visible:outline-2 focus-visible:outline-ring rounded-sm cursor-pointer [&[data-state=open]>svg]:rotate-180",
            className
          )}
          {...props}
        >
          {children}
          <ChevronDown aria-hidden className="size-5 shrink-0 text-muted-foreground transition-transform duration-200" />
        </AccordionPrimitive.Trigger>
      </Heading>
    </AccordionPrimitive.Header>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0 leading-relaxed text-muted-foreground", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

import { useState } from "react";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { linkedinAuthCommandSchema } from "@/lib/schemas/linkedin.schemas";

import type { QueryState } from "@/types";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useStepper } from "@/components/ui/stepper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

type LinkedInFormData = z.infer<typeof linkedinAuthCommandSchema>;

function LinkedInForm() {
  const { navigateTo } = useStepper();
  const [generationState, setGenerationState] = useState<QueryState>("idle");

  const form = useForm<LinkedInFormData>({
    resolver: zodResolver(linkedinAuthCommandSchema),
    defaultValues: {
      fullName: "",
      position: "",
      summary: "",
      experience: "",
    },
    mode: "onChange",
  });

  const handleFormSubmit = async (data: LinkedInFormData) => {
    try {
      setGenerationState("loading");

      // Make API call to generate portfolio
      const response = await fetch("/api/v1/imports/linkedin/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to generate portfolio");
      }

      setGenerationState("success");
      alert("Portfolio generated successfully");
      // Navigate to dashboard or next step
      // navigateTo("dashboard");
    } catch {
      setGenerationState("error");
      // TODO: Add toast notification for error feedback
    }
  };
  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(handleFormSubmit)}>
      <Controller
        control={form.control}
        name="fullName"
        render={({ field, fieldState }) => (
          <Field className="items-stretch">
            <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
            <Input
              id="fullName"
              name={field.name}
              ref={field.ref}
              aria-invalid={fieldState.invalid}
              placeholder="Enter your full name"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              autoComplete="name"
            />
            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="position"
        render={({ field, fieldState }) => (
          <Field className="items-stretch">
            <FieldLabel htmlFor="position">Position</FieldLabel>
            <Input
              id="position"
              name={field.name}
              ref={field.ref}
              aria-invalid={fieldState.invalid}
              placeholder="Enter your position"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="summary"
        render={({ field, fieldState }) => (
          <Field className="items-stretch">
            <FieldLabel htmlFor="summary">About Me</FieldLabel>
            <Textarea
              id="summary"
              name={field.name}
              ref={field.ref}
              aria-invalid={fieldState.invalid}
              placeholder="Tell us about yourself"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={4}
            />
            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="experience"
        render={({ field, fieldState }) => (
          <Field className="items-stretch">
            <FieldLabel htmlFor="experience">Experience</FieldLabel>
            <Textarea
              id="experience"
              name={field.name}
              ref={field.ref}
              aria-invalid={fieldState.invalid}
              placeholder="Describe your professional experience"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={8}
            />
            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <div className="flex gap-4">
        <Button type="submit" disabled={form.formState.isSubmitting || generationState === "loading"}>
          {generationState === "loading" ? (
            <>
              <Spinner className="mr-2" />
              Generating Portfolio...
            </>
          ) : (
            "Continue"
          )}
        </Button>

        <Button variant="link" onClick={() => navigateTo("github-import")} disabled={generationState === "loading"}>
          Skip
        </Button>
      </div>
    </form>
  );
}

export default LinkedInForm;

import { useState, useCallback } from "react";
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

type LinkedInFormData = z.infer<typeof linkedinAuthCommandSchema>;

const LINKEDIN_OAUTH_API_URL = "/api/v1/auth/linkedin";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};

const useLinkedInAuth = () => {
  const [state, setState] = useState<{
    state: QueryState;
    error: string | null;
  }>({
    state: "idle",
    error: null,
  });

  const authorize = useCallback(async () => {
    setState({ state: "loading", error: null });

    try {
      await fetch(LINKEDIN_OAUTH_API_URL);

      setState({
        state: "success",
        error: null,
      });
      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setState({
        state: "error",
        error: errorMessage,
      });
      return { success: false };
    }
  }, []);

  return {
    ...state,
    authorize,
  };
};

function LinkedInForm() {
  const { navigateTo } = useStepper();
  const { state, authorize } = useLinkedInAuth();

  const form = useForm<LinkedInFormData>({
    resolver: zodResolver(linkedinAuthCommandSchema),
    defaultValues: {
      fullName: "",
      headline: "",
      aboutMe: "",
      experience: "",
    },
    mode: "onChange",
  });

  const handleFormSubmit = async () => {
    try {
      const result = await authorize();
      if (result.success) {
        console.log("success");
      }
    } catch {
      // Handle authorization error
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
        name="headline"
        render={({ field, fieldState }) => (
          <Field className="items-stretch">
            <FieldLabel htmlFor="headline">Headline</FieldLabel>
            <Textarea
              id="headline"
              name={field.name}
              ref={field.ref}
              aria-invalid={fieldState.invalid}
              placeholder="Enter your professional headline"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={2}
            />
            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="aboutMe"
        render={({ field, fieldState }) => (
          <Field className="items-stretch">
            <FieldLabel htmlFor="aboutMe">About Me</FieldLabel>
            <Textarea
              id="aboutMe"
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
        <Button type="submit" disabled={state === "loading"}>
          Continue
        </Button>

        <Button variant="link" onClick={() => navigateTo("github-import")}>
          Skip
        </Button>
      </div>
    </form>
  );
}

export default LinkedInForm;

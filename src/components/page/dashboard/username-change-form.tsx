import { useState, useCallback, useRef, useEffect } from "react";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, CircleQuestionMark, CircleX, Loader2 } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { debounce } from "es-toolkit/function";
import type { QueryState } from "@/types";
import { usernameSchema } from "@/lib/schemas/username.schemas";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

type UsernameFormData = z.infer<typeof usernameSchema>;

// Constants
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const DEBOUNCE_DELAY = 500;
const DOMAIN_SUFFIX = ".coderpage.dev";
const AVAILABILITY_API_URL = "/api/v1/profiles/username-availability";
const CHANGE_USERNAME_API_URL = "/api/v1/profiles/change-username";

// Utility functions
const sanitizeUsername = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
};

const getUsernameAvailabilityUrl = (username: string): string =>
  `${AVAILABILITY_API_URL}?username=${encodeURIComponent(username)}`;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};

const useUsernameAvailability = () => {
  const [availabilityState, setAvailabilityState] = useState<{
    state: QueryState;
    error: string | null;
    isAvailable: boolean;
  }>({
    state: "idle",
    error: null,
    isAvailable: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedCheckRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      debouncedCheckRef.current?.cancel?.();
    };
  }, []);

  const checkAvailability = useCallback(async (username: string) => {
    if (username.length < USERNAME_MIN_LENGTH) {
      setAvailabilityState({
        state: "idle",
        error: null,
        isAvailable: false,
      });
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setAvailabilityState((prev) => ({ ...prev, state: "loading", error: null }));

    try {
      const response = await fetch(getUsernameAvailabilityUrl(username), {
        signal: abortControllerRef.current.signal,
      });
      const json = await response.json();

      if (!response.ok) {
        const errorMessage = json?.error?.message || "Something went wrong. Please try again later.";
        setAvailabilityState({
          state: "error",
          error: errorMessage,
          isAvailable: false,
        });
        return;
      }

      if (json?.data?.available) {
        setAvailabilityState({
          state: "success",
          error: null,
          isAvailable: true,
        });
      } else {
        setAvailabilityState({
          state: "error",
          error: "Username is not available",
          isAvailable: false,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setAvailabilityState({
          state: "error",
          error: getErrorMessage(error),
          isAvailable: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    debouncedCheckRef.current = debounce(checkAvailability, DEBOUNCE_DELAY);
    return () => {
      debouncedCheckRef.current?.cancel?.();
    };
  }, [checkAvailability]);

  return {
    ...availabilityState,
    checkAvailability: (username: string) => debouncedCheckRef.current?.(username),
    resetError: () => setAvailabilityState((prev) => ({ ...prev, error: null })),
  };
};

const useChangeUsername = () => {
  const [changeState, setChangeState] = useState<{
    state: QueryState;
    error: string | null;
  }>({
    state: "idle",
    error: null,
  });

  const changeUsername = useCallback(async (username: string) => {
    setChangeState({ state: "loading", error: null });

    try {
      const response = await fetch(CHANGE_USERNAME_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const json = await response.json();

      if (!response.ok) {
        const errorMessage = json?.error?.message || "Failed to change username. Please try again.";
        setChangeState({
          state: "error",
          error: errorMessage,
        });
        return { success: false };
      }

      setChangeState({
        state: "success",
        error: null,
      });
      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setChangeState({
        state: "error",
        error: errorMessage,
      });
      return { success: false };
    }
  }, []);

  return {
    ...changeState,
    changeUsername,
  };
};

interface UsernameChangeFormProps {
  currentUsername: string | null;
}

export function UsernameChangeForm({ currentUsername }: UsernameChangeFormProps) {
  const { state, error: availabilityError, isAvailable, checkAvailability, resetError } = useUsernameAvailability();
  const { state: changeState, error: changeError, changeUsername } = useChangeUsername();

  const form = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: currentUsername || "",
    },
    mode: "onChange",
  });

  const handleInputChange = useCallback(
    (fieldOnChange: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const sanitizedValue = sanitizeUsername(newValue);
      const previousValue = form.getValues("username");

      if (sanitizedValue !== newValue) {
        e.target.value = sanitizedValue;
      }

      fieldOnChange(sanitizedValue);

      if (sanitizedValue === previousValue || sanitizedValue === currentUsername) {
        return;
      }

      resetError();
      checkAvailability(sanitizedValue);
    },
    [form, checkAvailability, resetError, currentUsername]
  );

  const handleFormSubmit = form.handleSubmit(async (data) => {
    const result = await changeUsername(data.username);
    if (result.success) {
      // TODO: Handle success - maybe redirect or show success message
      window.location.reload(); // Temporary solution - reload to update username in UI
    }
  });

  const isLoading = changeState === "loading" || (state === "loading" && changeState !== "success");
  const currentError = changeError || availabilityError;
  const displayState = changeState === "loading" || changeState === "error" ? changeState : state;
  const isCurrentUsername = form.watch("username") === currentUsername;

  return (
    <form className="space-y-4" onSubmit={handleFormSubmit}>
      <Controller
        control={form.control}
        name="username"
        render={({ field, fieldState }) => (
          <Field className="items-stretch">
            <FieldContent>
              <FieldLabel htmlFor="username">New Username</FieldLabel>
              <FieldDescription className="flex-1 nth-last-child(2):mt-0">
                {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} characters, lowercase letters, numbers, and hyphens only
              </FieldDescription>
            </FieldContent>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>https://</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="username"
                name={field.name}
                ref={field.ref}
                aria-invalid={fieldState.invalid || displayState === "error"}
                placeholder="username"
                className="!pl-0.5"
                value={field.value}
                onChange={handleInputChange(field.onChange)}
                onBlur={field.onBlur}
                autoComplete="off"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{DOMAIN_SUFFIX}</InputGroupText>
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {!isLoading && isCurrentUsername && <CheckCircle className="text-green-600 h-4 w-4" />}
                {!isLoading && displayState === "idle" && !isCurrentUsername && (
                  <CircleQuestionMark className="h-4 w-4" />
                )}
                {!isLoading && displayState === "success" && <CheckCircle className="text-green-600 h-4 w-4" />}
                {!isLoading && displayState === "error" && <CircleX className="text-red-600 h-4 w-4" />}
              </InputGroupAddon>
            </InputGroup>
            {currentError && <FieldError>{currentError}</FieldError>}
            {!currentError && fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />
      <Button
        disabled={!form.formState.isValid || !isAvailable || !!currentError || isLoading || isCurrentUsername}
        type="submit"
        className="gap-2"
      >
        {changeState === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Changing username...
          </>
        ) : (
          "Change Username"
        )}
      </Button>
    </form>
  );
}

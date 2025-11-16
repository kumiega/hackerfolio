import { createContext, useState, useContext, useCallback, useMemo, useEffect, useRef } from "react";

export interface IStep<T, S extends string> {
  label: S;
  content: React.ReactNode;
  isValid?: (data: T) => boolean;
  preventBack?: boolean;
}

interface IStepperContext<T, S extends string> {
  activeStep: number;
  setActiveStep: (newStep: number) => void;
  navigateTo: (id: S, replace?: boolean) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  handleSetData: (partial: Partial<T>) => void;
  resetData: () => void;
  data: T;
  steps: IStep<T, S>[];
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoToNext: boolean;
  currentStep: IStep<T, S>;
}

interface IStepperProviderProps<T, S extends string> {
  children: React.ReactNode;
  initialData: T;
  steps: IStep<T, S>[];
}

const StepperContext = createContext<IStepperContext<unknown, string> | undefined>(undefined);

const StepperProvider = <T, S extends string>({ children, initialData, steps }: IStepperProviderProps<T, S>) => {
  const [activeStep, setActiveStep] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step");
      if (stepParam) {
        const index = steps.findIndex((step) => step.label === stepParam);
        if (index !== -1) return index;
      }
    }
    return 0;
  });

  const [data, setData] = useState<T>(initialData);
  const isInitialMount = useRef(true);

  // Custom navigation stack to preserve valid back history
  const historyRef = useRef<number[]>([0]);
  const manualNavigationRef = useRef(false);

  // Sync activeStep with URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentStep = steps[activeStep];
    const params = new URLSearchParams(window.location.search);
    const currentStepParam = params.get("step");

    if (currentStepParam === currentStep.label) return;

    params.set("step", currentStep.label);
    const newUrl = `${window.location.pathname}?${params.toString()}`;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      window.history.replaceState(null, "", newUrl);
      return;
    }

    // Only update history if navigation wasn't triggered by browser back/forward
    if (!manualNavigationRef.current) {
      if (currentStep.preventBack) {
        window.history.replaceState(null, "", newUrl);
      } else {
        window.history.pushState(null, "", newUrl);
      }
    }

    manualNavigationRef.current = false;
  }, [activeStep, steps]);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      manualNavigationRef.current = true;

      // Pop from our custom stack
      const previous = historyRef.current[historyRef.current.length - 2]; // second from top
      if (previous !== undefined) {
        historyRef.current.pop();
        setActiveStep(previous);
      } else {
        setActiveStep(0);
        historyRef.current = [0];
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSetData = useCallback((partial: Partial<T>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetData = useCallback(() => {
    setData(initialData);
  }, [initialData]);

  const navigateTo = useCallback(
    (id: S, replace = false) => {
      const index = steps.findIndex((step) => step.label === id);
      if (index === -1) {
        return;
      }

      const currentIndex = historyRef.current[historyRef.current.length - 1];

      // If user jumps forward/backward more than one step → reset stack
      if (Math.abs(index - currentIndex) > 1) {
        historyRef.current = [index];
        setActiveStep(index);
        return;
      }

      // Normal sequential move
      if (!replace) {
        historyRef.current.push(index);
      } else {
        historyRef.current[historyRef.current.length - 1] = index;
      }

      setActiveStep(index);
    },
    [steps]
  );

  const goToNext = useCallback(() => {
    setActiveStep((prev) => {
      const next = Math.min(prev + 1, steps.length - 1);
      if (next !== prev) {
        historyRef.current.push(next);
      }
      return next;
    });
  }, [steps.length]);

  const goToPrevious = useCallback(() => {
    setActiveStep((prev) => {
      const previous = Math.max(prev - 1, 0);
      if (previous !== prev) {
        historyRef.current.push(previous);
      }
      return previous;
    });
  }, []);

  const contextValue = useMemo(() => {
    const currentStep = steps[activeStep];
    const isFirstStep = activeStep === 0;
    const isLastStep = activeStep === steps.length - 1;
    const canGoToNext = !isLastStep && (!currentStep.isValid || currentStep.isValid(data));

    return {
      activeStep,
      setActiveStep,
      navigateTo,
      goToNext,
      goToPrevious,
      data,
      handleSetData,
      resetData,
      steps,
      isFirstStep,
      isLastStep,
      canGoToNext,
      currentStep,
    };
  }, [activeStep, steps, data, navigateTo, goToNext, goToPrevious, handleSetData, resetData]);

  return <StepperContext.Provider value={contextValue}>{children}</StepperContext.Provider>;
};

const useStepper = <T, S extends string>(): IStepperContext<T, S> => {
  const context = useContext(StepperContext);
  if (context === undefined) {
    throw new Error("useStepper must be used within a StepperProvider");
  }
  return context;
};

export { StepperProvider, useStepper };

import { Check } from "lucide-react";

const STEPS: Record<"supplier" | "client", string[]> = {
  supplier: ["Inscription", "Documents", "Abonnement"],
  client: ["Inscription", "Documents", "Abonnement"],
};

interface RegistrationStepperProps {
  role: "supplier" | "client";
  /** 1-based index of the step the user is on. */
  current: number;
  className?: string;
}

export default function RegistrationStepper({
  role,
  current,
  className = "",
}: RegistrationStepperProps) {
  const steps = STEPS[role];

  return (
    <nav aria-label={`Étape ${current} sur ${steps.length}`} className={`mx-auto w-full ${className}`}>
      <ol className="flex items-start">
        {steps.map((label, index) => {
          const step = index + 1;
          const done = step < current;
          const active = step === current;
          const isLast = step === steps.length;

          return (
            <li key={label} className={`flex items-start ${isLast ? "" : "flex-1"}`}>
              <div className="flex flex-col items-center gap-1.5 w-16 sm:w-24 shrink-0">
                <span
                  aria-current={active ? "step" : undefined}
                  className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    done
                      ? "bg-green-500 text-white"
                      : active
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-white text-gray-400 border-2 border-gray-200"
                  }`}
                >
                  {done ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : step}
                </span>
                <span
                  className={`text-center text-[11px] sm:text-sm leading-tight ${
                    active ? "font-semibold text-blue-700" : done ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <span
                  aria-hidden
                  className={`mt-4 sm:mt-5 h-0.5 flex-1 rounded-full ${
                    done ? "bg-green-400" : "bg-gray-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

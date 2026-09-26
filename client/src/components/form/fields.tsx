import type { ReactNode } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

interface BaseFieldProps {
  label: string;
  error?: FieldError;
  hint?: string;
  required?: boolean;
}

function FieldWrapper({ label, error, hint, required, children }: BaseFieldProps & { children: ReactNode }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {error && <p className="field-error">{error.message}</p>}
    </div>
  );
}

interface InputFieldProps extends BaseFieldProps {
  registration: UseFormRegisterReturn;
  type?: 'text' | 'number' | 'date' | 'password';
  placeholder?: string;
  /** np. "0.01" dla kwot pieniężnych, żeby przeglądarka akceptowała grosze. */
  step?: string;
}

export function TextField({ registration, type = 'text', placeholder, step, ...rest }: InputFieldProps) {
  return (
    <FieldWrapper {...rest}>
      <input type={type} step={step} placeholder={placeholder} className="input" {...registration} />
    </FieldWrapper>
  );
}

export function TextareaField({ registration, placeholder, ...rest }: Omit<InputFieldProps, 'type'>) {
  return (
    <FieldWrapper {...rest}>
      <textarea rows={3} placeholder={placeholder} className="input" {...registration} />
    </FieldWrapper>
  );
}

interface SelectFieldProps extends BaseFieldProps {
  registration: UseFormRegisterReturn;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ registration, options, placeholder, ...rest }: SelectFieldProps) {
  return (
    <FieldWrapper {...rest}>
      <select className="input" {...registration}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

interface CheckboxFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
}

export function CheckboxField({ label, registration }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800" {...registration} />
      {label}
    </label>
  );
}
